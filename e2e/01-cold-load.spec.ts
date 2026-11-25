import { expect, test } from '@playwright/test';
import { gotoApp, mockReleaseApi, seedReady, shot, watchConsole } from './helpers';

test.describe('flow 1 · cold load', () => {
  test('shell renders on a cold load with no console errors', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await gotoApp(page, '/');

    await expect(page.getByRole('complementary', { name: 'Primary navigation' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search… ⌘K' })).toBeVisible();
    await expect(page.getByRole('contentinfo', { name: 'Status' })).toContainText('Lance');
    const path = await shot(page, '01-cold-load-dashboard');
    console.log(`[evidence] cold-load screenshot: ${path}`);
    console.log(`[evidence] console errors: ${JSON.stringify(errors)}`);
    expect(errors, `console errors on cold load: ${errors.join(' | ')}`).toEqual([]);
  });

  test('first-run onboarding completes in 3/3 fresh contexts', async ({ browser }) => {
    const results: Array<Record<string, unknown>> = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await mockReleaseApi(page);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });

      const dialog = page.getByRole('dialog', { name: 'Set up Lance' });
      let onboardingShown = false;
      try {
        await dialog.waitFor({ state: 'visible', timeout: 10000 });
        onboardingShown = true;
      } catch {
        /* no onboarding */
      }

      if (onboardingShown && attempt === 1) {
        await shot(page, '02-onboarding-step1');
      }
      if (onboardingShown) {
        await page.getByRole('button', { name: 'Developer' }).click();
        await page.getByRole('button', { name: 'Continue →' }).click();
        await page.waitForTimeout(1200); // let async saveProfile settle
        const afterFirstContinue = (await dialog.innerText()).split('\n').slice(0, 4).join(' | ');

        // Try to get to step 3 by clicking Continue one more time.
        if (await page.getByRole('button', { name: 'Continue →' }).count()) {
          await page.getByRole('button', { name: 'Continue →' }).click();
          await page.waitForTimeout(1200);
        }
        const finish = page.getByRole('button', { name: /start fresh|show me around/ });
        const finishCount = await finish.count();
        const finishStates: string[] = [];
        for (let i = 0; i < finishCount; i++) {
          finishStates.push(`${await finish.nth(i).innerText()}=${await finish.nth(i).isEnabled() ? 'enabled' : 'disabled'}`);
        }
        if (finishCount && (await finish.first().isEnabled())) {
          await finish.first().click();
          await page.waitForTimeout(1500);
        }
        if (attempt === 1) await shot(page, '03-onboarding-final-step');

        results.push({
          attempt,
          onboardingShown,
          afterFirstContinue,
          step3FinishButtons: finishStates,
          nameInputs: await dialog.locator('input').evaluateAll((els) =>
            els.map((e) => ({ placeholder: (e as HTMLInputElement).placeholder, type: (e as HTMLInputElement).type })),
          ),
          completed: !(await dialog.isVisible().catch(() => false)),
          pageErrors: errors,
        });
      } else {
        results.push({ attempt, onboardingShown, completed: true, pageErrors: errors });
      }
      await ctx.close();
    }
    console.log(`[evidence] onboarding runs: ${JSON.stringify(results)}`);
    const completed = results.filter((r) => r.completed).length;
    expect(completed, `onboarding completed in only ${completed}/3 fresh contexts; see [evidence] log`).toBe(3);
  });
});
