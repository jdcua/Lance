import { describe, it, expect, beforeEach, vi } from 'vitest';
import { maybeFirstSendMoment } from './firstWin';
import { commands } from '../lib/commands';

beforeEach(() => {
  localStorage.clear();
});

describe('first-send paywall moment', () => {
  it('fires once for free tier', () => {
    const dispatch = vi.spyOn(commands, 'dispatch');
    expect(maybeFirstSendMoment(() => 'free')).toBe(true);
    expect(dispatch).toHaveBeenCalledWith('lance:open-upgrade');
    expect(maybeFirstSendMoment(() => 'free')).toBe(false);
    dispatch.mockRestore();
  });

  it('fires once for expired tier', () => {
    const dispatch = vi.spyOn(commands, 'dispatch');
    expect(maybeFirstSendMoment(() => 'expired')).toBe(true);
    expect(dispatch).toHaveBeenCalledWith('lance:open-upgrade');
    dispatch.mockRestore();
  });

  it('stays shut for trial and licensed, but records the flag', () => {
    const dispatch = vi.spyOn(commands, 'dispatch');
    expect(maybeFirstSendMoment(() => 'trial')).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    // flag recorded: a later free-tier send does not reopen it
    expect(maybeFirstSendMoment(() => 'free')).toBe(false);
    dispatch.mockRestore();
  });

  it('never throws in private mode', () => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('denied');
    };
    expect(maybeFirstSendMoment(() => 'free')).toBe(false);
    Storage.prototype.getItem = getItem;
  });
});
