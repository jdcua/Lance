import { describe, it, expect } from 'vitest';
import { validateLicenseKey, validateLicenseKeyFormat } from './index';

/**
 * Browser mode has no `validate_license` handler, so tauriInvoke returned {}
 * from its catch-all. {} is truthy, so every string passed the offline check
 * and activateLicense granted Pro. Found by pasting a key that the input had
 * mangled: the mangled key still reported "Licensed".
 */
describe('validateLicenseKey', () => {
  it('rejects a non-key string', async () => {
    expect(await validateLicenseKey('hello')).toBe(false);
    expect(await validateLicenseKey('')).toBe(false);
    expect(await validateLicenseKey('   ')).toBe(false);
  });

  it('never returns a truthy non-boolean from the shim', async () => {
    // Whatever the shim hands back, the result must be a real boolean.
    const result = await validateLicenseKey('LANCE-NCMW-5XKT-HFWR-5DEN');
    expect(typeof result).toBe('boolean');
  });

  it('does not treat a mangled key as valid', async () => {
    // LANCE-ANCE-NCMW-5XKT-HFWR is what the input produced from a real key.
    // It is deliberately well-formed, so the shape check cannot catch it: only
    // the input fix and the strict `=== true` coercion do.
    expect(await validateLicenseKey('LANCE-ANCE-NCMW-5XKT-HFWR')).toBe(false);
  });
});

describe('validateLicenseKeyFormat', () => {
  it('accepts a well-formed key', () => {
    expect(validateLicenseKeyFormat('LANCE-NCMW-5XKT-HFWR-5DEN')).toBe(true);
  });

  it('still passes the shape check for a mangled key, which is why that check is not enough', () => {
    // Four legal groups, so the shape is fine. Documented as a limitation: the
    // shape guard catches typos, not a duplicated LANCE prefix.
    expect(validateLicenseKeyFormat('LANCE-ANCE-NCMW-5XKT-HFWR')).toBe(true);
  });

  it('rejects wrong lengths and lowercase', () => {
    expect(validateLicenseKeyFormat('LANCE-NCMW-5XKT')).toBe(false);
    expect(validateLicenseKeyFormat('LANCE-ncmw-5xkt-hfwr-5den')).toBe(false);
    expect(validateLicenseKeyFormat('XXXXX-NCMW-5XKT-HFWR-5DEN')).toBe(false);
  });

  it('rejects characters outside the Crockford-style alphabet', () => {
    // 0, 1, I, O and U are excluded by the mint script's ALLOWED set.
    expect(validateLicenseKeyFormat('LANCE-NCM0-5XKT-HFWR-5DEN')).toBe(false);
    expect(validateLicenseKeyFormat('LANCE-NCM1-5XKT-HFWR-5DEN')).toBe(false);
  });
});
