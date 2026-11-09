import { chromium } from 'playwright';
console.log('start');
const browser = await chromium.launch({ headless: true });
console.log('launched');
const page = await browser.newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
console.log('goto done', page.url());
await browser.close();
console.log('closed');
