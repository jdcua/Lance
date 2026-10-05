/**
 * Isolate the console error(s) the sweep found on /settings.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.QA_BASE || 'http://localhost:4173';
const FIXTURE = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/seeded.json'), 'utf8'));

const browser = await chromium.launch({ headless: true });
for (const route of process.argv.slice(2).length ? process.argv.slice(2) : ['/settings']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(
    ([pairs]) => {
      for (const [k, v] of pairs) localStorage.setItem(k, String(v));
    },
    [Object.entries({ ...FIXTURE, 'lance:theme-mode': '"dark"' })],
  );
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() !== 'error') return;
    if (t.includes('localStorage persistence') || t.includes('[vite]')) return;
    errs.push(t);
  });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).split('\n').slice(0, 4).join(' | ')));
  page.on('response', (r) => {
    if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`);
  });
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#main-content');
  await page.waitForTimeout(2500);
  console.log(`\n### ${route}: ${errs.length} problems`);
  for (const e of [...new Set(errs)]) console.log('  •', e.slice(0, 400));
  await page.screenshot({
    path: path.resolve(__dirname, `../../qa-shots/sweep/err${route.replace(/\//g, '_')}.png`),
  });
  await ctx.close();
}
await browser.close();
