import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.QA_BASE || 'http://localhost:4173';
const SHOT = '/Users/juandiegocua/Projects/Developer/Lance/qa-shots/swarm';
fs.mkdirSync(SHOT, { recursive: true });
let n = 0;
async function shot(page, name) {
  n++;
  const file = path.join(SHOT, `04-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('SHOT', file);
  return file;
}
function loadFixture(name='seeded') {
  return JSON.parse(fs.readFileSync(`/Users/juandiegocua/Projects/Developer/Lance/scripts/qa/fixtures/${name}.json`,'utf8'));
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const entries = Object.entries(loadFixture('seeded'));
await ctx.addInitScript(([pairs]) => {
  for (const [k,v] of pairs) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
}, [entries]);
const page = await ctx.newPage();

const errors=[]; const failed=[];
page.on('console', m=>{ const t=m.text(); if(t.includes('[vite]')||t.includes('using localStorage persistence')||t.includes('Download the React DevTools')) return; if(m.type()==='error') errors.push(t); });
page.on('pageerror', e=>errors.push('PAGEERROR: '+String(e)));
page.on('requestfailed', r=>failed.push('REQFAIL '+r.url()+' '+ (r.failure()?.errorText||'')));
page.on('response', r=>{ if(r.status()>=400) failed.push('HTTP'+r.status()+' '+r.url()); });

await page.goto(BASE+'/', {waitUntil:'domcontentloaded'});
await page.waitForTimeout(1200);
await shot(page,'home-initial');

// dismiss overlays
for (let i=0;i<6;i++){
  const btn = page.locator('[role="dialog"] button[aria-label="Close dialog"]').first();
  if (await btn.isVisible().catch(()=>false)){ await btn.click().catch(()=>{}); await page.waitForTimeout(250);}
  else break;
}
await page.waitForTimeout(500);
await shot(page,'home');

// store dump
const dump = await page.evaluate(()=>{ const out={}; for(const k of Object.keys(localStorage)){const v=localStorage.getItem(k); try{const p=JSON.parse(v); out[k]=Array.isArray(p)?p.length:(typeof p==='object'&&p?Object.keys(p).length:p);}catch{out[k]=v?.slice(0,40);}} return out;});
console.log('STORE', JSON.stringify(dump));

console.log('ERRORS', errors.length, errors.slice(0,20));
console.log('FAILED', failed.length, failed.slice(0,20));

await browser.close();
