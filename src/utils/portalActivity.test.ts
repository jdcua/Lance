import { describe, it, expect } from 'vitest';
import { parseViewCount, getProposalViews, snapshotOpens, detectNewOpens } from './portalActivity';
import type { PortalActivity } from '../types';

function act(over: Partial<PortalActivity>): PortalActivity {
  return {
    entity_type: 'proposal',
    entity_id: 'p1',
    token: 't',
    activity: 'Proposal "X" viewed 3 times',
    timestamp: '2026-09-01T10:00:00Z',
    ...over,
  };
}

describe('portal view tracking', () => {
  it('parses open counts defensively', () => {
    expect(parseViewCount('Proposal "X" viewed 3 times')).toBe(3);
    expect(parseViewCount('Proposal "X" viewed 1 time')).toBe(1);
    expect(parseViewCount('something else')).toBe(1);
    expect(parseViewCount('')).toBe(1);
  });

  it('summarizes a proposal across activity rows', () => {
    const rows = [
      act({ activity: 'Proposal "X" viewed 2 times', timestamp: '2026-09-01T09:00:00Z' }),
      act({ activity: 'Proposal "X" viewed 5 times', timestamp: '2026-09-02T09:00:00Z' }),
      act({ entity_id: 'p2', activity: 'Proposal "Y" viewed 1 time' }),
    ];
    expect(getProposalViews(rows, 'p1')).toEqual({
      proposalId: 'p1',
      opens: 5,
      lastOpenedAt: '2026-09-02T09:00:00Z',
    });
    expect(getProposalViews(rows, 'zzz')).toBeNull();
  });

  it('detects newly opened proposals since a snapshot', () => {
    const before = [act({ activity: 'Proposal "X" viewed 2 times' })];
    const after = [act({ activity: 'Proposal "X" viewed 4 times' })];
    expect(detectNewOpens(after, snapshotOpens(before))).toHaveLength(1);
    expect(detectNewOpens(after, snapshotOpens(after))).toHaveLength(0);
    expect(detectNewOpens([], {})).toHaveLength(0);
  });
});
