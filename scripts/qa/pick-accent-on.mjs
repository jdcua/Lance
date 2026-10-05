/**
 * For each theme's --accent, decide whether white or the near-black ink gives
 * the better WCAG contrast, and by how much. Used to pick the value of a new
 * --accent-on token so `bg-[var(--accent)] text-[var(--accent-on)]` is legible
 * in all 7 themes instead of hardcoded white (which fails AA in 6 of them).
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
const INK = hexRgb('#181716'); // Default theme's text-primary

const blocks = src.split(/\n  \{\n    id: /).slice(1);
for (const b of blocks) {
  const id = b.match(/^([\w-]+)/)?.[1] ?? '?';
  const light = b.match(/colors:\s*\{([\s\S]*?)\n    \}/)?.[1] ?? '';
  const dark = b.match(/darkColors:\s*\{([\s\S]*?)\n    \}/)?.[1] ?? '';
  for (const [mode, block] of [['light', light], ['dark', dark]]) {
    const hex = block.match(/'--accent':\s*'(#[0-9a-fA-F]+)'/)?.[1];
    if (!hex) continue;
    const accent = hexRgb(hex);
    const w = ratio(accent, WHITE);
    const i = ratio(accent, INK);
    const pick = w >= i ? '#FFFFFF' : '#181716';
    const got = Math.max(w, i);
    console.log(
      `${(id + '/' + mode).padEnd(20)} accent ${hex}  white ${w.toFixed(2)}  ink ${i.toFixed(2)}  → ${pick} (${got.toFixed(2)}) ${got >= 4.5 ? 'AA ok' : 'STILL FAILS'}`,
    );
  }
}
