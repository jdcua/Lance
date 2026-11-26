import { expect, test } from '@playwright/test';
import { gotoApp, seedReady, shot, watchConsole } from './helpers';

test.describe('flow 7 · refactor-sensitive surfaces', () => {
  test('Pipeline board renders its stage columns without crashing', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await gotoApp(page, '/pipeline');
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('heading', { name: 'Pipeline' })).toBeVisible();
    const main = page.getByRole('main');
    await expect(main).toContainText('Drag work forward');
    const text = await main.innerText();
    console.log(`[evidence] pipeline main text: ${text.replace(/\n/g, ' | ').slice(0, 300)}`);
    expect(text.length).toBeGreaterThan(50);
    await shot(page, '18-pipeline-board');
    expect(errors, `pipeline console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('Follow-ups screen renders its filter tabs without crashing', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await gotoApp(page, '/follow-ups');
    await expect(page.getByRole('main')).toContainText('Pending');
    await expect(page.getByRole('main')).toContainText('Sent');
    await expect(page.getByRole('main')).toContainText('Dismissed');
    await shot(page, '19-follow-ups');
    expect(errors, `follow-ups console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  // The archetype surface is intentionally disabled in the shipped build
  // (ArchetypeFeatureTabs returns null). Those trackers are verified by the
  // component-level tests in src/test/recordTrackerMigration.test.tsx instead.
  test('disabled archetype surface does not leak half-rendered tracker panels', async ({ page }) => {
    const routes = [
      '/', '/clients', '/projects', '/invoices', '/finance', '/proposals',
      '/contracts', '/time', '/insights', '/settings', '/assets', '/follow-ups', '/pipeline',
    ];
    const needles = [
      'add column', 'build log', 'shoot log', 'dataset log', 'chain log',
      'service blueprint', 'dataset versioning',
    ];
    const found: Record<string, string[]> = {};
    await seedReady(page);
    for (const route of routes) {
      await gotoApp(page, route);
      const text = ((await page.getByRole('main').innerText()) || '').toLowerCase();
      found[route] = needles.filter((n) => text.includes(n));
    }
    console.log(`[evidence] tracker/kanban affordances found per route: ${JSON.stringify(found)}`);
    await shot(page, '20-refactor-sensitive-last-route');
    const reachableRoutes = Object.entries(found).filter(([, hits]) => hits.length > 0);
    expect(
      reachableRoutes,
      `unexpected tracker/kanban panel on routes: ${JSON.stringify(reachableRoutes)}`,
    ).toEqual([]);

    await gotoApp(page, '/settings');
    await expect(page.getByRole('main')).toContainText('Features');
  });
});
