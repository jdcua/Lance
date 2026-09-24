import { describe, it, expect } from 'vitest';
import { generateInvoiceNumber, sanitizeInvoiceNumber } from './invoiceNumber';
import type { Invoice } from '../types';

function inv(n: string): Invoice {
  return { id: n, client_id: 'c', invoice_number: n } as Invoice;
}

describe('invoice numbers', () => {
  it('starts at INV-001 and increments past the max', () => {
    expect(generateInvoiceNumber([])).toBe('INV-001');
    expect(generateInvoiceNumber([inv('INV-001'), inv('INV-009')])).toBe('INV-010');
  });

  it('never reuses deleted numbers (max, not count)', () => {
    expect(generateInvoiceNumber([inv('INV-001'), inv('INV-005')])).toBe('INV-006');
  });

  it('parses case-insensitively and ignores non-numeric numbers', () => {
    expect(generateInvoiceNumber([inv('inv-007')])).toBe('INV-008');
    expect(generateInvoiceNumber([inv('Q-5'), inv('INV-002')])).toBe('INV-003');
    expect(generateInvoiceNumber([inv('')])).toBe('INV-001');
  });

  it('sanitizes header-injection and markup characters', () => {
    expect(sanitizeInvoiceNumber('INV-001\r\nBcc: x')).not.toMatch(/[\r\n]/);
    expect(sanitizeInvoiceNumber('<b>INV-1</b>')).toBe('bINV-1/b');
    expect(sanitizeInvoiceNumber('  INV-12  ')).toBe('INV-12');
    expect(sanitizeInvoiceNumber('')).toBe('');
  });
});
