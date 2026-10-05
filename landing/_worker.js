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
  // NOTE: /releases/latest excludes prereleases, so it kept answering 0.9.2
  // through the entire 0.9.9 beta line: downloads, the landing version label,
  // and the in-app updater all served stale builds while new ones shipped.
  // List instead and take the most recently published non-draft release, so
  // betas actually reach users and a future full release takes over on its own.
  try {
    const res = await fetch('https://api.github.com/repos/jdcua/Lance/releases?per_page=20', {
      headers: githubHeaders(env),
    });
    if (res.ok) {
      const all = await res.json();
      const live = (Array.isArray(all) ? all : []).filter((r) => r && !r.draft && r.published_at);
      live.sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
      if (live[0]) return live[0];
    }
  } catch {
    /* fall through to /releases/latest */
  }
  const res = await fetch(RELEASE_API, { headers: githubHeaders(env) });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function findAsset(release, os) {
  if (!Object.hasOwn(OS_ASSET_SUFFIX, os)) return null;
  const suffixes = OS_ASSET_SUFFIX[os];
  if (!release || !suffixes) return null;
  const assets = release.assets || [];
  return assets.find((a) => suffixes.some((s) => (a.name || '').endsWith(s))) || null;
}

async function handleDownload(os, env) {
  // Object.hasOwn, not truthiness: inherited keys (constructor, toString,
  // __proto__, 12 more) passed a `!OS_ASSET_SUFFIX[os]` check and threw a 500.
  if (!Object.hasOwn(OS_ASSET_SUFFIX, os)) {
    return Response.json({ error: 'unknown platform' }, { status: 404 });
  }
  if (!env.GITHUB_TOKEN) {
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }
  const asset = findAsset(await getLatestRelease(env), os);
  if (!asset) {
    return Response.json({ error: 'no installer for this platform yet' }, { status: 404 });
  }
  const upstream = await fetch(asset.url, {
    headers: githubHeaders(env, 'application/octet-stream'),
  });
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: 'upstream unavailable' }, { status: 502 });
  }
  const headers = new Headers();
  headers.set(
    'Content-Type',
    asset.content_type || upstream.headers.get('Content-Type') || 'application/octet-stream',
  );
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

// Floor for the updater manifest. A client on an older build than this should be
// told to download fresh rather than auto-update, because the older build cannot
// be trusted to check anything. Bump this in the same commit that ships a
// security fix older clients need.
const MIN_SUPPORTED_VERSION = '0.9.0';

async function handleUpdatesLatest(request, env) {
  const origin = new URL(request.url).origin;

  // Local-release override, opt-in via `?local=1` ONLY.
  //
  // This used to short-circuit whenever landing/downloads/manifest.json merely
  // EXISTED. That file is a hand-made local artifact (it shipped with a `dmg`
  // and no bundle/signature), so the endpoint answered 404 for every user
  // forever: auto-update was non-functional, and every install stayed pinned to
  // whatever build it had. A user with a security fix shipped could never
  // receive it.
  //
  // The release workflow generates a properly signed latest.json and attaches it
  // to the GitHub release, so the release is the source of truth and the static
  // file is only for local testing.
  if (new URL(request.url).searchParams.get('local') === '1') {
    const localManifest = await getLocalManifest(request, env);
    if (localManifest) {
      const platforms = {};
      const localMac =
        localManifest.mac && localManifest.mac.bundle && localManifest.mac.bundleSignature;
      if (localMac) {
        const url = `${origin}/api/updates/download-local/${encodeURIComponent(localManifest.mac.bundle)}`;
        for (const key of UPDATER_BUNDLES[0].platforms)
          platforms[key] = { url, signature: localManifest.mac.bundleSignature };
      }
      if (Object.keys(platforms).length === 0) {
        return Response.json(
          { error: 'no local signed bundle (expected mac.bundle + signature)' },
          { status: 404 },
        );
      }
      const notes = String(localManifest.notes || 'Local build')
        .replace(/[\n\r]+/g, ' ')
        .trim();
      return Response.json(
        { version: localManifest.version, notes, pub_date: null, platforms },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store',
            'X-Lance-Updater-Source': 'local-override',
          },
        },
      );
    }
  }

  if (!env.GITHUB_TOKEN) {
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }
  if (!outboundBudgetAvailable()) {
    return Response.json({ error: 'service busy, try again later' }, { status: 503 });
  }
  spendOutbound();
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
    const sigRes = await fetch(sig.url, {
      headers: githubHeaders(env, 'application/octet-stream'),
    });
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
  const notes = String(release.body || 'Bug fixes and improvements')
    .replace(/[\n\r]+/g, ' ')
    .trim();
  return Response.json(
    {
      version,
      notes,
      pub_date: release.published_at || null,
      platforms,
      // Lets the client refuse a manifest that is older than one it has already
      // seen. There is no signature over this manifest, so someone who can write
      // the worker's ASSETS could otherwise pin every install onto a previously
      // signed but now-vulnerable bundle; the signature would verify, because it
      // IS a genuine signature. The client-side high-water mark is the check.
      min_supported_version: MIN_SUPPORTED_VERSION,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    },
  );
}

// A malformed percent-escape (`/api/updates/download/%`) throws URIError, which
// surfaced as a 500. Asset names are [A-Za-z0-9._-] by construction, so reject
// anything else before decoding rather than catching the throw.
function safeDecodeName(raw) {
  const value = String(raw || '');
  if (!/^[A-Za-z0-9._-]*$/.test(value)) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

async function handleUpdatesDownload(filename, env) {
  if (!env.GITHUB_TOKEN) {
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }
  const name = safeDecodeName(filename);
  if (name === null) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  const release = await getLatestRelease(env);
  // Exact-name match against the latest release only: no path traversal,
  // no arbitrary-URL proxying.
  const asset = (release && (release.assets || []).find((a) => a.name === name)) || null;
  if (!asset) {
    return Response.json({ error: 'asset not found' }, { status: 404 });
  }
  const upstream = await fetch(asset.url, {
    headers: githubHeaders(env, 'application/octet-stream'),
  });
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: 'upstream unavailable' }, { status: 502 });
  }
  const headers = new Headers();
  headers.set(
    'Content-Type',
    asset.content_type || upstream.headers.get('Content-Type') || 'application/octet-stream',
  );
  headers.set('Content-Disposition', `attachment; filename="${asset.name}"`);
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return new Response(upstream.body, { status: 200, headers });
}

// Local-release override for manual testing ONLY (opt-in, never automatic).
// `node scripts/prepare-local-release.cjs` copies a local Tauri build into
// landing/downloads/ + writes manifest.json there. The updater ignores it
// unless `?local=1` is passed; /api/download/mac and /api/release still honor
// it when present, so do NOT commit landing/downloads/ (it once shadowed the
// real releases in production for weeks). Delete the directory to revert fully
// to GitHub-only.
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
  // Defence in depth. Both callers already compare `filename` against a value in
  // the checked-in manifest, but that safety lives at the call site. A manifest
  // value containing `../` would turn this into a traversal primitive, so the
  // filename is validated where it becomes a path.
  if (!/^[A-Za-z0-9._-]+$/.test(filename)) return null;
  const res = await env.ASSETS.fetch(new Request(new URL(`/downloads/${filename}`, request.url)));
  if (!res.ok || !res.body) return null;
  const headers = new Headers();
  headers.set(
    'Content-Type',
    contentType || res.headers.get('Content-Type') || 'application/octet-stream',
  );
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return new Response(res.body, { status: 200, headers });
}

// Anonymous A/B counters: first-party, aggregate only. Payload is
// {exp, variant, goal}, no IP storage, no fingerprint, hourly buckets.
// Mirrors scripts/promo/exp-beacon.mjs (kept in sync); counts feed
// promo/exp-report.md via GET /api/exp-report.
const expCounters = new Map();
const expHour = () => new Date().toISOString().slice(0, 13);
const EXP_GOALS = new Set([
  'view',
  'dl-click',
  'pricing-view',
  'trial-cta',
  'contact-submit',
  'issue-submit',
]);

function recordExpHit(exp, variant, goal) {
  exp = String(exp || '').slice(0, 40);
  variant = String(variant || '').slice(0, 8);
  goal = String(goal || '').slice(0, 24);
  if (!/^[a-z0-9-]+$/.test(exp) || !/^[ABC]$/.test(variant) || !EXP_GOALS.has(goal)) return false;
  // Hard cap. The previous sweep only removed keys from *other* hours, so an
  // attacker sending distinct `exp` values inside one hour grew the map without
  // limit, and /api/exp-report is unauthenticated, so its cost is charged on
  // every public GET. Reject once full rather than sweeping.
  if (expCounters.size >= 5000 && !expCounters.has(`${exp}:${variant}:${goal}`)) {
    return false;
  }
  const k = `${exp}:${variant}:${goal}:${expHour()}`;
  expCounters.set(k, (expCounters.get(k) || 0) + 1);
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

// ── Global outbound budget ──
//
// Every rate limit here is per-IP, which means the ceiling scales with the
// attacker's IP supply. With 2000 live IPs at 3 submissions/hour, an attacker
// can drive ~6000 GitHub API calls/hour against the single shared
// GITHUB_TOKEN (rated at 5000/hour) and exhaust it inside an hour, at which
// point /api/release and every download route start failing for REAL visitors.
//
// A per-IP limit does not protect a shared upstream quota. This does: one
// module-level hourly ceiling on outbound calls, checked before spending.
const OUTBOUND_MAX_PER_HOUR = 400;

let outboundSpent = 0;
let outboundHour = 0;

/** True when there is still room to make an upstream call this hour. */
function outboundBudgetAvailable() {
  const hour = Math.floor(Date.now() / 3_600_000);
  if (hour !== outboundHour) {
    outboundHour = hour;
    outboundSpent = 0;
  }
  return outboundSpent < OUTBOUND_MAX_PER_HOUR;
}

/** Record one upstream call. Call only after deciding to actually make it. */
function spendOutbound() {
  outboundSpent += 1;
}

// Anonymous download counts per OS + waitlist signups. Same discipline as
// exp counters: aggregates only, no IP storage. Served via /api/exp-report
// under the _totals key so launch day has one dashboard endpoint.
const dlCounters = new Map(); // key: dl:<os>:<hour> or waitlist:<hour>
function countDl(os) {
  const k = `dl:${os}:${expHour()}`;
  dlCounters.set(k, (dlCounters.get(k) || 0) + 1);
}
function countWaitlist() {
  const k = `waitlist:${expHour()}`;
  dlCounters.set(k, (dlCounters.get(k) || 0) + 1);
}
function totalsReport() {
  const downloads = {};
  let waitlist = 0;
  for (const [k, n] of dlCounters) {
    const parts = k.split(':');
    if (parts[0] === 'dl') downloads[parts[1]] = (downloads[parts[1]] || 0) + n;
    else if (parts[0] === 'waitlist') waitlist += n;
  }
  return { downloads, waitlist };
}

async function handleExpHit(request) {
  if (request.method !== 'POST')
    return Response.json({ error: 'method not allowed' }, { status: 405 });
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
  const recent = (issueHits.get(ip) || [])
    .filter((t) => now - t < windowMs)
    .concat([now])
    .slice(-10);
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
  const name = String(body.name || '')
    .replace(/[\r\n]/g, ' ')
    .trim()
    .slice(0, 100);
  const email = String(body.email || '')
    .trim()
    .slice(0, 200);
  const title = String(body.title || '')
    .replace(/[\r\n]/g, ' ')
    .trim()
    .slice(0, 120);
  const details = String(body.details || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, 3000);
  if (
    !name ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    title.length < 5 ||
    details.length < 10
  ) {
    return Response.json(
      { error: 'name, a valid email, a short summary, and details are required' },
      { status: 400 },
    );
  }
  if (!env.GITHUB_TOKEN) {
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }
  // Global budget BEFORE the per-IP check. Every limit here is per-IP, so the
  // ceiling scales with the attacker's IP supply: 2000 live IPs at 3/hour is
  // ~6000 GitHub calls/hour against a token rated 5000/hour, which exhausts the
  // shared quota inside an hour and breaks /api/release for every real visitor.
  // 503 says "try later" honestly; a 429 would keep inviting more attempts.
  if (!outboundBudgetAvailable()) {
    return Response.json({ error: 'service busy, try again later' }, { status: 503 });
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
  // One submission can cost TWO upstream calls (the 422 unlabeled retry), so
  // budget for both rather than discovering the second one mid-flight.
  spendOutbound();
  spendOutbound();
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

// Trial build attestation lives at /try/build.json: version + sha256 per
// file. No source is published; hashes let anyone verify the bytes served.
//
// CSP notes (read before tightening):
// - connect-src 'none' is the exfiltration guard: no page or worker fetch
//   can reach any server, so business data cannot leave the browser.
// - script-src keeps 'unsafe-inline' for our own build-time inline theme
//   bootstrap (view-source it: no network calls). Third-party scripts still
//   cannot load (default-src/script-src 'self'), and even an injected inline
//   script could not send data anywhere (connect-src 'none', form-action
//   'none'). Removing 'unsafe-inline' would break the theme pre-paint with
//   zero privacy gain.
const TRIAL_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'none'",
  "media-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function isTrialPath(pathname) {
  return pathname === '/try' || pathname.startsWith('/try/');
}

// Constant-time string compare for bearer tokens. Length is compared first,
// which leaks length, acceptable here because the compared value is a header
// the caller already controls.
function safeEqual(a, b) {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ba.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < ba.length; i++) out |= ba[i] ^ bb[i];
  return out === 0;
}

// Marketing, legal, and promo pages. They hold no user data, but they still
// load script and post forms, so they get a real policy instead of nothing.
//
// Why this can be stricter than the trial on script-src: every executable
// script in these pages is a same-origin file (app.js, ab-activator.js,
// launch-*.js). The only inline <script> blocks are application/ld+json and
// application/json data, which CSP does not treat as scripts. The trial needs
// 'unsafe-inline' only because its theme pre-paint bootstrap is inline.
// 'unsafe-inline' for style-src is required, the pages set CSS custom
// properties through ~30 inline style attributes for animation staggering.
const LANDING_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.bunny.net",
  "font-src 'self' https://fonts.bunny.net",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

// Only HTML carries a CSP: applying it to CSS/JS/image responses is noise.
function landingResponse(res) {
  const type = res.headers.get('Content-Type') || '';
  if (!type.includes('text/html')) return res;
  const headers = new Headers(res.headers);
  headers.set('Content-Security-Policy', LANDING_CSP);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return new Response(res.body, { status: res.status, headers });
}

function trialResponse(res) {
  const headers = new Headers(res.headers);
  headers.set('Content-Security-Policy', TRIAL_CSP);
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return new Response(res.body, { status: res.status, headers });
}

async function handleTrial(request, env) {
  const url = new URL(request.url);
  // No data collection surface: the trial never POSTs, so reject writes.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return Response.json({ error: 'trial is read-only static' }, { status: 405 });
  }
  // The service worker script must NOT carry the page CSP: a worker's own
  // fetch() calls are checked against the CSP delivered with the worker
  // script, so connect-src 'none' would neuter offline caching entirely
  // (install fails, every navigation falls through to an empty cache).
  // Page responses below keep the full policy; the exfiltration guarantee
  // lives there, not in the SW script response.
  if (url.pathname === '/try/trial-sw.js') {
    const res = await env.ASSETS.fetch(request);
    const headers = new Headers(res.headers);
    headers.set('Content-Type', 'application/javascript');
    headers.set('Service-Worker-Allowed', '/try/');
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    return new Response(res.body, { status: res.status, headers });
  }
  // SPA fallback: /try and /try/<route> serve the trial shell.
  // File paths with an extension serve directly; build.json is public proof.
  const hasExt = /\/[^/]+\.[a-z0-9]+$/i.test(url.pathname);
  if (url.pathname === '/try' || url.pathname === '/try/') {
    const res = await env.ASSETS.fetch(new Request(new URL('/try/index.html', request.url)));
    return trialResponse(res);
  }
  if (!hasExt) {
    const res = await env.ASSETS.fetch(new Request(new URL('/try/index.html', request.url)));
    if (res.ok) return trialResponse(res);
  }
  const res = await env.ASSETS.fetch(request);
  if (!res.ok && !hasExt) {
    const fallback = await env.ASSETS.fetch(new Request(new URL('/try/index.html', request.url)));
    if (fallback.ok) return trialResponse(fallback);
  }
  return trialResponse(res);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Never serve the worker's own source or deploy config, even if the
    // assets upload includes them. Without this, /_worker.js (all API logic
    // and route structure) is a public static file.
    if (
      url.pathname === '/_worker.js' ||
      url.pathname === '/wrangler.jsonc' ||
      url.pathname === '/wrangler.toml'
    ) {
      return Response.json({ error: 'not found' }, { status: 404 });
    }

    if (isTrialPath(url.pathname)) {
      return handleTrial(request, env);
    }

    if (url.pathname === '/api/updates/latest.json') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return Response.json({ error: 'method not allowed' }, { status: 405 });
      }
      return handleUpdatesLatest(request, env);
    }

    if (url.pathname.startsWith('/api/updates/download-local/')) {
      // Temporary local-release override: only the exact bundle named in the
      // checked-in manifest is servable.
      const filename = safeDecodeName(
        url.pathname.slice('/api/updates/download-local/'.length).split('/')[0] || '',
      );
      const manifest = await getLocalManifest(request, env);
      if (filename === null || !manifest?.mac?.bundle || filename !== manifest.mac.bundle) {
        return Response.json({ error: 'asset not found' }, { status: 404 });
      }
      const local = await serveLocalFile(request, env, filename, 'application/gzip');
      if (!local) return Response.json({ error: 'asset not found' }, { status: 404 });
      return local;
    }

    if (url.pathname.startsWith('/api/updates/download/')) {
      const raw = url.pathname.slice('/api/updates/download/'.length).split('/')[0];
      // Same allowlist as download-local: never proxy an arbitrary string.
      const filename = safeDecodeName(raw);
      if (filename === null) {
        return Response.json({ error: 'bad request' }, { status: 400 });
      }
      return handleUpdatesDownload(filename, env);
    }

    if (url.pathname === '/api/issues') {
      return handleCreateIssue(request, env);
    }

    if (url.pathname === '/api/exp-hit') {
      return handleExpHit(request);
    }

    if (url.pathname === '/api/exp-report') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return Response.json({ error: 'method not allowed' }, { status: 405 });
      }
      // The A/B breakdown and per-OS download counts are launch metrics, a
      // competitor reading them free costs conversion rate and privacy noise.
      // Gate the detail behind REPORT_TOKEN when it is set; when it is not, serve
      // the totals only rather than publishing the experiment board by default.
      const authed =
        env.REPORT_TOKEN &&
        safeEqual(request.headers.get('Authorization') || '', `Bearer ${env.REPORT_TOKEN}`);
      const body = authed
        ? { ...expReport(), _totals: totalsReport() }
        : { _totals: totalsReport() };
      return Response.json(body, {
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
          if (local) {
            countDl(os);
            return local;
          }
        }
      }
      const res = await handleDownload(os, env);
      if (res.ok) countDl(os);
      return res;
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
      const email = String(body.email || '')
        .trim()
        .slice(0, 200);
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
        countWaitlist();
        // Confirmation to the subscriber: best-effort, never fails the signup.
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: env.CONTACT_FROM || 'Lance waitlist <onboarding@resend.dev>',
              to: [email],
              subject: "You're on the Lance v2 list",
              text: `You're on the list, one email when Lance v2 (local, on-device AI drafting) ships. Nothing else, ever.\n\nDidn't sign up? Ignore this email.\nWant off the list anytime? Reply "forget me".\n\n, Lance (your business data stays on your device)`,
            }),
          });
        } catch {
          /* confirmation is best-effort */
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
      // Strip control characters: `name` flows into an outbound Subject and a
      // Reply-To name-addr pair, so a CRLF in it is header injection into mail
      // we send. `email` is regex-validated below and cannot carry CR/LF.
      const name = String(body.name || '')
        .replace(/[\r\n<>"]/g, ' ')
        .trim()
        .slice(0, 100);
      const email = String(body.email || '')
        .trim()
        .slice(0, 200);
      const message = String(body.message || '')
        .replace(/\r\n/g, '\n')
        .trim()
        .slice(0, 2000);
      // Honeypot: bots fill it, humans never see it.
      if (body.company_hp) return Response.json({ ok: true });
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
        return Response.json(
          { error: 'name, a valid email, and a message are required' },
          { status: 400 },
        );
      }
      // Rate limit: this route sends outbound email, so without a cap it is
      // a free mail relay for whoever finds the form first.
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
      '/templates': '/templates/index.html',
    };
    if (STATIC_PAGES[url.pathname]) {
      const res = await env.ASSETS.fetch(
        new Request(new URL(STATIC_PAGES[url.pathname], request.url)),
      );
      return landingResponse(res);
    }

    // Promo SEO pages: /craft/<id>, /alternatives/<slug>, /use/<slug> resolve
    // to their static .html files (generated by scripts/promo/build.mjs).
    const SEO_DIR = /^\/(craft|alternatives|use|tools|rates|templates)\/[^/.]+$/;
    if (SEO_DIR.test(url.pathname)) {
      const res = await env.ASSETS.fetch(new Request(new URL(url.pathname + '.html', request.url)));
      return landingResponse(res);
    }

    // Everything else (static assets, /, and any page not listed above).
    return landingResponse(await env.ASSETS.fetch(request));
  },
};
