/**
 * idleOrTimeout: startup work must not depend on the browser ever going idle.
 *
 * The trial seeds its sample business from a deferred startup task. On a busy
 * machine requestIdleCallback can be starved, which left a first-time visitor
 * looking at an empty app. These lock the "runs eventually, runs once" contract
 * and the cleanup path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { idleOrTimeout } from '../App';

describe('idleOrTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs on the timer even if idle never fires', () => {
    const fn = vi.fn();
    idleOrTimeout(fn, 400);
    // No idle callback granted: only the timer can save us.
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs on idle without waiting for the timer', () => {
    const fn = vi.fn();
    idleOrTimeout(fn, 400);
    vi.advanceTimersByTime(0); // let requestIdleCallback fire
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1); // never twice
  });

  it('cancels both the timer and the idle request', () => {
    const fn = vi.fn();
    const cancel = idleOrTimeout(fn, 400);
    cancel();
    vi.advanceTimersByTime(2000);
    expect(fn).not.toHaveBeenCalled();
  });
});
