import { expect, test } from '@playwright/test';
import { addClient, gotoApp, seedReady, shot, watchConsole } from './helpers';

const CLIENT = 'Guard Client';

test.describe('edge 2 · delete guards for a referenced client', () => {
  test('blocking a client linked to a project and an invoice warns and keeps the row', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await gotoApp(page, '/clients');
    await addClient(page, CLIENT);

    await gotoApp(page, '/projects');
    const projectDialog = page.getByRole('dialog', { name: 'New Project' });
    await page.getByRole('button', { name: 'New project' }).last().click();
    await projectDialog.getByRole('combobox', { name: 'Select a client...' }).click();
    await page.getByRole('option', { name: new RegExp(CLIENT) }).click();
    await projectDialog.getByPlaceholder('Project title').fill('Guard Project');
    await projectDialog.getByRole('button', { name: 'Create Project' }).click();
    await expect(page.getByText('Guard Project').first()).toBeVisible({ timeout: 10000 });

    await gotoApp(page, '/invoices');
    await page.getByRole('button', { name: 'New Invoice' }).last().click();
    const invoiceDialog = page.getByRole('dialog', { name: 'New Invoice' });
    await invoiceDialog.getByRole('combobox', { name: 'Select a client...' }).click();
    await page.getByRole('option', { name: new RegExp(CLIENT) }).click();
    await invoiceDialog.getByPlaceholder('Description').first().fill('Guard line');
    await invoiceDialog.getByPlaceholder('Rate').first().fill('250');
    await invoiceDialog.getByRole('button', { name: 'Create Invoice' }).click();
    await expect(invoiceDialog).toBeHidden({ timeout: 10000 });
    await expect(page.getByRole('main')).toContainText('INV-001');

    await gotoApp(page, '/clients');
    await page.getByRole('button', { name: 'Delete client' }).click();
    const confirm = page.getByRole('dialog', { name: 'Delete Client' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
    const alert = page.getByRole('alert').first();
    await expect(alert).toContainText('Cannot delete this client', { timeout: 10000 });
    const message = await alert.innerText();
    console.log(`[evidence] delete warning: "${message}"`);
    const path = await shot(page, 'edge-delete-guard');
    console.log(`[evidence] screenshot ${path}`);

    expect(message, `warning did not name both dependents: "${message}"`).toMatch(/project/i);
    expect(message, `warning did not name both dependents: "${message}"`).toMatch(/invoice/i);
    expect(await confirm.isVisible(), 'confirm dialog should remain after a blocked delete').toBe(true);
    expect(await page.getByRole('heading', { name: CLIENT, exact: true }).isVisible(), 'client row survived').toBe(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: new RegExp(CLIENT) })).toBeVisible({ timeout: 10000 });
    console.log('[evidence] client still present after blocked delete and reload');
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
