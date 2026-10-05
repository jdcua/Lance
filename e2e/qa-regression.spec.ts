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
    // Wait for the dialog itself before asserting its contents: the modal
    // animates in, and asserting children first races the entrance.
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
    await expect.soft(page.getByText('Set up Lance')).toBeVisible({ timeout: 10_000 });
    const splashOnFirstRun = await page
      .getByRole('dialog', { name: 'Lance Pro' })
      .isVisible()
      .catch(() => false);
    console.log('splash stacked over onboarding (want false):', splashOnFirstRun);
    expect(splashOnFirstRun).toBe(false);

    // 2. Onboarding shell: title, labeled stepper, skip link, wider modal.
    //    Five steps now — Comfort leads, then Your craft / profile / theme /
    //    Rates & data. Step 1 must offer a way forward: it used to render the
    //    Comfort panel with no Continue button, so a first-run user was stuck
    //    there and could only bail out via "Skip setup".
    await expect.soft(page.getByText('Step 1 of 5 · Comfort')).toBeVisible();
    await expect.soft(page.getByRole('button', { name: 'Skip setup' })).toBeVisible();
    await expect
      .soft(page.getByRole('button', { name: /Continue/ }))
      .toBeVisible({ timeout: 5000 });
    await shot(page, '21-onboarding-step1-v2.png');

    // 3. X = finish later (from the profile step, so there is progress to
    // resume): closes WITHOUT completing; reload resumes with banner.
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect.soft(page.getByText('Step 2 of 5 · Your craft')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Developer / Engineer' }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect.soft(page.getByText('Step 3 of 5 · Your profile')).toBeVisible({ timeout: 10_000 });
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

    // 4. Walk through to the end with sample data (resumed on the profile
    // step, profession carried over from the persisted profile).
    await expect
      .soft(page.getByText('Step 3 of 5 · Your profile'))
      .toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder('Your full name').fill('QA Tester');
    await page.getByPlaceholder('you@example.com').fill('qa@example.com');
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect.soft(page.getByText('Step 4 of 5 · Your theme')).toBeVisible({ timeout: 10_000 });
    await shot(page, '23-onboarding-step4.png');
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect.soft(page.getByText('Rates & sample data')).toBeVisible({ timeout: 10_000 });
    await shot(page, '24-onboarding-step5.png');
    await page.getByText('Yes, show me around').click();

    // 5. Walkthrough appears after setup. It was redesigned into a "Welcome
    //    back" choice (explore alone / take the tour); either way the session
    //    must land somewhere usable, and the upsell splash must not ambush it.
    await expect.soft(page.getByText('Welcome back')).toBeVisible({ timeout: 15_000 });
    await shot(page, '25-walkthrough.png');

    const takeTour = page.getByRole('button', { name: 'Take the tour' });
    if (await takeTour.isVisible().catch(() => false)) {
      await takeTour.click();
      // Walk the spotlight to its end, whatever the primary control is called.
      for (let i = 0; i < 8; i++) {
        const next = page
          .getByRole('button', { name: /^(Next|Continue|Done|Finish|Skip)/i })
          .first();
        if (!(await next.isVisible().catch(() => false))) break;
        const label = (await next.innerText().catch(() => '')) || '';
        await next.click();
        await page.waitForTimeout(350);
        if (/done|finish|skip/i.test(label)) break;
      }
    }
    await page.waitForTimeout(600);
    await shot(page, '26-after-tour.png');

    // Whatever the tour did, the user must be able to act: clear whatever
    // overlay is still up (its own Skip/Done/Explore control, else Escape),
    // navigate to Clients the normal way, then Cmd+N must open New Client.
    for (let i = 0; i < 8; i++) {
      const overlayOpen = await page
        .locator('div.fixed.inset-0.z-\\[60\\]')
        .first()
        .isVisible()
        .catch(() => false);
      if (!overlayOpen) break;
      const dismiss = page
        .getByRole('button', { name: /^(Skip|Done|Finish|Explore on my own|Close|Got it)$/i })
        .first();
      if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(450);
    }
    await page.getByRole('link', { name: /^Clients/ }).first().click({ timeout: 15_000 });
    await page.waitForTimeout(900);
    await page.keyboard.press('Meta+n');
    await page.waitForTimeout(1000);
    const newClientModal = await page
      .getByRole('dialog')
      .filter({ hasText: 'Add Client' })
      .isVisible()
      .catch(() => false);
    console.log('New Client modal opens after setup (want true):', newClientModal);
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
      // First-launch grace: the upsell splash is deliberately withheld until
      // the second launch, so a "returning" user must carry the has-launched
      // marker. Without it the app correctly shows no splash and this test
      // asserted the wrong thing.
      localStorage.setItem('lance:has-launched', 'true');
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
