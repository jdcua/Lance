import { expect, test } from '@playwright/test';
import { gotoApp, seedReady, shot, watchConsole } from './helpers';

/** Empty copy rotates daily; accept any bank variant, never a blank/crashed page. */
const CASES: Array<{ route: string; needles: string[] }> = [
  { route: '/clients', needles: ['No clients yet', 'Your roster awaits', 'Nobody on the books'] },
  { route: '/projects', needles: ['No projects yet', 'A very clean slate', 'Nothing on the bench'] },
  {
    route: '/invoices',
    needles: [
      'No invoices yet', 'The till is quiet', 'Zero paperwork, so far',
      'Add at least one client before creating an invoice.',
    ],
  },
  {
    route: '/proposals',
    needles: ['No proposals out', 'The pipeline is empty', 'No pitches in flight', 'Add at least one client before creating a proposal.'],
  },
  {
    route: '/contracts',
    needles: ['No contracts filed', 'Nothing countersigned', 'The drawer is empty', 'Add at least one client before creating a contract.'],
  },
  { route: '/time', needles: ['No time entries yet'] },
  { route: '/finance', needles: ['No expenses yet'] },
  {
    route: '/insights',
    needles: ['Not enough data yet', 'Not enough signal yet', 'Charts need data snacks', 'Quiet analytics'],
  },
  { route: '/follow-ups', needles: ['No pending follow-ups'] },
  { route: '/search', needles: ['Start typing to search'] },
];

test.describe('edge 1 · explicit empty states on a seeded-clean profile', () => {
  for (const { route, needles } of CASES) {
    test(`${route} shows an explicit empty state`, async ({ page }) => {
      const errors = watchConsole(page);
      await seedReady(page);
      await gotoApp(page, route);
      const main = page.getByRole('main', { name: 'Main content' });
      await expect(main).not.toBeEmpty({ timeout: 12000 });
      const text = (await main.innerText()).replace(/\n/g, ' | ');
      const found = needles.filter((n) => text.includes(n));
      console.log(`[evidence] ${route} chars=${text.length} matched=${JSON.stringify(found)} text="${text.slice(0, 160)}"`);
      const path = await shot(page, `edge-empty-${route.replace(/\W/g, '') || 'root'}`);
      console.log(`[evidence] screenshot ${path}`);
      expect(found, `${route} had no explicit empty state: "${text.slice(0, 200)}"`).not.toEqual([]);
      expect(errors, `${route} console errors: ${errors.join(' | ')}`).toEqual([]);
    });
  }
});
