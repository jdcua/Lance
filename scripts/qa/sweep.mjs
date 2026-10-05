/**
 * Lance · full-app automated sweep (lead QA instrument).
 *
 * For every route × condition it loads the app in an isolated headless
 * chromium and records:
 *   · console errors, unhandled page errors, failed / 4xx-5xx requests
 *   · axe-core accessibility violations
 *   · horizontal overflow + elements spilling past the viewport
 *   · text clipped by an overflow:hidden ancestor (truncated labels)
 *   · NaN / undefined / Infinity / [object Object] leaking into the UI
 *   · broken images
 *   · icon-only buttons and inputs with no accessible name
 *   · a screenshot per condition
 *
 * Usage:
 *   node scripts/qa/sweep.mjs                     # full run
 *   node scripts/qa/sweep.mjs --only=/clients    # one route
 *   node scripts/qa/sweep.mjs --phase=responsive # skip axe (faster)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../qa-shots/sweep');
const REPORT = path.resolve(__dirname, '../../.qa/sweep-report.json');
const AXE = path.resolve(__dirname, '../../node_modules/axe-core/axe.min.js');
const BASE = process.env.QA_BASE || 'http://localhost:4173';
const FIXTURE = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'fixtures/seeded.json'), 'utf8'),
);

fs.mkdirSync(OUT, { recursive: true });

const argv = process.argv.slice(2);
const arg = (k) => {
  const m = argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.split('=')[1] : '';
};

const ROUTES = [
  '/',
  '/clients',
  '/projects',
  '/time',
  '/invoices',
  '/finance',
  '/insights',
  '/proposals',
  '/contracts',
  '/follow-ups',
  '/settings',
  '/achievements',
  '/assets',
  '/search',
  '/archetype',
  '/this-route-does-not-exist',
];

const VIEWPORTS = {
  sm: { width: 1280, height: 800 },
  md: { width: 1440, height: 900 },
  lg: { width: 1920, height: 1080 },
};

/** Prefs + theme injection so each condition renders the way a user would. */
function seedFor(mode, { textScale, density, theme }) {
  return {
    'lance:theme-mode': JSON.stringify(mode),
    'lance:prefs': JSON.stringify({
      motion: 'off',
      contrast: 'auto',
      textScale,
      density,
    }),
    'lance:density': density,
    'lance:theme': JSON.stringify(theme),
  };
}

const CONDITIONS = [
  { name: 'dark-md', mode: 'dark', vp: 'md', theme: 'default' },
  { name: 'light-md', mode: 'light', vp: 'md', theme: 'default' },
  { name: 'dark-sm', mode: 'dark', vp: 'sm', theme: 'default' },
  { name: 'dark-lg', mode: 'dark', vp: 'lg', theme: 'default' },
  { name: 'dark-md-125', mode: 'dark', vp: 'md', textScale: '125', theme: 'default' },
  { name: 'dark-md-compact', mode: 'dark', vp: 'md', density: 'compact', theme: 'default' },
  { name: 'light-md-terminal', mode: 'light', vp: 'md', theme: 'terminal' },
  { name: 'dark-md-studio', mode: 'dark', vp: 'md', theme: 'studio' },
];

const pageAudit = () => {
  const out = {
    overflowX: null,
    offenders: [],
    clipped: [],
    badText: [],
    brokenImages: [],
    namelessControls: [],
    tinyText: [],
  };
  const vw = window.innerWidth;

  // horizontal overflow
  const de = document.documentElement;
  out.overflowX = de.scrollWidth - de.clientWidth;

  const label = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ');
    return `${el.tagName.toLowerCase()}${t ? ` "${t.slice(0, 40)}"` : ''}`;
  };

  const all = Array.from(document.querySelectorAll('body *'));

  // True when the element, or any ancestor up to <body>, scrolls horizontally.
  const inScroller = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    return false;
  };

  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // Visually-hidden helpers (sr-only, clip) are SUPPOSED to clip.
    const srOnly =
      r.width <= 2 ||
      r.height <= 2 ||
      (el.className || '').toString().includes('sr-only') ||
      cs.clip === 'rect(0px, 0px, 0px, 0px)';

    // Spilling past the right edge. An element inside a horizontal scroller
    // (overflow-x: auto/scroll on itself OR any ancestor) is scrolling by
    // design — the filter-chip rows on /assets are a real example — so only
    // count elements with no scrollable escape hatch.
    if (r.right > vw + 2 && out.offenders.length < 12 && !inScroller(el)) {
      out.offenders.push({ el: label(el), right: Math.round(r.right) });
    }

    // text clipped by an ancestor with overflow hidden
    if (
      out.clipped.length < 12 &&
      !srOnly &&
      el.children.length === 0 &&
      (el.textContent || '').trim().length > 3 &&
      cs.overflow === 'hidden' &&
      el.scrollWidth > el.clientWidth + 2 &&
      cs.textOverflow !== 'ellipsis'
    ) {
      out.clipped.push({ el: label(el), text: el.textContent.trim().slice(0, 40) });
    }

    // junk values leaking into the UI
    const txt = (el.textContent || '').trim();
    if (
      out.badText.length < 12 &&
      el.children.length === 0 &&
      /\b(NaN|Infinity|undefined|null)\b|\[object Object\]/.test(txt)
    ) {
      out.badText.push({ el: label(el), text: txt.slice(0, 60) });
    }
  }

  // broken images
  for (const img of Array.from(document.images)) {
    if (!img.complete || img.naturalWidth === 0) {
      out.brokenImages.push(img.currentSrc || img.src || '(no src)');
    }
  }

  // interactive controls with no accessible name
  for (const el of Array.from(
    document.querySelectorAll('button, a[href], [role="button"], input, select, textarea'),
  )) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    const name =
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      (el.textContent || '').trim() ||
      el.getAttribute('placeholder') ||
      (el.labels && el.labels.length ? el.labels[0].textContent.trim() : '') ||
      (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent.trim()) ||
      '';
    if (!name) {
      out.namelessControls.push({
        el: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 60),
        html: el.outerHTML.slice(0, 90),
      });
    }
    if (out.namelessControls.length > 25) break;
  }
  out.namelessControls = out.namelessControls.slice(0, 25);
  return out;
};

async function run() {
  const only = arg('only');
  const routes = only ? ROUTES.filter((r) => r.includes(only)) : ROUTES;
  const results = [];

  const browser = await chromium.launch({ headless: true });

  for (const cond of CONDITIONS) {
    for (const route of routes) {
      const ctx = await browser.newContext({
        viewport: VIEWPORTS[cond.vp],
        deviceScaleFactor: 1,
      });
      const overrides = {
        ...seedFor(cond.mode, {
          textScale: cond.textScale || '100',
          density: cond.density || 'comfortable',
          theme: cond.theme,
        }),
        ...FIXTURE,
      };
      await ctx.addInitScript(
        ([pairs]) => {
          for (const [k, v] of pairs) localStorage.setItem(k, String(v));
        },
        [Object.entries(overrides)],
      );

      const page = await ctx.newPage();
      const errors = [];
      const failed = [];
      const seen = new Set();
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const t = m.text();
        if (t.includes('localStorage persistence') || t.includes('[vite]')) return;
        if (seen.has(t)) return;
        seen.add(t);
        errors.push(t.slice(0, 300));
      });
      page.on('pageerror', (e) => {
        const t = String(e).slice(0, 300);
        if (!seen.has(t)) (seen.add(t), errors.push('PAGEERROR ' + t));
      });
      page.on('response', (r) => {
        if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 120)}`);
      });

      let axe = [];
      let audit = null;
      try {
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForSelector('#main-content', { timeout: 20000 });
        await page.waitForTimeout(1100);
        // close any modal that would block the view
        for (let i = 0; i < 4; i++) {
          const c = page.locator('[role="dialog"] button[aria-label="Close dialog"]').first();
          if (await c.isVisible().catch(() => false)) {
            await c.click().catch(() => {});
            await page.waitForTimeout(200);
          } else break;
        }
        await page.waitForTimeout(300);

        if (arg('phase') !== 'responsive') {
          await page.addScriptTag({ path: AXE });
          axe = await page.evaluate(async () => {
            const r = await window.axe.run(document, {
              resultTypes: ['violations'],
              runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
            });
            return r.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              help: v.help,
              nodes: v.nodes.length,
              sample: v.nodes[0]?.html?.slice(0, 110),
            }));
          });
        }
        audit = await page.evaluate(pageAudit);
        await page.screenshot({
          path: path.join(OUT, `${cond.name}${route.replace(/\//g, '_') || '_root'}.png`),
          fullPage: false,
        });
      } catch (e) {
        errors.push('SWEEP: ' + String(e).slice(0, 200));
      }

      results.push({ cond: cond.name, route, errors, failed, axe, audit });
      const flags = [];
      if (errors.length) flags.push(`${errors.length} err`);
      if (audit?.overflowX > 2) flags.push(`overflow ${audit.overflowX}px`);
      if (audit?.offenders.length) flags.push(`${audit.offenders.length} spill`);
      if (audit?.clipped.length) flags.push(`${audit.clipped.length} clipped`);
      if (audit?.badText.length) flags.push(`${audit.badText.length} junk`);
      if (audit?.namelessControls.length) flags.push(`${audit.namelessControls.length} nameless`);
      if (axe.length) flags.push(`axe:${axe.length}`);
      console.log(
        `${flags.length ? '✗' : '✓'} ${cond.name.padEnd(16)} ${route.padEnd(28)} ${
          flags.join(' · ') || 'clean'
        }`,
      );

      await ctx.close();
    }
  }

  await browser.close();
  fs.writeFileSync(REPORT, JSON.stringify(results, null, 1));
  console.log('\nreport → ' + REPORT);

  // ---- summary ----
  const agg = {};
  const add = (k, v) => {
    agg[k] = agg[k] || [];
    agg[k].push(v);
  };
  for (const r of results) {
    if (r.errors.length) add('console', r);
    if (r.failed.length) add('http', r);
    if (r.audit?.overflowX > 2) add('overflow', r);
    if (r.audit?.offenders.length) add('spill', r);
    if (r.audit?.clipped.length) add('clipped', r);
    if (r.audit?.badText.length) add('junktext', r);
    if (r.audit?.brokenImages.length) add('img', r);
    if (r.audit?.namelessControls.length) add('nameless', r);
    for (const v of r.axe) add('axe:' + v.id, r);
  }
  console.log('\n=== AGGREGATE ===');
  for (const [k, list] of Object.entries(agg)) {
    const uniq = [...new Set(list.map((r) => r.route))];
    console.log(`${k}: ${list.length} hits across ${uniq.length} routes → ${uniq.join(', ')}`);
  }
}

run();
