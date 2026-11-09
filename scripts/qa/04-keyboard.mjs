import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.QA_BASE || 'http://localhost:4173';
const SHOT = '/Users/juandiegocua/Projects/Developer/Lance/qa-shots/swarm';
fs.mkdirSync(SHOT, { recursive: true });
let n = 0;
async function shot(page, name) {
  const file = path.join(SHOT, `04-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('SHOT', path.basename(file));
  return file;
}
function loadFixture(name='seeded') {
  return JSON.parse(fs.readFileSync(`/Users/juandiegocua/Projects/Developer/Lance/scripts/qa/fixtures/${name}.json`,'utf8'));
}

const routes = ['/settings'];
const findings = { routes: {}, console: [], failed: [], interactions: {} };

console.log('LAUNCHING');
const browser = await chromium.launch({ headless: true });
console.log('LAUNCHED');
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const entries = Object.entries(loadFixture('seeded'));
await ctx.addInitScript(([pairs]) => {
  for (const [k,v] of pairs) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
}, [entries]);
const page = await ctx.newPage();

const errors=[]; const failed=[];
const seenErr=new Set();
page.on('console', m=>{ const t=m.text(); if(t.includes('[vite]')||t.includes('using localStorage persistence')||t.includes('Download the React DevTools')) return; if(m.type()==='error'){const l='[console.error] '+t; if(!seenErr.has(l)){seenErr.add(l);errors.push(l);}}});
page.on('pageerror', e=>{const l='[pageerror] '+String(e); if(!seenErr.has(l)){seenErr.add(l);errors.push(l);}});
page.on('requestfailed', r=>failed.push('REQFAIL '+r.url()+' '+(r.failure()?.errorText||'')));
page.on('response', r=>{ if(r.status()>=400) failed.push('HTTP'+r.status()+' '+r.url()); });

async function dismiss() {
  for (let i=0;i<8;i++){
    const btn = page.locator('[role="dialog"] button[aria-label="Close dialog"]').first();
    if (await btn.isVisible().catch(()=>false)){ await btn.click().catch(()=>{}); await page.waitForTimeout(200);}
    else break;
  }
}

// Route walk
for (const r of routes) {
  await page.goto(BASE+r, {waitUntil:'domcontentloaded'});
  await page.waitForTimeout(900);
  await dismiss();
  await page.waitForTimeout(200);
  const title = await page.title();
  const h1 = await page.locator('h1,h2').first().textContent().catch(()=>null);
  const mainText = await page.locator('#main-content').innerText().catch(()=>null);
  const marker = (mainText||'').slice(0,120).replace(/\s+/g,' ');
  findings.routes[r] = { title, h1, marker, errors: [...errors], failed: [...failed] };
  await shot(page, `route-${r.replace(/\//g,'_')||'home'}`);
}
console.log('ROUTE ERRORS TOTAL', errors.length, errors);
console.log('ROUTE FAILED TOTAL', failed.length, failed.slice(0,20));

// Skip link test
await page.goto(BASE+'/', {waitUntil:'domcontentloaded'});
await page.waitForTimeout(700);
await dismiss();
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
const skipActive = await page.evaluate(()=>document.activeElement?.textContent?.trim());
console.log('SKIP_LINK_ACTIVE', JSON.stringify(skipActive));
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
const afterSkip = await page.evaluate(()=>document.activeElement?.id);
console.log('AFTER_SKIP_FOCUS', afterSkip);
await shot(page,'skip-link');

// Focus rings: focus a button and inspect computed style
await page.goto(BASE+'/clients', {waitUntil:'domcontentloaded'});
await page.waitForTimeout(700);
await dismiss();
const ringInfo = await page.evaluate(() => {
  const btn = document.querySelector('button');
  if (!btn) return null;
  btn.focus();
  const cs = getComputedStyle(btn);
  return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor, boxShadow: cs.boxShadow };
});
console.log('FOCUS_RING', JSON.stringify(ringInfo));
await shot(page,'focus-ring');

// Tab order on clients
await page.goto(BASE+'/clients', {waitUntil:'domcontentloaded'});
await page.waitForTimeout(700);
await dismiss();
const tabSeq = [];
for (let i=0;i<12;i++){
  await page.keyboard.press('Tab');
  await page.waitForTimeout(120);
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    return { tag: el.tagName, text: (el.textContent||'').trim().slice(0,40), aria: el.getAttribute('aria-label'), role: el.getAttribute('role'), id: el.id };
  });
  tabSeq.push(info);
}
console.log('TAB_SEQ_CLIENTS', JSON.stringify(tabSeq, null, 2));
await shot(page,'tab-order');

// Command palette
await page.goto(BASE+'/', {waitUntil:'domcontentloaded'});
await page.waitForTimeout(700);
await dismiss();
await page.keyboard.press('Control+k');
await page.waitForTimeout(300);
const paletteOpen = await page.locator('[role="dialog"][aria-label="Command palette"]').isVisible().catch(()=>false);
console.log('PALETTE_OPEN', paletteOpen);
await shot(page,'palette-open');
if (paletteOpen) {
  await page.keyboard.type('client');
  await page.waitForTimeout(300);
  await shot(page,'palette-query');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  console.log('AFTER_PALETTE_ENTER_URL', page.url());
  // focus return
  await page.waitForTimeout(300);
  const focusAfter = await page.evaluate(()=>document.activeElement?.id);
  console.log('PALETTE_FOCUS_RETURN', focusAfter);
  await shot(page,'palette-after-enter');
}

// Shortcuts modal via Ctrl+/
await page.goto(BASE+'/', {waitUntil:'domcontentloaded'});
await page.waitForTimeout(700);
await dismiss();
await page.keyboard.press('Control+/');
await page.waitForTimeout(300);
const shortcutsOpen = await page.locator('[role="dialog"][aria-label="Keyboard Shortcuts"]').isVisible().catch(()=>false);
console.log('SHORTCUTS_OPEN_CTRL_SLASH', shortcutsOpen);
await shot(page,'shortcuts-modal');
if (shortcutsOpen) {
  // Esc closes
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const still = await page.locator('[role="dialog"][aria-label="Keyboard Shortcuts"]').isVisible().catch(()=>false);
  console.log('SHORTCUTS_ESC_CLOSED', !still);
}

// Shortcuts modal via Cmd/Ctrl+? (shift) maybe
await page.keyboard.press('Control+Shift+/');
await page.waitForTimeout(300);
const sc2 = await page.locator('[role="dialog"]').count();
console.log('SHORTCUTS_SHIFT_COUNT', sc2);

// Client add modal via Ctrl+N on /clients
await page.goto(BASE+'/clients', {waitUntil:'domcontentloaded'});
await page.waitForTimeout(700);
await dismiss();
await page.keyboard.press('Control+n');
await page.waitForTimeout(500);
const dialogs = await page.locator('[role="dialog"]').count();
console.log('DIALOGS_AFTER_CTRLN_CLIENTS', dialogs);
await shot(page,'client-add-modal');
// focus trap test
if (dialogs>0) {
  const trapSeq=[];
  for (let i=0;i<8;i++){
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    const inside = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.contains(document.activeElement) : null;
    });
    trapSeq.push(inside);
  }
  console.log('FOCUS_TRAP_CLIENT_MODAL', JSON.stringify(trapSeq));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const closed = !(await page.locator('[role="dialog"]').count());
  console.log('MODAL_ESC_CLOSED', closed);
}

// Cmd+N shortcut hijack: when input focused, should not navigate? test on proposals
await page.goto(BASE+'/proposals', {waitUntil:'domcontentloaded'});
await page.waitForTimeout(700);
await dismiss();
// open palette? instead focus search input if exists
const input = page.locator('input').first();
if (await input.isVisible().catch(()=>false)) {
  await input.click(); // mouse but for setup; then keyboard
  await page.waitForTimeout(100);
  const beforeUrl = page.url();
  await page.keyboard.press('Control+n');
  await page.waitForTimeout(300);
  console.log('CTRLN_IN_INPUT_URL_CHANGED', beforeUrl !== page.url(), page.url());
}

// Cmd+1..8 navigation
await page.goto(BASE+'/settings', {waitUntil:'domcontentloaded'});
await page.waitForTimeout(700);
await dismiss();
await page.keyboard.press('Control+1');
await page.waitForTimeout(500);
console.log('CTRL1_FROM_SETTINGS_URL', page.url());

await browser.close();
console.log('FINAL_ERRORS', errors);
console.log('FINAL_FAILED', failed);
