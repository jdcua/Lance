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
