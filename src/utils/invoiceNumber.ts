import type { Invoice } from '../types';

export function generateInvoiceNumber(existingInvoices: Invoice[]): string {
  if (!existingInvoices || existingInvoices.length === 0) {
    return 'INV-001';
  }
  const max = existingInvoices.reduce((acc, inv) => {
    const n = parseInt(inv.invoice_number.replace('INV-', '')) || 0;
    return Math.max(acc, n);
  }, 0);
  return `INV-${String(max + 1).padStart(3, '0')}`;
}
