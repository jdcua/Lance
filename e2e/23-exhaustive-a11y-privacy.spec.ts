import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { BASE, gotoApp, seedReady, shot, watchConsole } from './helpers';

/** Beyond spec 08/09: axe on two screens those specs never visited, plus a
 *  wider console/privacy walk that includes progressive-disclosure routes. */

const AXE = resolve('node_modules/axe-core/axe.min.js');

async function severeAxe(page: Page, label: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  await page.addScriptTag({ path: AXE });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (ctx: Document, opts: object) => Promise<{ violations: Array<{ id: string; impact: string; help: string; nodes: Array<{ target: string[] }> }> }> };
    }).axe;
    const res = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return res.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  });
  console.log(`[evidence] axe ${label} serious/critical: ${JSON.stringify(violations)}`);
  await shot(page, `qa5-axe-${label.replace(/\W/g, '')}`);
  return violations;
}

test.describe('exhaustive · accessibility and privacy beyond existing coverage', () => {
  for (const route of ['/time', '/pipeline']) {
    test(`axe has no serious/critical violations on ${route}`, async ({ page }) => {
      await seedReady(page);
      await gotoApp(page, route);
      const violations = await severeAxe(page, route);
      expect(violations, `axe violations on ${route}: ${JSON.stringify(violations)}`).toEqual([]);
    });
  }

  test('full walk has zero console errors and no unexpected third-party origins', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    const errors = watchConsole(page);
    await seedReady(page);
    // Expand the sidebar so hidden routes are exercised too.
    await gotoApp(page, '/');
    const sidebar = page.getByRole('complementary', { name: 'Primary navigation' });
    const more = sidebar.getByRole('button', { name: /Show all sections/ });
    if (await more.count()) await more.click();

    for (const route of [
      '/', '/clients', '/projects', '/invoices', '/finance', '/contracts', '/time',
      '/proposals', '/follow-ups', '/pipeline', '/insights', '/achievements',
      '/assets', '/search', '/settings',
    ]) {
      await gotoApp(page, route);
      await expect(page.getByRole('main', { name: 'Main content' })).not.toBeEmpty();
    }
    await page.waitForTimeout(2000); // allow the one mocked release check to land

    const ownHost = new URL(BASE).host;
    const external = [...new Set(requests.map((u) => {
      try {
        const parsed = new URL(u);
        return parsed.host === ownHost ? '' : `${parsed.origin}${parsed.pathname}`;
      } catch {
        return '';
      }
    }).filter(Boolean))];
    const unexpected = external.filter((u) => !u.includes('api.github.com'));
    console.log(`[evidence] external origins across 15 routes: ${JSON.stringify(external)}`);
    console.log(`[evidence] total requests: ${requests.length}; console errors: ${JSON.stringify(errors)}`);
    await shot(page, 'qa5-privacy-walk-end');
    expect(unexpected, `unexpected third-party requests: ${JSON.stringify(unexpected)}`).toEqual([]);
    expect(errors, `console errors across walk: ${errors.join(' | ')}`).toEqual([]);
  });
});
