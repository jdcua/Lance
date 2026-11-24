/**
 * Axe regression gate — locks in the zero-violation state.
 *
 * Spins up vite, onboards a seeded profile, and runs full axe-core rules
 * on the densest routes (default theme) plus a dark-mode spot check.
 * Exits non-zero on any violation, with targets for fast triage.
 *
 * Usage: npm run test:axe  (needs playwright browsers installed)
 */
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import net from 'node:net';

const ROUTES = ['/', '/finance', '/invoices', '/clients', '/proposals', '/settings', '/time', '/follow-ups'];
const DARK_SPOTS = [['studio', '/finance'], ['terminal', '/']];

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
  // 5-step flow: Comfort first (Continue), then the craft grid.
  const comfort = page.getByText('Make yourself comfortable');
  if (await comfort.count()) {
    const c0 = page.locator('button', { hasText: 'Continue' });
    if (await c0.count()) {
      try { if (await c0.first().isEnabled({ timeout: 3000 })) { await c0.first().click(); await page.waitForTimeout(800); } } catch { /* no-op */ }
    }
  }
  const card = page.locator('button', { hasText: 'Developer / Engineer' });
  if (await card.count()) { await card.first().click(); await page.waitForTimeout(400); }
  const cont = page.locator('button', { hasText: 'Continue' });
  if (await cont.count()) {
    try { if (await cont.first().isEnabled({ timeout: 3000 })) { await cont.first().click(); await page.waitForTimeout(1000); } } catch { /* no-op */ }
  }
  const nm = page.locator('input[placeholder*="name" i], input[name="name"]').first();
  if (await nm.count()) { await nm.fill('Axe Gate'); await page.waitForTimeout(300); }
  const em = page.locator('input[type="email"], input[placeholder*="email" i]').first();
  if (await em.count()) { await em.fill('axe@example.com'); await page.waitForTimeout(300); }
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
    // (Marker must render unconditionally: btn-accent only appears with an
    // accepted proposal, so seeded runs without one aborted here forever.)
    await page.goto(base + '/proposals', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);
    const fresh = await page.evaluate(() => document.body.innerHTML.includes('New Proposal'));
    if (!fresh) throw new Error('stale code served — aborting gate');

    for (const route of ROUTES) {
      await page.goto(base + route, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2200);
      await dismiss(page);
      await page.evaluate(axeSrc);
      const res = await page.evaluate(async () => await axe.run(document));
      for (const v of res.violations) {
        failures.push(
          `default ${route} [${v.id}] ` +
          v.nodes.map((n) => n.target.join(' ')).join(' | ').slice(0, 160),
        );
      }
    }

    // Dark-mode spot check (profile-driven, the way Settings enables it).
    await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem('lance:profile') || '{}');
      p.theme = 'dark';
      localStorage.setItem('lance:profile', JSON.stringify(p));
    });
    for (const [theme, route] of DARK_SPOTS) {
      await page.evaluate((t) => localStorage.setItem('lance:theme', t), theme);
      await page.goto(base + route, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2200);
      await dismiss(page);
      const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      if (!dark) throw new Error(`dark mode did not apply for ${theme} ${route}`);
      await page.evaluate(axeSrc);
      const res = await page.evaluate(async () => await axe.run(document));
      for (const v of res.violations) {
        failures.push(
          `dark/${theme} ${route} [${v.id}] ` +
          v.nodes.map((n) => n.target.join(' ')).join(' | ').slice(0, 160),
        );
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
