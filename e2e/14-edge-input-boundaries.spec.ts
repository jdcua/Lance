import { expect, test } from '@playwright/test';
import { addClient, gotoApp, seedReady, shot, watchConsole } from './helpers';

test.describe('edge 5 · form input boundaries', () => {
  test('empty submit is blocked; 1.2k-char name is bounded to the field max', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await gotoApp(page, '/clients');
    await page.getByRole('button', { name: 'Add client' }).click();
    const dialog = page.getByRole('dialog', { name: 'New Client' });
    const submit = dialog.getByRole('button', { name: 'Add Client', exact: true });
    expect(await submit.isDisabled(), 'empty submit should be disabled').toBe(true);
    console.log('[evidence] empty New Client submit is disabled');

    const name = 'X'.repeat(1200);
    await dialog.getByRole('textbox', { name: 'Name *' }).fill(name);
    const inputLen = (await dialog.getByRole('textbox', { name: 'Name *' }).inputValue()).length;
    console.log(`[evidence] 1200-char paste truncated in input to ${inputLen}`);
    expect(inputLen).toBe(200);
    await submit.click();
    await expect(page.getByRole('heading', { name: 'X'.repeat(200), exact: true })).toBeVisible({ timeout: 10000 });
    const stored = await page.evaluate(() =>
      (JSON.parse(localStorage.getItem('lance:store:clients') || '[]') as { name: string }[]).map((c) => c.name.length),
    );
    console.log(`[evidence] stored client name lengths: ${JSON.stringify(stored)}`);
    expect(stored).toEqual([200]);
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('special characters are stored as text, not executed', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await gotoApp(page, '/clients');
    await page.getByRole('button', { name: 'Add client' }).click();
    const dialog = page.getByRole('dialog', { name: 'New Client' });
    const weird = `O'Brien & Sons; <script>alert(1)</script> "quoted" --`;
    await dialog.getByRole('textbox', { name: 'Name *' }).fill(weird);
    await dialog.getByRole('button', { name: 'Add Client', exact: true }).click();
    await expect(page.getByRole('main', { name: 'Main content' })).toContainText("O'Brien & Sons", { timeout: 10000 });
    const storedName = await page.evaluate(() =>
      (JSON.parse(localStorage.getItem('lance:store:clients') || '[]') as { name: string }[])[0]?.name ?? '',
    );
    console.log(`[evidence] stored special-char name: "${storedName}"`);
    const path = await shot(page, 'edge-input-special-chars');
    console.log(`[evidence] screenshot ${path}`);
    expect(storedName).toContain("O'Brien & Sons");
    expect(storedName).not.toContain('<script>');
    expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('negative and zero invoice values are clamped and blocked', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await gotoApp(page, '/clients');
    await addClient(page, 'Numeric Client');
    await gotoApp(page, '/invoices');
    await page.getByRole('button', { name: 'New Invoice' }).last().click();
    const dialog = page.getByRole('dialog', { name: 'New Invoice' });
    await dialog.getByRole('combobox', { name: 'Select a client...' }).click();
    await page.getByRole('option', { name: /Numeric Client/ }).click();
    await dialog.getByPlaceholder('Description').first().fill('Negative values');
    await dialog.getByPlaceholder('Qty').first().fill('-3');
    await dialog.getByPlaceholder('Rate').first().fill('-25');
    const tax = dialog.locator('input[type=number]').nth(2);
    await tax.fill('-9');
    const qty = await dialog.getByPlaceholder('Qty').first().inputValue();
    const rate = await dialog.getByPlaceholder('Rate').first().inputValue();
    const taxValue = await tax.inputValue();
    console.log(`[evidence] clamped qty=${JSON.stringify(qty)} rate=${JSON.stringify(rate)} tax=${JSON.stringify(taxValue)}`);
    expect(taxValue).toBe('0');
    expect(qty === '' || Number(qty) === 0).toBe(true);
    expect(rate === '' || Number(rate) === 0).toBe(true);
    await dialog.getByRole('button', { name: 'Create Invoice' }).click();
    const alert = page.getByRole('alert').first();
    await expect(alert).toContainText('total looks off', { timeout: 10000 });
    console.log(`[evidence] zero-total rejection: "${await alert.innerText()}"`);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lance:store:invoices') || '[]').length);
    expect(stored).toBe(0);
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
