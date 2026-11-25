import { describe, it, expect } from 'vitest';
import { buildTaxPack, taxPackCsv, taxPackYears } from './taxPack';
import type { Invoice, Expense, Client } from '../types';

const clients = [{ id: 'c1', name: 'Acme' }] as Client[];

function inv(over: Partial<Invoice>): Invoice {
  return {
    id: 'i',
    client_id: 'c1',
    invoice_number: 'INV-1',
    status: 'paid',
    line_items: [],
    subtotal: 100,
    total: 100,
    created_at: '2026-03-01',
    ...over,
  } as Invoice;
}

function exp(over: Partial<Expense>): Expense {
  return { id: 'e', category: 'Tools', description: 'D', amount: 10, date: '2026-02-01', ...over };
}

describe('tax pack', () => {
  it('aggregates a year by paid date, quarters, clients, categories', () => {
    const invoices = [
      inv({ id: 'a', total: 1000, paid_at: '2026-02-10' }),
      inv({ id: 'b', total: 500, paid_at: '2026-08-10' }),
      inv({ id: 'c', total: 9999, status: 'sent', created_at: '2026-05-01' }),
      inv({ id: 'd', total: 2000, paid_at: '2025-12-10' }),
    ];
    const expenses = [
      exp({ amount: 100, date: '2026-01-15' }),
      exp({ amount: 50, date: '2025-06-01' }),
    ];
    const pack = buildTaxPack(invoices, expenses, clients, 2026);
    expect(pack.revenuePaid).toBe(1500);
    expect(pack.expenses).toBe(100);
    expect(pack.profit).toBe(1400);
    expect(pack.outstanding).toBe(9999);
    expect(pack.quarters[0].revenue).toBe(1000);
    expect(pack.quarters[2].revenue).toBe(500);
    expect(pack.perClient).toEqual([{ name: 'Acme', revenue: 1500, invoices: 2 }]);
    expect(pack.expenseCategories).toEqual([{ category: 'Tools', total: 100 }]);
  });

  it('lists years newest first with current year always present', () => {
    const years = taxPackYears([inv({ paid_at: '2024-05-01' })], [], new Date('2026-09-08'));
    expect(years[0]).toBe(2026);
    expect(years).toContain(2024);
  });

  it('renders escaped CSV sections', () => {
    const pack = buildTaxPack(
      [inv({ total: 100, paid_at: '2026-01-01' })],
      [],
      [{ id: 'c1', name: 'Acme, Inc.' } as Client],
      2026,
    );
    const csv = taxPackCsv(pack);
    expect(csv).toContain('Summary,Revenue paid,100');
    expect(csv).toContain('"Acme, Inc.",100');
    expect(csv).toContain('Quarterly,Q1 revenue,100');
  });
});
