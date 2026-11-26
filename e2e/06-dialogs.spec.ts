import { expect, test } from '@playwright/test';
import { addClient, gotoApp, seedReady, shot } from './helpers';

test.describe('flow 6 · dialogs open and close cleanly', () => {
  test('Quick Log Time modal opens with ⌘⇧L and closes with Escape', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/time');
    await page.keyboard.press('Control+Shift+L');
    const dialog = page.getByRole('dialog', { name: 'Quick Log Time' });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toContainText('Description (optional)');
    await shot(page, '14-quick-log-time-modal');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    console.log('[evidence] Quick Log Time modal opened and closed');
  });

  test('Import Files modal opens from the sidebar and closes', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/');
    const sidebar = page.getByRole('complementary', { name: 'Primary navigation' });
    const showAll = sidebar.getByRole('button', { name: /Show all sections/ });
    if (await showAll.count()) await showAll.click();
    await sidebar.getByRole('button', { name: 'Import' }).click();
    const dialog = page.getByRole('dialog', { name: 'Import Files' });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await shot(page, '15-import-modal');
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    await expect(dialog).toBeHidden();
    console.log('[evidence] Import Files modal opened and closed');
  });

  test('New Proposal screen renders its form and saves a draft', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/clients');
    await addClient(page, 'Proposal Client');

    await gotoApp(page, '/proposals/new');
    await expect(page.getByRole('main').getByRole('heading', { name: 'New Proposal' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Select a client...' }).click();
    await page.getByRole('option', { name: /Proposal Client/ }).click();
    await page.getByPlaceholder('e.g. Website Redesign Proposal').fill('QA E2E Proposal');
    await shot(page, '16-new-proposal-form');
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page).toHaveURL(/\/proposals$/);
    await expect(page.getByText('QA E2E Proposal').first()).toBeVisible({ timeout: 10000 });
    console.log('[evidence] New Proposal form saved a draft visible on /proposals');
  });

  test('Share modal renders for a sent proposal and closes cleanly', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/clients');
    await addClient(page, 'Share Client');

    await gotoApp(page, '/proposals/new');
    await page.getByRole('combobox', { name: 'Select a client...' }).click();
    await page.getByRole('option', { name: /Share Client/ }).click();
    await page.getByPlaceholder('e.g. Website Redesign Proposal').fill('QA Share Proposal');
    await page.getByRole('button', { name: 'Save & Send' }).click();
    await expect(page).toHaveURL(/\/proposals$/);

    const shareBtn = page.getByRole('button', { name: 'Share proposal' }).first();
    await expect(shareBtn).toBeVisible({ timeout: 10000 });
    await shareBtn.click();
    const dialog = page.getByRole('dialog', { name: /^Share / });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toContainText('Generate Share Link');
    const generate = dialog.getByRole('button', { name: 'Generate Share Link' });
    console.log(`[evidence] share modal generate enabled=${await generate.isEnabled()} (desktop portal server unavailable in browser mode)`);
    await shot(page, '17-share-modal');
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    await expect(dialog).toBeHidden();
  });
});
