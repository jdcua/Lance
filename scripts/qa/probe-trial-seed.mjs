/**
 * Replicate qa-trial.spec.ts "seeded business appears after skipping
 * onboarding" exactly: skip → /clients → /invoices, and report where the
 * invoice numbers stop being visible.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:1420';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('localStorage persistence')) errs.push(m.text().slice(0, 160));
});
page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 160)));

await page.goto(BASE + '/?trial=1');
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});
await page.goto(BASE + '/?trial=1');
await page.waitForSelector('#main-content');
await page.waitForTimeout(1200);

const skip = page.getByRole('button', { name: 'Skip setup' });
if ((await skip.count()) > 0) await skip.click();

const countInvoices = () =>
  page.evaluate(() => {
    const v = JSON.parse(localStorage.getItem('lance:store:invoices') || 'null');
    return Array.isArray(v) ? v.length : v;
  });

await page.goto(BASE + '/clients?trial=1');
await page.waitForTimeout(2500);
const clientsTxt = await page.locator('main').innerText();
console.log('clients seeded & visible:', clientsTxt.includes('Jordan Avery'));
console.log('invoices in store after /clients:', await countInvoices());

await page.goto(BASE + '/invoices?trial=1');
await page.waitForTimeout(3000);
console.log('invoices in store on /invoices:', await countInvoices());
const txt = await page.locator('main').innerText();
console.log('INV-00 visible:', /INV-00/.test(txt));
console.log('shows empty state:', txt.includes('No invoices yet'));
console.log('page head:', JSON.stringify(txt.slice(0, 180)));

// Does the Playwright locator the spec uses resolve?
console.log('getByText(/INV-00/).count():', await page.getByText(/INV-00/).count());
if (errs.length) console.log('console errors:', [...new Set(errs)].slice(0, 4));

await browser.close();

// Is the FIRST match actually visible? The invoices list may render a desktop
// table and a mobile card layout, in which case .first() lands on the hidden one.
{
  const b2 = await chromium.launch();
  const c2 = await b2.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await c2.newPage();
  await p2.goto(BASE + '/?trial=1');
  await p2.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await p2.goto(BASE + '/invoices?trial=1');
  await p2.waitForSelector('#main-content');
  await p2.waitForTimeout(4000);
  const n = await p2.getByText(/INV-00/).count();
  const vis = [];
  for (let i = 0; i < n; i++) vis.push(await p2.getByText(/INV-00/).nth(i).isVisible());
  console.log(`\nINV-00 matches: ${n} · visible flags: ${JSON.stringify(vis)}`);
  await b2.close();
}
