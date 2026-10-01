import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './index';

describe('startTrial', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ profile: null });
  });

  it("returns no-profile when there is no profile", async () => {
    expect(await useStore.getState().startTrial()).toBe('no-profile');
  });

  it('starts the clock once, then reports already', async () => {
    useStore.setState({ profile: { currency: 'CAD' } as never });
    expect(await useStore.getState().startTrial()).toBe('started');
    const startedAt = useStore.getState().profile?.trial_started_at;
    expect(startedAt).toBeTruthy();
    expect(await useStore.getState().startTrial()).toBe('already');
    expect(useStore.getState().profile?.trial_started_at).toBe(startedAt);
    expect(useStore.getState().getActiveTier()).toBe('trial');
  });

  it('reports expired for an old clock without resetting it', async () => {
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    useStore.setState({ profile: { currency: 'CAD', trial_started_at: old } as never });
    expect(await useStore.getState().startTrial()).toBe('expired');
    expect(useStore.getState().profile?.trial_started_at).toBe(old);
    expect(useStore.getState().getActiveTier()).toBe('expired');
  });

  it('reports licensed when a key is present', async () => {
    useStore.setState({ profile: { currency: 'CAD', license_key: 'x' } as never });
    expect(await useStore.getState().startTrial()).toBe('licensed');
  });
});
