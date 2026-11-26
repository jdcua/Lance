import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sanitizeRates, convertAmount, convertByCurrency, ratesCover } from './currency';

describe('currency math properties', () => {
  it('sanitizeRates is idempotent and emits only valid entries', () => {
    const rawRates = fc.dictionary(
      fc.string(),
      fc.oneof(fc.float(), fc.string(), fc.constant(null)),
    );

    fc.assert(
      fc.property(rawRates, (raw) => {
        const once = sanitizeRates(raw);
        expect(sanitizeRates(once)).toEqual(once);
        for (const [code, rate] of Object.entries(once)) {
          expect(code).toMatch(/^[A-Z]{3}$/);
          expect(Number.isFinite(rate)).toBe(true);
          expect(rate).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('convertAmount is an identity, linear and reciprocal', () => {
    const amount = fc.integer({ min: -100_000, max: 100_000 });
    const rate = fc.integer({ min: 1, max: 100_000 });
    const code = fc.constantFrom('CAD', 'USD', 'EUR', 'XYZ');

    fc.assert(
      fc.property(amount, rate, code, (a, r, c) => {
        expect(convertAmount(a, c, c, {})).toBe(a);
        expect(convertAmount(a, 'USD', 'CAD', { USD: r })).toBeCloseTo(a * r, 2);
        expect(convertAmount(a, 'USD', 'CAD', {})).toBeNull();
        expect(convertAmount(a * r, 'CAD', 'USD', { CAD: 1 / r })).toBeCloseTo(a, 2);

        const byCurrency = { CAD: a, USD: a === 0 ? 0 : r };
        const foreign = a === 0 ? [] : ['USD'];
        expect(convertByCurrency(byCurrency, 'CAD', {}) === null).toBe(
          !ratesCover(foreign, 'CAD', {}),
        );
        expect(convertByCurrency(byCurrency, 'CAD', { USD: r }) === null).toBe(
          !ratesCover(foreign, 'CAD', { USD: r }),
        );
      }),
      { numRuns: 100 },
    );
  });
});
