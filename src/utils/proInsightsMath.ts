import type { Invoice, Proposal, RecurringInvoice, Client } from '../types';

// Pure math behind the Pro insights panels. No React, no store access,
// so the forecasting stays unit testable and explainable to the user.

const RECURRING_MONTHLY_FACTOR: Record<RecurringInvoice['frequency'], number> = {
  weekly: 4.33,
  biweekly: 2.17,
  monthly: 1,
  quarterly: 1 / 3,
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export interface ForecastMonth {
  label: string;
  base: number;
  pipeline: number;
  total: number;
}

export interface Forecast {
  months: ForecastMonth[];
  runRate: number;
  recurringMonthly: number;
  pipelineValue: number;
  total: number;
  flatOnly: boolean;
}

export function computeForecast(
  invoices: Invoice[],
  proposals: Proposal[],
  recurring: RecurringInvoice[],
  winRateFraction: number,
  now = new Date(),
): Forecast {
  // Average paid revenue over the last 3 full months.
  const paidByMonth = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.status !== 'paid') continue;
    const day = inv.paid_at || inv.created_at;
    const d = new Date(day);
    if (isNaN(d.getTime())) continue;
    const key = monthKey(d);
    paidByMonth.set(key, (paidByMonth.get(key) || 0) + inv.total);
  }
  const last3: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last3.push(paidByMonth.get(monthKey(d)) || 0);
  }
  const runRate = last3.reduce((a, b) => a + b, 0) / 3;

  const recurringMonthly = recurring
    .filter((r) => r.active)
    .reduce((sum, r) => sum + r.total * (RECURRING_MONTHLY_FACTOR[r.frequency] || 0), 0);

  // Pipeline: flat-rate open proposals weighted by win rate. Hourly proposals
  // carry no fixed value, so they are counted separately, never guessed.
  const openFlat = proposals.filter((p) => p.status === 'sent' && p.rate_type !== 'hourly');
  const openHourlyCount = proposals.filter((p) => p.status === 'sent' && p.rate_type === 'hourly').length;
  const pipelineValue = openFlat.reduce((sum, p) => sum + (p.rate || 0), 0) * winRateFraction;

  const months: ForecastMonth[] = [0, 1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const label = d.toLocaleString('en-US', { month: 'short' });
    const base = runRate + recurringMonthly;
    const pipeline = pipelineValue / 3;
    return { label, base, pipeline, total: base + pipeline };
  });

  return {
    months,
    runRate,
    recurringMonthly,
    pipelineValue,
    total: months.reduce((a, m) => a + m.total, 0),
    flatOnly: openHourlyCount > 0,
  };
}

export interface EffectiveRate {
  effective: number | null;
  stated: number | null;
  /** True when effective trails stated by more than 15 percent. */
  alert: boolean;
  leakPerHour: number | null;
}

export function computeEffectiveRate(
  totalPaid: number,
  totalMinutes: number,
  statedRate: number | null | undefined,
): EffectiveRate {
  const hours = totalMinutes / 60;
  if (hours <= 0) return { effective: null, stated: statedRate || null, alert: false, leakPerHour: null };
  const effective = totalPaid / hours;
  if (!statedRate || statedRate <= 0) {
    return { effective, stated: null, alert: false, leakPerHour: null };
  }
  const ratio = effective / statedRate;
  const alert = ratio < 0.85;
  return { effective, stated: statedRate, alert, leakPerHour: alert ? statedRate - effective : null };
}

export interface ClientWinRate {
  clientId: string;
  name: string;
  accepted: number;
  resolved: number;
  rate: number | null;
  lostRevenue: number;
}

export function isProposalResolved(p: Proposal): boolean {
  return p.status !== 'draft' && p.status !== 'sent' && p.status !== 'expired';
}

export function computeClientWinRates(proposals: Proposal[], clients: Client[]): ClientWinRate[] {
  const byClient = new Map<string, { accepted: number; resolved: number; lost: number }>();
  for (const p of proposals) {
    if (!isProposalResolved(p)) continue;
    const entry = byClient.get(p.client_id) || { accepted: 0, resolved: 0, lost: 0 };
    entry.resolved += 1;
    if (p.status === 'accepted') entry.accepted += 1;
    else if (p.rate_type !== 'hourly') entry.lost += p.rate || 0;
    byClient.set(p.client_id, entry);
  }
  return [...byClient.entries()]
    .map(([clientId, e]) => ({
      clientId,
      name: clients.find((c) => c.id === clientId)?.name || 'Unknown client',
      accepted: e.accepted,
      resolved: e.resolved,
      rate: e.resolved > 0 ? Math.round((e.accepted / e.resolved) * 100) : null,
      lostRevenue: e.lost,
    }))
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
}
