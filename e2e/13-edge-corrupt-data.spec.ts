import { expect, test } from '@playwright/test';
import { gotoApp, seedReady, shot, watchConsole } from './helpers';

const CORRUPT_KEYS = [
  'lance:store:clients',
  'lance:store:invoices',
  'lance:store:projects',
  'lance:profile',
  'lance:achievements',
  'lance:features',
  'lance:follow-up-settings',
];

test.describe('edge 4 · malformed localStorage values', () => {
  test('app recovers on cold load and across representative routes', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await page.addInitScript((keys) => {
      for (const key of keys) localStorage.setItem(key, '{not-valid-json');
    }, CORRUPT_KEYS);
    await gotoApp(page, '/');
    const main = page.getByRole('main', { name: 'Main content' });
    await expect(main).not.toBeEmpty({ timeout: 12000 });
    const dashboard = (await main.innerText()).replace(/\n/g, ' | ');
    console.log(`[evidence] dashboard after corrupt inject: "${dashboard.slice(0, 180)}"`);
    expect(dashboard.length, 'dashboard was blank after corrupt data').toBeGreaterThan(40);
    expect(dashboard.toLowerCase()).not.toMatch(/something went wrong|application error/);

    for (const route of ['/clients', '/invoices', '/settings']) {
      await gotoApp(page, route);
      await expect(main).not.toBeEmpty({ timeout: 12000 });
      const text = (await main.innerText()).replace(/\n/g, ' | ');
      console.log(`[evidence] ${route} after corrupt inject chars=${text.length} "${text.slice(0, 100)}"`);
      expect(text.length, `${route} blank after corrupt data`).toBeGreaterThan(20);
    }
    const path = await shot(page, 'edge-corrupt-data-recovery');
    console.log(`[evidence] screenshot ${path}`);
    console.log(`[evidence] console errors: ${JSON.stringify(errors).slice(0, 1000)}`);
    expect(errors, `console errors after corrupt data: ${errors.join(' | ')}`).toEqual([]);
  });
});
