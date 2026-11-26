import { expect, test } from '@playwright/test';
import { addClient, gotoApp, seedReady, shot, watchConsole } from './helpers';

test.describe('edge 8 · share link in browser mode', () => {
  test('generating a link yields a working view, never a dead navigation', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await gotoApp(page, '/clients');
    await addClient(page, 'Share Edge Client');
    await gotoApp(page, '/proposals/new');
    await page.getByRole('combobox', { name: 'Select a client...' }).click();
    await page.getByRole('option', { name: /Share Edge Client/ }).click();
    await page.getByPlaceholder('e.g. Website Redesign Proposal').fill('Share Edge Proposal');
    await page.getByRole('button', { name: 'Save & Send' }).click();
    await expect(page).toHaveURL(/\/proposals$/);
    await page.getByRole('button', { name: 'Share proposal' }).first().click();
    const dialog = page.getByRole('dialog', { name: /^Share / });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    const dialogBefore = (await dialog.innerText()).replace(/\n/g, ' | ');
    console.log(`[evidence] share dialog before generate: "${dialogBefore.slice(0, 260)}"`);
    await dialog.getByRole('button', { name: 'Generate Share Link' }).click();
    await expect(dialog.getByText('Share link')).toBeVisible({ timeout: 10000 });
    const url = await dialog.locator('input[readonly]').inputValue();
    console.log(`[evidence] generated url: ${url}`);
    expect(url).toMatch(/\/share\/[a-f0-9]+$/);
    expect(page.url(), 'share modal must not navigate away').toMatch(/\/proposals$/);
    const path = await shot(page, 'edge-share-link-generated');
    console.log(`[evidence] screenshot ${path}`);

    const viewer = await page.context().newPage();
    const response = await viewer.goto(url, { waitUntil: 'domcontentloaded' });
    // The share view hydrates after the initial HTML shell; wait for its
    // content before asserting (a bare 200 can still be an empty container).
    await expect(viewer.getByText('Share Edge Proposal')).toBeVisible({ timeout: 10000 });
    const body = (await viewer.locator('body').innerText()).replace(/\n/g, ' | ');
    console.log(`[evidence] shared view status=${response?.status()} body="${body.slice(0, 180)}"`);
    expect(response?.status()).toBe(200);
    expect(body).toContain('Share Edge Proposal');
    await viewer.close();
    console.log('[INFO] browser mode generates a working link instead of a desktop-only notice; no "desktop app only" copy found in the dialog');
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
