/**
 * Lance QA harness · shared headless browser helpers.
 *
 * Every QA agent launches its OWN chromium instance with its OWN storage
 * state, so 10 agents can run in parallel without stepping on each other.
 *
 * Usage from an agent spec:
 *   import { launch, collect, shot } from './harness.mjs';
 *   const { browser, ctx, page } = await launch({ fixture: 'seeded' });
 *   const log = collect(page);
 *   await page.goto('/clients');
 *   ...
 *   await shot(page, 'clients');
 *   console.log(log.report());
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SHOT_DIR = path.resolve(__dirname, '../../qa-shots/swarm');
export const BASE = process.env.QA_BASE || 'http://localhost:1420';

fs.mkdirSync(SHOT_DIR, { recursive: true });

/** Read a saved localStorage fixture produced by make-fixture.mjs. */
export function loadFixture(name = 'seeded') {
  const file = path.resolve(__dirname, `fixtures/${name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `No fixture "${name}" at ${file}. Run: node scripts/qa/make-fixture.mjs`,
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Launch an isolated headless chromium.
 * fixture: 'seeded' (sample data) | 'fresh' (onboarding not completed) | null
 * overrides: extra localStorage keys merged over the fixture.
 */
export async function launch(opts = {}) {
  const {
    fixture = 'seeded',
    overrides = {},
    viewport = { width: 1440, height: 900 },
    storageState = null,
  } = opts;

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    ...(storageState ? { storageState } : {}),
  });

  const entries = [];
  if (fixture) entries.push(...Object.entries(loadFixture(fixture)));
  entries.push(...Object.entries(overrides));

  if (entries.length) {
    await ctx.addInitScript(
      ([pairs]) => {
        for (const [k, v] of pairs) {
          try {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          } catch {
            /* quota */
          }
        }
      },
      [entries],
    );
  }

  const page = await ctx.newPage();
  return { browser, ctx, page };
}

/** Attach console/pageerror/network collectors. Returns a log object. */
export function collect(page) {
  const errors = [];
  const warnings = [];
  const failed = [];
  const seen = new Set();

  page.on('console', (m) => {
    const t = m.text();
    // Vite HMR chatter and the shim's own debug lines are not defects.
    if (t.includes('[vite]') || t.includes('using localStorage persistence')) return;
    if (t.includes('Download the React DevTools')) return;
    const line = `[console.${m.type()}] ${t}`;
    if (m.type() === 'error') {
      if (!seen.has(line)) (seen.add(line), errors.push(line));
    } else if (m.type() === 'warning') warnings.push(line);
  });
  page.on('pageerror', (e) => {
    const line = `[pageerror] ${String(e && e.stack ? e.stack.split('\n')[0] : e)}`;
    if (!seen.has(line)) (seen.add(line), errors.push(line));
  });
  page.on('requestfailed', (r) => {
    const f = r.failure();
    failed.push(`[requestfailed] ${r.url()} · ${f ? f.errorText : 'unknown'}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`[http ${r.status()}] ${r.url()}`);
  });

  return {
    errors,
    warnings,
    failed,
    report() {
      return [
        errors.length ? `CONSOLE/PAGE ERRORS (${errors.length}):\n` + errors.join('\n') : 'no console/page errors',
        failed.length ? `FAILED REQUESTS (${failed.length}):\n` + failed.join('\n') : 'no failed requests',
      ].join('\n---\n');
    },
  };
}

let shotN = 0;
/** Screenshot into qa-shots/swarm. Returns the path. */
export async function shot(page, name) {
  const file = path.join(
    SHOT_DIR,
    `${String(++shotN).padStart(2, '0')}-${process.env.QA_AGENT || 'agent'}-${name}.png`.replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    ),
  );
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

/** Screenshot a specific element (or full page). */
export async function shotEl(page, selector, name) {
  const file = path.join(
    SHOT_DIR,
    `${String(++shotN).padStart(2, '0')}-${process.env.QA_AGENT || 'agent'}-${name}.png`.replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    ),
  );
  const el = await page.locator(selector).first();
  await el.screenshot({ path: file }).catch(async () => {
    await page.screenshot({ path: file, fullPage: true });
  });
  return file;
}

/** goto a route on the Lance dev/preview server. */
export async function go(page, route = '/') {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
}

/** Dump every lance localStorage key (entity counts) for backend assertions. */
export async function storeDump(page) {
  return page.evaluate(() => {
    const out = {};
    for (const k of Object.keys(localStorage)) {
      const v = localStorage.getItem(k);
      try {
        const p = JSON.parse(v);
        out[k] = Array.isArray(p) ? { count: p.length } : typeof p === 'object' && p ? { keys: Object.keys(p).length } : p;
      } catch {
        out[k] = v?.slice(0, 60);
      }
    }
    return out;
  });
}

/** Read one lance store list back out of the page. */
export async function readStore(page, key) {
  return page.evaluate((k) => {
    try {
      return JSON.parse(localStorage.getItem('lance:store:' + k) || 'null');
    } catch {
      return null;
    }
  }, key);
}

/** Wait for the app shell (sidebar) to be present. */
export async function waitApp(page) {
  await page.waitForSelector('#main-content', { timeout: 20000 });
  await page.waitForTimeout(400);
}

/** Dismiss the splash / upgrade modal if it is in the way. */
export async function dismissOverlays(page) {
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('[role="dialog"] button[aria-label="Close dialog"]').first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(250);
    } else break;
  }
}
