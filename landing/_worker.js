export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/release') {
      const GITHUB_TOKEN = env.GITHUB_TOKEN;
      if (!GITHUB_TOKEN) {
        return Response.json({ error: 'server misconfigured' }, { status: 500 });
      }

      try {
        const res = await fetch('https://api.github.com/repos/jdcua/Lance/releases/latest', {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Lance-Landing',
          },
        });
        const body = await res.text();
        return new Response(body, {
          status: res.status,
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
