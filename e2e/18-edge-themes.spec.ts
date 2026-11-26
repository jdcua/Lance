import { expect, test } from '@playwright/test';
import { gotoApp, seedReady, shot, watchConsole } from './helpers';

const ALL_ACHIEVEMENTS = [
  'first_proposal_sent', 'ten_hours_logged', 'first_invoice_paid',
  'motion_theme', 'lens_theme', 'scale_theme',
];
const THEMES: Array<[string, string]> = [
  ['Default', 'default'], ['Studio', 'studio'], ['Terminal', 'terminal'],
  ['Craft', 'craft'], ['Motion', 'motion'], ['Lens', 'lens'], ['Scale', 'scale'],
];

test.describe('edge 9 · all seven themes plus dark mode', () => {
  test('every theme applies without console errors and content stays visible', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page, { achievements: ALL_ACHIEVEMENTS });
    await gotoApp(page, '/settings');
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();

    for (const [name, id] of THEMES) {
      const button = page.getByRole('button', { name: new RegExp(`^${name}\\b`) }).first();
      expect(await button.isEnabled(), `${name} theme button should be unlocked`).toBe(true);
      await button.click();
      const stored = await page.evaluate(() => localStorage.getItem('lance:theme'));
      console.log(`[evidence] theme ${name} → localStorage=${stored}`);
      expect(stored).toBe(id);
      await expect(page.getByRole('main', { name: 'Main content' })).toContainText('Appearance');
    }

    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
    const path = await shot(page, 'edge-all-themes-dark');
    console.log(`[evidence] screenshot ${path}`);
    await gotoApp(page, '/clients');
    const main = page.getByRole('main', { name: 'Main content' });
    await expect(main).not.toBeEmpty({ timeout: 12000 });
    const text = (await main.innerText()).replace(/\n/g, ' | ');
    console.log(`[evidence] content visible after theme walk: chars=${text.length} "${text.slice(0, 100)}"`);
    expect(text.length).toBeGreaterThan(20);
    console.log(`[evidence] console errors: ${JSON.stringify(errors).slice(0, 800)}`);
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
