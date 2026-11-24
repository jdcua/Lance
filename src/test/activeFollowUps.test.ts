import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import type { FollowUpLog } from '../types';

const fu = (id: string, entity_type: 'invoice' | 'proposal', entity_id: string): FollowUpLog => ({
  id,
  entity_type,
  entity_id,
  stage: 1,
  status: 'pending',
  drafted_at: '2026-01-01',
});

describe('getActiveFollowUps (orphan filter)', () => {
  beforeEach(() => {
    useStore.setState({
      invoices: [{ id: 'i1' }],
      proposals: [{ id: 'p1' }],
      pendingFollowUps: [
        fu('live-inv', 'invoice', 'i1'),
        fu('live-prop', 'proposal', 'p1'),
        fu('orphan-inv', 'invoice', 'stress-inv-99'),
        fu('orphan-prop', 'proposal', 'gone-proposal'),
      ],
    } as never);
  });

  it('drops rows whose invoice or proposal no longer exists', () => {
    const active = useStore.getState().getActiveFollowUps();
    expect(active.map((f) => f.id).sort()).toEqual(['live-inv', 'live-prop']);
  });

  it('keeps everything when nothing was deleted', () => {
    useStore.setState({
      invoices: [{ id: 'i1' }, { id: 'stress-inv-99' }],
      proposals: [{ id: 'p1' }, { id: 'gone-proposal' }],
    } as never);
    expect(useStore.getState().getActiveFollowUps()).toHaveLength(4);
  });
});
