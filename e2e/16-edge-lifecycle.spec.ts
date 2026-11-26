import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { addClient, gotoApp, seedReady, shot, watchConsole } from './helpers';

const CLIENT = 'Round Trip Client';

test.describe('edge 7 · export → reset → import round trip', () => {
  test('a created client survives a backup round trip', async ({ page }) => {
    page.setDefaultTimeout(15000);
    const errors = watchConsole(page);
    await seedReady(page);
    await gotoApp(page, '/clients');
    await addClient(page, CLIENT);

    await gotoApp(page, '/settings');
    await page.getByRole('button', { name: 'Data & Backup', exact: true }).click();
    await expect(page.getByText('Export all data')).toBeVisible();
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.getByRole('button', { name: 'Export', exact: true }).first().click();
    const download = await downloadPromise;
    const envelope = JSON.parse(await readFile((await download.path())!, 'utf8'));
    console.log(`[evidence] export file=${download.suggestedFilename()} lance_backup=${envelope.lance_backup} schema_version=${envelope.schema_version} tables=${Object.keys(envelope.data || {}).length} clients=${(envelope.data?.clients || []).length}`);
    expect(envelope.lance_backup).toBe(true);
    expect(typeof envelope.schema_version).toBe('number');
    expect(Object.keys(envelope.data || {}).length, 'backup has no tables').toBeGreaterThan(0);
    expect((envelope.data?.clients || []).length, 'backup has no clients').toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Danger Zone', exact: true }).click();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    const reset = page.getByRole('dialog', { name: 'Reset all data' });
    await expect(reset).toBeVisible();
    await reset.getByRole('textbox').fill('Lance, The Tool for Freelancers');
    await reset.getByRole('button', { name: 'Delete everything' }).click();
    await page.waitForTimeout(1800);
    await gotoApp(page, '/clients');
    expect(await page.getByRole('heading', { name: CLIENT, exact: true }).isVisible().catch(() => false), 'client survived reset').toBe(false);
    console.log('[evidence] client absent after reset');

    await gotoApp(page, '/settings');
    await page.getByRole('button', { name: 'Data & Backup', exact: true }).click();
    await page.locator('input[type=file][accept*="json"]').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(envelope)),
    });
    const summary = page.getByRole('dialog', { name: /Import/i }).first();
    await expect(summary).toBeVisible();
    console.log(`[evidence] import summary: ${(await summary.innerText()).replace(/\n/g, ' | ').slice(0, 200)}`);
    await summary.getByRole('button', { name: 'Import', exact: true }).click();
    await page.waitForTimeout(1500);
    await gotoApp(page, '/clients');
    await expect(page.getByRole('heading', { name: CLIENT, exact: true })).toBeVisible({ timeout: 10000 });
    const path = await shot(page, 'edge-lifecycle-roundtrip');
    console.log(`[evidence] screenshot ${path}`);
    console.log('[evidence] client restored after import');
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
