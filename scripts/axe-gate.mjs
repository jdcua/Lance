/**
 * Axe regression gate — locks in the zero-violation state.
 *
 * Spins up vite, onboards a seeded profile, and runs full axe-core rules
 * across dense routes × all 7 themes × light/dark. Exits non-zero on any
 * violation, with targets for fast triage.
 *
 * Lessons baked in (Waves 4–6):
 * - Default-theme-only is insufficient: tertiaries, accent-ink, and lens/
 *   terminal palette bugs only showed per-theme. All 7 themes run here.
 * - Dark mode once silently never applied (inline light vars beat the .dark
 *   stylesheet block). The dark leg asserts the palette itself, not just
 *   the .dark class — a stale dev server fails loudly instead of passing.
 * - `select-name` phantoms: very long sessions intermittently flag a
 *   `select` on select-less routes; never reproduced in isolation (3+
 *   attempts). Select-name-only failures get one re-run before failing.
 *
 * Usage: npm run test:axe  (needs playwright browsers installed)
 */
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import net from 'node:net';

const ROUTES = ['/', '/finance', '/invoices', '/clients', '/proposals', '/settings', '/time', '/follow-ups'];
const THEMES = ['default', 'studio', 'terminal', 'craft', 'motion', 'lens', 'scale'];
const DARK_ROUTES = ['/', '/finance', '/settings'];

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, () => {
      const addr = s.address();
      const port = typeof addr === 'object' && addr ? addr.port : 5230;
      s.close(() => resolve(port));
    });
  });
}

async function dismiss(page) {
  for (const t of ['Explore on my own', 'Continue free']) {
    const el = page.getByText(t, { exact: false });
    if (await el.count()) {
      try { await el.first().click({ timeout: 1500 }); await page.waitForTimeout(300); } catch { /* gone */ }
    }
  }
}

async function onboard(page, base) {
  await page.goto(base + '/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(4000);
  const card = page.locator('button', { hasText: 'Developer / Engineer' });
  if (await card.count()) { await card.first().click(); await page.waitForTimeout(400); }
  const cont = page.locator('button', { hasText: 'Continue' });
  if (await cont.count()) {
    try { if (await cont.first().isEnabled({ timeout: 3000 })) { await cont.first().click(); await page.waitForTimeout(1000); } } catch { /* no-op */ }
  }
  const nm = page.locator('input[placeholder*="name" i], input[name="name"]').first();
  if (await nm.count()) { await nm.fill('Axe Gate'); await page.waitForTimeout(300); }
  for (let i = 0; i < 5; i++) {
    const c = page.locator('button', { hasText: 'Continue' });
    if (!(await c.count())) break;
    try { if (await c.first().isEnabled({ timeout: 2000 })) { await c.first().click(); await page.waitForTimeout(1000); } } catch { break; }
  }
  const seed = page.getByText('Yes, show me around');
  if (await seed.count()) { await seed.first().click(); await page.waitForTimeout(4500); }
  await dismiss(page);
}

async function main() {
  const axeSrc = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
  const port = await freePort();
  const base = `http://localhost:${port}`;
  const vite = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 9000));

  const browser = await chromium.launch();
  const failures = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
    await onboard(page, base);

    // Gate: verify the served tree, so a stale dev server fails loudly.
    // (btn-accent only renders on a few routes — check where it lives.)
    await page.goto(base + '/proposals', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);
    const fresh = await page.evaluate(() => document.body.innerHTML.includes('btn-accent'));
    if (!fresh) throw new Error('stale code served — aborting gate');

    const collect = (res, prefix) => {
      const out = [];
      for (const v of res.violations) {
        out.push(
          `${prefix} [${v.id}] ` +
          v.nodes.map((n) => n.target.join(' ')).join(' | ').slice(0, 160),
        );
      }
      return out;
    };

    const audit = async (theme, route, dark) => {
      await page.evaluate((t) => localStorage.setItem('lance:theme', t), theme);
      await page.goto(base + route, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2200);
      await dismiss(page);
      await page.evaluate(axeSrc);
      let res = await page.evaluate(async () => await axe.run(document));
      let found = collect(res, `${dark ? 'dark' : 'light'}/${theme} ${route}`);
      // Phantom handling: select-name-only failures get one re-run; the
      // phantom never survives a second pass, real findings do.
      if (found.length > 0 && res.violations.every((v) => v.id === 'select-name')) {
        await page.waitForTimeout(1000);
        await page.evaluate(axeSrc);
        res = await page.evaluate(async () => await axe.run(document));
        found = collect(res, `${dark ? 'dark' : 'light'}/${theme} ${route}`);
      }
      return found;
    };

    for (const theme of THEMES) {
      for (const route of ROUTES) {
        failures.push(...await audit(theme, route, false));
      }
    }

    // Dark mode across all themes (profile-driven, the way Settings
    // enables it). Asserts the palette applied — not just the class.
    await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem('lance:profile') || '{}');
      p.theme = 'dark';
      localStorage.setItem('lance:profile', JSON.stringify(p));
    });
    for (const theme of THEMES) {
      for (const route of DARK_ROUTES) {
        failures.push(...await audit(theme, route, true));
      }
      const applied = await page.evaluate(() => ({
        dark: document.documentElement.classList.contains('dark'),
        card: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim(),
      }));
      if (!applied.dark || applied.card === '#FFFFFF') {
        throw new Error(`dark palette did not apply for ${theme} — aborting gate`);
      }
    }

    if (errs.length) console.log('pageerrors: ' + [...new Set(errs)].slice(0, 5).join(' ;; '));
  } finally {
    await browser.close();
    vite.kill();
  }

  if (failures.length) {
    console.log(`AXE GATE FAILED — ${failures.length} violation(s):`);
    for (const f of failures) console.log('  ' + f);
    process.exit(1);
  }
  console.log('AXE GATE PASSED — zero violations.');
}

main().catch((e) => {
  console.error('gate error: ' + (e.message || e).toString().slice(0, 200));
  process.exit(2);
});
