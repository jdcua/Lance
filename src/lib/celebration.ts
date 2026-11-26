/**
 * Earned delight with novelty decay. Celebratory moments scale down with
 * repetition so month three still feels good: first time = full moment,
 * 2nd–5th = reduced, later = a small quick acknowledgment. Counters live in
 * localStorage (no migration, no server, cleared with app data).
 *
 * Kinds: invoice-paid, milestone-hit, project-completed, queue-cleared,
 * first-proposal, revenue-goal. Wave 2 wires these into Today + pipeline;
 * this item ships the scale + copy rotation only.
 */

export type CelebrationKind =
  | 'invoice-paid'
  | 'milestone-hit'
  | 'project-completed'
  | 'queue-cleared'
  | 'first-proposal'
  | 'revenue-goal';

export type CelebrationLevel = 'full' | 'reduced' | 'quiet';

const KEY = 'lance:celebrations';

function readCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Level for the next celebration of this kind (reads, does not record). */
export function celebrationLevel(kind: CelebrationKind): CelebrationLevel {
  const n = readCounts()[kind] || 0;
  if (n <= 0) return 'full';
  if (n <= 4) return 'reduced';
  return 'quiet';
}

/** Record that a celebration of this kind was shown. Best-effort. */
export function recordCelebration(kind: CelebrationKind): void {
  try {
    const counts = readCounts();
    counts[kind] = (counts[kind] || 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(counts));
  } catch {
    /* private mode: decay just won't persist */
  }
}

const TOASTS: Record<CelebrationKind, string[]> = {
  'invoice-paid': [
    'Paid. Money in the account.',
    'Invoice settled.',
    "That one's done — paid in full.",
  ],
  'milestone-hit': ['Milestone hit.', 'Another milestone down.', 'Milestone cleared.'],
  'project-completed': ['Project complete. Ship it.', 'Wrapped. Nice work.', 'Project closed out.'],
  'queue-cleared': ['Today queue clear.', 'All caught up.', 'Nothing left that needs you.'],
  'first-proposal': [
    "First proposal sent. That's the hardest one.",
    'Proposal away. Fingers crossed, professionally.',
  ],
  'revenue-goal': ['Revenue goal reached.', 'Goal hit. Raise the bar?', 'Target met.'],
};

/** Toast line for a kind, rotated so repeats don't echo. Short, warm, never cringe. */
export function celebrationToast(kind: CelebrationKind): string {
  const variants = TOASTS[kind];
  const n = readCounts()[kind] || 0;
  return variants[n % variants.length];
}
