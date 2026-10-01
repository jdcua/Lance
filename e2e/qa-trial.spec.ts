import { test, expect } from '@playwright/test';

/**
 * Trial-mode QA (?trial=1 activates the same code path the /try/ build
 * serves in production: banner, seeded business, silenced network callers,
 * no upsell splash, export/reset continuity).
 *
 * Run against a trial-flagged dev server (strips webfonts like prod):
 *   VITE_TRIAL=1 npm run dev & npx playwright test e2e/qa-trial.spec.ts --config=e2e.config.ts
 * or override baseURL below to match your server.
 */
test.use({ baseURL: 'http://localhost:1420' });
test.describe('trial mode', () => {
  test.beforeEach(async ({ page }) => {
    // Normalize: start every test from a clean trial slate.
    await page.goto('/?trial=1');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/?trial=1');
  });

  test('banner renders with all four actions', async ({ page }) => {
    await expect(page.getByText('runs 100% in this browser')).toBeVisible({ timeout: 20000 });
    for (const name of ['Export trial data', 'Reset demo', 'Download desktop app', 'Prove it']) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }
  });

  test('seeded business appears after skipping onboarding', async ({ page }) => {
    const skip = page.getByRole('button', { name: 'Skip setup' });
    if ((await skip.count()) > 0) await skip.click();
    await page.goto('/clients?trial=1');
    await expect(page.getByText(/Jordan Avery/).first()).toBeVisible({ timeout: 20000 });
    await page.goto('/invoices?trial=1');
    await expect(page.getByText(/INV-00/).first()).toBeVisible({ timeout: 20000 });
  });

  test('no upsell splash on repeat loads', async ({ page }) => {
    await page.goto('/?trial=1');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('button', { name: 'Try Pro free for 30 days' })).toHaveCount(0);
  });

  test('verify panel lists local storage keys', async ({ page }) => {
    const skip = page.getByRole('button', { name: 'Skip setup' });
    if ((await skip.count()) > 0) await skip.click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Prove it' }).click();
    await expect(page.getByText(/lance:store:/).first()).toBeVisible({ timeout: 10000 });
  });

  test('export downloads a valid desktop envelope', async ({ page }) => {
    const skip = page.getByRole('button', { name: 'Skip setup' });
    if ((await skip.count()) > 0) await skip.click();
    const dlPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export trial data' }).click();
    const dl = await dlPromise;
    const dlPath = await dl.path();
    const fs = await import('node:fs');
    const envelope = JSON.parse(fs.readFileSync(dlPath, 'utf8'));
    expect(envelope.lance_backup).toBe(true);
    expect(typeof envelope.schema_version).toBe('number');
    expect((envelope.data.clients || []).length).toBeGreaterThan(0);
  });

  test('reset removes created data and restores seeds', async ({ page }) => {
    const skip = page.getByRole('button', { name: 'Skip setup' });
    if ((await skip.count()) > 0) await skip.click();
    await page.goto('/clients?trial=1');
    await expect(page.getByText(/Jordan Avery/).first()).toBeVisible({ timeout: 20000 });
    await page.getByText('Add client').click();
    await page.getByPlaceholder('Client name').fill('E2E Testerson');
    await page.getByRole('button', { name: 'Add Client' }).last().click();
    await expect(page.getByText('E2E Testerson').first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Reset demo' }).click();
    // Reset reloads the page; wait for the app to boot again.
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    await expect(page.getByText('E2E Testerson')).toHaveCount(0);
    await page.goto('/clients?trial=1');
    await expect(page.getByText(/Jordan Avery/).first()).toBeVisible({ timeout: 20000 });
  });

  test('no third-party requests during a session', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (req) => {
      const origin = new URL(req.url()).origin;
      if (origin !== new URL(page.url()).origin && !req.url().startsWith('blob:')) {
        external.push(req.url());
      }
    });
    await page.goto('/?trial=1');
    await page.waitForTimeout(3000);
    const skip = page.getByRole('button', { name: 'Skip setup' });
    if ((await skip.count()) > 0) await skip.click();
    await page.goto('/invoices?trial=1');
    await page.waitForTimeout(3000);
    expect(external).toEqual([]);
  });

  test('uploaded file bytes survive a reload (IndexedDB, zero server)', async ({ page }) => {
    const skip = page.getByRole('button', { name: 'Skip setup' });
    if ((await skip.count()) > 0) await skip.click();
    await page.goto('/assets?trial=1');
    // 1x1 red PNG fixture, no fixture file needed.
    const red = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'e2e-red.png',
      mimeType: 'image/png',
      buffer: red,
    });
    await expect(page.getByText('e2e-red.png').first()).toBeVisible({ timeout: 15000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await expect(page.getByText('e2e-red.png').first()).toBeVisible({ timeout: 15000 });
    const thumb = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img')).some((i) => i.src.startsWith('blob:')),
    );
    expect(thumb).toBe(true);
  });
});
