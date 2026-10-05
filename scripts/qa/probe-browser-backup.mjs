/**
 * Does a browser-mode (localStorage) backup actually capture the archetype
 * tables, or does it silently drop them?
 *
 * backup.ts enumerates tables via `SELECT name FROM sqlite_master`. In browser
 * mode there is no SQLite, so that query either fails (caught → falls back to
 * the 34-entry hand list, losing ~100 tables) or is served by a shim.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.QA_BASE || 'http://localhost:4173';
const FIXTURE = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/seeded.json'), 'utf8'));

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(
  ([pairs]) => {
    for (const [k, v] of pairs) localStorage.setItem(k, String(v));
  },
  [Object.entries(FIXTURE)],
);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await page.goto(BASE + '/settings', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#main-content');
await page.waitForTimeout(2500);

const out = await page.evaluate(async () => {
  const backup = await import('/src/utils/backup.ts');
  let tables = [];
  let err = null;
  try {
    tables = await backup.discoverBackupTables();
  } catch (e) {
    err = String(e);
  }
  let data = null;
  let fetchErr = null;
  try {
    data = await backup.fetchBackupTables();
  } catch (e) {
    fetchErr = String(e);
  }
  const db = await import('/src/db/index.ts');
  let dbKind = 'unknown';
  try {
    const d = await db.getDb();
    dbKind = typeof d?.select === 'function' ? 'select-capable' : 'no-select';
  } catch (e) {
    dbKind = 'getDb threw: ' + String(e).slice(0, 80);
  }
  return {
    err,
    fetchErr,
    dbKind,
    tableCount: tables.length,
    tables: tables.slice(0, 200),
    fetchedTables: data ? Object.keys(data).length : null,
    nonEmpty: data
      ? Object.entries(data)
          .filter(([, v]) => Array.isArray(v) && v.length > 0)
          .map(([k, v]) => `${k}=${v.length}`)
      : null,
  };
});

console.log('db:', out.dbKind);
console.log('discover error:', out.err);
console.log('fetch error:', out.fetchErr);
console.log('tables discovered:', out.tableCount);
console.log('tables fetched:', out.fetchedTables);
console.log('\nnon-empty tables in the browser-mode backup payload:');
console.log('  ' + (out.nonEmpty || []).join('  '));
console.log('\nsample of discovered names:');
console.log('  ' + out.tables.slice(0, 40).join(', '));
if (errs.length) console.log('\npageerrors:', errs.slice(0, 3));
await browser.close();
