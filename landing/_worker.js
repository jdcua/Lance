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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/download/')) {
      const os = url.pathname.slice('/api/download/'.length).split('/')[0];
      return handleDownload(os, env);
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

    return env.ASSETS.fetch(request);
  },
};
