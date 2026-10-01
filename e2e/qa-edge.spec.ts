import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SHOTS = path.resolve(import.meta.dirname, '../qa-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page: any, name: string) => page.screenshot({ path: path.join(SHOTS, name) });

async function fresh(page: any, seed: Record<string, string> = {}) {
  await page.goto('/');
  await page.evaluate((s: Record<string, string>) => {
    localStorage.clear();
    sessionStorage.clear();
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, seed);
  await page.reload();
  await page.waitForTimeout(800);
}

function errors(page: any) {
  const ce: string[] = [];
  const pe: string[] = [];
  page.on('console', (m: any) => {
    if (m.type() === 'error') ce.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e: any) => pe.push(String(e).slice(0, 200)));
  return { ce, pe };
}

test.describe('edge cases, new-user eyes', () => {
  test('E1: Skip setup link → tour still offered, no half-profile', async ({ page }) => {
    const { ce, pe } = errors(page);
    await fresh(page);
    await page.getByRole('button', { name: 'Skip setup' }).click();
    await page.waitForTimeout(600);
    await expect
      .soft(page.getByRole('button', { name: 'Take the tour' }))
      .toBeVisible({ timeout: 10_000 });
    await shot(page, '32-skip-goes-to-tour.png');
    console.log(
      'completed flag:',
      await page.evaluate(() => localStorage.getItem('lance:onboarding-completed')),
    );
    console.log(
      'tour-pending:',
      await page.evaluate(() => localStorage.getItem('lance:tour-pending')),
    );
    console.log('ERRORS:', JSON.stringify([...ce, ...pe].slice(0, 10)));
  });

  test('E2: X on step 1 (no progress) → reload starts clean, no banner', async ({ page }) => {
    const { ce, pe } = errors(page);
    await fresh(page);
    await expect.soft(page.getByText('Set up Lance')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.waitForTimeout(400);
    console.log(
      'step after X:',
      await page.evaluate(() => localStorage.getItem('lance:onboarding-step')),
    );
    await page.reload();
    await page.waitForTimeout(800);
    const banner = await page
      .getByText('pick up where you left off')
      .isVisible()
      .catch(() => false);
    console.log('resume banner on clean slate (want false):', banner);
    await shot(page, '33-x-step1-reload.png');
    console.log('ERRORS:', JSON.stringify([...ce, ...pe].slice(0, 10)));
  });

  test('E3: whitespace-only name + weird rates', async ({ page }) => {
    const { ce, pe } = errors(page);
    await fresh(page);
    await page.getByRole('button', { name: 'Developer / Engineer' }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByPlaceholder('Your full name').fill('   ');
    const cont = page.getByRole('button', { name: /Continue/ });
    console.log('continue disabled w/ spaces-only name (want true):', await cont.isDisabled());
    await page.getByPlaceholder('Your full name').fill('QA');
    await page.getByPlaceholder('you@example.com').fill('qa@example.com');
    await cont.click();
    await page.getByRole('button', { name: /Continue/ }).click(); // themes → step 4
    await expect.soft(page.getByText('Rates & sample data')).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder('e.g. 75').fill('-50');
    await shot(page, '34-negative-rate.png');
    console.log(
      'negative rate accepted in field (observe):',
      await page.getByPlaceholder('e.g. 75').inputValue(),
    );
    await page.getByText('Skip -- start fresh').click();
    await page.waitForTimeout(1500);
    await shot(page, '35-fresh-empty-dashboard.png');
    console.log('ERRORS:', JSON.stringify([...ce, ...pe].slice(0, 10)));
  });

  test('E4: tour dismissal paths (arrows, dots, skip)', async ({ page }) => {
    const { ce, pe } = errors(page);
    await fresh(page, {
      'lance:onboarding-completed': 'true',
      'lance:onboarding-step': 'complete',
      'lance:tour-pending': 'true',
    });
    // Intro card first (personalized greeting, not a fixed string).
    await expect
      .soft(page.getByRole('button', { name: 'Take the tour' }))
      .toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Take the tour' }).click();
    // Spotlight tour: read the total from the live counter, never hardcode it.
    await expect.soft(page.getByText(/Step 1 of \d+/)).toBeVisible({ timeout: 10_000 });
    const counter = await page
      .getByText(/Step \d+ of \d+/)
      .textContent()
      .catch(() => '');
    const total = parseInt(counter?.match(/of (\d+)/)?.[1] || '0', 10);
    // ArrowRight advances.
    await page.keyboard.press('ArrowRight');
    await expect.soft(page.getByText('Step 2 of')).toBeVisible({ timeout: 10_000 });
    console.log(
      'slide counter after ArrowRight:',
      await page
        .getByText(/Step \d+ of \d+/)
        .textContent()
        .catch(() => 'n/a'),
    );
    // Dot nav jumps to last (dots are real buttons with Go-to-slide labels).
    await page.getByRole('button', { name: `Go to slide ${total}` }).click();
    await expect.soft(page.getByText(`Step ${total} of`)).toBeVisible({ timeout: 10_000 });
    await shot(page, '36-tour-last-slide.png');
    // Skip dismisses.
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await page.waitForTimeout(400);
    const tourGone = await page
      .getByText(/Step \d+ of \d+/)
      .isVisible()
      .catch(() => false);
    console.log('tour dismissed by skip (want false visible):', tourGone);
    console.log(
      'tour-pending after dismiss:',
      await page.evaluate(() => localStorage.getItem('lance:tour-pending')),
    );
    console.log('ERRORS:', JSON.stringify([...ce, ...pe].slice(0, 10)));
  });

  test('E5: splash Try-Pro with no checkout configured', async ({ page }) => {
    const { ce, pe } = errors(page);
    await fresh(page, {
      'lance:onboarding-completed': 'true',
      'lance:onboarding-step': 'complete',
    });
    await expect
      .soft(page.getByRole('dialog', { name: 'Lance Pro' }))
      .toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Try Pro free/ }).click();
    await page.waitForTimeout(800);
    await shot(page, '37-checkout-unconfigured.png');
    const notice = await page
      .getByText(/isn’t configured/)
      .isVisible()
      .catch(() => false);
    console.log('checkout notice shown (want true):', notice);
    const splashStill = await page
      .getByRole('dialog', { name: 'Lance Pro' })
      .isVisible()
      .catch(() => false);
    console.log('splash stays open after failed checkout (want true):', splashStill);
    console.log('ERRORS:', JSON.stringify([...ce, ...pe].slice(0, 10)));
  });

  test('E6: upgrade modal tabs + Escape on dashboard (no settings race)', async ({ page }) => {
    const { ce, pe } = errors(page);
    await fresh(page, {
      'lance:onboarding-completed': 'true',
      'lance:onboarding-step': 'complete',
    });
    // Dismiss splash first.
    await expect
      .soft(page.getByRole('dialog', { name: 'Lance Pro' }))
      .toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Continue free' }).click();
    await page.waitForTimeout(400);
    await page.evaluate(() =>
      document.dispatchEvent(new CustomEvent('lance:open-upgrade', { detail: 'Edge' })),
    );
    await page.waitForTimeout(400);
    for (const tab of ['Yearly', 'Lifetime', 'Monthly']) {
      await page.getByRole('tab', { name: new RegExp(tab) }).click();
      await page.waitForTimeout(250);
    }
    await shot(page, '38-upgrade-tabs.png');
    // Checkout attempt without config → inline notice, modal stays.
    await page
      .getByRole('button', { name: /Buy lifetime|Start 30-day/ })
      .first()
      .click();
    await page.waitForTimeout(600);
    const notice = await page
      .getByText(/isn’t configured/)
      .isVisible()
      .catch(() => false);
    console.log('upgrade inline notice (want true):', notice);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    console.log(
      'upgrade closed by Escape (want false visible):',
      await page
        .getByRole('dialog', { name: 'Unlock Pro depth' })
        .isVisible()
        .catch(() => false),
    );
    console.log('ERRORS:', JSON.stringify([...ce, ...pe].slice(0, 10)));
  });

  test('E7: deep-link reload + license modal Escape guard', async ({ page }) => {
    const { ce, pe } = errors(page);
    // Deep link straight into /clients.
    const resp = await page.goto('/clients');
    console.log('GET /clients status (want 200, SPA fallback?):', resp?.status());
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('lance:onboarding-completed', 'true');
      localStorage.setItem('lance:onboarding-step', 'complete');
    });
    await page.reload();
    await page.waitForTimeout(1000);
    await shot(page, '39-deep-link-clients.png');
    // Settings → license modal → Escape closes modal, stays on settings.
    // (Returning-user splash covers the screen on launch. Dismiss first.)
    await page.goto('/settings');
    await page.waitForTimeout(800);
    const splash7 = page.getByRole('dialog', { name: 'Lance Pro' });
    if (await splash7.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Continue free' }).click();
      await page.waitForTimeout(400);
    }
    // Real launch sequence: changelog follows the splash when unseen.
    const cl7 = page.getByRole('dialog', { name: /What's new/ });
    if (await cl7.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Got it' }).click();
      await page.waitForTimeout(400);
    }
    const enterKey = page.getByRole('button', { name: 'Enter license key' });
    if (await enterKey.isVisible().catch(() => false)) {
      await enterKey.click();
      await page.waitForTimeout(400);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      const licOpen = await page
        .getByRole('dialog', { name: 'Enter your license key' })
        .isVisible()
        .catch(() => false);
      console.log('license modal after Escape (want false):', licOpen);
      console.log('still on settings (want true):', page.url().includes('/settings'));
    } else {
      console.log('Enter license key button not found. Check screenshot');
      await shot(page, '39b-settings-license-tab.png');
    }
    console.log('ERRORS:', JSON.stringify([...ce, ...pe].slice(0, 10)));
  });

  test('E8: changelog appears on new version for returning user', async ({ page }) => {
    const { ce, pe } = errors(page);
    await fresh(page, {
      'lance:onboarding-completed': 'true',
      'lance:onboarding-step': 'complete',
      'lance:changelog-seen': '0.0.0',
    });
    await page.waitForTimeout(1500);
    // Launch sequence: splash first (dismiss), changelog surfaces after.
    const splash8 = page.getByRole('dialog', { name: 'Lance Pro' });
    if (await splash8.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Continue free' }).click();
      await page.waitForTimeout(500);
    }
    const changelog = page.getByRole('dialog', { name: /What's new/ });
    const shown = await changelog.isVisible().catch(() => false);
    console.log('changelog shown for unseen version (want true):', shown);
    if (shown) {
      await shot(page, '40-changelog.png');
      await page.getByRole('button', { name: 'Got it' }).click();
      await page.waitForTimeout(300);
      console.log(
        'seen version persisted:',
        await page.evaluate(() => localStorage.getItem('lance:changelog-seen')),
      );
    }
    console.log('ERRORS:', JSON.stringify([...ce, ...pe].slice(0, 10)));
  });
});
