import { expect, test } from '@playwright/test';
import { addClient, gotoApp, seedReady, shot } from './helpers';

const CLIENT = 'QA E2E Client';
const EDITED = 'QA E2E Client Edited';

test.describe('flow 3 · core CRUD in browser (localStorage shim)', () => {
  test('client create → persists reload → edit → delete', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/clients');

    await addClient(page, CLIENT);
    await shot(page, '06-client-created');

    // Persistence across a full page reload.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: new RegExp(CLIENT) })).toBeVisible({ timeout: 10000 });
    console.log(`[evidence] client persisted after reload: "${CLIENT}"`);

    // Edit.
    await page.getByRole('button', { name: 'Edit client' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Client' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByRole('textbox', { name: 'Name *' }).fill(EDITED);
    await editDialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('heading', { name: EDITED, exact: true })).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: new RegExp(EDITED) })).toBeVisible();
    console.log(`[evidence] edited client persisted after reload: "${EDITED}"`);

    // Delete.
    await page.getByRole('button', { name: 'Delete client' }).click();
    const confirm = page.getByRole('dialog', { name: 'Delete Client' });
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText(EDITED);
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Your roster awaits')).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Your roster awaits')).toBeVisible();
    await shot(page, '07-client-deleted');
    console.log('[evidence] deleted client absent after reload; empty state present');
  });

  test('project create appears and persists after reload', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/clients');
    await addClient(page, 'Project Owner');

    await gotoApp(page, '/projects');
    const newProject = page.getByRole('button', { name: 'New project' }).last();
    await expect(newProject).toBeEnabled();
    await newProject.click();
    const dialog = page.getByRole('dialog', { name: 'New Project' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Select a client...' }).click();
    await page.getByRole('option', { name: /Project Owner/ }).click();
    await dialog.getByPlaceholder('Project title').fill('QA E2E Project');
    await dialog.getByRole('button', { name: 'Create Project' }).click();

    await expect(page.getByText('QA E2E Project').first()).toBeVisible({ timeout: 10000 });
    await shot(page, '08-project-created');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('QA E2E Project').first()).toBeVisible({ timeout: 10000 });
    console.log('[evidence] project persisted after reload');
  });
});
