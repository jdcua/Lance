import { expect, test } from '@playwright/test';
import { addClient, gotoApp, seedReady, shot } from './helpers';

test.describe('flow 4 · search and command palette', () => {
  test('⌘K opens palette, typed query returns the matching record', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/clients');
    await addClient(page, 'Palette Needle');

    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible({ timeout: 10000 });

    const input = palette.getByRole('combobox', {
      name: 'Search clients, projects, invoices and more',
    });
    await input.fill('Palette Needle');
    await expect(palette.getByRole('listbox', { name: 'Search results' })).toContainText(
      'Palette Needle',
      { timeout: 10000 },
    );
    await shot(page, '09-command-palette-results');
    console.log('[evidence] palette result text:', await palette.getByRole('listbox').innerText());

    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();
  });

  test('topbar Search button opens palette and shows shortcut help when empty', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/clients');
    await page.getByRole('button', { name: 'Search… ⌘K' }).click();
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();
    await expect(palette.getByRole('listbox', { name: 'Search results' })).toContainText(
      'Keyboard shortcuts',
    );
    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();
  });

  test('dedicated Search screen returns results for a stored record', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/clients');
    await addClient(page, 'Search Screen Needle');

    await gotoApp(page, '/search?q=Search%20Screen%20Needle');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Search' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('Search Screen Needle', { timeout: 10000 });
    await shot(page, '10-search-screen-results');
  });
});
