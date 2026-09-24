import type { RecurringInvoice } from '../types';

export function getNextDueDate(
  frequency: RecurringInvoice['frequency'],
  from: Date
): Date {
  const d = new Date(from);
  if (isNaN(d.getTime())) return getNextDueDate(frequency, new Date());
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'quarterly':
      shiftMonths(d, 3);
      break;
    case 'monthly':
    default:
      // Unknown frequencies fall through to monthly: any fixed forward step
      // beats standing still (a no-op advance regenerates every launch).
      shiftMonths(d, 1);
      break;
  }
  return d;
}

/**
 * Month arithmetic that clamps to month-end: Jan 31 + 1 month = Feb 28/29,
 * not Mar 3. Plain setMonth overflows (Feb 31 → Mar 3) and the schedule
 * drifts away from month-end forever after.
 */
function shiftMonths(d: Date, n: number): void {
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
}

/**
 * The date the engine reasons about. Corrupt data (imports, legacy rows)
 * can carry an unparseable next_due — reasoning about "now" both generates
 * the owed draft and, via the normal advance below, self-heals the row
 * instead of stalling silently or regenerating every launch.
 */
export function effectiveDueDate(ri: RecurringInvoice, now: Date = new Date()): Date {
  const d = new Date(ri.next_due);
  return isNaN(d.getTime()) ? now : d;
}

export function shouldGenerate(ri: RecurringInvoice): boolean {
  if (!ri.active) return false;
  const d = new Date(ri.next_due);
  // Unparseable dates (imports, legacy rows) count as due: the loop heals
  // them via effectiveDueDate instead of stalling silently forever.
  if (isNaN(d.getTime())) return true;
  return d <= new Date();
}

export function countCyclesBehind(
  ri: RecurringInvoice,
  maxCycles: number = 12
): number {
  let count = 0;
  let cursor = effectiveDueDate(ri);
  const now = new Date();
  while (cursor <= now && count < maxCycles) {
    cursor = getNextDueDate(ri.frequency, cursor);
    count++;
  }
  return count;
}

const CATCH_UP_CAP = 3;

export function getCatchUpCount(cyclesBehind: number): {
  generate: number;
  capped: boolean;
} {
  if (cyclesBehind <= CATCH_UP_CAP) {
    return { generate: cyclesBehind, capped: false };
  }
  return { generate: CATCH_UP_CAP, capped: true };
}

export function shouldShowCatchUpWarning(
  ri: RecurringInvoice & { last_catch_up_warning?: string }
): boolean {
  if (!ri.last_catch_up_warning) return true;
  const lastWarning = new Date(ri.last_catch_up_warning);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return lastWarning < sevenDaysAgo;
}
