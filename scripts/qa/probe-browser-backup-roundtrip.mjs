/**
 * Browser-mode backup round-trip: archetype tables (e.g. project_phases) were
 * discovered and fetched, but are they IMPORTED on restore?
 *
 * The importer walks TABLE_INSERT_MAP; anything without a mapping relies on the
 * generic path. A table that exports but cannot re-import is still data loss.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.QA_BASE || 'http://localhost:4173';
const FIXTURE = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/seeded.json'), 'utf8'));

const browser = await chromium.launch({ headless: true });

// Phase 1: capture the envelope from a seeded install.
const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx1.addInitScript(
  ([pairs]) => {
    for (const [k, v] of pairs) localStorage.setItem(k, String(v));
  },
  [Object.entries(FIXTURE)],
);
const p1 = await ctx1.newPage();
await p1.goto(BASE + '/settings', { waitUntil: 'domcontentloaded' });
await p1.waitForSelector('#main-content');
await p1.waitForTimeout(2500);

const envelope = await p1.evaluate(async () => {
  const backup = await import('/src/utils/backup.ts');
  const data = await backup.fetchBackupTables();
  return { version: 1, tables: data };
});
console.log('captured tables:', Object.keys(envelope.tables).length);
console.log('project_phases rows:', envelope.tables.project_phases?.length ?? 'MISSING');
await ctx1.close();

// Phase 2: import into an empty install.
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx2.addInitScript(
  ([pairs]) => {
    for (const [k, v] of pairs) localStorage.setItem(k, String(v));
  },
  [['lance:onboarding-completed', 'true'], ['lance:onboarding-step', 'complete']],
);
const p2 = await ctx2.newPage();
const errs = [];
p2.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
p2.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('localStorage persistence')) errs.push(m.text().slice(0, 200));
});
await p2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p2.waitForSelector('#main-content');
await p2.waitForTimeout(2500);

const result = await p2.evaluate(async (tables) => {
  const backup = await import('/src/utils/backup.ts');
  const outcome = {};
  if (typeof backup.performImport !== 'function') {
    outcome.error = 'performImport not exported';
  } else {
    try {
      const r = await backup.performImport(
        {
          lance_backup: true,
          version: '1',
          exported_at: new Date().toISOString(),
          schema_version: 1,
          data: tables,
        },
        'replace',
      );
      outcome.imported = r.imported;
      outcome.skipped = r.skipped;
      outcome.failed = r.failed;
      outcome.tablesWritten = r.tablesWritten;
      outcome.errors = (r.errors || []).slice(0, 8);
    } catch (e) {
      outcome.threw = String(e).slice(0, 400);
    }
  }
  const phases = JSON.parse(localStorage.getItem('lance:store:project_phases') || 'null');
  const clients = JSON.parse(localStorage.getItem('lance:store:clients') || 'null');
  outcome.afterImport = {
    project_phases: Array.isArray(phases) ? phases.length : phases,
    clients: Array.isArray(clients) ? clients.length : clients,
  };
  return outcome;
}, envelope.tables);

console.log('\nimport result:', JSON.stringify(result, null, 1));
console.log('expected after import: clients=4, project_phases=14');
if (errs.length) console.log('\nconsole/page errors during import:', [...new Set(errs)].slice(0, 5));
await browser.close();
