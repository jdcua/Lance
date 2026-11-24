import type { Invoice, Expense, Client } from '../types';
import { csvCellValue as csvCell } from '../import/parsers/spreadsheet';

export interface TaxQuarter {
  quarter: string;
  revenue: number;
  expenses: number;
}

export interface TaxClientRow {
  name: string;
  revenue: number;
  invoices: number;
}

export interface TaxPack {
  year: number;
  revenuePaid: number;
  expenses: number;
  outstanding: number;
  profit: number;
  quarters: TaxQuarter[];
  perClient: TaxClientRow[];
  expenseCategories: { category: string; total: number }[];
}

function yearOf(iso: string | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  // UTC getters: date-only strings ('2026-01-01') parse as UTC midnight,
  // and local getters would flip the year/month near boundaries.
  return isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

/** Years present in the data, newest first. Always includes current year. */
export function taxPackYears(invoices: Invoice[], expenses: Expense[], now = new Date()): number[] {
  const years = new Set<number>([now.getFullYear()]);
  for (const inv of invoices) {
    const y = yearOf(inv.paid_at || inv.created_at);
    if (y !== null) years.add(y);
  }
  for (const e of expenses) {
    const y = yearOf(e.date);
    if (y !== null) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export function buildTaxPack(
  invoices: Invoice[],
  expenses: Expense[],
  clients: Client[],
  year: number,
): TaxPack {
  const paid = invoices.filter(
    (i) => i.status === 'paid' && yearOf(i.paid_at || i.created_at) === year,
  );
  const yearExpenses = expenses.filter((e) => yearOf(e.date) === year);
  const outstanding = invoices
    .filter((i) => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0);

  const revenuePaid = paid.reduce((s, i) => s + i.total, 0);
  const expenseTotal = yearExpenses.reduce((s, e) => s + e.amount, 0);

  const quarters: TaxQuarter[] = [1, 2, 3, 4].map((q) => {
    const qPaid = paid.filter((i) => {
      const m = new Date(i.paid_at || i.created_at).getUTCMonth();
      return Math.floor(m / 3) + 1 === q;
    });
    const qExp = yearExpenses.filter(
      (e) => Math.floor(new Date(e.date).getUTCMonth() / 3) + 1 === q,
    );
    return {
      quarter: `Q${q}`,
      revenue: qPaid.reduce((s, i) => s + i.total, 0),
      expenses: qExp.reduce((s, e) => s + e.amount, 0),
    };
  });

  const byClient = new Map<string, { total: number; count: number }>();
  for (const inv of paid) {
    const entry = byClient.get(inv.client_id) || { total: 0, count: 0 };
    entry.total += inv.total;
    entry.count += 1;
    byClient.set(inv.client_id, entry);
  }
  const perClient: TaxClientRow[] = [...byClient.entries()]
    .map(([id, e]) => ({
      name: clients.find((c) => c.id === id)?.name || 'Unknown client',
      revenue: e.total,
      invoices: e.count,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const byCat = new Map<string, number>();
  for (const e of yearExpenses) {
    byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount);
  }
  const expenseCategories = [...byCat.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return {
    year,
    revenuePaid,
    expenses: expenseTotal,
    outstanding,
    profit: revenuePaid - expenseTotal,
    quarters,
    perClient,
    expenseCategories,
  };
}

/** Accountant-ready CSV: summary, quarters, per-client, categories. */
export function taxPackCsv(pack: TaxPack): string {
  const lines: string[] = [
    'Section,Label,Value',
    `Summary,Revenue paid,${pack.revenuePaid}`,
    `Summary,Expenses,${pack.expenses}`,
    `Summary,Profit,${pack.profit}`,
    `Summary,Outstanding (all time),${pack.outstanding}`,
  ];
  for (const q of pack.quarters) {
    lines.push(`Quarterly,${q.quarter} revenue,${q.revenue}`);
    lines.push(`Quarterly,${q.quarter} expenses,${q.expenses}`);
  }
  for (const c of pack.perClient) {
    lines.push(`Per client,${csvCell(c.name)},${c.revenue}`);
  }
  for (const c of pack.expenseCategories) {
    lines.push(`Expenses by category,${csvCell(c.category)},${c.total}`);
  }
  return lines.join('\n');
}

/** Browser and webview safe file download. */
export function downloadTextFile(
  filename: string,
  text: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
