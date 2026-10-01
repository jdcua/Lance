import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadTestMode,
  activateTestMode,
  deactivateTestMode,
  snapshotProfile,
  restoreProfileSnapshot,
} from './testMode';

describe('testMode helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to off and tolerates garbage', () => {
    expect(loadTestMode()).toEqual({ active: false, tier: null });
    localStorage.setItem('lance:test-mode', 'not-json{{{');
    expect(loadTestMode()).toEqual({ active: false, tier: null });
  });

  it('round-trips activation', () => {
    activateTestMode('pro');
    expect(loadTestMode()).toEqual({ active: true, tier: 'pro' });
    deactivateTestMode();
    expect(loadTestMode()).toEqual({ active: false, tier: null });
  });

  it('snapshots and restores the profile byte-for-byte', () => {
    localStorage.setItem('lance:profile', '{"currency":"CAD","name":"Real"}');
    snapshotProfile();
    localStorage.setItem('lance:profile', '{"currency":"USD"}');
    restoreProfileSnapshot();
    expect(localStorage.getItem('lance:profile')).toBe('{"currency":"CAD","name":"Real"}');
  });

  it('restore removes a profile created during testing', () => {
    localStorage.removeItem('lance:profile');
    snapshotProfile();
    localStorage.setItem('lance:profile', '{"currency":"CAD"}');
    restoreProfileSnapshot();
    expect(localStorage.getItem('lance:profile')).toBeNull();
  });
});
