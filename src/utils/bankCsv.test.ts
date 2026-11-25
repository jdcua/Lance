import { describe, it, expect } from 'vitest';
import { detectBankColumns, parseBankDate, parseBankRows, expenseFingerprint } from './bankCsv';

describe('bank CSV importing', () => {
  it('detects common bank layouts', () => {
    expect(detectBankColumns(['Date', 'Description', 'Amount'])).toEqual({
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
      debit: undefined,
      credit: undefined,
    });
    const split = detectBankColumns(['Posted Date', 'Payee', 'Debit', 'Credit']);
    expect(split.date).toBe('Posted Date');
    expect(split.debit).toBe('Debit');
    expect(split.credit).toBe('Credit');
  });

  it('parses US, EU, and ISO dates', () => {
    expect(parseBankDate('2026-09-01')).toBe('2026-09-01');
    expect(parseBankDate('09/02/2026')).toBe('2026-09-02');
    expect(parseBankDate('15/09/2026')).toBe('2026-09-15');
    expect(parseBankDate('')).toBeNull();
    expect(parseBankDate('nonsense')).toBeNull();
  });

  it('resolves signed amounts and debit/credit splits', () => {
    const signed = parseBankRows(
      [
        { Date: '2026-09-01', Description: 'Coffee', Amount: '-4.50' },
        { Date: '2026-09-02', Description: 'Client pay', Amount: '1200.00' },
        { Date: '2026-09-03', Description: 'Empty', Amount: '' },
      ],
      { date: 'Date', description: 'Description', amount: 'Amount' },
    );
    expect(signed.parsed).toHaveLength(2);
    expect(signed.parsed[0]).toMatchObject({ amount: -4.5, direction: 'out' });
    expect(signed.parsed[1]).toMatchObject({ amount: 1200, direction: 'in' });
    expect(signed.skipped).toBe(1);

    const split = parseBankRows([{ D: '2026-09-01', M: 'Ads', Out: '50.00', In: '' }], {
      date: 'D',
      description: 'M',
      debit: 'Out',
      credit: 'In',
    });
    expect(split.parsed[0]).toMatchObject({ amount: -50, direction: 'out' });
  });

  it('parses US thousands, EU decimals, and parentheses negatives', () => {
    const rows = parseBankRows(
      [
        { D: '2026-09-01', M: 'US thousands', A: '1,200.00' },
        { D: '2026-09-02', M: 'EU decimal', A: '1.200,00' },
        { D: '2026-09-03', M: 'EU cents', A: '-4,50' },
        { D: '2026-09-04', M: 'Parens refund', A: '($25.00)' },
        { D: '2026-09-05', M: 'Bare thousands', A: '1,200' },
      ],
      { date: 'D', description: 'M', amount: 'A' },
    );
    expect(rows.skipped).toBe(0);
    expect(rows.parsed.map((r) => r.amount)).toEqual([1200, 1200, -4.5, -25, 1200]);
  });

  it('fingerprints duplicates deterministically', () => {
    expect(expenseFingerprint('2026-09-01', -4.5, ' Coffee ')).toBe(
      expenseFingerprint('2026-09-01', 4.5, 'coffee'),
    );
  });
});
