import { expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

export const BASE = process.env.LANCE_BASE_URL || 'http://localhost:4173';
export const SHOTS = 'qa-shots';
export const VERSION = '0.9.9-5';

mkdirSync(SHOTS, { recursive: true });

/** Collect console errors + unhandled exceptions for the life of a page. */
export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

/**
 * Keep release-note checks deterministic. The real endpoint rate-limits (403),
 * which otherwise produces console errors unrelated to the app under test.
 * The request still happens, so privacy checks still see the same origin.
 */
export async function mockReleaseApi(page: Page): Promise<void> {
  await page.route('https://api.github.com/repos/jdcua/Lance/releases**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

/**
 * Put a brand-new browser context into the "returning user" state the built
 * app expects. Runs on every navigation, so it never masks changes to the
 * keys the tests are actually persisting (theme, density, entities).
 */
export async function seedReady(
  page: Page,
  opts: { achievements?: string[] } = {},
): Promise<void> {
  await mockReleaseApi(page);
  await page.addInitScript(
    ({ version, achievements }) => {
      localStorage.setItem('lance:onboarding-completed', 'true');
      localStorage.setItem('lance:onboarding-step', 'complete');
      localStorage.setItem('lance:changelog-seen', version);
      localStorage.setItem('lance:last-run-version', version);
      localStorage.setItem('lance:has-launched', 'true');
      localStorage.setItem('lance:tour-pending', 'false');
      if (achievements.length) {
        localStorage.setItem('lance:achievements', JSON.stringify(achievements));
      }
    },
    { version: VERSION, achievements: opts.achievements ?? [] },
  );
}

export async function gotoApp(page: Page, path = '/'): Promise<void> {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('complementary', { name: 'Primary navigation' }),
    'app shell sidebar',
  ).toBeVisible({ timeout: 15000 });
}

export async function shot(page: Page, name: string): Promise<string> {
  const path = `${SHOTS}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

export async function addClient(page: Page, name: string, company = 'QA Industries') {
  await page.getByRole('button', { name: 'Add client' }).click();
  await expect(page.getByRole('dialog', { name: 'New Client' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Name *' }).fill(name);
  await page.getByRole('textbox', { name: 'Company' }).fill(company);
  await page.getByRole('button', { name: 'Add Client', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}
