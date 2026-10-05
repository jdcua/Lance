/**
 * Three-way table consistency check.
 *
 * Lance keeps a schema in three places that must agree:
 *   1. src-tauri/src/db.rs        — the real SQLite schema (Tauri)
 *   2. src/db/index.ts            — the browser-mode schema + migrations
 *   3. src/utils/backup.ts        — what a backup/restore round-trips
 *
 * A table present in (1) but missing from (3) is data a user can never back
 * up: silent, permanent loss. A table in (2) but not (1) is a browser-only
 * feature the desktop app silently drops.
 *
 * Usage: node scripts/qa/check-schema.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const tablesIn = (src) => {
  const out = new Set();
  for (const m of src.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+([a-z_0-9]+)/gi)) {
    out.add(m[1].toLowerCase());
  }
  return out;
};

const rust = read('src-tauri/src/db.rs');
const ts = read('src/db/index.ts');
const backup = read('src/utils/backup.ts');

const rustTables = tablesIn(rust);
const tsTables = tablesIn(ts);

// Backup coverage: the TABLES/table-name list in backup.ts.
const backupNames = new Set();
for (const m of backup.matchAll(/^\s*([a-z_0-9]+):\s*\{/gm)) backupNames.add(m[1]);
for (const m of backup.matchAll(/['"]([a-z_0-9]+)['"]/g)) {
  // Only count names that look like real tables we know about.
  const n = m[1];
  if (rustTables.has(n) || tsTables.has(n)) backupNames.add(n);
}
for (const m of backup.matchAll(/table:\s*'([a-z_0-9]+)'/g)) backupNames.add(m[1]);

const rustOnly = [...rustTables].filter((t) => !tsTables.has(t) && !t.startsWith('sqlite_'));
const tsOnly = [...tsTables].filter((t) => !rustTables.has(t));
const notBackedUp = [...rustTables].filter((t) => !backupNames.has(t) && !t.startsWith('sqlite_'));

console.log(`rust tables: ${rustTables.size} · ts tables: ${tsTables.size} · backup names: ${backupNames.size}\n`);

console.log(`── in Rust but not in src/db (${rustOnly.length})`);
console.log(rustOnly.length ? '  ' + rustOnly.join(', ') : '  none');
console.log(`\n── in src/db but not in Rust (${tsOnly.length})`);
console.log(tsOnly.length ? '  ' + tsOnly.join(', ') : '  none');
console.log(`\n── Rust tables with no backup coverage (${notBackedUp.length})`);
console.log(notBackedUp.length ? '  ' + notBackedUp.join(', ') : '  none');

// FK declarations that reference a table that does not exist.
console.log(`\n── FK targets that do not exist (${(() => {
  const bad = new Set();
  for (const src of [rust, ts]) {
    for (const m of src.matchAll(/REFERENCES\s+([a-z_0-9]+)\s*\(/gi)) {
      const t = m[1].toLowerCase();
      if (!rustTables.has(t) && !tsTables.has(t)) bad.add(t);
    }
  }
  return [...bad].join(', ') || 'none';
})()})`);
