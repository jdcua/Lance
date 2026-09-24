const RELEASE_API = 'https://api.github.com/repos/jdcua/Lance/releases/latest';

// The repo is private, so github.com download links 404 for the public.
// The worker fetches with a server-side GITHUB_TOKEN and streams the
// installer bytes back, keeping the code private while downloads stay public.
const OS_ASSET_SUFFIX = {
  mac: ['.dmg'],
  win: ['-setup.exe', '.msi'],
  linux: ['.AppImage'],
};

function githubHeaders(env, accept) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: accept || 'application/vnd.github+json',
    'User-Agent': 'Lance-Landing',
  };
}

async function getLatestRelease(env) {
  const res = await fetch(RELEASE_API, { headers: githubHeaders(env) });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function findAsset(release, os) {
  const suffixes = OS_ASSET_SUFFIX[os];
  if (!release || !suffixes) return null;
  const assets = release.assets || [];
  return assets.find((a) => suffixes.some((s) => (a.name || '').endsWith(s))) || null;
}

async function handleDownload(os, env) {
  if (!OS_ASSET_SUFFIX[os]) {
    return Response.json({ error: 'unknown platform' }, { status: 404 });
  }
  if (!env.GITHUB_TOKEN) {
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }
  const asset = findAsset(await getLatestRelease(env), os);
  if (!asset) {
    return Response.json({ error: 'no installer for this platform yet' }, { status: 404 });
  }
  const upstream = await fetch(asset.url, { headers: githubHeaders(env, 'application/octet-stream') });
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: 'upstream unavailable' }, { status: 502 });
  }
  const headers = new Headers();
  headers.set('Content-Type', asset.content_type || upstream.headers.get('Content-Type') || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${asset.name}"`);
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return new Response(upstream.body, { status: 200, headers });
}

// Updater bundles mirror scripts/generate-latest-json.cjs. The worker
// rebuilds latest.json on the fly so platform URLs point at the public
// proxy instead of the private repo.
const UPDATER_BUNDLES = [
  { platforms: ['darwin-aarch64', 'darwin-x86_64'], suffix: '.app.tar.gz' },
  { platforms: ['linux-x86_64'], suffix: '.AppImage' },
  { platforms: ['windows-x86_64'], suffix: '-setup.exe' },
];

async function handleUpdatesLatest(request, env) {
  // Temporary local-release mode: when landing/downloads/manifest.json
  // exists, serve ONLY what it provides. Unsigned builds offer no updater
  // entries (mac users install via the download button); win/linux entries
  // are omitted rather than mislabeled with a version they don't match.
  // No manifest → full matrix from the latest GitHub release.
  const manifest = await getLocalManifest(request, env);
  const origin = new URL(request.url).origin;
  if (manifest) {
    const platforms = {};
    const localMac = manifest.mac && manifest.mac.bundle && manifest.mac.bundleSignature;
    if (localMac) {
      const url = `${origin}/api/updates/download-local/${encodeURIComponent(manifest.mac.bundle)}`;
      for (const key of UPDATER_BUNDLES[0].platforms) platforms[key] = { url, signature: manifest.mac.bundleSignature };
    }
    if (Object.keys(platforms).length === 0) {
      return Response.json({ error: 'no signed updater bundles yet' }, { status: 404 });
    }
    const notes = String(manifest.notes || 'Bug fixes and improvements').replace(/[\n\r]+/g, ' ').trim();
    return Response.json(
      { version: manifest.version, notes, pub_date: null, platforms },
      { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300, s-maxage=600' } },
    );
  }
  if (!env.GITHUB_TOKEN) {
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }
  const release = await getLatestRelease(env);
  if (!release) {
    return Response.json({ error: 'upstream unavailable' }, { status: 502 });
  }
  const assets = release.assets || [];
  const byName = new Map(assets.map((a) => [a.name, a]));
  const platforms = {};
  for (const { platforms: keys, suffix } of UPDATER_BUNDLES) {
    const bundle = assets.find((a) => (a.name || '').endsWith(suffix));
    const sig = bundle && byName.get(`${bundle.name}.sig`);
    if (!bundle || !sig) continue;
    const sigRes = await fetch(sig.url, { headers: githubHeaders(env, 'application/octet-stream') });
    if (!sigRes.ok) continue;
    const signature = (await sigRes.text()).trim();
    if (!signature) continue;
    const url = `${origin}/api/updates/download/${encodeURIComponent(bundle.name)}`;
    for (const key of keys) platforms[key] = { url, signature };
  }
  if (Object.keys(platforms).length === 0) {
    return Response.json({ error: 'no signed updater bundles yet' }, { status: 404 });
  }
  const version = String(release.tag_name || '').replace(/^v/, '');
  const notes = String(release.body || 'Bug fixes and improvements').replace(/[\n\r]+/g, ' ').trim();
  return Response.json(
    { version, notes, pub_date: release.published_at || null, platforms },
    { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300, s-maxage=600' } },
  );
}

async function handleUpdatesDownload(filename, env) {
  if (!env.GITHUB_TOKEN) {
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }
  const name = decodeURIComponent(filename || '');
  const release = await getLatestRelease(env);
  // Exact-name match against the latest release only: no path traversal,
  // no arbitrary-URL proxying.
  const asset = (release && (release.assets || []).find((a) => a.name === name)) || null;
  if (!asset) {
    return Response.json({ error: 'asset not found' }, { status: 404 });
  }
  const upstream = await fetch(asset.url, { headers: githubHeaders(env, 'application/octet-stream') });
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: 'upstream unavailable' }, { status: 502 });
  }
  const headers = new Headers();
  headers.set('Content-Type', asset.content_type || upstream.headers.get('Content-Type') || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${asset.name}"`);
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return new Response(upstream.body, { status: 200, headers });
}

// TEMPORARY local-release override (until GitHub Actions minutes renew).
// `node scripts/prepare-local-release.cjs` copies a local Tauri build into
// landing/downloads/ + writes manifest.json there. When the manifest exists,
// mac downloads/updater entries come from those files; everything else still
// comes from GitHub. Delete landing/downloads/ to revert to GitHub-only.
let manifestCache = null;

async function getLocalManifest(request, env) {
  const now = Date.now();
  if (manifestCache && now - manifestCache.at < 5 * 60 * 1000) return manifestCache.data;
  try {
    const assetUrl = new URL('/downloads/manifest.json', request.url).href;
    const res = await env.ASSETS.fetch(assetUrl);
    if (!res.ok) {
      manifestCache = { at: now, data: null };
      return null;
    }
    const data = await res.json();
    manifestCache = { at: now, data };
    return data;
  } catch {
    manifestCache = { at: now, data: null };
    return null;
  }
}

async function serveLocalFile(request, env, filename, contentType) {
  const res = await env.ASSETS.fetch(new Request(new URL(`/downloads/${filename}`, request.url)));
  if (!res.ok || !res.body) return null;
  const headers = new Headers();
  headers.set('Content-Type', contentType || res.headers.get('Content-Type') || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return new Response(res.body, { status: 200, headers });
}

// Anonymous A/B counters: first-party, aggregate only. Payload is
// {exp, variant, goal} — no IP storage, no fingerprint, hourly buckets.
// Mirrors scripts/promo/exp-beacon.mjs (kept in sync); counts feed
// promo/exp-report.md via GET /api/exp-report.
const expCounters = new Map();
const expHour = () => new Date().toISOString().slice(0, 13);
const EXP_GOALS = new Set(['view', 'dl-click', 'pricing-view', 'trial-cta', 'contact-submit', 'issue-submit']);

function recordExpHit(exp, variant, goal) {
  exp = String(exp || '').slice(0, 40);
  variant = String(variant || '').slice(0, 8);
  goal = String(goal || '').slice(0, 24);
  if (!/^[a-z0-9-]+$/.test(exp) || !/^[ABC]$/.test(variant) || !EXP_GOALS.has(goal)) return false;
  const k = `${exp}:${variant}:${goal}:${expHour()}`;
  expCounters.set(k, (expCounters.get(k) || 0) + 1);
  if (expCounters.size > 5000) {
    const cutoff = expHour();
    for (const key of expCounters.keys()) {
      if (!key.endsWith(cutoff)) expCounters.delete(key);
      if (expCounters.size <= 3000) break;
    }
  }
  return true;
}

function expReport() {
  const out = {};
  for (const [k, n] of expCounters) {
    const [exp, variant, goal] = k.split(':');
    (out[exp] ??= {})[variant] ??= {};
    out[exp][variant][goal] = (out[exp][variant][goal] || 0) + n;
  }
  return out;
}

async function handleExpHit(request) {
  if (request.method !== 'POST') return Response.json({ error: 'method not allowed' }, { status: 405 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (!recordExpHit(body.exp, body.variant, body.goal)) {
    return Response.json({ error: 'bad payload' }, { status: 400 });
  }
  return Response.json({ ok: true });
}

// Public issue intake: landing form posts here, worker files a GitHub issue
// in the private repo (labeled user-report) using the server-side token.
const issueHits = new Map();

function issueRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const recent = ((issueHits.get(ip) || []).filter((t) => now - t < windowMs).concat([now])).slice(-10);
  issueHits.set(ip, recent);
  if (issueHits.size > 2000) {
    for (const [k, v] of issueHits) {
      if (v.every((t) => now - t >= windowMs)) issueHits.delete(k);
      if (issueHits.size <= 1000) break;
    }
  }
  return recent.length > 3;
}

async function handleCreateIssue(request, env) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'method not allowed' }, { status: 405 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 });
  }
  // Honeypot: bots fill it, humans never see it.
  if (body.company_hp) return Response.json({ ok: true });
  const name = String(body.name || '').trim().slice(0, 100);
  const email = String(body.email || '').trim().slice(0, 200);
  const title = String(body.title || '').trim().slice(0, 120);
  const details = String(body.details || '').trim().slice(0, 3000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || title.length < 5 || details.length < 10) {
    return Response.json({ error: 'name, a valid email, a short summary, and details are required' }, { status: 400 });
  }
  if (!env.GITHUB_TOKEN) {
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (issueRateLimited(ip)) {
    return Response.json({ error: 'too many reports, try again later' }, { status: 429 });
  }
  const payload = {
    title: `[user-report] ${title}`,
    body: `Reported via the Lance landing page.\n\nReporter: ${name} <${email}>\n\n${details}`,
    labels: ['user-report'],
  };
  const postIssue = (p) =>
    fetch('https://api.github.com/repos/jdcua/Lance/issues', {
      method: 'POST',
      headers: { ...githubHeaders(env), 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
  try {
    let res = await postIssue(payload);
    if (res.status === 422) {
      // Most likely the user-report label doesn't exist yet; retry unlabeled.
      const { labels: _dropped, ...bare } = payload;
      res = await postIssue(bare);
    }
    if (!res.ok) {
      return Response.json({ error: 'could not file issue, try again later' }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'could not file issue, try again later' }, { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/updates/latest.json') {
      return handleUpdatesLatest(request, env);
    }

    if (url.pathname.startsWith('/api/updates/download-local/')) {
      // Temporary local-release override: only the exact bundle named in the
      // checked-in manifest is servable.
      const filename = decodeURIComponent(url.pathname.slice('/api/updates/download-local/'.length).split('/')[0] || '');
      const manifest = await getLocalManifest(request, env);
      if (!manifest?.mac?.bundle || filename !== manifest.mac.bundle) {
        return Response.json({ error: 'asset not found' }, { status: 404 });
      }
      const local = await serveLocalFile(request, env, filename, 'application/gzip');
      if (!local) return Response.json({ error: 'asset not found' }, { status: 404 });
      return local;
    }

    if (url.pathname.startsWith('/api/updates/download/')) {
      const filename = url.pathname.slice('/api/updates/download/'.length).split('/')[0];
      return handleUpdatesDownload(filename, env);
    }

    if (url.pathname === '/api/issues') {
      return handleCreateIssue(request, env);
    }

    if (url.pathname === '/api/exp-hit') {
      return handleExpHit(request);
    }

    if (url.pathname === '/api/exp-report') {
      return Response.json(expReport(), {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    if (url.pathname.startsWith('/api/download/')) {
      const os = url.pathname.slice('/api/download/'.length).split('/')[0];
      if (os === 'mac') {
        // Temporary local-release override: serve the locally built dmg.
        const manifest = await getLocalManifest(request, env);
        if (manifest && manifest.mac && manifest.mac.dmg) {
          const local = await serveLocalFile(request, env, manifest.mac.dmg);
          if (local) return local;
        }
      }
      return handleDownload(os, env);
    }

    // v2 AI waitlist: opt-in email only. Notified via Resend to the owner
    // inbox (one email per signup; the list lives in email until KV lands).
    // Same honeypot + rate-limit discipline as the other intake routes.
    if (url.pathname === '/api/waitlist' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 });
      }
      if (body.company_hp) return Response.json({ ok: true });
      const email = String(body.email || '').trim().slice(0, 200);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Response.json({ error: 'a valid email is required' }, { status: 400 });
      }
      const RESEND_API_KEY = env.RESEND_API_KEY;
      const CONTACT_TO = env.CONTACT_TO;
      if (!RESEND_API_KEY || !CONTACT_TO) {
        return Response.json({ error: 'server misconfigured' }, { status: 500 });
      }
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      if (issueRateLimited(ip)) {
        return Response.json({ error: 'too many requests, try again later' }, { status: 429 });
      }
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.CONTACT_FROM || 'Lance waitlist <onboarding@resend.dev>',
            to: [CONTACT_TO],
            subject: 'Lance v2 waitlist signup',
            text: `New v2 AI waitlist signup: ${email}\nIP: ${ip}\nTime: ${new Date().toISOString()}`,
          }),
        });
        if (!res.ok) {
          return Response.json({ error: 'could not join, try again later' }, { status: 502 });
        }
        return Response.json({ ok: true });
      } catch {
        return Response.json({ error: 'could not join, try again later' }, { status: 502 });
      }
    }

    if (url.pathname === '/api/contact' && request.method === 'POST') {
      const RESEND_API_KEY = env.RESEND_API_KEY;
      const CONTACT_TO = env.CONTACT_TO;
      if (!RESEND_API_KEY || !CONTACT_TO) {
        return Response.json({ error: 'server misconfigured' }, { status: 500 });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 });
      }
      const name = String(body.name || '').trim().slice(0, 100);
      const email = String(body.email || '').trim().slice(0, 200);
      const message = String(body.message || '').trim().slice(0, 2000);
      // Honeypot: bots fill it, humans never see it.
      if (body.company_hp) return Response.json({ ok: true });
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
        return Response.json({ error: 'name, a valid email, and a message are required' }, { status: 400 });
      }

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.CONTACT_FROM || 'Lance contact <onboarding@resend.dev>',
            to: [CONTACT_TO],
            reply_to: `${name} <${email}>`,
            subject: `Lance contact: ${name}`,
            text: `From: ${name} <${email}>\n\n${message}`,
          }),
        });
        if (!res.ok) {
          return Response.json({ error: 'delivery failed, try again later' }, { status: 502 });
        }
        return Response.json({ ok: true });
      } catch {
        return Response.json({ error: 'delivery failed, try again later' }, { status: 502 });
      }
    }

    if (url.pathname === '/api/release') {
      const GITHUB_TOKEN = env.GITHUB_TOKEN;
      if (!GITHUB_TOKEN) {
        return Response.json({ error: 'server misconfigured' }, { status: 500 });
      }

      try {
        const release = await getLatestRelease(env);
        if (!release) {
          return Response.json({ error: 'upstream unavailable' }, { status: 502 });
        }
        // Temporary local-release mode: surface the local version/notes so
        // the page label matches what mac users actually download.
        const manifest = await getLocalManifest(request, env);
        if (manifest) {
          if (manifest.version) release.tag_name = `v${String(manifest.version).replace(/^v/, '')}`;
          if (manifest.notes) release.body = manifest.notes;
        }
        return new Response(JSON.stringify(release), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300, s-maxage=600',
          },
        });
      } catch {
        return Response.json({ error: 'upstream unavailable' }, { status: 502 });
      }
    }

    // Pretty legal URLs: /privacy, /terms and /refunds resolve to their
    // static .html files (the footer links here, not at *.html paths).
    const STATIC_PAGES = {
      '/privacy': '/privacy.html',
      '/terms': '/terms.html',
      '/refunds': '/refunds.html',
      '/press': '/press.html',
      '/rates': '/rates/index.html',
    };
    if (STATIC_PAGES[url.pathname]) {
      return env.ASSETS.fetch(new Request(new URL(STATIC_PAGES[url.pathname], request.url)));
    }

    // Promo SEO pages: /craft/<id>, /alternatives/<slug>, /use/<slug> resolve
    // to their static .html files (generated by scripts/promo/build.mjs).
    const SEO_DIR = /^\/(craft|alternatives|use|tools|rates)\/[^/.]+$/;
    if (SEO_DIR.test(url.pathname)) {
      return env.ASSETS.fetch(new Request(new URL(url.pathname + '.html', request.url)));
    }

    return env.ASSETS.fetch(request);
  },
};
