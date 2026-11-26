import { expect, test, type Page } from '@playwright/test';
import { gotoApp, seedReady, shot, watchConsole } from './helpers';

/** Beyond spec 04/06/15: actually *running* the global tools, not just opening them. */

async function seedClientProject(page: Page, client: string, project: string) {
  await gotoApp(page, '/clients');
  await page.getByRole('button', { name: 'Add client' }).click();
  const c = page.getByRole('dialog', { name: 'New Client' });
  await c.getByRole('textbox', { name: 'Name *' }).fill(client);
  await c.getByRole('button', { name: 'Add Client', exact: true }).click();
  await expect(page.getByRole('heading', { name: client, exact: true })).toBeVisible();

  await gotoApp(page, '/projects');
  await expect(page.getByRole('button', { name: 'New project' }).last()).toBeEnabled();
  await page.getByRole('button', { name: 'New project' }).last().click();
  const p = page.getByRole('dialog', { name: 'New Project' });
  await p.getByRole('combobox', { name: 'Select a client...' }).click();
  await page.getByRole('option', { name: new RegExp(client) }).click();
  await p.getByPlaceholder('Project title').fill(project);
  await p.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByText(project).first()).toBeVisible();
}

const entries = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('lance:store:time_entries') || '[]') as Array<Record<string, unknown>>);

test.describe('exhaustive · global tools', () => {
  test('topbar Timer starts a real entry; a backdated running entry stops into a saved entry', async ({ page }) => {
    const errors = watchConsole(page);
    await seedReady(page);
    await seedClientProject(page, 'Timer Client', 'Timer Project');
    await gotoApp(page, '/');
    // Let mount effects register the command listener before dispatching.
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Timer', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Timer started · Timer Project' })).toBeVisible();
    const started = await entries(page);
    expect(started.length, 'no time entry created on start').toBe(1);
    expect(started[0].end_time, 'started entry should be open').toBeFalsy();

    // Backdate the open entry, reload so the store re-reads it, then stop.
    const backdated = new Date(Date.now() - 5 * 60_000).toISOString();
    await page.evaluate((iso) => {
      const list = JSON.parse(localStorage.getItem('lance:store:time_entries') || '[]') as Array<Record<string, unknown>>;
      list[0].start_time = iso;
      localStorage.setItem('lance:store:time_entries', JSON.stringify(list));
    }, backdated);
    // Full navigation through gotoApp waits for the React-rendered shell, so
    // the Timer click cannot land before its listener is attached.
    await gotoApp(page, '/');
    await page.waitForLoadState('networkidle');
    expect((await entries(page))[0].start_time).toBe(backdated);
    await page.getByRole('button', { name: 'Timer', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /Timer stopped/ })).toBeVisible();
    const stopped = await entries(page);
    expect(stopped[0].end_time, 'stopped entry was not closed').toBeTruthy();
    expect(Number(stopped[0].duration_minutes)).toBeGreaterThanOrEqual(4);
    const path = await shot(page, 'qa5-timer-stopped');
    console.log(`[evidence] stopped entry duration=${stopped[0].duration_minutes}, screenshot=${path}`);
    expect(errors, `timer console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('Quick Log Time actually writes an entry that shows on /time', async ({ page }) => {
    await seedReady(page);
    await seedClientProject(page, 'Quick Client', 'Quick Project');
    await page.keyboard.press('Control+Shift+L');
    const d = page.getByRole('dialog', { name: 'Quick Log Time' });
    await expect(d).toBeVisible();
    await d.locator('select').selectOption({ label: 'Quick Project' });
    await d.getByPlaceholder('e.g. 30').fill('45');
    await d.getByPlaceholder('What did you work on?').fill('Logged via quick tool');
    await d.getByRole('button', { name: 'Log', exact: true }).click();
    await expect(d).toBeHidden();
    await expect.poll(async () => (await entries(page)).length).toBe(1);
    expect((await entries(page))[0]).toMatchObject({ description: 'Logged via quick tool', duration_minutes: 45 });
    await gotoApp(page, '/time');
    await expect(page.getByRole('main')).toContainText('Logged via quick tool');
    console.log('[evidence] quick-log entry present on /time');
  });

  test('palette Enter navigates; "Search all results" command opens /search?q=', async ({ page }) => {
    await seedReady(page);
    await seedClientProject(page, 'Palette Client', 'Palette Target Project');
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    const input = palette.getByRole('combobox', { name: 'Search clients, projects, invoices and more' });
    await input.fill('Palette Target Project');
    await expect(palette.getByRole('option', { name: /Palette Target Project/ }).first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('heading', { name: 'Projects' })).toBeVisible();

    await page.keyboard.press('Control+k');
    await input.fill('Palette Client');
    const footer = palette.getByRole('option', { name: /Search all results for/ });
    await expect(footer).toBeVisible();
    await footer.click();
    await expect(page).toHaveURL(/\/search\?q=Palette%20Client$/);
    await expect(page.getByRole('main')).toContainText('Palette Client');
    console.log(`[evidence] palette commands navigated to ${page.url()}`);
  });

  test('shortcut sheet, digit jump and settings chord all work', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/');
    await page.keyboard.press('Control+/');
    const sheet = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Command palette');
    await expect(sheet).toContainText('Start/stop timer');
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();

    await page.keyboard.press('Control+2');
    await expect(page).toHaveURL(/\/clients$/);
    await page.keyboard.press('Control+,');
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('main')).toContainText('General');
    console.log('[evidence] Ctrl+/ sheet, Ctrl+2 jump, Ctrl+, settings verified');
  });

  test('drag-and-drop import overlay appears on dragenter and clears on dragleave', async ({ page }) => {
    await seedReady(page);
    await gotoApp(page, '/');
    const overlayText = page.getByText('Drop files to import');
    await expect(overlayText).toHaveCount(0);
    // The app listens on `document`; dispatching on `window` would not bubble down.
    await page.evaluate(() => document.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: new DataTransfer() })));
    await expect(overlayText).toBeVisible();
    await shot(page, 'qa5-dropzone-overlay');
    await page.evaluate(() => document.dispatchEvent(new DragEvent('dragleave', { bubbles: true, dataTransfer: new DataTransfer() })));
    await expect(overlayText).toHaveCount(0);
    console.log('[evidence] dragenter/dragleave overlay toggled correctly');
  });
});
