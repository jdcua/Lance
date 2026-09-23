/* Chi-square-ish winner check for 2-variant exps. Draft-only: prints call.
 * Usage: node scripts/promo/exp-eval.mjs
 * Reads promo/experiments.json (minConversionsToCall) + promo/exp-counts.json
 * (shape: {exp:{A:{hit,base},B:{hit,base}}}) if present; else reports need-data.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const promo = join(root, 'promo');
const exps = JSON.parse(readFileSync(join(promo, 'experiments.json'), 'utf8'));
const countsPath = join(promo, 'exp-counts.json');
const counts = existsSync(countsPath) ? JSON.parse(readFileSync(countsPath, 'utf8')) : {};
for (const e of exps.experiments) {
  const c = counts[e.id];
  if (!c) { console.log(`${e.id}: need-data (no exp-counts.json yet)`); continue; }
  const [aH, aB] = [c.A?.hit ?? 0, c.A?.base ?? 0];
  const [bH, bB] = [c.B?.hit ?? 0, c.B?.base ?? 0];
  const total = aH + bH;
  if (total < (exps.minConversionsToCall ?? 200)) { console.log(`${e.id}: keep-running (${total} conversions)`); continue; }
  const aR = aB ? aH / aB : 0, bR = bB ? bH / bB : 0;
  const win = bR > aR ? 'B' : 'A';
  console.log(`${e.id}: A=${(aR * 100).toFixed(2)}% B=${(bR * 100).toFixed(2)}% → promote ${win} (human merge required)`);
}
