import { expect, test } from '@playwright/test';
import { gotoApp, seedReady, shot } from './helpers';

test.describe('flow 5 · settings persistence', () => {
  test('light → dark theme switch persists after full reload', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/settings');
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();

    await expect(page.getByRole('button', { name: 'Light', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
    await shot(page, '11-settings-dark-theme');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
    console.log('[evidence] dark theme persisted after reload:', await page.evaluate(() => localStorage.getItem('lance:theme-mode')));
  });

  test('layout density comfortable → compact persists after full reload', async ({ page }) => {
    // Density control is unlocked by the three_proposals achievement.
    await seedReady(page, { achievements: ['three_proposals'] });
    await gotoApp(page, '/settings');
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();

    const compact = page.getByRole('button', { name: 'Compact', exact: true });
    await expect(compact).toBeVisible({ timeout: 10000 });
    await compact.click();
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('density-compact'))).toBe(true);
    await shot(page, '12-settings-compact-density');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('density-compact'))).toBe(true);
    console.log('[evidence] density persisted after reload:', await page.evaluate(() => localStorage.getItem('lance:density')));
  });

  test('a Features checkbox toggle persists after full reload', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/settings');
    await page.getByRole('button', { name: 'Features', exact: true }).click();

    const row = page.locator('label').filter({ hasText: /^BuildLog$/ }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    const checkbox = row.getByRole('checkbox');
    const before = await checkbox.isChecked();
    await checkbox.click();
    await expect.poll(() => checkbox.isChecked()).toBe(!before);
    await shot(page, '13-settings-feature-toggle');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Features', exact: true }).click();
    const rowAfter = page.locator('label').filter({ hasText: /^BuildLog$/ }).first();
    await expect(rowAfter.getByRole('checkbox')).toBeChecked({ checked: !before });
    console.log(`[evidence] BuildLog feature checkbox ${before} -> ${!before} persisted after reload`);
  });
});
