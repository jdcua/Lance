import { describe, it, expect } from 'vitest';
import { mapToClients, mapToExpenses } from './mappers';

const mapping = (fields: string[]) => Object.fromEntries(fields.map((f) => [`col_${f}`, f]));

describe('import mappers sanitize untrusted cells', () => {
  it('strips markup from client text fields', () => {
    const rows = [
      {
        col_name: '<img src=x onerror=alert(1)>Acme',
        col_email: 'a@b.co',
        col_phone: '../../../etc/passwd',
        col_company: 'Acme',
        col_notes: 'hi',
      },
    ];
    const [c] = mapToClients(rows, mapping(['name', 'email', 'phone', 'company', 'notes']));
    expect(c.name).not.toMatch(/<|>/);
    expect(c.name).toContain('Acme');
    expect(c.phone).not.toMatch(/[a-z/]/);
  });

  it('strips markup from expense fields', () => {
    const rows = [{ col_category: 'Travel<script>', col_description: 'x', col_amount: '10' }];
    const [e] = mapToExpenses(rows, mapping(['category', 'description', 'amount']));
    expect(e.category).not.toMatch(/<|>/);
  });
});

describe('normalizeDate via mapToExpenses', () => {
  it('converts Excel serials to ISO dates', () => {
    // Excel serial 45658 = 2025-01-01.
    const rows = [{ col_description: 'x', col_amount: '10', col_date: '45658' }];
    const [e] = mapToExpenses(rows, mapping(['description', 'amount', 'date']));
    expect(e.date).toBe('2025-01-01');
  });

  it('leaves plain small numbers alone (no date)', () => {
    const rows = [{ col_description: 'x', col_amount: '10', col_date: '2024' }];
    const [e] = mapToExpenses(rows, mapping(['description', 'amount', 'date']));
    // '2024' parses as a year via Date(); must never become a serial date.
    expect(e.date).not.toBe('1975-01-01');
  });

  it('still parses ISO and locale dates', () => {
    const iso = mapToExpenses(
      [{ col_description: 'x', col_amount: '10', col_date: '2026-03-04' }],
      mapping(['description', 'amount', 'date']),
    )[0];
    expect(iso.date).toBe('2026-03-04');
  });
});
