import { describe, it, expect } from 'vitest';
import { sanitizePhone } from './sanitize';

describe('sanitizePhone', () => {
  it('keeps legitimate international formats intact', () => {
    expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
    expect(sanitizePhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  });

  it('strips letters and slashes instead of storing them verbatim', () => {
    expect(sanitizePhone('../../../etc/passwd')).not.toMatch(/[a-z/]/);
    expect(sanitizePhone('555-ABC-DEF')).toBe('555--');
    expect(sanitizePhone('')).toBe('');
  });
});
