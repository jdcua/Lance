import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../store';

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState({ toasts: [] });
});

describe('toast stacking', () => {
  it('caps at three toasts', () => {
    const s = useStore.getState();
    s.addToast('one');
    s.addToast('two');
    s.addToast('three');
    s.addToast('four');
    expect(useStore.getState().toasts).toHaveLength(3);
    expect(useStore.getState().toasts.map((t) => t.message)).toEqual(['two', 'three', 'four']);
  });

  it('dedupes identical transient toasts instead of stacking', () => {
    const s = useStore.getState();
    const id1 = s.addToast('Failed to save', 'error');
    const id2 = s.addToast('Failed to save', 'error');
    expect(id2).toBe(id1);
    expect(useStore.getState().toasts).toHaveLength(1);
    // distinct messages still stack
    s.addToast('Something else', 'error');
    expect(useStore.getState().toasts).toHaveLength(2);
  });

  it('never dedupes interactive (action) toasts', () => {
    const s = useStore.getState();
    const act = [{ label: 'Undo', onClick: () => {} }];
    s.addToast('Client opened "X"', 'info', undefined, act);
    s.addToast('Client opened "X"', 'info', undefined, act);
    expect(useStore.getState().toasts).toHaveLength(2);
  });

  it('auto-dismisses after duration and clears timers on remove', () => {
    const s = useStore.getState();
    const id = s.addToast('hello', 'info', 1000);
    expect(useStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(999);
    expect(useStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useStore.getState().toasts).toHaveLength(0);
    // removing twice is safe
    s.removeToast(id);
    expect(useStore.getState().toasts).toHaveLength(0);
  });

  it('pause/resume stretches visibility across hover', () => {
    const s = useStore.getState();
    const id = s.addToast('hover me', 'info', 1000);
    vi.advanceTimersByTime(800);
    s.pauseToast(id);
    vi.advanceTimersByTime(5000);
    expect(useStore.getState().toasts).toHaveLength(1);
    s.resumeToast(id);
    vi.advanceTimersByTime(199);
    expect(useStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useStore.getState().toasts).toHaveLength(0);
  });
});
