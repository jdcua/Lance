import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usePortalPolling } from '../lib/engines/usePortalPolling';
import { useStore } from '../store';

let portalCalls = 0;
vi.mock('../utils/tauri', () => ({
  isTauri: () => false,
  tauriInvoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === 'get_portal_activity') {
      portalCalls += 1;
      const views = portalCalls === 1 ? 2 : 3;
      return Promise.resolve([
        {
          entity_type: 'proposal',
          entity_id: 'p1',
          token: 't',
          activity: `viewed ${views} times`,
          timestamp: '2026-01-01T00:00:00Z',
        },
      ]);
    }
    return Promise.resolve([]);
  }),
}));

vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue(undefined),
  }),
}));

function Harness() {
  usePortalPolling();
  return null;
}

describe('usePortalPolling', () => {
  beforeEach(() => {
    portalCalls = 0;
    vi.useFakeTimers();
    localStorage.clear();
    useStore.setState({
      portalActivity: [],
      proposals: [
        {
          id: 'p1',
          client_id: 'c1',
          title: 'Test Proposal',
          status: 'sent',
          created_at: '2026-01-01',
          rate_type: 'flat',
        },
      ],
      toasts: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls on mount and toasts when a new open is detected', async () => {
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    const toasts = useStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Client opened "Test Proposal" (2x)');
  });

  it('stops polling after unmount', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(useStore.getState().toasts).toHaveLength(1);
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(30000);
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(useStore.getState().toasts).toHaveLength(1);
  });
});
