/**
 * Trial value ledger: every dollar of Pro-created revenue during the trial
 * is recorded locally (never leaves the machine). At purchase time the
 * upgrade modal shows the user their own number instead of a pitch.
 */

export type TrialValueKind = 'change-order' | 'late-fee' | 'topup';

export interface TrialValueEvent {
  kind: TrialValueKind;
  amount: number;
  at: string;
}

export interface TrialValueSummary {
  total: number;
  count: number;
  changeOrders: number;
  lateFees: number;
  topUps: number;
}

const KEY = 'lance:trial-value';
const MAX_EVENTS = 50;

export function recordTrialValue(kind: TrialValueKind, amount: number): void {
  if (!(amount > 0)) return;
  try {
    const raw = localStorage.getItem(KEY);
    const events: TrialValueEvent[] = raw ? JSON.parse(raw) : [];
    events.push({ kind, amount: Math.round(amount * 100) / 100, at: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* private mode: ledger is best-effort */
  }
}

const EMPTY: TrialValueSummary = { total: 0, count: 0, changeOrders: 0, lateFees: 0, topUps: 0 };

export function getTrialValue(): TrialValueSummary {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const events = JSON.parse(raw) as TrialValueEvent[];
    if (!Array.isArray(events)) return { ...EMPTY };
    const summary = { ...EMPTY, count: events.length };
    for (const e of events) {
      if (typeof e.amount !== 'number' || !(e.amount > 0)) continue;
      summary.total = Math.round((summary.total + e.amount) * 100) / 100;
      if (e.kind === 'change-order') summary.changeOrders += e.amount;
      else if (e.kind === 'late-fee') summary.lateFees += e.amount;
      else if (e.kind === 'topup') summary.topUps += e.amount;
    }
    summary.changeOrders = Math.round(summary.changeOrders * 100) / 100;
    summary.lateFees = Math.round(summary.lateFees * 100) / 100;
    summary.topUps = Math.round(summary.topUps * 100) / 100;
    return summary;
  } catch {
    return { ...EMPTY };
  }
}

export function resetTrialValue(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

export interface ProRoi {
  /** Revenue the ledger attributes to Pro features. */
  earned: number;
  /** Monthly Pro price used as the cost basis. */
  monthlyCost: number;
  /** Earned multiples of one month of Pro. Null when nothing earned yet. */
  multiple: number | null;
  /** Whole months of Pro the earnings cover. */
  monthsCovered: number;
}

/**
 * The mindless-buy number: how many times Pro paid for itself.
 * Cost basis defaults to the $14/mo plan; pass the user's actual
 * equivalent (yearly ≈ $8.25/mo, lifetime amortized) when known.
 */
export function computeProRoi(earned: number, monthlyCost = 14): ProRoi {
  if (!(earned > 0) || !(monthlyCost > 0)) {
    return { earned: Math.max(0, earned || 0), monthlyCost, multiple: null, monthsCovered: 0 };
  }
  const multiple = Math.round((earned / monthlyCost) * 10) / 10;
  return {
    earned,
    monthlyCost,
    multiple,
    monthsCovered: Math.floor(earned / monthlyCost),
  };
}
