import { describe, it, expect } from 'vitest';
import { getProfileName } from '../export/common';

describe('export common helpers', () => {
  it('returns profile name when present', () => {
    expect(getProfileName({ name: 'Jane', currency: 'USD' })).toBe('Jane');
  });

  it('falls back to Freelancer when name is empty', () => {
    expect(getProfileName({ name: '', currency: 'USD' })).toBe('Freelancer');
  });
});
