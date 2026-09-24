import type { Invoice } from '../types';

export function generateInvoiceNumber(existingInvoices: Invoice[]): string {
  if (!existingInvoices || existingInvoices.length === 0) {
    return 'INV-001';
  }
  const max = existingInvoices.reduce((acc, inv) => {
    const n = parseInt((inv.invoice_number || '').replace(/^inv-/i, '')) || 0;
    return Math.max(acc, n);
  }, 0);
  return `INV-${String(max + 1).padStart(3, '0')}`;
}

/**
 * Sanitizes a user-entered invoice number.
 * Strips CR/LF and control characters (prevents email header injection when the
 * number is interpolated into follow-up subjects/bodies), HTML-special characters,
 * and everything outside a conservative safe set. Used at input time, at save time,
 * and defensively at export/email time.
 */
export function sanitizeInvoiceNumber(value: string): string {
  if (!value) return '';
  return value
    // Remove control chars (CR/LF/TAB/NUL etc.) and HTML-special chars first
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>"'`&=]/g, '')
    // Keep only safe filename/email characters
    .replace(/[^A-Za-z0-9#./\-_:]/g, '')
    .slice(0, 40)
    .trim();
}
