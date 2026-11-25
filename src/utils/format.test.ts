import { describe, it, expect } from 'vitest';
import { formatCurrency, parseDateString, todayLocalISO } from './format';

describe('format hardening', () => {
  it('formats finite amounts normally', () => {
    expect(formatCurrency(1234.5, 'CAD')).toMatch(/1,234\.50/);
    expect(formatCurrency(0, 'USD')).toMatch(/0\.00/);
    expect(formatCurrency(-45.2, 'CAD')).toMatch(/45\.20/);
  });

  it('renders an em dash for non-finite amounts instead of $NaN', () => {
    expect(formatCurrency(NaN, 'CAD')).toBe('—');
    expect(formatCurrency(Infinity, 'CAD')).toBe('—');
    expect(formatCurrency(-Infinity, 'CAD')).toBe('—');
    expect(formatCurrency('12.5' as never, 'CAD')).toBe('—');
    expect(formatCurrency(undefined as never, 'CAD')).toBe('—');
  });

  it('todayLocalISO uses local calendar, not UTC', () => {
    // 11:30pm local Dec 31 is already Jan 1 in UTC — toISOString would say
    // the wrong day. Explicit local fields never lie.
    expect(todayLocalISO(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
    expect(todayLocalISO(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
    expect(todayLocalISO(new Date(2026, 2, 5, 12, 0))).toBe('2026-03-05');
  });

  it('parses date-only strings as local midnight, not UTC', () => {
    const d = parseDateString('2026-07-01');
    // Timezone-independent assertion: local getters must show Jul 1.
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
    // Leap day survives the round trip.
    const leap = parseDateString('2024-02-29');
    expect(leap.getMonth()).toBe(1);
    expect(leap.getDate()).toBe(29);
    // Full timestamps pass through untouched.
    expect(parseDateString('2026-07-01T15:30:00.000Z').toISOString()).toBe(
      '2026-07-01T15:30:00.000Z',
    );
  });
});
