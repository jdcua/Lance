import { expect, test, type Page } from '@playwright/test';
import { gotoApp, seedReady, shot } from './helpers';

async function openClientDialog(page: Page) {
  await seedReady(page);
  await gotoApp(page, '/clients');
  await page.getByRole('button', { name: 'Add client' }).click();
  return page.getByRole('dialog', { name: 'New Client' });
}

test.describe('edge 6 · keyboard and dialog focus', () => {
  test('Ctrl+K over an open modal leaves the modal open on first Escape (3 runs)', async ({ browser }) => {
    const runs: Array<Record<string, unknown>> = [];
    for (let i = 1; i <= 3; i++) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      const dialog = await openClientDialog(page);
      await page.keyboard.press('Control+k');
      const palette = page.getByRole('dialog', { name: 'Command palette' });
      const paletteOpened = await palette.isVisible().catch(() => false);
      // The palette focuses its input after a short delay; wait for it so the
      // Escape keypress is deterministically delivered to the topmost dialog.
      if (paletteOpened) {
        await expect(palette.locator('input').first()).toBeVisible();
        await page.waitForTimeout(150);
      }
      const modalStayed = await dialog.isVisible().catch(() => false);
      await page.keyboard.press('Escape');
      const paletteAfter = await palette.isVisible().catch(() => false);
      const modalAfter = await dialog.isVisible().catch(() => false);
      runs.push({ i, paletteOpened, modalStayed, paletteAfter, modalAfter });
      if (i === 1) {
        const path = await shot(page, 'edge-palette-over-modal');
        console.log(`[evidence] screenshot ${path}`);
      }
      await ctx.close();
    }
    console.log(`[evidence] palette/modal Escape runs: ${JSON.stringify(runs)}`);
    const correct = runs.filter((r) => r.paletteOpened && r.modalStayed && !r.paletteAfter && r.modalAfter).length;
    expect(correct, `only ${correct}/3 runs dismissed just the palette; see evidence`).toBe(3);
  });

  test('Escape from a single modal returns focus to its trigger (3 runs)', async ({ browser }) => {
    const runs: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await seedReady(page);
      await gotoApp(page, '/clients');
      const trigger = page.getByRole('button', { name: 'Add client' });
      // Keyboard activation leaves focus on the trigger, which is the state
      // focus-return is defined for. A mouse click may not focus the button.
      await trigger.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'New Client' });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      // Focus is restored on the next animation frame.
      await page.waitForTimeout(50);
      const focus = await page.evaluate(() => {
        const el = document.activeElement;
        return el instanceof HTMLElement
          ? `${el.tagName}#${el.id}[aria-label=${el.getAttribute('aria-label') ?? ''}][text=${(el.textContent ?? '').trim()}]`
          : 'none';
      });
      runs.push(focus);
      await ctx.close();
    }
    console.log(`[evidence] focus after modal Escape in 3 runs: ${JSON.stringify(runs)}`);
    const returned = runs.filter((f) => /aria-label=Add client|\[text=Add client\]/.test(f)).length;
    console.log(`[evidence] focus returned to trigger in ${returned}/3 runs`);
    expect(returned, `focus returned to the trigger in only ${returned}/3 runs`).toBe(3);
  });

  test('tab order reaches every field and stays inside the dialog', async ({ page }) => {
    const dialog = await openClientDialog(page);
    await expect(dialog).toBeVisible();
    const seq: string[] = [];
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Tab');
      seq.push(await page.evaluate(() => {
        const el = document.activeElement;
        return (el as HTMLElement)?.id || el?.getAttribute('aria-label') || el?.getAttribute('placeholder') || el?.tagName || 'none';
      }));
    }
    console.log(`[evidence] tab sequence: ${JSON.stringify(seq)}`);
    const fields = ['client-name', 'client-email', 'client-phone', 'client-company', 'client-currency', 'client-notes'];
    for (const field of fields) expect(seq, `tab never reached ${field}`).toContain(field);
    const inside = await page.evaluate(() =>
      !!document.activeElement?.closest('[role="dialog"][aria-label="New Client"]'),
    );
    expect(inside, 'tab escaped the dialog').toBe(true);
    const closePos = seq.indexOf('Close dialog');
    console.log(`[evidence] Close dialog tab position (0-based): ${closePos}`);
  });
});
