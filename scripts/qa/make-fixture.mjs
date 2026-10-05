/**
 * Build the localStorage fixtures the QA swarm starts from.
 *
 * "fresh"  = brand-new user, onboarding NOT completed (first-run QA).
 * "seeded" = completed onboarding with sample data (every screen populated).
 *
 * Regenerate after schema/seed changes:  node scripts/qa/make-fixture.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, 'fixtures');
const BASE = process.env.QA_BASE || 'http://localhost:1420';

fs.mkdirSync(OUT, { recursive: true });

function dump(page) {
  return page.evaluate(() => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      o[k] = localStorage.getItem(k);
    }
    return o;
  });
}

async function runOnboarding(page, { sampleData }) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#main-content', { timeout: 25000 });
  await page.waitForTimeout(900);

  const cont = () => page.getByRole('button', { name: /Continue/ }).first();

  // Step 1 — Comfort
  if (await cont().isVisible().catch(() => false)) await cont().click();
  await page.waitForTimeout(300);

  // Step 2 — Your craft
  const craft = page.getByRole('button', { name: 'Designer' }).first();
  if (await craft.isVisible().catch(() => false)) await craft.click();
  if (await cont().isVisible().catch(() => false)) await cont().click();
  await page.waitForTimeout(300);

  // Step 3 — Your profile
  const name = page.getByPlaceholder('Your full name');
  if (await name.isVisible().catch(() => false)) await name.fill('QA Tester');
  if (await cont().isVisible().catch(() => false)) await cont().click();
  await page.waitForTimeout(300);

  // Step 4 — Your theme
  if (await cont().isVisible().catch(() => false)) await cont().click();
  await page.waitForTimeout(300);

  // Step 5 — Rates & sample data
  const yes = page.getByRole('button', { name: /Yes, show me around/ });
  const skip = page.getByRole('button', { name: /Skip .* start fresh/ });
  if (sampleData && (await yes.isVisible().catch(() => false))) await yes.click();
  else if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.waitForTimeout(2500);

  // Close the tour / spotlight if it opened.
  const esc = page.keyboard;
  await esc.press('Escape');
  await page.waitForTimeout(500);
  await esc.press('Escape');
  await page.waitForTimeout(500);
}

const browser = await chromium.launch({ headless: true });

for (const [name, sampleData] of [
  ['seeded', true],
  ['fresh', false],
]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('localStorage persistence')) errs.push(m.text().slice(0, 200));
  });

  await runOnboarding(page, { sampleData });
  const data = await dump(page);

  if (name === 'fresh') {
    // Strip the completion flags so the next load runs onboarding again, and
    // drop every entity row so first-run QA starts from a genuinely empty app
    // (templates re-seed themselves in-app, which is real behaviour).
    for (const k of Object.keys(data)) {
      if (k === 'lance:onboarding-completed' || k === 'lance:tour-pending') delete data[k];
      if (k === 'lance:onboarding-step' && data[k] === 'complete') delete data[k];
      if (k.startsWith('lance:store:') && k !== 'lance:store:project_templates' &&
          k !== 'lance:store:contract_templates' && k !== 'lance:store:export_templates' &&
          k !== 'lance:store:project_template_milestones') delete data[k];
      if (k === 'lance:profile') delete data[k];
    }
  }

  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(data, null, 1));
  const counts = Object.entries(data)
    .filter(([k]) => k.startsWith('lance:store:'))
    .map(([k, v]) => {
      try {
        const p = JSON.parse(v);
        return `${k.replace('lance:store:', '')}=${Array.isArray(p) ? p.length : Object.keys(p).length}`;
      } catch {
        return `${k}=?`;
      }
    });
  console.log(`\n[${name}] ${Object.keys(data).length} keys, pageerrors=${errs.length}`);
  console.log('  ' + counts.join(' '));
  if (errs.length) console.log('  ERRORS: ' + errs.join(' | '));
  await ctx.close();
}

await browser.close();
console.log('\nfixtures written to ' + OUT);
