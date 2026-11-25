import { describe, it, expect } from 'vitest';
import { extractFields, extractAmounts } from '../import/parsers/document';

const invoiceText =
  'Invoice #INV-001\nDate: 01/15/2025\nBill to: Acme Corp\nTotal: $1,234.56\nEmail: a@b.com';

const proposalText =
  'Subject: Website Redesign\nDue date: 2025-03-01\nTotal: $500.00\nhello@example.com';

describe('document parser extraction helpers', () => {
  it('extractAmounts collects monetary amounts from invoice text', () => {
    expect(extractAmounts(invoiceText)).toEqual([1234.56, 1234.56]);
  });

  it('extractAmounts collects amounts from proposal text', () => {
    expect(extractAmounts(proposalText)).toEqual([500, 500]);
  });

  it('extractAmounts returns [] for empty input', () => {
    expect(extractAmounts('')).toEqual([]);
  });

  it('extractAmounts returns [] when nothing matches', () => {
    expect(extractAmounts('no numbers here')).toEqual([]);
  });

  it('extractFields parses an invoice', () => {
    expect(extractFields(invoiceText)).toEqual({
      date: '01/15/2025',
      total: '1234.56',
      email: 'a@b.com',
      client_name: 'Acme Corp',
      invoice_number: 'INV-001',
    });
  });

  it('extractFields parses a proposal', () => {
    expect(extractFields(proposalText)).toEqual({
      date: '2025-03-01',
      due_date: '2025-03-01',
      total: '500',
      email: 'hello@example.com',
      title: 'Website Redesign',
    });
  });

  it('extractFields returns {} for empty input', () => {
    expect(extractFields('')).toEqual({});
  });

  it('extractFields returns {} when nothing matches', () => {
    expect(extractFields('no numbers here')).toEqual({});
  });
});
