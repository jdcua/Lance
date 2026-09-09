import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import type { UserProfile } from '../types';

function profile(over: Partial<UserProfile>): void {
  useStore.setState({
    profile: {
      currency: 'CAD',
      ...over,
    } as UserProfile,
  });
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

describe('trial tier derivation', () => {
  beforeEach(() => {
    useStore.setState({ profile: null });
  });

  it('resolves free with no profile', () => {
    expect(useStore.getState().getActiveTier()).toBe('free');
  });

  it('lets server-validated tiers win when the key is present', () => {
    profile({ license_tier: 'pro', license_key: 'LANCE-AAAA-BBBB-CCCC-DDDD' });
    expect(useStore.getState().getActiveTier()).toBe('pro');
  });

  it('treats a key without a tier as lifetime (legacy)', () => {
    profile({ license_key: 'LANCE-AAAA-BBBB-CCCC-DDDD' });
    expect(useStore.getState().getActiveTier()).toBe('lifetime');
  });

  it('grants trial through the 37-day grace window', () => {
    profile({ trial_started_at: daysAgo(5) });
    expect(useStore.getState().getActiveTier()).toBe('trial');
    profile({ trial_started_at: daysAgo(30) });
    expect(useStore.getState().getActiveTier()).toBe('trial');
    profile({ trial_started_at: daysAgo(37) });
    expect(useStore.getState().getActiveTier()).toBe('trial');
  });

  it('expires past the grace window', () => {
    profile({ trial_started_at: daysAgo(38) });
    expect(useStore.getState().getActiveTier()).toBe('expired');
    profile({ trial_started_at: daysAgo(200) });
    expect(useStore.getState().getActiveTier()).toBe('expired');
  });

  it('falls back to free on garbage dates', () => {
    profile({ trial_started_at: 'not-a-date' });
    expect(useStore.getState().getActiveTier()).toBe('free');
  });

  it('never grants paid tiers without a key (stale tier after removal)', () => {
    profile({ license_tier: 'pro', trial_started_at: daysAgo(200) });
    expect(useStore.getState().getActiveTier()).toBe('expired');
    profile({ license_tier: 'lifetime', trial_started_at: daysAgo(5) });
    expect(useStore.getState().getActiveTier()).toBe('trial');
    profile({ license_tier: 'lifetime' });
    expect(useStore.getState().getActiveTier()).toBe('free');
  });

  it('honors non-paid server tiers without a key', () => {
    profile({ license_tier: 'expired' });
    expect(useStore.getState().getActiveTier()).toBe('expired');
    profile({ license_tier: 'free', trial_started_at: daysAgo(5) });
    expect(useStore.getState().getActiveTier()).toBe('free');
  });
});
