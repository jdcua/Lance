import { describe, it, expect } from 'vitest';
import {
  computeForecast,
  computeEffectiveRate,
  computeClientWinRates,
} from '../utils/proInsightsMath';
import type { Invoice, Proposal, RecurringInvoice, Client } from '../types';

const NOW = new Date(2026, 7, 15); // Aug 15 2026: full months are Jul, Jun, May.

function inv(over: Partial<Invoice>): Invoice {
  return {
    id: 'i',
    client_id: 'c1',
    invoice_number: 'INV-1',
    status: 'paid',
    line_items: [],
    subtotal: 100,
    total: 100,
    created_at: '2026-07-10',
    ...over,
  } as Invoice;
}

function prop(over: Partial<Proposal>): Proposal {
  return {
    id: 'p',
    client_id: 'c1',
    title: 'T',
    status: 'sent',
    rate_type: 'flat',
    created_at: '2026-08-01',
    ...over,
  } as Proposal;
}

describe('pro insights math', () => {
  it('forecasts from run rate, retainers, and weighted pipeline', () => {
    const invoices = [
      inv({ id: 'a', total: 3000, paid_at: '2026-07-05', created_at: '2026-07-01' }),
      inv({ id: 'b', total: 3000, paid_at: '2026-06-05', created_at: '2026-06-01' }),
      inv({ id: 'c', total: 3000, paid_at: '2026-05-05', created_at: '2026-05-01' }),
      inv({ id: 'd', total: 9999, status: 'sent', created_at: '2026-07-01' }),
    ];
    const proposals = [prop({ id: 'p1', rate: 2000 })];
    const recurring: RecurringInvoice[] = [
      {
        id: 'r',
        client_id: 'c1',
        title: 'Retainer',
        frequency: 'weekly',
        line_items: [],
        subtotal: 100,
        total: 100,
        active: true,
        next_due: '2026-08-20',
        created_at: '2026-01-01',
      },
    ];
    const f = computeForecast(invoices, proposals, recurring, 0.5, NOW);
    expect(f.runRate).toBe(3000); // sent invoice excluded
    expect(f.recurringMonthly).toBeCloseTo(433, 0);
    expect(f.pipelineValue).toBe(1000); // 2000 flat x 0.5
    expect(f.months).toHaveLength(3);
    expect(f.months[0].total).toBeCloseTo(3000 + 433 + 1000 / 3, 0);
    expect(f.flatOnly).toBe(false);
  });

  it('excludes hourly proposals from pipeline value but flags them', () => {
    const f = computeForecast([], [prop({ rate_type: 'hourly', rate: 150 })], [], 1, NOW);
    expect(f.pipelineValue).toBe(0);
    expect(f.flatOnly).toBe(true);
  });

  it('detects effective-rate leaks', () => {
    // $5000 over 10000 min (166.7h) = $30/h effective.
    const leak = computeEffectiveRate(5000, 10000, 50);
    expect(leak.effective).toBeCloseTo(30, 5);
    expect(leak.alert).toBe(true);
    expect(leak.leakPerHour).toBeCloseTo(20, 5);

    const healthy = computeEffectiveRate(5000, 10000, 30);
    expect(healthy.alert).toBe(false);
    expect(healthy.leakPerHour).toBeNull();

    expect(computeEffectiveRate(0, 0, 50).effective).toBeNull();
    expect(computeEffectiveRate(5000, 10000, null).alert).toBe(false);
  });

  it('ranks clients by win rate and totals lost revenue', () => {
    const clients = [
      { id: 'c1', name: 'Alpha' },
      { id: 'c2', name: 'Beta' },
    ] as Client[];
    const proposals = [
      prop({ id: 'a1', client_id: 'c1', status: 'accepted', rate: 1000 }),
      prop({ id: 'a2', client_id: 'c1', status: 'declined', rate: 2000 }),
      prop({ id: 'b1', client_id: 'c2', status: 'accepted', rate: 500 }),
      prop({ id: 'd1', client_id: 'c1', status: 'draft', rate: 9999 }),
      prop({ id: 's1', client_id: 'c2', status: 'sent', rate: 9999 }),
    ];
    const rows = computeClientWinRates(proposals, clients);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Beta');
    expect(rows[0].rate).toBe(100);
    expect(rows[1].name).toBe('Alpha');
    expect(rows[1].rate).toBe(50);
    // Only declined flat-rate counts as lost; drafts/sent/hourly excluded.
    expect(rows[1].lostRevenue).toBe(2000);
    expect(rows.reduce((s, r) => s + r.lostRevenue, 0)).toBe(2000);
  });
});
