import { formatCurrency, DAY_MS } from './format';

/**
 * Late-fee engine (Pro, smart dunning family).
 *
 * A fee accrues per 30-day period started past the due date:
 * period 1 covers days 1-30 overdue, period 2 days 31-60, and so on.
 * Simple, explainable, and shown line by line before anything is charged.
 */

export interface LateFee {
  periods: number;
  percentPerPeriod: number;
  fee: number;
}

export function computeLateFee(
  total: number,
  dueDateIso: string | undefined,
  percentPerPeriod: number,
  now: Date = new Date(),
): LateFee {
  if (!dueDateIso || !(total > 0) || !(percentPerMonthValid(percentPerPeriod))) {
    return { periods: 0, percentPerPeriod, fee: 0 };
  }
  const due = new Date(dueDateIso);
  if (isNaN(due.getTime())) return { periods: 0, percentPerPeriod, fee: 0 };
  const daysOverdue = Math.floor((now.getTime() - due.getTime()) / DAY_MS);
  if (daysOverdue < 1) return { periods: 0, percentPerPeriod, fee: 0 };
  const periods = Math.floor((daysOverdue - 1) / 30) + 1;
  const fee = Math.round(total * (percentPerPeriod / 100) * periods * 100) / 100;
  return { periods, percentPerPeriod, fee };
}

function percentPerMonthValid(p: number): boolean {
  return typeof p === 'number' && isFinite(p) && p > 0 && p <= 100;
}

/** One factual paragraph appended to reminder drafts when a fee accrued. */
export function lateFeeParagraph(fee: LateFee, currency?: string): string {
  if (fee.fee <= 0) return '';
  return (
    `A late fee of ${formatCurrency(fee.fee, currency)} applies ` +
    `(${fee.percentPerPeriod}% per month, ${fee.periods} period${fee.periods === 1 ? '' : 's'} overdue).`
  );
}
