import { describe, it, expect, beforeEach } from 'vitest';
import { recordTrialValue, getTrialValue, resetTrialValue, computeProRoi } from './trialValue';

describe('trial value ledger', () => {
  beforeEach(() => {
    resetTrialValue();
  });

  it('starts empty and ignores junk', () => {
    expect(getTrialValue()).toEqual({ total: 0, count: 0, changeOrders: 0, lateFees: 0, topUps: 0 });
    recordTrialValue('change-order', 0);
    recordTrialValue('late-fee', -5);
    recordTrialValue('late-fee', NaN);
    expect(getTrialValue().total).toBe(0);
    localStorage.setItem('lance:trial-value', 'not-json');
    expect(getTrialValue().total).toBe(0);
  });

  it('totals revenue by kind', () => {
    recordTrialValue('change-order', 200);
    recordTrialValue('late-fee', 15.5);
    recordTrialValue('topup', 100);
    const s = getTrialValue();
    expect(s.total).toBe(315.5);
    expect(s.count).toBe(3);
    expect(s.changeOrders).toBe(200);
    expect(s.lateFees).toBe(15.5);
    expect(s.topUps).toBe(100);
  });

  it('persists across reads', () => {
    recordTrialValue('change-order', 50);
    expect(getTrialValue().total).toBe(50);
    recordTrialValue('change-order', 25);
    expect(getTrialValue().total).toBe(75);
  });

  it('computes the mindless-buy multiple', () => {
    expect(computeProRoi(0)).toEqual({ earned: 0, monthlyCost: 14, multiple: null, monthsCovered: 0 });
    const roi = computeProRoi(280);
    expect(roi.multiple).toBe(20);
    expect(roi.monthsCovered).toBe(20);
    expect(computeProRoi(7).monthsCovered).toBe(0);
    expect(computeProRoi(140, 8.25).multiple).toBeCloseTo(17, 0);
  });
});
