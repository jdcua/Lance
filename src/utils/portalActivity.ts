import type { PortalActivity } from '../types';

// Portal activity strings are backend-rendered, e.g.
//   Proposal "Brand refresh" viewed 3 times
// Parse defensively: unknown formats still count as a single open.
const VIEW_COUNT_RE = /viewed (\d+) times?/i;

export interface ProposalViews {
  proposalId: string;
  opens: number;
  lastOpenedAt: string;
}

export function parseViewCount(activity: string): number {
  const m = VIEW_COUNT_RE.exec(activity || '');
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  return isNaN(n) || n < 1 ? 1 : n;
}

/** Latest open activity for a proposal, or null when never opened. */
export function getProposalViews(
  activities: PortalActivity[],
  proposalId: string,
): ProposalViews | null {
  const hits = (activities || []).filter(
    (a) => a.entity_type === 'proposal' && a.entity_id === proposalId,
  );
  if (hits.length === 0) return null;
  const latest = hits.reduce((a, b) => (a.timestamp >= b.timestamp ? a : b));
  return {
    proposalId,
    opens: Math.max(...hits.map((h) => parseViewCount(h.activity))),
    lastOpenedAt: latest.timestamp,
  };
}

/** Map of proposal id to last-seen open count, for change detection. */
export function snapshotOpens(activities: PortalActivity[]): Record<string, number> {
  const snap: Record<string, number> = {};
  for (const a of activities || []) {
    if (a.entity_type !== 'proposal') continue;
    snap[a.entity_id] = Math.max(snap[a.entity_id] || 0, parseViewCount(a.activity));
  }
  return snap;
}

/** Proposal ids whose open count grew since the snapshot. */
export function detectNewOpens(
  activities: PortalActivity[],
  prev: Record<string, number>,
): { proposalId: string; opens: number; timestamp: string }[] {
  const current = snapshotOpens(activities);
  const fresh: { proposalId: string; opens: number; timestamp: string }[] = [];
  for (const [id, opens] of Object.entries(current)) {
    if (opens > (prev[id] || 0)) {
      const latest = (activities || [])
        .filter((a) => a.entity_type === 'proposal' && a.entity_id === id)
        .reduce((a, b) => (a.timestamp >= b.timestamp ? a : b));
      fresh.push({ proposalId: id, opens, timestamp: latest.timestamp });
    }
  }
  return fresh;
}
