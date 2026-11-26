import { expect, test } from '@playwright/test';
import { gotoApp, seedReady, shot, watchConsole } from './helpers';

/**
 * Beyond spec 02/05: the progressive-disclosure sidebar itself, plus the
 * Settings tabs whose persistence was not exercised by earlier specs
 * (General, Notifications, privacy toggle). All interactions non-destructive.
 */

test.describe('exhaustive · sidebar disclosure + settings persistence', () => {
  test('Show all reveals hidden sections, persists, and collapses back', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await gotoApp(page, '/');
    const sidebar = page.getByRole('complementary', { name: 'Primary navigation' });
    const more = sidebar.getByRole('button', { name: /Show all sections/ });
    await expect(more).toBeVisible();
    const hiddenBefore = await sidebar.getByRole('button', { name: 'Import' }).count();
    expect(hiddenBefore, 'Import must start hidden for a fresh profile').toBe(0);

    await more.click();
    await expect(sidebar.getByRole('button', { name: 'Import' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Achievements' }).first()).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Follow-ups' }).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('lance:sidebar-full'))).toBe('true');
    const expanded = await shot(page, 'qa5-sidebar-expanded');
    console.log(`[evidence] expanded sidebar: ${expanded}`);

    // A link revealed only by "Show all" actually navigates.
    await sidebar.getByRole('link', { name: 'Achievements' }).first().click();
    await expect(page).toHaveURL(/\/achievements$/);
    await expect(
      page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('heading', { name: 'Achievements' }),
    ).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(sidebar.getByRole('button', { name: /Show fewer sections/ })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('lance:sidebar-full'))).toBe('true');
    await sidebar.getByRole('button', { name: /Show fewer sections/ }).click();
    await expect(sidebar.getByRole('button', { name: 'Import' })).toHaveCount(0);
    console.log('[evidence] sidebar show-all persisted across reload and collapsed again');
    expect(errors, `sidebar console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('General profile fields autosave on blur and survive reload', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/settings');
    const name = page.getByRole('textbox', { name: 'Your full name' });
    await name.fill('QA General Person');
    await name.blur();
    await page.getByRole('combobox', { name: 'Default currency' }).selectOption('EUR');
    const terms = page.getByRole('spinbutton', { name: 'Payment terms (days)' });
    await terms.fill('30');
    await terms.blur();
    await expect.poll(async () =>
      JSON.parse((await page.evaluate(() => localStorage.getItem('lance:profile'))) || '{}'),
    ).toMatchObject({ name: 'QA General Person', currency: 'EUR', payment_terms: 30 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('textbox', { name: 'Your full name' })).toHaveValue('QA General Person');
    await expect(page.getByRole('combobox', { name: 'Default currency' })).toHaveValue('EUR');
    await expect(page.getByRole('spinbutton', { name: 'Payment terms (days)' })).toHaveValue('30');
    console.log('[evidence] name/currency/payment-terms persisted after full reload');
  });

  test('invalid email is rejected without being persisted', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/settings');
    const email = page.getByRole('textbox', { name: 'you@example.com' });
    await email.fill('not-an-email');
    await email.blur();
    await expect(page.getByRole('alert').filter({ hasText: 'valid email' }).first()).toBeVisible();
    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('lance:profile') || '{}'));
    expect(profile.email || '').not.toBe('not-an-email');
    console.log(`[evidence] bad email blocked; stored email=${JSON.stringify(profile.email || '')}`);
  });

  test('Notifications prefs persist: motion, contrast, text size, toggles', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/settings');
    await page.getByRole('button', { name: 'Notifications', exact: true }).click();

    await page.getByRole('group', { name: 'Motion preference' }).getByRole('button', { name: 'Off' }).click();
    await page.getByRole('group', { name: 'Contrast preference' }).getByRole('button', { name: 'High' }).click();
    await page.getByRole('group', { name: 'Text size preference' }).getByRole('button', { name: '112%' }).click();
    // PrefToggle hides its checkbox under a styled track; click the wrapping label.
    await page.getByRole('checkbox', { name: 'KPI sparklines' }).locator('..').click();

    await expect.poll(async () =>
      JSON.parse((await page.evaluate(() => localStorage.getItem('lance:prefs'))) || '{}'),
    ).toMatchObject({ motion: 'off', contrast: 'high', textScale: '112', sparklines: false });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Notifications', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Motion preference' }).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('group', { name: 'Contrast preference' }).getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('group', { name: 'Text size preference' }).getByRole('button', { name: '112%' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('checkbox', { name: 'KPI sparklines' })).not.toBeChecked();
    console.log('[evidence] motion/contrast/textScale/sparklines persisted after reload');
  });

  test('release-and-update-checks privacy toggle persists across reload', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/settings');
    const track = page.getByRole('checkbox', { name: 'Release and update checks' }).locator('..');
    await expect(page.getByRole('checkbox', { name: 'Release and update checks' })).toBeChecked();
    await track.click();
    expect(await page.evaluate(() => localStorage.getItem('lance:network-checks-enabled'))).toBe('false');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('checkbox', { name: 'Release and update checks' })).not.toBeChecked();
    console.log('[evidence] network checks disabled and persisted after reload');
  });
});
