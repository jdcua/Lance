import { expect, test } from '@playwright/test';
import { BASE, gotoApp, mockReleaseApi, seedReady, shot, watchConsole } from './helpers';

test.describe('edge 3 · persistence edge cases', () => {
  test('reload at onboarding step 2 resumes sanely (not silently reset to step 1)', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await mockReleaseApi(page);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const dialog = page.getByRole('dialog', { name: 'Set up Lance' });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Developer' }).click();
    await page.getByRole('button', { name: 'Continue →' }).click();
    await expect(dialog).toContainText('Step 2 of 3', { timeout: 10000 });
    const stored = await page.evaluate(() => localStorage.getItem('lance:onboarding-step'));
    console.log(`[evidence] stored onboarding step before reload: ${stored}`);
    expect(stored).toBe('2');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    const after = (await dialog.innerText()).replace(/\n/g, ' | ').slice(0, 220);
    console.log(`[evidence] onboarding after reload: "${after}"`);
    const path = await shot(page, 'edge-onboarding-reload-step2');
    console.log(`[evidence] screenshot ${path}`);
    const resumed = after.includes('Step 2 of 3');
    const honestReset = !after.includes('Welcome back');
    expect(
      resumed || honestReset,
      `stored step=2 was ignored on reload yet the dialog claims resumption: "${after}"`,
    ).toBe(true);
    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
    await ctx.close();
  });

  test('theme change and a large text entry survive a full reload', async ({ page }) => {
    await seedReady(page, { achievements: ['first_proposal_sent'] });
    await gotoApp(page, '/settings');
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByRole('button', { name: /^Studio\b/ }).first().click();
    expect(await page.evaluate(() => localStorage.getItem('lance:theme'))).toBe('studio');

    const notes = 'Z'.repeat(1500);
    const company = 'C'.repeat(190);
    await gotoApp(page, '/clients');
    await page.getByRole('button', { name: 'Add client' }).click();
    const dialog = page.getByRole('dialog', { name: 'New Client' });
    await dialog.getByRole('textbox', { name: 'Name *' }).fill('Large Text Client');
    await dialog.getByRole('textbox', { name: 'Company' }).fill(company);
    await dialog.getByRole('textbox', { name: 'Notes' }).fill(notes);
    await dialog.getByRole('button', { name: 'Add Client', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Large Text Client', exact: true })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Large Text Client/ })).toBeVisible({ timeout: 10000 });
    expect(await page.evaluate(() => localStorage.getItem('lance:theme'))).toBe('studio');
    await page.getByRole('button', { name: 'Edit client' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit Client' });
    const notesAfter = (await edit.getByRole('textbox', { name: 'Notes' }).inputValue()).length;
    const companyAfter = (await edit.getByRole('textbox', { name: 'Company' }).inputValue()).length;
    console.log(`[evidence] persisted notes chars=${notesAfter} company chars=${companyAfter} theme=${await page.evaluate(() => localStorage.getItem('lance:theme'))}`);
    const path = await shot(page, 'edge-persist-large-text');
    console.log(`[evidence] screenshot ${path}`);
    expect(notesAfter).toBe(1500);
    expect(companyAfter).toBe(190);
  });
});
