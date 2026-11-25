import { describe, it, expect } from 'vitest';
import { buildWeeklyDigest, weekStart, weekKey } from './weeklyDigest';
import type { Invoice, TimeEntry, Proposal } from '../types';

const NOW = new Date('2026-09-08T12:00:00');

describe('weekly digest', () => {
  it('starts weeks on Monday', () => {
    // Sep 8 2026 is a Tuesday; week starts Monday Sep 7.
    expect(weekStart(NOW).getDate()).toBe(7);
    expect(weekStart(new Date('2026-09-13T12:00:00')).getDate()).toBe(7);
    expect(weekStart(new Date('2026-09-14T12:00:00')).getDate()).toBe(14);
    expect(typeof weekKey(NOW)).toBe('string');
  });

  it('aggregates this week only', () => {
    const invoices = [
      {
        id: 'a',
        status: 'paid',
        total: 500,
        paid_at: '2026-09-08T09:00:00',
        created_at: '2026-09-01',
      },
      {
        id: 'b',
        status: 'paid',
        total: 999,
        paid_at: '2026-08-20T09:00:00',
        created_at: '2026-08-01',
      },
      { id: 'c', status: 'overdue', total: 100, created_at: '2026-09-01' },
    ] as Invoice[];
    const time = [
      { id: 't', duration_minutes: 120, start_time: '2026-09-07T10:00:00' },
      { id: 'u', duration_minutes: 600, start_time: '2026-08-01T10:00:00' },
    ] as TimeEntry[];
    const proposals = [
      { id: 'p', status: 'sent' },
      { id: 'q', status: 'draft' },
    ] as Proposal[];
    const d = buildWeeklyDigest(invoices, time, proposals, NOW);
    expect(d.paidTotal).toBe(500);
    expect(d.paidCount).toBe(1);
    expect(d.hoursLogged).toBe(2);
    expect(d.openProposals).toBe(1);
    expect(d.overdueCount).toBe(1);
    expect(d.hasActivity).toBe(true);
  });

  it('reports quiet weeks honestly', () => {
    const d = buildWeeklyDigest([], [], [], NOW);
    expect(d.hasActivity).toBe(false);
    expect(d.paidTotal).toBe(0);
  });
});
