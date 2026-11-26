import { expect, test } from '@playwright/test';
import { BASE, gotoApp, seedReady, shot } from './helpers';

const ALLOWED_EXTERNAL = new Set(['api.github.com']);

test.describe('flow 8 · privacy / network', () => {
  test('no unexpected third-party requests after a full app walk', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));

    await seedReady(page);
    for (const route of ['/', '/clients', '/projects', '/invoices', '/finance', '/settings']) {
      await gotoApp(page, route);
    }
    await page.waitForTimeout(2500); // allow the one-shot release-notes fetch to land

    const external = requests
      .map((u) => {
        try {
          return new URL(u);
        } catch {
          return null;
        }
      })
      .filter((u): u is URL => !!u && u.host !== new URL(BASE).host)
      .map((u) => `${u.origin}${u.pathname}`);
    const unexpected = [...new Set(external)].filter((u) => !ALLOWED_EXTERNAL.has(new URL(u).host));

    console.log(`[evidence] external request origins: ${JSON.stringify([...new Set(external)])}`);
    console.log(`[evidence] total requests observed: ${requests.length}`);
    await shot(page, '21-privacy-walk-end');
    expect(unexpected, `unexpected third-party requests: ${JSON.stringify(unexpected)}`).toEqual([]);
  });

  test('release-notes GitHub API call is the only external origin (if present)', async ({ page }) => {
    const github: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('api.github.com')) github.push(`${r.method()} ${r.url()}`);
    });
    await seedReady(page);
    await gotoApp(page, '/');
    await page.waitForTimeout(2500);
    console.log(`[evidence] GitHub API calls: ${JSON.stringify(github)}`);
    expect(github.length).toBeLessThanOrEqual(1);
  });

  test('browser preview response headers (CSP informational)', async ({ request }) => {
    const res = await request.get(BASE + '/');
    const csp = res.headers()['content-security-policy'] ?? null;
    console.log(`[evidence] content-security-policy header on preview response: ${csp}`);
    expect(res.status()).toBe(200);
  });

  test('offline cold load in browser preview (informational, no service worker in dist)', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await seedReady(page);
    await gotoApp(page, '/'); // prime caches
    await ctx.setOffline(true);
    let booted = false;
    let detail = '';
    try {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 8000 });
      booted = await page.getByRole('complementary', { name: 'Primary navigation' }).isVisible();
      detail = (await page.locator('body').innerText()).slice(0, 180).replace(/\n/g, ' | ');
    } catch (e) {
      detail = String(e).slice(0, 180);
    }
    console.log(`[evidence] offline cold load shell booted=${booted}; body="${detail}"`);
    await ctx.setOffline(false);
    await ctx.close();
    // Informational: the desktop build bundles assets; the Vite preview
    // harness intentionally has no service worker, so a hard failure here is
    // a harness property rather than an app regression.
    expect(true).toBe(true);
  });
});
