export interface RetainerRow {
  id: string;
  client_id: string;
  monthly_hours: number;
  rate: number;
  renewal_date?: string;
  active: boolean;
}

export type BurnStatus = 'ok' | 'watch' | 'over';

export interface BurnResult {
  hoursLogged: number;
  percent: number;
  overByHours: number;
  status: BurnStatus;
}

/** Monthly burn-down for one retainer. Watch at 80 percent, over past 100. */
export function computeBurn(monthlyHours: number, loggedMinutes: number): BurnResult {
  const hoursLogged = Math.round(((loggedMinutes || 0) / 60) * 10) / 10;
  if (!(monthlyHours > 0)) {
    return { hoursLogged, percent: 0, overByHours: 0, status: 'ok' };
  }
  const percent = Math.round((hoursLogged / monthlyHours) * 100);
  const overByHours = Math.round(Math.max(0, hoursLogged - monthlyHours) * 10) / 10;
  const status: BurnStatus = percent >= 100 ? 'over' : percent >= 80 ? 'watch' : 'ok';
  return { hoursLogged, percent, overByHours, status };
}

/** Whole minutes logged per client inside a month window (ISO bounds). */
export function minutesByClient(
  entries: { client_id: string; start_time: string; duration_minutes?: number }[],
  monthStartIso: string,
  monthEndIso: string,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of entries) {
    if (!e.duration_minutes) continue;
    if (e.start_time < monthStartIso || e.start_time > monthEndIso) continue;
    totals[e.client_id] = (totals[e.client_id] || 0) + (e.duration_minutes || 0);
  }
  return totals;
}

export function currentMonthBounds(now: Date = new Date()): { start: string; end: string; label: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const label = now.toLocaleString('en-US', { month: 'long' });
  return { start, end, label };
}
