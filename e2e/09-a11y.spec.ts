import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { gotoApp, seedReady, shot } from './helpers';

const AXE = resolve('node_modules/axe-core/axe.min.js');

async function runAxe(page: import('@playwright/test').Page, label: string) {
  await page.addScriptTag({ path: AXE });
  const result = await page.evaluate(async () => {
    // axe-core is injected above; use a loose cast because it is not a TS dep of this file.
    const axe = (window as unknown as {
      axe: { run: (ctx: Document, opts: object) => Promise<{ violations: Array<{ id: string; impact: string; help: string; nodes: Array<{ target: string[] }> }> }> };
    }).axe;
    const res = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return res.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    }));
  });
  const severe = result.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  console.log(`[evidence] axe ${label}: total=${result.length} serious/critical=${severe.length} ${JSON.stringify(severe)}`);
  await shot(page, `22-axe-${label.replace(/[^a-z0-9]+/gi, '-').replace(/^\/|\/$/g, '') || 'root'}`);
  return severe;
}

test.describe('flow 9 · accessibility basics (axe-core)', () => {
  for (const route of ['/', '/clients', '/settings']) {
    test(`axe serious/critical violations on ${route}`, async ({ page }) => {
      await seedReady(page);
      await gotoApp(page, route);
      const severe = await runAxe(page, route);
      expect(severe, `axe serious/critical violations on ${route}: ${JSON.stringify(severe)}`).toEqual([]);
    });
  }
});
