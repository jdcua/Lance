/**
 * Contrast check for `bg-[var(--accent)] text-white` buttons across all
 * themes (light + dark).
 *
 * Every theme defines its own --accent, so "white on accent" is only readable
 * when that theme's accent is dark enough. Measured from the real theme
 * definitions, not assumed.
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

const WHITE = [255, 255, 255];
// Split the file into theme objects and pull --accent from each colour block.
const blocks = src.split(/\n  \{\n    id: /).slice(1);
console.log('white text on --accent  ·  AA needs 4.5:1 for the 10–12px labels\n');
let failing = 0;
for (const b of blocks) {
  const id = b.match(/^([\w-]+)/)?.[1] ?? '?';
  const name = b.match(/name:\s*'([^']+)'/)?.[1] ?? id;
  const light = b.match(/colors:\s*\{([\s\S]*?)\n    \}/)?.[1] ?? '';
  const dark = b.match(/darkColors:\s*\{([\s\S]*?)\n    \}/)?.[1] ?? '';
  for (const [mode, block] of [['light', light], ['dark', dark]]) {
    const hex = block.match(/'--accent':\s*'(#[0-9a-fA-F]+)'/)?.[1];
    if (!hex) continue;
    const cr = ratio(hexRgb(hex), WHITE);
    const ok = cr >= 4.5;
    if (!ok) failing++;
    console.log(
      `  ${(id + '/' + mode).padEnd(20)} ${name.padEnd(9)} ${hex}  ${cr.toFixed(2)}  ${ok ? 'PASS' : '<<< FAIL'}`,
    );
  }
}
console.log(`\n${failing} theme/mode combination(s) fail AA with white text.`);
