import { describe, it, expect } from 'vitest';
import {
  getNextDueDate,
  shouldGenerate,
  countCyclesBehind,
  getCatchUpCount,
  shouldShowCatchUpWarning,
  effectiveDueDate,
} from './recurringEngine';
import type { RecurringInvoice } from '../types';

function ri(over: Partial<RecurringInvoice>): RecurringInvoice {
  return {
    id: 'r1',
    client_id: 'c1',
    title: 'Retainer',
    frequency: 'monthly',
    line_items: [],
    subtotal: 100,
    total: 100,
    active: true,
    next_due: '2026-01-15T00:00:00.000Z',
    created_at: '2025-01-01T00:00:00.000Z',
    ...over,
  } as RecurringInvoice;
}

describe('recurring date math', () => {
  it('clamps month-end instead of overflowing (Jan 31 -> Feb 28)', () => {
    expect(
      getNextDueDate('monthly', new Date('2026-01-31T12:00:00Z')).toISOString().slice(0, 10),
    ).toBe('2026-02-28');
    // leap year keeps the 29th
    expect(
      getNextDueDate('monthly', new Date('2024-01-31T12:00:00Z')).toISOString().slice(0, 10),
    ).toBe('2024-02-29');
    // quarterly from Jan 31 lands Apr 30, not May 1
    expect(
      getNextDueDate('quarterly', new Date('2026-01-31T12:00:00Z')).toISOString().slice(0, 10),
    ).toBe('2026-04-30');
    // mid-month dates are unaffected
    expect(
      getNextDueDate('monthly', new Date('2026-01-15T12:00:00Z')).toISOString().slice(0, 10),
    ).toBe('2026-02-15');
    expect(
      getNextDueDate('weekly', new Date('2026-01-31T12:00:00Z')).toISOString().slice(0, 10),
    ).toBe('2026-02-07');
  });

  it('unknown frequencies advance monthly instead of standing still', () => {
    const next = getNextDueDate('fortnightly' as never, new Date('2026-01-15T12:00:00Z'));
    expect(next.toISOString().slice(0, 10)).toBe('2026-02-15');
  });

  it('heals invalid dates instead of stalling or looping', () => {
    expect(getNextDueDate('monthly', new Date('garbage')).getTime()).not.toBeNaN();
    const eff = effectiveDueDate(ri({ next_due: 'garbage' }));
    expect(Math.abs(eff.getTime() - Date.now())).toBeLessThan(5000);
    expect(effectiveDueDate(ri({ next_due: '2026-01-15T00:00:00.000Z' })).toISOString()).toBe(
      '2026-01-15T00:00:00.000Z',
    );
  });
});

describe('generation decisions', () => {
  it('generates only when active and due (invalid dates count as due, healed downstream)', () => {
    expect(shouldGenerate(ri({ active: false, next_due: '2020-01-01T00:00:00Z' }))).toBe(false);
    expect(shouldGenerate(ri({ next_due: '2020-01-01T00:00:00Z' }))).toBe(true);
    expect(shouldGenerate(ri({ next_due: '2999-01-01T00:00:00Z' }))).toBe(false);
    expect(shouldGenerate(ri({ next_due: 'garbage' }))).toBe(true);
    expect(countCyclesBehind(ri({ next_due: 'garbage' }))).toBe(1);
  });

  it('caps catch-up at 3 with a flag', () => {
    expect(getCatchUpCount(2)).toEqual({ generate: 2, capped: false });
    expect(getCatchUpCount(3)).toEqual({ generate: 3, capped: false });
    expect(getCatchUpCount(12)).toEqual({ generate: 3, capped: true });
    expect(
      countCyclesBehind(ri({ frequency: 'monthly', next_due: '2020-01-01T00:00:00.000Z' })),
    ).toBe(12);
  });

  it('throttles catch-up warnings to weekly', () => {
    expect(shouldShowCatchUpWarning(ri({}))).toBe(true);
    expect(shouldShowCatchUpWarning(ri({ last_catch_up_warning: new Date().toISOString() }))).toBe(
      false,
    );
    const old = new Date(Date.now() - 8 * 86400000).toISOString();
    expect(shouldShowCatchUpWarning(ri({ last_catch_up_warning: old }))).toBe(true);
  });
});
