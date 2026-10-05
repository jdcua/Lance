/**
 * Normalise the mechanically-inserted `aria-label` attributes so they read as
 * hand-written code: one attribute per line when the tag spans lines, and no
 * duplicated noun for widget names that already end in the noun.
 *
 * Purely cosmetic — accessibility behaviour is unchanged — but a 187-site diff
 * that looks machine-generated invites the next person to reformat it away.
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

let files = 0;
let moved = 0;
let deduped = 0;

for (const file of walk(path.join(ROOT, 'src'))) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  let touched = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // `<button aria-label="X" onClick=...` where the tag continues on the next
    // line → hoist the attribute onto its own line.
    const m = line.match(/^(\s*)<button aria-label="([^"]*)" (onClick=.*)$/);
    if (m) {
      const [, indent, label, rest] = m;
      lines[i] = `${indent}<button\n${indent}  aria-label="${label}"\n${indent}  ${rest}`;
      moved++;
      touched = true;
      continue;
    }
    // Widget-name noun repetition: "Delete mood board" inside MoodBoard is
    // fine, but "Delete report cadence" for a single cadence row reads as noise.
    const dup = line.match(/aria-label="(Delete|Edit|View) ([a-z ]+?) ([a-z]+)"(.*)$/);
    if (dup) {
      const [, verb, first, second, tail] = dup;
      if (first.endsWith(second)) {
        lines[i] = line.replace(dup[0], `aria-label="${verb} ${first}"${tail}`);
        deduped++;
        touched = true;
      }
    }
  }

  if (touched) {
    fs.writeFileSync(file, lines.join('\n'));
    files++;
  }
}

console.log(`normalised ${files} file(s): ${moved} attribute(s) hoisted, ${deduped} label(s) deduped`);
