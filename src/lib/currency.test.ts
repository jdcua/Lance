import { describe, it, expect } from 'vitest';
import { sanitizeRates, normalizeRates, ratesCover, convertAmount, convertByCurrency } from './currency';

describe('manual exchange rates', () => {
  it('sanitizes garbage rates', () => {
    expect(sanitizeRates({ USD: 1.36, usd2: 2, XX: 0, YY: -1, ZZ: NaN, BAD: 'x', EUR: '0.92' })).toEqual({
      USD: 1.36,
      EUR: 0.92,
    });
    expect(sanitizeRates(null)).toEqual({});
    expect(sanitizeRates('nope')).toEqual({});
  });

  it('normalizes the TEXT-column form', () => {
    expect(normalizeRates('{"USD":1.36}')).toEqual({ USD: 1.36 });
    expect(normalizeRates('garbage{')).toEqual({});
    expect(normalizeRates({ USD: 1.36 })).toEqual({ USD: 1.36 });
  });

  it('checks coverage excluding the profile currency', () => {
    expect(ratesCover(['CAD'], 'CAD', {})).toBe(true);
    expect(ratesCover(['CAD', 'USD'], 'CAD', { USD: 1.36 })).toBe(true);
    expect(ratesCover(['CAD', 'USD', 'EUR'], 'CAD', { USD: 1.36 })).toBe(false);
  });

  it('converts amounts and per-currency maps', () => {
    expect(convertAmount(100, 'CAD', 'CAD', {})).toBe(100);
    expect(convertAmount(100, 'USD', 'CAD', { USD: 1.36 })).toBeCloseTo(136);
    expect(convertAmount(100, 'EUR', 'CAD', { USD: 1.36 })).toBeNull();
    expect(convertByCurrency({ CAD: 100, USD: 100 }, 'CAD', { USD: 1.36 })).toBeCloseTo(236);
    expect(convertByCurrency({ CAD: 100, EUR: 50 }, 'CAD', { USD: 1.36 })).toBeNull();
    expect(convertByCurrency({}, 'CAD', {})).toBe(0);
  });
});
