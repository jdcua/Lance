/**
 * Bank statement CSV parsing. Banks disagree on everything (headers,
 * date formats, debit/credit split vs signed amount), so detection is
 * alias-based with explicit fallbacks, and every decision surfaces in
 * the preview before anything is imported. Expenses import; income
 * rows are counted and skipped (revenue belongs to invoices).
 */

export interface BankRow {
  date: string;
  description: string;
  /** Signed: negative = money out (expense), positive = money in. */
  amount: number;
}

export interface BankColumnMap {
  date?: string;
  description?: string;
  amount?: string;
  debit?: string;
  credit?: string;
}

const DATE_ALIASES = [
  'date',
  'transaction_date',
  'transactiondate',
  'posted_date',
  'posting_date',
  'value_date',
  'booking_date',
  'day',
];
const DESC_ALIASES = [
  'description',
  'memo',
  'details',
  'narrative',
  'narration',
  'payee',
  'merchant',
  'name',
  'transaction',
  'label',
];
const AMOUNT_ALIASES = ['amount', 'value', 'sum', 'total'];
const DEBIT_ALIASES = ['debit', 'withdrawal', 'money_out', 'paid_out', 'debits', 'outflow'];
const CREDIT_ALIASES = ['credit', 'deposit', 'money_in', 'paid_in', 'credits', 'inflow'];

function norm(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function pick(headers: string[], aliases: string[]): string | undefined {
  const norms = headers.map((h) => ({ h, n: norm(h) }));
  for (const { h, n } of norms) {
    if (aliases.includes(n)) return h;
  }
  for (const { h, n } of norms) {
    if (aliases.some((a) => n.includes(a) || a.includes(n))) return h;
  }
  return undefined;
}

/** Detect bank columns. Returns undefined fields when not found. */
export function detectBankColumns(headers: string[]): BankColumnMap {
  return {
    date: pick(headers, DATE_ALIASES),
    description: pick(headers, DESC_ALIASES),
    amount: pick(headers, AMOUNT_ALIASES),
    debit: pick(headers, DEBIT_ALIASES),
    credit: pick(headers, CREDIT_ALIASES),
  };
}

function parseMoney(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-');
  // Keep only digits and separators, then let the RIGHTMOST separator win
  // as the decimal mark: US "1,200.00" vs EU "1.200,00" vs plain "4,50".
  let num = s.replace(/[^0-9.,]/g, '');
  if (!num) return null;
  const lastDot = num.lastIndexOf('.');
  const lastComma = num.lastIndexOf(',');
  if (lastComma > lastDot) {
    // Comma is last: EU decimal ("4,50", "1.200,00") — except US thousands
    // with no decimal part ("1,200", "12,345,678").
    if (/,\d{3}($|,)/.test(num) && !num.includes('.')) {
      num = num.replace(/,/g, '');
    } else {
      num = num.replace(/\./g, '').replace(',', '.');
    }
  } else {
    num = num.replace(/,/g, '');
  }
  const val = parseFloat(num);
  if (isNaN(val)) return null;
  return neg ? -Math.abs(val) : val;
}

/** Parse ambiguous bank dates: ISO, US (M/D/Y), EU (D/M/Y), dotted. */
export function parseBankDate(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  const m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    // Try day-first (most of the world), fall back to month-first.
    d = new Date(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    if (!isNaN(d.getTime()) && d.getDate() === parseInt(m[1], 10)) {
      return d.toISOString().split('T')[0];
    }
    d = new Date(year, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

export interface ParsedBankRow extends BankRow {
  direction: 'out' | 'in';
}

/** Debit columns win, then credit, then a single signed amount column. */
function resolveBankAmount(row: Record<string, unknown>, map: BankColumnMap): number | null {
  let amount: number | null = null;
  if (map.debit) {
    const debit = parseMoney(row[map.debit]);
    if (debit !== null && debit !== 0) amount = -Math.abs(debit);
  }
  if (amount === null && map.credit) {
    const credit = parseMoney(row[map.credit]);
    if (credit !== null && credit !== 0) amount = Math.abs(credit);
  }
  if (amount === null && map.amount) {
    amount = parseMoney(row[map.amount]);
  }
  return amount;
}

/** Resolve rows to signed amounts. Debit columns mean outflow. */
export function parseBankRows(
  rows: Record<string, unknown>[],
  map: BankColumnMap,
): { parsed: ParsedBankRow[]; skipped: number } {
  const parsed: ParsedBankRow[] = [];
  let skipped = 0;
  for (const row of rows) {
    const date = map.date ? parseBankDate(row[map.date]) : null;
    const description = map.description ? String(row[map.description] ?? '').trim() : '';
    if (!date || !description) {
      skipped += 1;
      continue;
    }
    const amount = resolveBankAmount(row, map);
    if (amount === null || amount === 0) {
      skipped += 1;
      continue;
    }
    parsed.push({ date, description, amount, direction: amount < 0 ? 'out' : 'in' });
  }
  return { parsed, skipped };
}

/** Key for duplicate detection against existing expenses. */
export function expenseFingerprint(dateIso: string, amount: number, description: string): string {
  return `${dateIso}|${Math.abs(amount).toFixed(2)}|${description.trim().toLowerCase()}`;
}
