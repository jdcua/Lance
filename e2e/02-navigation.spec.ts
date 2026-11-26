import { expect, test } from '@playwright/test';
import { gotoApp, seedReady, shot, watchConsole } from './helpers';

const ROUTES: Array<[string, string]> = [
  ['/', 'Dashboard'],
  ['/clients', 'Clients'],
  ['/projects', 'Projects'],
  ['/invoices', 'Invoices'],
  ['/finance', 'Finance'],
  ['/proposals', 'Proposals'],
  ['/contracts', 'Contracts'],
  ['/time', 'Time'],
  ['/insights', 'Insights'],
  ['/settings', 'Settings'],
  ['/achievements', 'Achievements'],
  ['/assets', 'Assets'],
  ['/follow-ups', 'Follow-ups'],
  ['/pipeline', 'Pipeline'],
  ['/search', 'Search'],
  ['/proposals/new', 'New Proposal'],
];

test.describe('flow 2 · navigation (full page load per route)', () => {
  for (const [path, heading] of ROUTES) {
    test(`route ${path} renders "${heading}" with content and no errors`, async ({ page }) => {
      const errors = watchConsole(page);
      await seedReady(page);
      await gotoApp(page, path);

      const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
      await expect(crumb.getByRole('heading', { name: heading, exact: true })).toBeVisible({
        timeout: 15000,
      });
      const main = page.getByRole('main', { name: 'Main content' });
      // Dashboard content mounts behind data loads; wait for real content.
      await expect(main).not.toBeEmpty({ timeout: 10000 });
      const text = (await main.innerText()).trim();
      console.log(`[evidence] ${path} main chars=${text.length} first="${text.slice(0, 70).replace(/\n/g, ' | ')}"`);
      expect(text.length, `${path} rendered a blank main region`).toBeGreaterThan(20);
      if (path === '/time') {
        await expect(main.getByRole('heading', { name: 'Time tracking' })).toBeVisible();
      }
      if (path === '/') await shot(page, '04-navigation-dashboard');
      if (path === '/insights') await shot(page, '05-navigation-insights');
      expect(errors, `${path} console errors: ${errors.join(' | ')}`).toEqual([]);
    });
  }

  test('sidebar link navigation reaches a second route client-side', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/');
    await page.getByRole('link', { name: 'Clients' }).first().click();
    await expect(page).toHaveURL(/\/clients$/);
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('heading', { name: 'Clients' })).toBeVisible();
  });

  test('unknown route renders Not Found rather than a blank shell', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/this-route-does-not-exist');
    await expect(page.getByRole('main')).not.toBeEmpty();
    const text = await page.getByRole('main').innerText();
    expect(text.toLowerCase()).toMatch(/not found|doesn't exist|404/);
  });
});
