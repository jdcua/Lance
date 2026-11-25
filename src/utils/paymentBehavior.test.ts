import { describe, it, expect } from 'vitest';
import { clientPaymentBehavior } from './paymentBehavior';
import type { Invoice, InvoicePayment } from '../types';

const inv = (over: Partial<Invoice> = {}): Invoice => ({
  id: 'i1',
  client_id: 'c1',
  invoice_number: 'INV-001',
  status: 'paid',
  line_items: [],
  subtotal: 100,
  total: 100,
  created_at: '2026-08-01',
  due_date: '2026-08-15',
  paid_at: '2026-08-15',
  ...over,
});

describe('payment behavior', () => {
  it('prompt payer paid on the due date', () => {
    const b = clientPaymentBehavior('c1', [inv()], []);
    expect(b.risk).toBe('prompt');
    expect(b.avgDaysLate).toBe(0);
    expect(b.onTimePct).toBe(100);
  });

  it('averages lateness and bands typical/slow/risky', () => {
    const invoices = [
      inv({ id: 'a', paid_at: '2026-08-20' }), // +5
      inv({ id: 'b', paid_at: '2026-08-25' }), // +10
    ];
    const b = clientPaymentBehavior('c1', invoices, []);
    expect(b.avgDaysLate).toBe(7.5);
    expect(b.onTimePct).toBe(0);
    expect(b.risk).toBe('slow');
    expect(b.worstLate).toBe(10);
  });

  it('single 61-day lateness is risky', () => {
    const b = clientPaymentBehavior('c1', [inv({ paid_at: '2026-10-15' })], []);
    expect(b.risk).toBe('risky');
  });

  it('falls back to last payment date without paid_at', () => {
    const noStamp = inv({ paid_at: undefined });
    const payments = [
      {
        id: 'p1',
        invoice_id: 'i1',
        amount: 100,
        payment_date: '2026-08-18',
        payment_method: 'Bank Transfer',
      },
    ] as InvoicePayment[];
    const b = clientPaymentBehavior('c1', [noStamp], payments);
    expect(b.avgDaysLate).toBe(3);
    expect(b.risk).toBe('typical');
  });

  it('unknown with no history, slow with open overdue', () => {
    expect(clientPaymentBehavior('c1', [], []).risk).toBe('unknown');
    const over = inv({ id: 'o', status: 'overdue', paid_at: undefined, due_date: '2026-01-01' });
    const b = clientPaymentBehavior('c1', [over], [], new Date('2026-10-15').getTime());
    expect(b.risk).toBe('slow');
    expect(b.openOverdue).toBe(1);
  });

  it('ignores other clients and undated invoices', () => {
    const invoices = [
      inv({ id: 'x', client_id: 'c2', paid_at: '2027-01-01' }),
      inv({ id: 'y', due_date: undefined, paid_at: undefined }),
    ];
    const b = clientPaymentBehavior('c1', invoices, []);
    expect(b.risk).toBe('unknown');
    expect(b.paidCount).toBe(0);
  });
});
