import { describe, it, expect, beforeEach } from 'vitest';
import { getPrefs, setPref, DEFAULT_PREFS } from './prefs';

describe('a11y prefs', () => {
  beforeEach(() => localStorage.clear());
  it('defaults to auto comfort', () => {
    expect(getPrefs().motion).toBe('auto');
    expect(getPrefs().contrast).toBe('auto');
    expect(getPrefs().textScale).toBe('100');
  });
  it('persists contrast + text scale', () => {
    setPref('contrast', 'high');
    setPref('textScale', '125');
    expect(getPrefs().contrast).toBe('high');
    expect(getPrefs().textScale).toBe('125');
  });
  it('merges over old blobs missing new keys', () => {
    localStorage.setItem('lance:prefs', JSON.stringify({ motion: 'off' }));
    expect(getPrefs()).toEqual({ ...DEFAULT_PREFS, motion: 'off' });
  });
});
