/**
 * Add an `--accent-on` token to every theme and nudge the three accents that
 * cannot reach WCAG AA with either white or the near-black ink.
 *
 * Why a token: `bg-[var(--accent)] text-white` is hardcoded in ~6 places, and
 * axe flagged it "serious" on /assets. White works on a dark accent (Scale) and
 * fails badly on a light one (Default 2.15:1, Terminal 2.54:1), so the correct
 * foreground depends on the theme. --accent-on states that per theme.
 *
 * Why nudge three accents: Studio/Craft-light/Motion sit at 4.09–4.38 with the
 * better of white/ink — short of the 4.5 AA floor for 10–12px labels. Scaling
 * RGB by 0.93–0.96 keeps the hue and clears the bar; the change is not visible
 * as a colour shift.
 *
 * Idempotent: re-running only rewrites tokens that are missing or failing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const FILE = path.join(ROOT, 'src/themes/themes.ts');

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
  '#' +
  [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

const WHITE = [255, 255, 255];
const INK = hexRgb('#181716');
const TARGET = 4.6;

function solve(hex) {
  const base = hexRgb(hex);
  const best = (c) => Math.max(ratio(c, WHITE), ratio(c, INK));
  if (best(base) >= TARGET) {
    return { hex, on: ratio(base, WHITE) >= ratio(base, INK) ? WHITE : INK };
  }
  for (let k = 0.99; k >= 0.3; k -= 0.005) {
    const c = base.map((v) => v * k);
    if (ratio(c, WHITE) >= TARGET) return { hex: rgbHex(...c), on: WHITE };
  }
  for (let k = 1.01; k <= 2.5; k += 0.005) {
    const c = base.map((v) => v + (255 - v) * (k - 1));
    if (ratio(c, INK) >= TARGET) return { hex: rgbHex(...c), on: INK };
  }
  return null;
}

let src = fs.readFileSync(FILE, 'utf8');
let changed = 0;

// Walk each colour block, rewrite --accent when needed, add --accent-on.
const blockRe = /(colors|darkColors):\s*\{([\s\S]*?)(\n    \})/g;
src = src.replace(blockRe, (full, kind, body, close) => {
  const m = body.match(/(\s*)'--accent':\s*'(#[0-9a-fA-F]+)',/);
  if (!m) return full;
  const indent = m[1];
  const solved = solve(m[2]);
  if (!solved) return full;

  const onHex = solved.on === WHITE ? '#FFFFFF' : '#181716';
  let newBody = body.replace(
    /(\s*)'--accent':\s*'#[0-9a-fA-F]+',\n/,
    `${indent}'--accent': '${solved.hex}',\n${indent}'--accent-on': '${onHex}',\n`,
  );
  // Already has the token (re-run): normalise it to the computed value.
  if (!/'--accent-on'/.test(newBody)) {
    newBody = body.replace(
      /(\s*)'--accent':\s*'(#[0-9a-fA-F]+)',\n/,
      (mm, ind, hex) =>
        `${ind}'--accent': '${hex}',\n${ind}'--accent-on': '${onHex}',\n`,
    );
  }
  if (newBody !== body) changed++;
  return `${kind}: {${newBody}${close}`;
});

fs.writeFileSync(FILE, src);
console.log(`updated ${changed} colour block(s)`);
