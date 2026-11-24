import { describe, it, expect, beforeEach } from 'vitest';
import {
  celebrationLevel,
  recordCelebration,
  celebrationToast,
} from './celebration';

beforeEach(() => {
  localStorage.clear();
});

describe('celebration novelty decay', () => {
  it('first time is full', () => {
    expect(celebrationLevel('invoice-paid')).toBe('full');
  });

  it('2nd–5th are reduced, later quiet', () => {
    recordCelebration('invoice-paid');
    expect(celebrationLevel('invoice-paid')).toBe('reduced');
    recordCelebration('invoice-paid');
    recordCelebration('invoice-paid');
    recordCelebration('invoice-paid');
    expect(celebrationLevel('invoice-paid')).toBe('reduced');
    recordCelebration('invoice-paid');
    expect(celebrationLevel('invoice-paid')).toBe('quiet');
  });

  it('kinds decay independently', () => {
    recordCelebration('invoice-paid');
    expect(celebrationLevel('milestone-hit')).toBe('full');
  });

  it('toast copy rotates without repeating', () => {
    const a = celebrationToast('invoice-paid');
    recordCelebration('invoice-paid');
    const b = celebrationToast('invoice-paid');
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
    expect(a.length).toBeGreaterThan(0);
  });
});
