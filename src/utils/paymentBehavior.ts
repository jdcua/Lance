import type { Invoice, InvoicePayment } from '../types';

/**
 * Payment behavior per client, computed locally from invoice + payment
 * history. Facts only — averages, counts, bands. No recommendations, no
 * predictions-as-promises: a "slow" payer sometimes pays early, and the UI
 * copy must never claim otherwise.
 */

export type PaymentRisk = 'unknown' | 'prompt' | 'typical' | 'slow' | 'risky';

export interface PaymentBehavior {
  /** paid invoices with usable dates */
  paidCount: number;
  /** mean days past due at payment; null with no dated payments */
  avgDaysLate: number | null;
  /** share paid on/before due date; null with no dated payments */
  onTimePct: number | null;
  /** worst single lateness, days */
  worstLate: number;
  /** unpaid invoices already past due */
  openOverdue: number;
  risk: PaymentRisk;
}

const DAY_MS = 86400000;

function lastPaidAt(inv: Invoice, payments: InvoicePayment[]): string | null {
  if (inv.paid_at) return inv.paid_at;
  const dates = payments
    .filter((p) => p.invoice_id === inv.id)
    .map((p) => p.payment_date)
    .filter(Boolean)
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

function paidDaysLate(inv: Invoice, payments: InvoicePayment[]): number | null {
  if (inv.status !== 'paid') return null;
  if (!inv.due_date) return null;
  const paidAt = lastPaidAt(inv, payments);
  if (!paidAt) return null;
  const due = new Date(inv.due_date).getTime();
  const paid = new Date(paidAt).getTime();
  if (isNaN(due) || isNaN(paid)) return null;
  return Math.ceil((paid - due) / DAY_MS);
}

function isOpenOverdue(inv: Invoice, now: number): boolean {
  if (inv.status !== 'overdue') return false;
  if (!inv.due_date) return true;
  return new Date(inv.due_date).getTime() < now;
}

function countOpenOverdue(mine: Invoice[], now: number): number {
  return mine.filter((i) => isOpenOverdue(i, now)).length;
}

function classifyPaymentRisk(worst: number, avg: number): PaymentRisk {
  if (worst > 60 || avg > 30) return 'risky';
  if (avg > 7) return 'slow';
  if (avg > 0) return 'typical';
  return 'prompt';
}

export function clientPaymentBehavior(
  clientId: string,
  invoices: Invoice[],
  payments: InvoicePayment[],
  now: number = Date.now(),
): PaymentBehavior {
  const mine = invoices.filter((i) => i.client_id === clientId);
  const lates: number[] = [];
  let worst = 0;
  for (const inv of mine) {
    const days = paidDaysLate(inv, payments);
    if (days === null) continue;
    lates.push(days);
    if (days > worst) worst = days;
  }
  const openOverdue = countOpenOverdue(mine, now);

  if (lates.length === 0) {
    return {
      paidCount: 0,
      avgDaysLate: null,
      onTimePct: null,
      worstLate: 0,
      openOverdue,
      risk: openOverdue > 0 ? 'slow' : 'unknown',
    };
  }
  const avg = lates.reduce((s, d) => s + d, 0) / lates.length;
  const onTime = lates.filter((d) => d <= 0).length / lates.length;
  const risk = classifyPaymentRisk(worst, avg);
  return {
    paidCount: lates.length,
    avgDaysLate: Math.round(avg * 10) / 10,
    onTimePct: Math.round(onTime * 100),
    worstLate: worst,
    openOverdue,
    risk,
  };
}

export const RISK_LABEL: Record<PaymentRisk, string> = {
  unknown: 'No history',
  prompt: 'Pays promptly',
  typical: 'Usually on time',
  slow: 'Often late',
  risky: 'Frequently very late',
};
