import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useStore } from '../store';
import { createMetaSlice } from '../store/slices/meta';
import { loadChangelog } from '../utils/changelog';
import { useAutoUpdater } from '../hooks/useAutoUpdater';

const { check } = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check }));

function Harness() {
  useAutoUpdater();
  return null;
}

function pref(): boolean {
  return (useStore.getState() as unknown as { networkChecksEnabled: boolean }).networkChecksEnabled;
}

function setEnabled(enabled: boolean): void {
  useStore.setState({ networkChecksEnabled: enabled } as never);
}

async function advancePastInitialDelay(): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(3000);
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

describe('networkChecksEnabled preference', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    check.mockResolvedValue(null);
    setEnabled(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('defaults to enabled with no stored preference', () => {
    const slice = createMetaSlice(
      () => {},
      () => ({ loading: {}, errors: {} }),
    );
    expect(slice.networkChecksEnabled).toBe(true);
    expect(pref()).toBe(true);
  });

  it('reads a persisted false value and persists writes through the setter', () => {
    localStorage.setItem('lance:network-checks-enabled', 'false');
    const reader = createMetaSlice(
      () => {},
      () => ({ loading: {}, errors: {} }),
    );
    expect(reader.networkChecksEnabled).toBe(false);

    const set = vi.fn();
    const writer = createMetaSlice(set, () => ({ loading: {}, errors: {} }));
    writer.setNetworkChecksEnabled(false);
    expect(localStorage.getItem('lance:network-checks-enabled')).toBe('false');
    expect(set).toHaveBeenCalledWith({ networkChecksEnabled: false });
  });

  it('makes zero GitHub fetch calls when disabled', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setEnabled(false);

    await loadChangelog();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still loads cached release notes when disabled', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem(
      'lance:changelog-cache',
      JSON.stringify([{ version: '9.9.9', date: '2026-01-01', items: ['Cached release note'] }]),
    );
    localStorage.setItem('lance:changelog-cache-expiry', String(Date.now() + 60_000));
    setEnabled(false);

    const entries = await loadChangelog();

    expect(entries.some((e) => e.items.includes('Cached release note'))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips the updater check when disabled', async () => {
    setEnabled(false);
    vi.useFakeTimers();
    render(<Harness />);

    await advancePastInitialDelay();

    expect(check).not.toHaveBeenCalled();
  });

  it('runs the updater check when enabled', async () => {
    setEnabled(true);
    vi.useFakeTimers();
    render(<Harness />);

    await advancePastInitialDelay();

    expect(check).toHaveBeenCalledTimes(1);
  });
});
