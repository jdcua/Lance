/**
 * Swap hardcoded `text-white` on a solid `--accent` fill for `text-[var(--accent-on)]`,
 * so the label is legible in all 7 themes (white fails AA on 6 of them).
 *
 * Only touches className strings that contain BOTH `bg-[var(--accent)]` and
 * `text-white` — i.e. white is being used as the foreground for that fill, which
 * is the pattern the axe run flagged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(path.join(ROOT, 'src')).filter((f) => !/\.test\./.test(f));
let changedFiles = 0;
let changedSpots = 0;
const sites = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  let touched = false;
  lines.forEach((line, i) => {
    // bg-[var(--accent)] present AND white used as its text colour.
    if (!line.includes('bg-[var(--accent)]') || !line.includes('text-white')) return;
    const next = line.replace(/text-white/g, 'text-[var(--accent-on)]');
    if (next === line) return;
    lines[i] = next;
    touched = true;
    changedSpots++;
    sites.push(`${path.relative(ROOT, file)}:${i + 1}  ${line.trim().slice(0, 96)}`);
  });
  if (touched) {
    fs.writeFileSync(file, lines.join('\n'));
    changedFiles++;
  }
}

console.log(`updated ${changedSpots} className(s) across ${changedFiles} file(s):\n`);
for (const s of sites) console.log('  ' + s);
