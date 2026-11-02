import { chromium } from 'playwright';
const base = 'https://pay.paddle.io/hsc_01m46xt5dtzt7d9t2e6yrwhbk9_qk6fah69w3gfjs69q5qdm72jqnzbq0fc';
const monthly = 'pri_01m242fjng66ktsykbdcf90aqg';
const yearly = 'pri_01m242fjyp4msa968w4a26e684';
const lifetime = 'pri_01m242fkeweq5ca4vwhvxm0wqs';
const browser = await chromium.launch({ headless: true });
for (const [label, url] of [
  ['no-param', base],
  ['monthly', `${base}?price_id=${monthly}`],
  ['yearly', `${base}?price_id=${yearly}`],
  ['lifetime', `${base}?price_id=${lifetime}`],
]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(4000);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1200);
    console.log(`\n=== ${label} ===`);
    console.log('URL:', page.url());
    console.log('TEXT:', text);
    if (errors.length) console.log('ERRORS:', errors.slice(0, 5).join(' | '));
    await page.screenshot({ path: `/private/var/folders/2c/8y09b4_52cn_5ghnltr2fjzh0000gn/T/opencode/checkout-${label}.png`, fullPage: false });
  } catch (e) {
    console.log(`\n=== ${label} FAILED ===`, e.message);
  }
  await page.close();
}
await browser.close();
