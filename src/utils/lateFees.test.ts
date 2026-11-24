import { describe, it, expect } from 'vitest';
import { computeLateFee, lateFeeParagraph } from './lateFees';

const NOW = new Date('2026-09-08T12:00:00Z');

describe('late-fee engine', () => {
  it('accrues per 30-day period started', () => {
    // 10 days overdue at 1.5% on $1000 -> 1 period -> $15.
    expect(computeLateFee(1000, '2026-08-29', 1.5, NOW)).toEqual({
      periods: 1,
      percentPerPeriod: 1.5,
      fee: 15,
    });
    // 31 days overdue -> 2 periods -> $30.
    expect(computeLateFee(1000, '2026-08-08', 1.5, NOW).fee).toBe(30);
    // 61 days overdue -> 3 periods.
    expect(computeLateFee(2000, '2026-07-09', 2, NOW)).toEqual({
      periods: 3,
      percentPerPeriod: 2,
      fee: 120,
    });
  });

  it('charges nothing before it is due or when misconfigured', () => {
    expect(computeLateFee(1000, '2026-09-08', 1.5, NOW).fee).toBe(0);
    expect(computeLateFee(1000, '2026-10-01', 1.5, NOW).fee).toBe(0);
    expect(computeLateFee(1000, undefined, 1.5, NOW).fee).toBe(0);
    expect(computeLateFee(1000, '2026-08-01', 0, NOW).fee).toBe(0);
    expect(computeLateFee(1000, '2026-08-01', -2, NOW).fee).toBe(0);
    expect(computeLateFee(0, '2026-08-01', 1.5, NOW).fee).toBe(0);
    expect(computeLateFee(1000, 'garbage', 1.5, NOW).fee).toBe(0);
  });

  it('rounds to cents', () => {
    expect(computeLateFee(333.33, '2026-08-20', 1.5, NOW).fee).toBe(5);
  });

  it('renders the draft paragraph', () => {
    const p = lateFeeParagraph({ periods: 2, percentPerPeriod: 1.5, fee: 30 }, 'USD');
    expect(p).toContain('$30');
    expect(p).toContain('1.5% per month');
    expect(p).toContain('2 periods');
    expect(lateFeeParagraph({ periods: 0, percentPerPeriod: 1.5, fee: 0 })).toBe('');
  });
});
