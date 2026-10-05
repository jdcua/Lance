/**
 * For each theme accent that cannot reach AA with EITHER white or the near-black
 * ink, find the minimal darkening (or lightening) of the accent that does, so
 * the fix keeps the hue and changes only the value.
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
const rgbHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

const WHITE = [255, 255, 255];
const INK = hexRgb('#181716');

/** Scale RGB toward black (k<1) or white (k>1) until the target ratio is met. */
function solve(hex, target = 4.6) {
  const base = hexRgb(hex);
  for (const fg of [WHITE, INK]) {
    if (ratio(base, fg) >= target) return { hex, fg, ratio: ratio(base, fg), scaled: false };
  }
  // darken
  for (let k = 0.99; k >= 0.3; k -= 0.005) {
    const c = base.map((v) => v * k);
    if (ratio(c, WHITE) >= target) return { hex: rgbHex(...c), fg: WHITE, ratio: ratio(c, WHITE), scaled: true, k };
  }
  // lighten
  for (let k = 1.01; k <= 2.5; k += 0.005) {
    const c = base.map((v) => v + (255 - v) * (k - 1));
    if (ratio(c, INK) >= target) return { hex: rgbHex(...c), fg: INK, ratio: ratio(c, INK), scaled: true, k };
  }
  return null;
}

const blocks = src.split(/\n  \{\n    id: /).slice(1);
for (const b of blocks) {
  const id = b.match(/^([\w-]+)/)?.[1] ?? '?';
  const light = b.match(/colors:\s*\{([\s\S]*?)\n    \}/)?.[1] ?? '';
  const dark = b.match(/darkColors:\s*\{([\s\S]*?)\n    \}/)?.[1] ?? '';
  for (const [mode, block] of [['light', light], ['dark', dark]]) {
    const hex = block.match(/'--accent':\s*'(#[0-9a-fA-F]+)'/)?.[1];
    if (!hex) continue;
    const w = ratio(hexRgb(hex), WHITE);
    const i = ratio(hexRgb(hex), INK);
    const cur = Math.max(w, i);
    const s = solve(hex);
    const flag = cur >= 4.5 ? '  ok  ' : ' FAIL ';
    console.log(
      `${flag}${(id + '/' + mode).padEnd(20)} ${hex} → ${s.hex} with ${s.fg === WHITE ? '#FFFFFF' : '#181716'} (${s.ratio.toFixed(2)})${s.scaled ? `  [scaled ${(s.k ?? 1).toFixed(3)}]` : ''}`,
    );
  }
}
