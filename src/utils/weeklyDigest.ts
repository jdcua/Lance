import type { Invoice, TimeEntry, Proposal } from '../types';

export interface WeeklyDigest {
  weekLabel: string;
  paidTotal: number;
  paidCount: number;
  hoursLogged: number;
  openProposals: number;
  overdueCount: number;
  hasActivity: boolean;
}

/** Monday (local) starting the week containing `now`. */
export function weekStart(now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function weekKey(now: Date = new Date()): string {
  const s = weekStart(now);
  return `${s.getFullYear()}-W${String(Math.ceil(s.getDate() / 7)).padStart(2, '0')}-${s.getMonth() + 1}`;
}

export function buildWeeklyDigest(
  invoices: Invoice[],
  timeEntries: TimeEntry[],
  proposals: Proposal[],
  now: Date = new Date(),
): WeeklyDigest {
  const start = weekStart(now).getTime();
  const paid = invoices.filter((i) => {
    if (i.status !== 'paid') return false;
    const t = new Date(i.paid_at || i.created_at).getTime();
    return !isNaN(t) && t >= start;
  });
  const hours =
    timeEntries
      .filter((t) => {
        if (!t.duration_minutes) return false;
        const s = new Date(t.start_time).getTime();
        return !isNaN(s) && s >= start;
      })
      .reduce((s, t) => s + (t.duration_minutes || 0), 0) / 60;
  const openProposals = proposals.filter((p) => p.status === 'sent').length;
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  return {
    weekLabel: `Week of ${weekStart(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    paidTotal: paid.reduce((s, i) => s + i.total, 0),
    paidCount: paid.length,
    hoursLogged: Math.round(hours * 10) / 10,
    openProposals,
    overdueCount,
    hasActivity: paid.length > 0 || hours > 0 || openProposals > 0 || overdueCount > 0,
  };
}
