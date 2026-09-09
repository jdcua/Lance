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

    const split = parseBankRows(
      [{ D: '2026-09-01', M: 'Ads', Out: '50.00', In: '' }],
      { date: 'D', description: 'M', debit: 'Out', credit: 'In' },
    );
    expect(split.parsed[0]).toMatchObject({ amount: -50, direction: 'out' });
  });

  it('fingerprints duplicates deterministically', () => {
    expect(expenseFingerprint('2026-09-01', -4.5, ' Coffee ')).toBe(
      expenseFingerprint('2026-09-01', 4.5, 'coffee'),
    );
  });
});
