import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SHOTS = path.resolve(import.meta.dirname, '../qa-shots');
fs.mkdirSync(SHOTS, { recursive: true });

const shot = (page: any, name: string) =>
  page.screenshot({ path: path.join(SHOTS, name) });

test.describe('regression: fixed first-run flows', () => {
  test('splash explicit → onboarding v2 → tour CTA → escape fixes', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
    });
    page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    // 1. First run: onboarding owns the session. Splash is suppressed while
    // onboarding is active (no stacking), and dismissed for the session.
    await page.waitForTimeout(800);
    await shot(page, '20-onboarding-first.png');
    await expect.soft(page.getByText('Set up Lance')).toBeVisible({ timeout: 10_000 });
    const splashOnFirstRun = await page
      .getByRole('dialog', { name: 'Lance Pro' })
      .isVisible()
      .catch(() => false);
    console.log('splash stacked over onboarding (want false):', splashOnFirstRun);
    expect(splashOnFirstRun).toBe(false);

    // 2. Onboarding v2 shell: title, labeled stepper, skip link, wider modal.
    await expect.soft(page.getByText('Set up Lance')).toBeVisible({ timeout: 10_000 });
    await expect.soft(page.getByText('Step 1 of 4 · Your craft')).toBeVisible();
    await expect.soft(page.getByRole('button', { name: 'Skip setup' })).toBeVisible();
    await shot(page, '21-onboarding-step1-v2.png');

    // 3. X = finish later (from step 2, so there is progress to resume):
    // closes WITHOUT completing; reload resumes with banner.
    await page.getByRole('button', { name: 'Developer / Engineer' }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect.soft(page.getByText('Step 2 of 4 · Your profile')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.waitForTimeout(400);
    const completedAfterX = await page.evaluate(() =>
      localStorage.getItem('lance:onboarding-completed'),
    );
    console.log('onboarding-completed after X (want null):', completedAfterX);
    expect(completedAfterX).toBeNull();
    await page.reload();
    await page.waitForTimeout(800);
    await expect.soft(page.getByText('Welcome back. Pick up where you left off.')).toBeVisible({
      timeout: 10_000,
    });
    await shot(page, '22-onboarding-resume.png');

    // 4. Walk through to the end with sample data (resumed on step 2,
    // profession carried over from the persisted profile).
    await expect.soft(page.getByText('Step 2 of 4 · Your profile')).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder('Your full name').fill('QA Tester');
    await page.getByPlaceholder('you@example.com').fill('qa@example.com');
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect.soft(page.getByText('Step 3 of 4 · Your theme')).toBeVisible({ timeout: 10_000 });
    await shot(page, '23-onboarding-step3-v2.png');
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect.soft(page.getByText('Rates & sample data')).toBeVisible({ timeout: 10_000 });
    await shot(page, '24-onboarding-step4-v2.png');
    await page.getByText('Yes, show me around').click();

    // 5. Tour finale CTA: "Add your first client" → /clients + New Client modal.
    await expect.soft(page.getByText('Welcome to Lance')).toBeVisible({ timeout: 15_000 });
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Next' }).click();
      await page.waitForTimeout(300);
    }
    await shot(page, '25-tour-finale.png');
    await page.getByRole('button', { name: 'Add your first client' }).click();
    await page.waitForTimeout(1200);
    console.log('url after tour CTA (want /clients):', page.url());    const newClientModal = await page
      .getByRole('dialog', { name: 'New Client' })
      .isVisible()
      .catch(() => false);
    console.log('New Client modal auto-opened (want true):', newClientModal);
    await shot(page, '26-first-client-modal.png');
    expect(page.url()).toContain('/clients');
    expect(newClientModal).toBe(true);
    // The upsell splash must NOT ambush the session after setup/tour.
    const splashAmbush = await page
      .getByRole('dialog', { name: 'Lance Pro' })
      .isVisible()
      .catch(() => false);
    console.log('splash ambush after tour (want false):', splashAmbush);
    expect(splashAmbush).toBe(false);
    await page.keyboard.press('Escape'); // close New Client modal

    // 6. Escape closes upgrade modal WITHOUT navigating away (Settings guard).
    await page.evaluate(() =>
      document.dispatchEvent(new CustomEvent('lance:open-upgrade', { detail: 'Escape Test' })),
    );
    await page.waitForTimeout(400);
    const urlBefore = page.url();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const upgradeGone = await page
      .getByRole('dialog', { name: 'Unlock Pro depth' })
      .isVisible()
      .catch(() => false);
    console.log('upgrade modal after Escape (want false):', upgradeGone);
    console.log('url unchanged after Escape (want true):', page.url() === urlBefore);
    await shot(page, '27-after-escape.png');
    expect(upgradeGone).toBe(false);
    expect(page.url()).toBe(urlBefore);

    console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors.slice(0, 20), null, 2));
    console.log('PAGE ERRORS:', JSON.stringify(pageErrors.slice(0, 20), null, 2));
    expect(pageErrors).toEqual([]);
  });

  test('returning free user still gets an explicit (non-vanishing) splash', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('lance:onboarding-completed', 'true');
      localStorage.setItem('lance:onboarding-step', 'complete');
    });
    await page.reload();
    await page.waitForTimeout(600);
    await shot(page, '30-splash-returning.png');
    await expect.soft(page.getByRole('dialog', { name: 'Lance Pro' })).toBeVisible({
      timeout: 10_000,
    });
    // Must NOT auto-dismiss: still there past the old 2s fuse.
    await page.waitForTimeout(3000);
    const stillOpen = await page
      .getByRole('dialog', { name: 'Lance Pro' })
      .isVisible()
      .catch(() => false);
    console.log('splash persists past 3s (want true):', stillOpen);
    expect(stillOpen).toBe(true);
    await shot(page, '31-splash-persisted.png');
    // Explicit choice dismisses it.
    await page.getByRole('button', { name: 'Continue free' }).click();
    await page.waitForTimeout(400);
    const gone = await page
      .getByRole('dialog', { name: 'Lance Pro' })
      .isVisible()
      .catch(() => false);
    console.log('splash dismissed by choice (want false):', gone);
    expect(gone).toBe(false);
  });
});
