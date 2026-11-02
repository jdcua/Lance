import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => {
  localStorage.setItem('lance:onboarding-completed', 'true');
  localStorage.setItem('lance:onboarding-step', 'complete');
  localStorage.setItem('lance:trial-reset-v1', 'done');
  localStorage.setItem('lance:profile', JSON.stringify({
    currency: 'USD', name: 'Test', license_key: 'LANCE-4MBJ-GSRA-DG7W-CCQ8', license_tier: 'lifetime',
  }));
  window.__opened = [];
  window.open = (url) => { window.__opened.push(String(url)); return null; };
});
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:1420/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
async function openModal() {
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('lance:open-upgrade', { detail: 'test' })));
  await page.waitForTimeout(500);
  return page.getByRole('dialog', { name: 'Unlock Pro depth' });
}
async function clickText(dialog, text) {
  await page.evaluate(() => { window.__opened = []; });
  const btn = dialog.locator('button').filter({ hasText: text }).first();
  const n = await btn.count();
  if (!n) { console.log('NO BUTTON', text); return; }
  await btn.click();
  await page.waitForTimeout(250);
  const still = await dialog.isVisible().catch(() => false);
  if (still) await btn.click().catch(() => {});
  await page.waitForTimeout(1800);
  const urls = await page.evaluate(() => window.__opened);
  console.log(`${text} ->`, JSON.stringify(urls));
}
let dialog = await openModal();
await clickText(dialog, 'Start 30-day free trial');
dialog = await openModal();
{
  await page.evaluate(() => { window.__opened = []; });
  const btns = dialog.locator('button').filter({ hasText: 'Start 30-day free trial' });
  await btns.nth(1).click(); await page.waitForTimeout(250);
  await btns.nth(1).click().catch(()=>{}); await page.waitForTimeout(1800);
  console.log('monthly ->', JSON.stringify(await page.evaluate(() => window.__opened)));
}
dialog = await openModal();
await clickText(dialog, 'Buy lifetime license');
console.log('ERRORS:', errors.slice(0, 10));
await browser.close();
