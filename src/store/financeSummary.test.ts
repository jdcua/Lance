import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

/**
 * Money-math regressions.
 *
 * Every test here corresponds to a bug that shipped: partial payments marking an
 * invoice fully paid, and a single payment collapsing the whole revenue figure.
 * Both were found by red-teaming, not by a user report, which is exactly why
 * they need tests.
 */

const client = { id: 1, name: 'Acme' } as never;

function invoice(id: number, total: number, status = 'sent') {
  return { id, client_id: 1, total, subtotal: total, status, line_items: [] } as never;
}

describe('getFinanceSummary revenue', () => {
  beforeEach(() => {
    useStore.setState({
      invoices: [],
      payments: [],
      expenses: [],
    } as never);
  });

  it('counts paid invoices with no payment rows', () => {
    useStore.setState({
      invoices: [invoice(1, 4200, 'paid'), invoice(2, 2000, 'paid')],
      payments: [],
      expenses: [],
    } as never);
    expect(useStore.getState().getFinanceSummary().totalPaidRevenue).toBe(6200);
  });

  it('does NOT collapse revenue when one payment is recorded', () => {
    // The regression: `paidFromPayments > 0 ? paidFromPayments : totalPaid`
    // meant recording a single $500 payment replaced $6,200 with $500.
    useStore.setState({
      invoices: [invoice(1, 4200, 'paid'), invoice(2, 2000, 'paid'), invoice(3, 1000, 'sent')],
      payments: [{ id: 1, invoice_id: 3, amount: 500, payment_date: '2026-10-01' } as never],
      expenses: [],
    } as never);
    const s = useStore.getState().getFinanceSummary();
    expect(s.totalPaidRevenue).toBe(6700); // 4200 + 2000 + 500
    expect(s.totalOutstanding).toBe(500); // the unpaid half of invoice 3
    expect(s.paidFromPayments).toBe(500);
  });

  it('counts a fully-paid-by-payments invoice', () => {
    useStore.setState({
      invoices: [invoice(1, 1000, 'sent')],
      payments: [
        { id: 1, invoice_id: 1, amount: 400, payment_date: '2026-10-01' } as never,
        { id: 2, invoice_id: 1, amount: 600, payment_date: '2026-10-02' } as never,
      ],
      expenses: [],
    } as never);
    expect(useStore.getState().getFinanceSummary().totalPaidRevenue).toBe(1000);
  });

  it('caps an overpaid invoice at its total', () => {
    useStore.setState({
      invoices: [invoice(1, 100, 'sent')],
      payments: [{ id: 1, invoice_id: 1, amount: 150, payment_date: '2026-10-01' } as never],
      expenses: [],
    } as never);
    expect(useStore.getState().getFinanceSummary().totalPaidRevenue).toBe(100);
  });

  it('excludes orphan payments whose invoice no longer exists', () => {
    useStore.setState({
      invoices: [invoice(1, 4200, 'paid')],
      payments: [{ id: 1, invoice_id: 999, amount: 5000, payment_date: '2026-10-01' } as never],
      expenses: [],
    } as never);
    const s = useStore.getState().getFinanceSummary();
    expect(s.totalPaidRevenue).toBe(4200);
    expect(s.paidFromPayments).toBe(0);
  });

  it('matches payments whether invoice_id arrives as a string or a number', () => {
    // Payment.invoice_id is typed `string` while Invoice.id is `number`
    // (SQLite INTEGER vs the TS model), so the selectors normalize with
    // String(). A JSON import can hand back either shape.
    useStore.setState({
      invoices: [invoice(7, 1000, 'sent')],
      payments: [{ id: 1, invoice_id: '7', amount: 250, payment_date: '2026-10-01' } as never],
      expenses: [],
    } as never);
    expect(useStore.getState().getFinanceSummary().totalPaidRevenue).toBe(250);
  });

  it('ignores drafts entirely', () => {
    useStore.setState({
      invoices: [invoice(1, 9999, 'draft')],
      payments: [],
      expenses: [],
    } as never);
    const s = useStore.getState().getFinanceSummary();
    expect(s.totalPaidRevenue).toBe(0);
    expect(s.totalInvoiced).toBe(0);
  });

  it('computes profit as revenue minus expenses', () => {
    useStore.setState({
      invoices: [invoice(1, 6200, 'paid')],
      payments: [],
      expenses: [{ id: 1, amount: 214 } as never],
    } as never);
    expect(useStore.getState().getFinanceSummary().profit).toBe(5986);
  });
});

describe('getInvoiceBalance', () => {
  beforeEach(() => {
    useStore.setState({ invoices: [], payments: [] } as never);
  });

  it('is unaffected by status and reflects payments only', () => {
    useStore.setState({
      invoices: [invoice(1, 1000, 'paid')],
      payments: [{ id: 1, invoice_id: 1, amount: 500, payment_date: '2026-10-01' } as never],
    } as never);
    // Status alone must not zero the balance, only money received does.
    expect(useStore.getState().getInvoiceBalance('1')).toBe(500);
  });
});

describe('outstanding agreement (Finance = Insights = Dashboard hero)', () => {
  beforeEach(() => {
    useStore.setState({ invoices: [], payments: [], expenses: [] } as never);
  });

  it('a partially-paid invoice contributes only its remainder', () => {
    // The regression: Insights and the Dashboard hero summed raw totals by
    // status, so a $1000 partial with $900 paid showed $1000 outstanding
    // while Finance showed $100. All three now read getFinanceSummary().
    useStore.setState({
      invoices: [invoice(1, 1000, 'partial')],
      payments: [{ id: 1, invoice_id: 1, amount: 900, payment_date: '2026-10-01' } as never],
      expenses: [],
    } as never);
    expect(useStore.getState().getFinanceSummary().totalOutstanding).toBe(100);
  });
});

void client;
