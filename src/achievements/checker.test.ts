import { describe, it, expect, beforeEach } from 'vitest';
import { checkAchievements, unlockAchievement, type StoreState } from './checker';

function state(over: Partial<StoreState>): StoreState {
  return {
    proposals: [],
    invoices: [],
    timeEntries: [],
    clients: [],
    contracts: [],
    recurringInvoices: [],
    projects: [],
    ...over,
  } as StoreState;
}

beforeEach(() => {
  localStorage.clear();
});

describe('achievements', () => {
  it('unlocks firsts and persists across runs', async () => {
    const s = state({ proposals: [{ status: 'sent' } as never] });
    const first = await checkAchievements(s);
    expect(first).toContain('first_proposal_sent');
    expect(first).toContain('motion_theme');
    // second run: nothing new, no duplicates
    expect(await checkAchievements(s)).toEqual([]);
    expect(JSON.parse(localStorage.getItem('lance:achievements') || '[]')).toContain('first_proposal_sent');
  });

  it('never double-reports under concurrent checks', async () => {
    const s = state({ invoices: [{ status: 'paid' } as never] });
    const [a, b] = await Promise.all([checkAchievements(s), checkAchievements(s)]);
    const total = [...a, ...b].filter((k) => k === 'first_invoice_paid');
    expect(total).toHaveLength(1);
    expect(new Set([...a, ...b]).size).toBe([...a, ...b].length);
  });

  it('unlockAchievement is single-winner under races', async () => {
    const [a, b] = await Promise.all([unlockAchievement('first_contract'), unlockAchievement('first_contract')]);
    expect([a, b].sort()).toEqual([false, true]);
  });

  it('does not unlock on empty state', async () => {
    expect(await checkAchievements(state({}))).toEqual([]);
  });
});
