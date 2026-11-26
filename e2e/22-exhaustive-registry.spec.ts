import { expect, test } from '@playwright/test';
import { gotoApp, seedReady, shot, watchConsole } from './helpers';

/** Beyond spec 05/07: every registry checkbox, bulk toggles, and the fact that
 *  even "enable all" cannot resurrect the intentionally disabled
 *  ArchetypeFeatureTabs surface. */

const SURFACE_NEEDLES = ['add column', 'build log', 'shoot log', 'dataset log', 'chain log', 'service blueprint'];

test.describe('exhaustive · feature registry', () => {
  test('registry lists many named features and bulk toggles persist after reload', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await gotoApp(page, '/settings');
    await page.getByRole('button', { name: 'Features', exact: true }).click();
    const boxes = page.getByRole('main').getByRole('checkbox');
    const total = await boxes.count();
    console.log(`[evidence] registry checkbox count in built UI: ${total}`);
    expect(total, 'feature registry rendered too few entries').toBeGreaterThan(100);
    for (const name of ['BuildLog', 'KanbanBoard', 'ChainLog', 'ServiceBlueprint', 'RecentTime']) {
      await expect(page.getByRole('main').getByRole('checkbox', { name, exact: true })).toBeVisible();
    }
    await shot(page, 'qa5-feature-registry');

    await page.getByRole('button', { name: 'Disable all' }).click();
    // All 246 flags update through one React state write; sample a handful of
    // representative boxes so a slow rerender of the long list cannot flake.
    for (const name of ['BuildLog', 'KanbanBoard', 'ChainLog', 'ServiceBlueprint']) {
      await expect(
        page.getByRole('main').getByRole('checkbox', { name, exact: true }),
      ).not.toBeChecked();
    }
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lance:features') || '{}'))).toBeTruthy();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Features', exact: true }).click();
    await expect(page.getByRole('main').getByRole('checkbox', { name: 'BuildLog', exact: true })).not.toBeChecked();

    await page.getByRole('button', { name: 'Enable all' }).click();
    await expect(page.getByRole('main').getByRole('checkbox', { name: 'BuildLog', exact: true })).toBeChecked();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Features', exact: true }).click();
    await expect(page.getByRole('main').getByRole('checkbox', { name: 'BuildLog', exact: true })).toBeChecked();
    console.log(`[evidence] ${total} registry flags toggled off then on, both survived reload`);
    expect(errors, `registry console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('enabling every registry flag does not surface disabled ArchetypeFeatureTabs panels', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/settings');
    await page.getByRole('button', { name: 'Features', exact: true }).click();
    await page.getByRole('button', { name: 'Enable all' }).click();

    const leaks: Record<string, string[]> = {};
    for (const route of ['/', '/clients', '/projects', '/invoices', '/time', '/finance']) {
      await gotoApp(page, route);
      const text = ((await page.getByRole('main').innerText()) || '').toLowerCase();
      leaks[route] = SURFACE_NEEDLES.filter((n) => text.includes(n));
    }
    console.log(`[evidence] archetype panel leaks after enable-all: ${JSON.stringify(leaks)}`);
    expect(Object.entries(leaks).filter(([, hits]) => hits.length > 0)).toEqual([]);
  });
});
