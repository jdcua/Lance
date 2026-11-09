import { chromium } from 'playwright';
import fs from 'node:fs';
console.log('start');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const entries = Object.entries(JSON.parse(fs.readFileSync('scripts/qa/fixtures/seeded.json','utf8')));
await ctx.addInitScript(([pairs]) => {
  for (const [k,v] of pairs) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
}, [entries]);
const page = await ctx.newPage();
console.log('page created');
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
console.log('goto done', page.url());
await browser.close();
console.log('closed');
