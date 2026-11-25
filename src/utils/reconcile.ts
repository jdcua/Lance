import type { Invoice, InvoicePayment } from '../types';
import type { ParsedBankRow } from './bankCsv';

/**
 * Payment↔invoice reconciliation. Matches bank-statement income rows to open
 * invoices so a deposit can become a recorded payment in one confirm.
 *
 * Conservative by design:
 * - Only unpaid invoices (sent/partial/overdue) with remaining balance.
 * - Amount must equal the remaining balance to the cent for 'exact'.
 * - 'likely' = exact amount but no date anchor or name signal.
 * - Nothing auto-applies: the UI confirms each match, and recording goes
 *   through the real createPayment flow with the same guards.
 */

export type MatchConfidence = 'exact' | 'likely';

export interface InvoiceMatch {
  invoiceId: string;
  confidence: MatchConfidence;
  /** human-readable why, shown in the UI */
  reasons: string[];
}

export interface RowMatch {
  row: ParsedBankRow;
  matches: InvoiceMatch[];
}

const DEFAULT_WINDOW_DAYS = 45;

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (isNaN(a) || isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.abs(a - b) / 86400000;
}

export function invoiceRemaining(inv: Invoice, payments: InvoicePayment[]): number {
  const paid = payments.filter((p) => p.invoice_id === inv.id).reduce((s, p) => s + p.amount, 0);
  return Math.max(0, inv.total - paid);
}

function nameHits(description: string, clientName: string | undefined): boolean {
  if (!clientName) return false;
  const words = clientName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  const desc = description.toLowerCase();
  return words.some((w) => desc.includes(w));
}

export function suggestInvoiceMatches(
  incomeRows: ParsedBankRow[],
  invoices: Invoice[],
  payments: InvoicePayment[],
  getClientName: (clientId: string) => string | undefined,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): RowMatch[] {
  const open = invoices.filter(
    (i) =>
      (i.status === 'sent' || i.status === 'partial' || i.status === 'overdue') &&
      invoiceRemaining(i, payments) > 0.005,
  );
  return incomeRows
    .filter((r) => r.direction === 'in' && r.amount > 0)
    .map((row) => {
      const matches: (InvoiceMatch & { gap: number })[] = [];
      for (const inv of open) {
        const remaining = invoiceRemaining(inv, payments);
        // Cents compare: bank and invoice math must agree exactly.
        if (Math.round(row.amount * 100) !== Math.round(remaining * 100)) continue;
        const reasons = [`${remaining.toFixed(2)} matches balance to the cent`];
        const anchor = inv.due_date || inv.created_at;
        const gap = anchor ? daysBetween(row.date, anchor) : Number.POSITIVE_INFINITY;
        const dated = gap <= windowDays;
        if (dated) reasons.push(`dated near ${anchor}`);
        const named = nameHits(row.description, getClientName(inv.client_id));
        if (named) reasons.push('client name in memo');
        if (dated || named) {
          matches.push({ invoiceId: inv.id, confidence: 'exact', reasons, gap });
        } else {
          matches.push({
            invoiceId: inv.id,
            confidence: 'likely',
            reasons: [...reasons, 'no date or name signal'],
            gap,
          });
        }
      }
      matches.sort((a, b) => {
        if (a.confidence !== b.confidence) return a.confidence === 'exact' ? -1 : 1;
        return a.gap - b.gap;
      });
      return {
        row,
        matches: matches.slice(0, 3).map(({ invoiceId, confidence, reasons }) => ({
          invoiceId,
          confidence,
          reasons,
        })),
      };
    });
}
