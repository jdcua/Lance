import { DAY_MS } from './format';

export type ProposalHeat = 'hot' | 'warm' | 'cooling' | 'neutral';

export interface HeatInput {
  status: string;
  sentAt?: string;
  createdAt: string;
  opens: number;
  lastOpenedAt?: string;
}

/**
 * Buy-intent scoring for sent proposals.
 * HOT means the client is looking right now: opened in the last 72 hours.
 * COOLING means a sent proposal sat unopened for 3+ weeks: nudge or close.
 */
export function scoreProposalHeat(input: HeatInput, now: Date = new Date()): ProposalHeat {
  if (input.status !== 'sent') return 'neutral';
  const since = (iso?: string): number | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return (now.getTime() - d.getTime()) / DAY_MS;
  };
  if (input.opens > 0 && input.lastOpenedAt) {
    const daysSinceOpen = since(input.lastOpenedAt);
    if (daysSinceOpen !== null && daysSinceOpen <= 3) return 'hot';
    if (daysSinceOpen !== null && daysSinceOpen <= 14) return 'warm';
    return 'warm';
  }
  const sentIso = input.sentAt || input.createdAt;
  const daysSinceSent = since(sentIso);
  if (daysSinceSent !== null && daysSinceSent >= 21) return 'cooling';
  return 'neutral';
}

const HEAT_RANK: Record<ProposalHeat, number> = { hot: 0, warm: 1, neutral: 2, cooling: 3 };

export function compareHeat(a: ProposalHeat, b: ProposalHeat): number {
  return HEAT_RANK[a] - HEAT_RANK[b];
}
