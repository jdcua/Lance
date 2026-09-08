import { describe, it, expect } from 'vitest';
import { trialDaysRemaining } from './trial';
import { TRIAL } from './constants';

describe('trial countdown', () => {
  it('gives a full trial with no start date', () => {
    expect(trialDaysRemaining(null)).toBe(TRIAL.FULL_DAYS);
    expect(trialDaysRemaining(undefined)).toBe(TRIAL.FULL_DAYS);
    expect(trialDaysRemaining('not-a-date')).toBe(TRIAL.FULL_DAYS);
  });

  it('counts down from the start date', () => {
    const now = new Date('2026-09-08T12:00:00Z');
    expect(trialDaysRemaining('2026-09-08T12:00:00Z', now)).toBe(30);
    expect(trialDaysRemaining('2026-09-03T12:00:00Z', now)).toBe(25);
    expect(trialDaysRemaining('2026-08-10T12:00:00Z', now)).toBe(1);
  });

  it('floors at zero past the trial', () => {
    const now = new Date('2026-10-20T12:00:00Z');
    expect(trialDaysRemaining('2026-08-01T00:00:00Z', now)).toBe(0);
  });
});
