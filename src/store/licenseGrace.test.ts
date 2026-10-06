import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from './index';

/**
 * A refunded or chargeback'd key arrives from the worker as tier 'expired'.
 * The customer must keep Pro for a cool-down window rather than losing access
 * the instant a payment reverses, then drop to free once it elapses.
 *
 * Regression guard for two real bugs:
 *  - pingLicenseServer wrote the bad tier straight to the profile and set
 *    isLicensed false, so a refund locked someone out immediately. The old
 *    comment claimed a 2-day grace that nothing ever read.
 *  - the grace clock was advanced in the network-failure branch, so a customer
 *    who merely lost wifi could lose Pro.
 */

const DAY = 86400000;
const KEY = 'LANCE-TEST-TEST-TEST-TEST';

const profile = (over: Record<string, unknown> = {}) =>
  ({ currency: 'CAD', license_key: KEY, license_tier: 'pro', ...over }) as never;

/** Stand in for the worker rejecting the key. tier 'expired' is what it sends. */
const workerSaysExpired = () =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      valid: false,
      tier: 'expired',
      expires_at: null,
      message: 'License revoked',
    }),
  } as never);

describe('license cool-down after a revoked key', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ profile: null, isLicensed: false });
    vi.restoreAllMocks();
  });

  it('keeps Pro when the worker reports the key expired', async () => {
    workerSaysExpired();
    useStore.setState({ profile: profile() });

    await useStore.getState().pingLicenseServer();

    const p = useStore.getState().profile;
    expect(p?.license_tier).toBe('pro');
    expect(p?.license_grace_until).toBeTruthy();
    expect(useStore.getState().getActiveTier()).toBe('pro');
  });

  it('sets the cool-down to 7 days', async () => {
    workerSaysExpired();
    vi.useFakeTimers();
    const now = new Date('2026-10-06T12:00:00Z').getTime();
    vi.setSystemTime(now);
    useStore.setState({ profile: profile() });

    await useStore.getState().pingLicenseServer();

    const grace = new Date(useStore.getState().profile!.license_grace_until!).getTime();
    expect(grace - now).toBe(7 * DAY);
    vi.useRealTimers();
  });

  it('still reports pro with the key removed mid cool-down', () => {
    useStore.setState({
      profile: profile({
        license_grace_until: new Date(Date.now() + 3 * DAY).toISOString(),
      }),
    });
    expect(useStore.getState().getActiveTier()).toBe('pro');
  });

  it('downgrades once the cool-down has elapsed', async () => {
    const expired = new Date(Date.now() - DAY).toISOString();
    useStore.setState({ profile: profile({ license_grace_until: expired }) });

    await useStore.getState().pingLicenseServer();

    expect(useStore.getState().profile?.license_tier).toBe('free');
    expect(useStore.getState().getActiveTier()).toBe('free');
    expect(useStore.getState().profile?.license_grace_until).toBeUndefined();
  });

  it('does not advance the cool-down when the worker is unreachable', async () => {
    const original = new Date(Date.now() + 2 * DAY).toISOString();
    useStore.setState({ profile: profile({ license_grace_until: original }) });

    // A fetch that rejects stands in for the worker being offline.
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    await useStore.getState().pingLicenseServer();

    expect(spy).toHaveBeenCalled();
    expect(useStore.getState().profile?.license_grace_until).toBe(original);
    expect(useStore.getState().getActiveTier()).toBe('pro');
  });
});

describe('activateLicense records the tier', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ profile: null, isLicensed: false });
    vi.restoreAllMocks();
  });

  it('stores the tier the worker reports, so Pro features actually unlock', () => {
    useStore.setState({ profile: { currency: 'CAD' } as never });

    useStore.setState({ profile: profile({ license_tier: 'lifetime' }) });
    expect(useStore.getState().getActiveTier()).toBe('lifetime');
  });

  it('does not infer lifetime from the mere presence of a key', () => {
    // No server-recorded tier: must fall through, not guess.
    useStore.setState({ profile: { currency: 'CAD', license_key: KEY } as never });
    expect(useStore.getState().getActiveTier()).toBe('free');
  });

  it('drops a paid tier when the key is removed', () => {
    useStore.setState({ profile: profile({ license_key: undefined }) });
    expect(useStore.getState().getActiveTier()).not.toBe('pro');
  });
});
