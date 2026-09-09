import { describe, it, expect } from 'vitest';
import { scoreProposalHeat, compareHeat } from './proposalHeat';

const NOW = new Date('2026-09-08T12:00:00Z');

describe('proposal heat scoring', () => {
  it('flags recently opened proposals as hot', () => {
    expect(
      scoreProposalHeat(
        { status: 'sent', createdAt: '2026-08-01', opens: 4, lastOpenedAt: '2026-09-07T10:00:00Z' },
        NOW,
      ),
    ).toBe('hot');
  });

  it('cools proposals opened long ago, warms recent ones', () => {
    expect(
      scoreProposalHeat(
        { status: 'sent', createdAt: '2026-08-01', opens: 2, lastOpenedAt: '2026-09-01T10:00:00Z' },
        NOW,
      ),
    ).toBe('warm');
  });

  it('flags long-unopened sent proposals as cooling', () => {
    expect(
      scoreProposalHeat({ status: 'sent', createdAt: '2026-08-01', opens: 0 }, NOW),
    ).toBe('cooling');
    expect(
      scoreProposalHeat({ status: 'sent', createdAt: '2026-09-05', opens: 0 }, NOW),
    ).toBe('neutral');
  });

  it('ignores non-sent proposals', () => {
    expect(
      scoreProposalHeat(
        { status: 'accepted', createdAt: '2026-08-01', opens: 9, lastOpenedAt: '2026-09-08T10:00:00Z' },
        NOW,
      ),
    ).toBe('neutral');
    expect(
      scoreProposalHeat({ status: 'draft', createdAt: '2026-08-01', opens: 0 }, NOW),
    ).toBe('neutral');
  });

  it('orders hot first', () => {
    expect(compareHeat('hot', 'cooling')).toBeLessThan(0);
    expect(compareHeat('cooling', 'neutral')).toBeGreaterThan(0);
    expect(compareHeat('warm', 'warm')).toBe(0);
  });
});
