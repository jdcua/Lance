import type { RecurringInvoice } from '../types';

export function getNextDueDate(
  frequency: RecurringInvoice['frequency'],
  from: Date
): Date {
  const d = new Date(from);
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
  }
  return d;
}

export function shouldGenerate(ri: RecurringInvoice): boolean {
  if (!ri.active) return false;
  return new Date(ri.next_due) <= new Date();
}

export function countCyclesBehind(
  ri: RecurringInvoice,
  maxCycles: number = 12
): number {
  let count = 0;
  let cursor = new Date(ri.next_due);
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
