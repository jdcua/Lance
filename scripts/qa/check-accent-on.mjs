/**
 * Verify the --accent-on token (not white) resolves AA in every theme/mode.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const src = fs.readFileSync(path.join(ROOT, 'src/themes/themes.ts'), 'utf8');

const srgb = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => {
  const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
};
const hexRgb = (h) => {
  const s = h.replace('#', '');
  const f = s.length === 3 ? [...s].map((c) => c + c).join('') : s.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};

let fails = 0;
let n = 0;
const blocks = src.split(/\n  \{\n    id: /).slice(1);
for (const b of blocks) {
  const id = b.match(/^([\w-]+)/)?.[1] ?? '?';
  for (const [mode, key] of [['light', 'colors'], ['dark', 'darkColors']]) {
    const block = b.match(new RegExp(`${key}:\\s*\\{([\\s\\S]*?)\\n    \\}`))?.[1] ?? '';
    const accent = block.match(/'--accent':\s*'(#[0-9a-fA-F]+)'/)?.[1];
    const on = block.match(/'--accent-on':\s*'(#[0-9a-fA-F]+)'/)?.[1];
    if (!accent) continue;
    n++;
    if (!on) {
      console.log(`  MISSING --accent-on  ${id}/${mode}`);
      fails++;
      continue;
    }
    const cr = ratio(hexRgb(accent), hexRgb(on));
    const ok = cr >= 4.5;
    if (!ok) fails++;
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'}  ${(id + '/' + mode).padEnd(18)} ${accent} on ${on}  ${cr.toFixed(2)}`,
    );
  }
}
console.log(`\n${n - fails}/${n} theme/mode pairs meet WCAG AA with --accent-on.`);
process.exit(fails ? 1 : 0);
