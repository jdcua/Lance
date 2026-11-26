import { expect, test, type Page } from '@playwright/test';
import { gotoApp, seedReady, shot, watchConsole } from './helpers';

/**
 * Beyond spec 03/11: create + view the entities that had no E2E create path
 * at all (expense, contract) and exercise the client detail tabs. No deletes.
 */

async function makeClient(page: Page, name: string) {
  await gotoApp(page, '/clients');
  await page.getByRole('button', { name: 'Add client' }).click();
  const d = page.getByRole('dialog', { name: 'New Client' });
  await d.getByRole('textbox', { name: 'Name *' }).fill(name);
  await d.getByRole('button', { name: 'Add Client', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

test.describe('exhaustive · additional CRUD surfaces', () => {
  test('expense create writes a record that appears in Finance', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await makeClient(page, 'Expense Client');
    await gotoApp(page, '/finance');
    await page.getByRole('button', { name: 'Add Expense' }).first().click();
    const d = page.getByRole('dialog');
    await expect(d).toBeVisible();
    await d.locator('select').selectOption({ label: 'Software' });
    await d.getByPlaceholder('What was this expense for?').fill('QA seat licence');
    await d.locator('input[type=number]').first().fill('19.99');
    await d.getByRole('button', { name: 'Add Expense', exact: true }).click();
    await expect(d).toBeHidden();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lance:store:expenses') || '[]') as Array<Record<string, unknown>>);
    expect(stored.some((e) => e.description === 'QA seat licence' && Number(e.amount) === 19.99)).toBe(true);
    await expect(page.getByRole('main')).toContainText('QA seat licence');
    const path = await shot(page, 'qa5-expense-created');
    console.log(`[evidence] expense stored and visible; screenshot=${path}`);
    expect(errors, `expense console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('contract create from a client writes a draft shown on /contracts', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await makeClient(page, 'Contract Client');
    await gotoApp(page, '/contracts');
    await expect(page.getByRole('button', { name: 'New Contract' }).first()).toBeEnabled();
    await page.getByRole('button', { name: 'New Contract' }).first().click();
    const d = page.getByRole('dialog', { name: /Contract/ });
    await expect(d).toBeVisible();
    await d.getByRole('combobox', { name: 'Select a client...' }).click();
    await page.getByRole('option', { name: /Contract Client/ }).click();
    await d.getByPlaceholder('Contract title').fill('QA Services Agreement');
    await d.getByRole('button', { name: 'Create Contract' }).click();
    await expect(d).toBeHidden();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lance:store:contracts') || '[]') as Array<Record<string, unknown>>);
    expect(stored.some((c) => c.title === 'QA Services Agreement')).toBe(true);
    await expect(page.getByRole('main')).toContainText('QA Services Agreement');
    await shot(page, 'qa5-contract-created');
    console.log('[evidence] contract draft stored and visible on /contracts');
    expect(errors, `contract console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('client detail exposes Overview / Metrics / Timeline without errors', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await makeClient(page, 'Detail Client');
    await page.getByRole('button', { name: /Detail Client/ }).first().click();
    const main = page.getByRole('main');
    // These tabs are plain buttons (no tablist role), so assert the content
    // actually swaps rather than an aria-selected attribute that does not exist.
    await expect(main.getByRole('button', { name: 'Overview', exact: true })).toBeVisible();
    const overview = await main.innerText();
    await main.getByRole('button', { name: 'Metrics', exact: true }).click();
    const metrics = await main.innerText();
    expect(metrics, 'Metrics tab did not change the detail panel').not.toBe(overview);
    await main.getByRole('button', { name: 'Timeline', exact: true }).click();
    const timeline = await main.innerText();
    expect(timeline, 'Timeline tab did not change the detail panel').not.toBe(metrics);
    await main.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Log interaction' })).toBeVisible();
    await shot(page, 'qa5-client-detail-tabs');
    console.log('[evidence] client detail tabs all selectable; no destructive action taken');
    expect(errors, `client detail console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('time entry list renders the quick-logged entry after a full reload', async ({ page }) => {
    await seedReady(page);
    await makeClient(page, 'Time Client');
    await gotoApp(page, '/projects');
    await page.getByRole('button', { name: 'New project' }).last().click();
    const p = page.getByRole('dialog', { name: 'New Project' });
    await p.getByRole('combobox', { name: 'Select a client...' }).click();
    await page.getByRole('option', { name: /Time Client/ }).click();
    await p.getByPlaceholder('Project title').fill('Time Project');
    await p.getByRole('button', { name: 'Create Project' }).click();
    await page.getByRole('dialog', { name: 'New Project' }).waitFor({ state: 'hidden' });

    await page.keyboard.press('Control+Shift+L');
    const q = page.getByRole('dialog', { name: 'Quick Log Time' });
    await q.locator('select').selectOption({ label: 'Time Project' });
    await q.getByPlaceholder('e.g. 30').fill('60');
    await q.getByPlaceholder('What did you work on?').fill('Persisted hour');
    await q.getByRole('button', { name: 'Log', exact: true }).click();
    await expect(q).toBeHidden();
    await expect.poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('lance:store:time_entries') || '[]').length),
    ).toBe(1);
    await gotoApp(page, '/time');
    await expect(page.getByRole('main')).toContainText('Persisted hour');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('main')).toContainText('Persisted hour');
    console.log('[evidence] time entry survived a full page reload');
  });
});
