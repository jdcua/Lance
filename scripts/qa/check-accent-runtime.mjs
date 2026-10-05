/**
 * Confirm at runtime, on the PRODUCTION build, that accent-filled labels are
 * legible: measure the rendered contrast of every `bg-[var(--accent)]` button
 * in each theme, in both light and dark.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.QA_BASE || 'http://localhost:4300';
const FIXTURE = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/seeded.json'), 'utf8'));
const THEMES = ['default', 'studio', 'terminal', 'craft', 'motion', 'lens', 'scale'];

const srgb = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => {
  const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
};

const browser = await chromium.launch({ headless: true });
let bad = 0;
let checked = 0;

for (const theme of THEMES) {
  for (const mode of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(
      ([pairs]) => {
        for (const [k, v] of pairs) localStorage.setItem(k, String(v));
      },
      [
        Object.entries({
          ...FIXTURE,
          'lance:theme': JSON.stringify(theme),
          'lance:theme-mode': JSON.stringify(mode),
          'lance:prefs': JSON.stringify({ motion: 'off', contrast: 'auto', textScale: '100' }),
        }),
      ],
    );
    const page = await ctx.newPage();
    // The accent-filled CTAs live on the empty-state screens; /clients and
    // /assets both render one when the store is seeded.
    await page.goto(BASE + '/assets', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#main-content', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);

    const measured = await page.evaluate(() => {
      const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const bgOf = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
          const bg = getComputedStyle(n).backgroundColor;
          const p = parse(bg);
          const [r, g, b] = p;
          // Opaque enough to read against?
          const alpha = (bg.match(/rgba?\([^)]*,\s*([\d.]+)\)/)?.[1] ?? '1');
          if (p.length === 3 && Number(alpha) > 0.85 && !(r === 255 && g === 255 && b === 255)) {
            return p;
          }
          n = n.parentElement;
        }
        return null;
      };
      const out = [];
      for (const el of document.querySelectorAll('button, label, a, span')) {
        const text = (el.textContent || '').trim();
        if (!text || text.length > 60) continue;
        if (el.children.length > 0) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        // Gradients / images are out of scope: bgOf can only report the nearest
        // ancestor's FLAT colour, which for a gradient-backed avatar says
        // nothing about the pixels the glyphs actually sit on. axe measures the
        // real pixels, so it covers those cases.
        const selfBg = getComputedStyle(el).backgroundImage;
        if (selfBg && selfBg !== 'none') continue;
        const bg = bgOf(el);
        if (!bg) continue;
        const fg = parse(cs.color);
        if (fg.length !== 3) continue;
        // Tinted (low-alpha) backgrounds are the `--*-bg` chips, not solid
        // fills; axe reports those correctly and they are a different rule.
        const alpha = parseFloat(
          (getComputedStyle(el).backgroundColor.match(/rgba?\([^)]*,\s*([\d.]+)\)/)?.[1] ?? '1'),
        );
        if (alpha < 0.85) continue;
        out.push({
          text: text.slice(0, 28),
          bg,
          fg,
          size: parseFloat(cs.fontSize),
          weight: cs.fontWeight,
        });
      }
      return out;
    });

    for (const m of measured) {
      const large = m.size >= 18 || (m.size >= 14 && Number(m.weight) >= 700);
      const need = large ? 3 : 4.5;
      const cr = ratio(m.bg, m.fg);
      checked++;
      if (cr < need) {
        bad++;
        console.log(
          `  FAIL ${theme}/${mode}  "${m.text}"  ${cr.toFixed(2)} < ${need}  (${m.size}px)`,
        );
      }
    }
    await ctx.close();
  }
}

console.log(`\nchecked ${checked} filled controls · ${bad} below WCAG AA`);
await browser.close();
process.exit(bad ? 1 : 0);
