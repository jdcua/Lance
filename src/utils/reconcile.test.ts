import { describe, it, expect } from 'vitest';
import { suggestInvoiceMatches, invoiceRemaining } from './reconcile';
import type { Invoice, InvoicePayment } from '../types';

const inv = (over: Partial<Invoice> = {}): Invoice => ({
  id: 'i1',
  client_id: 'c1',
  invoice_number: 'INV-001',
  status: 'sent',
  line_items: [],
  subtotal: 100,
  total: 100,
  created_at: '2026-09-01',
  due_date: '2026-09-15',
  ...over,
});

const row = (over: object = {}) => ({
  date: '2026-09-20',
  description: 'Transfer from client',
  amount: 100,
  direction: 'in' as const,
  ...over,
});

describe('reconcile matcher', () => {
  it('matches exact amount near due date', () => {
    const out = suggestInvoiceMatches([row()], [inv()], [], () => 'Client');
    expect(out).toHaveLength(1);
    expect(out[0].matches).toHaveLength(1);
    expect(out[0].matches[0].invoiceId).toBe('i1');
    expect(out[0].matches[0].confidence).toBe('exact');
  });

  it('excludes paid, draft and zero-remaining invoices', () => {
    const invoices = [
      inv({ id: 'paid', status: 'paid' }),
      inv({ id: 'draft', status: 'draft' }),
      inv({ id: 'open', status: 'overdue' }),
    ];
    const out = suggestInvoiceMatches([row()], invoices, [], () => undefined);
    expect(out[0].matches.map((m) => m.invoiceId)).toEqual(['open']);
  });

  it('matches remaining balance after a partial payment', () => {
    const payments: InvoicePayment[] = [
      {
        id: 'p1',
        invoice_id: 'i1',
        amount: 40,
        payment_date: '2026-09-10',
        payment_method: 'Bank Transfer',
      } as InvoicePayment,
    ];
    expect(invoiceRemaining(inv(), payments)).toBe(60);
    const out = suggestInvoiceMatches([row({ amount: 60 })], [inv()], payments, () => undefined);
    expect(out[0].matches[0].invoiceId).toBe('i1');
  });

  it('rejects off-by-a-cent amounts', () => {
    const out = suggestInvoiceMatches([row({ amount: 100.02 })], [inv()], [], () => undefined);
    expect(out[0].matches).toHaveLength(0);
  });

  it('downgrades to likely without date anchor or name', () => {
    const far = inv({ id: 'far', due_date: undefined, created_at: '2025-01-01' });
    const out = suggestInvoiceMatches([row()], [far], [], () => undefined);
    expect(out[0].matches[0].confidence).toBe('likely');
  });

  it('upgrades on client-name hit', () => {
    const far = inv({ id: 'far', due_date: undefined, created_at: '2025-01-01' });
    const out = suggestInvoiceMatches(
      [row({ description: 'Payment from Acme Corp invoice' })],
      [far],
      [],
      () => 'Acme Corp',
    );
    expect(out[0].matches[0].confidence).toBe('exact');
  });

  it('ignores outflow rows', () => {
    const out = suggestInvoiceMatches(
      [row({ amount: -50, direction: 'out' as const })],
      [inv()],
      [],
      () => undefined,
    );
    expect(out).toHaveLength(0);
  });
});
