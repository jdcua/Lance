import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SHOTS = path.resolve(import.meta.dirname, '../qa-shots');
fs.mkdirSync(SHOTS, { recursive: true });

const shot = (page: any, name: string) =>
  page.screenshot({ path: path.join(SHOTS, name) });

test.describe('first-run exploratory QA', () => {
  test('splash → onboarding → tour → core screens', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
    });
    page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));

    // Fresh first-run: clear everything before load.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    // 1. Splash (should be visible immediately, auto-dismisses ~2s).
    await page.waitForTimeout(500);
    await shot(page, '01-splash-visible.png');
    const splashVisible = await page
      .getByRole('dialog', { name: 'Lance Pro' })
      .isVisible()
      .catch(() => false);
    console.log('splash visible at 0.5s:', splashVisible);

    // Splash auto-dismiss check: still there at 1.5s, gone by 4s?
    await page.waitForTimeout(1200);
    const splashAt17 = await page
      .getByRole('dialog', { name: 'Lance Pro' })
      .isVisible()
      .catch(() => false);
    await shot(page, '02-splash-mid.png');
    await page.waitForTimeout(2500);
    const splashAt42 = await page
      .getByRole('dialog', { name: 'Lance Pro' })
      .isVisible()
      .catch(() => false);
    console.log('splash at ~1.7s:', splashAt17, '| splash at ~4.2s:', splashAt42);
    await shot(page, '03-after-splash.png');

    // 2. Onboarding step 1: Comfort (access prefs first, then the craft grid).
    await expect.soft(page.getByText('Make yourself comfortable')).toBeVisible({ timeout: 10_000 });
    await shot(page, '04-onboarding-step1-comfort.png');
    await page.getByRole('button', { name: /Continue/ }).click();

    // 2b. Onboarding step 2: profession grid.
    const step2 = page.getByText('What do you do?');
    await expect.soft(step2).toBeVisible({ timeout: 10_000 });
    await shot(page, '04-onboarding-step1.png');
    const archetypeButtons = await page
      .locator('button:has-text("Designer"), button')
      .count();
    console.log('buttons on step1:', archetypeButtons);
    // Pick an archetype in the step-1 grid (labels truncate in the sm modal).
    await page.getByRole('button', { name: 'Developer / Engineer' }).click();
    await page.getByRole('button', { name: /Continue/ }).click();

    // 3. Step 2: profile.
    await expect.soft(page.getByText('Tell us about yourself')).toBeVisible({
      timeout: 10_000,
    });
    await shot(page, '05-onboarding-step2-empty.png');
    // Continue should be disabled without a name.
    const cont2 = page.getByRole('button', { name: /Continue/ });
    console.log('continue disabled w/o name:', await cont2.isDisabled());
    await page.getByPlaceholder('Your full name').fill('QA Tester');
    await page.getByPlaceholder('you@example.com').fill('not-an-email');
    await shot(page, '06-onboarding-step2-bad-email.png');
    console.log(
      'continue disabled w/ bad email:',
      await cont2.isDisabled(),
    );
    await page.getByPlaceholder('you@example.com').fill('qa@example.com');
    await cont2.click();

    // 4. Step 3: themes.
    await expect.soft(page.getByText('Pick your workspace')).toBeVisible({
      timeout: 10_000,
    });
    await shot(page, '07-onboarding-step3-themes.png');

    // 5. Step 5: rates + sample data.
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect.soft(page.getByText('Rates & sample data')).toBeVisible({
      timeout: 10_000,
    });
    await shot(page, '08-onboarding-step4.png');
    await page.getByPlaceholder('e.g. 75').fill('80');
    await page.getByText('Yes, show me around').click();

    // 6. Walkthrough: intro card offers the hands-on spotlight tour.
    await expect
      .soft(page.getByRole('button', { name: 'Take the tour' }))
      .toBeVisible({ timeout: 15_000 });
    await shot(page, '09-walkthrough-intro.png');
    await page.getByRole('button', { name: 'Take the tour' }).click();
    // Spotlight tour length and per-step CTAs are dynamic (depend on the
    // archetype plan), so walk until Get Started appears instead of
    // hardcoding buttons or a slide count.
    for (let i = 0; i < 14; i++) {
      const done = page.getByRole('button', { name: 'Get Started' });
      if (await done.isVisible().catch(() => false)) {
        await done.click();
        break;
      }
      const advance = page.getByRole('button', { name: /^(Show me|Next)/ });
      if (await advance.isVisible().catch(() => false)) {
        await advance.click();
        await page.waitForTimeout(400);
        await shot(page, `09-walkthrough-slide${i + 1}.png`);
        continue;
      }
      // Action steps carry a custom CTA (e.g. "Try it"): take the primary.
      const cta = page.locator('[role="dialog"] button:not([aria-label="Skip tour"])').last();
      if (await cta.isVisible().catch(() => false)) {
        await cta.click();
        await page.waitForTimeout(400);
        continue;
      }
      throw new Error('tour shows no advance control');
    }
    await page.waitForTimeout(800);
    await shot(page, '10-dashboard-after-onboarding.png');

    // 7. Core nav sweep.
    for (const item of ['Clients', 'Proposals', 'Invoices', 'Time', 'Insights', 'Settings']) {
      const link = page.getByRole('link', { name: item }).first();
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForTimeout(600);
        await shot(page, `11-nav-${item.toLowerCase()}.png`);
      } else {
        console.log('nav item not found as link:', item);
      }
    }

    // 8. Upgrade modal via custom event (as feature gates do).
    await page.evaluate(() =>
      document.dispatchEvent(new CustomEvent('lance:open-upgrade', { detail: 'Test Feature' })),
    );
    await page.waitForTimeout(500);
    await shot(page, '12-upgrade-modal.png');
    const upgradeVisible = await page
      .getByRole('dialog', { name: 'Unlock Pro depth' })
      .isVisible()
      .catch(() => false);
    console.log('upgrade modal visible:', upgradeVisible);
    // Escape should close it.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    console.log(
      'upgrade modal after Escape:',
      await page
        .getByRole('dialog', { name: 'Unlock Pro depth' })
        .isVisible()
        .catch(() => false),
    );

    console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors.slice(0, 20), null, 2));
    console.log('PAGE ERRORS:', JSON.stringify(pageErrors.slice(0, 20), null, 2));
  });
});
