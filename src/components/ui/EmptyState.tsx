import type { ReactNode } from 'react';
import { getEmptyCopy } from './emptyCopy';

interface EmptyStateProps {
  /** key into the copy bank (invoices, projects, clients, …) */
  screen?: string;
  icon?: ReactNode;
  /** primary action (e.g. New Invoice button) */
  action?: ReactNode;
  /** secondary hint (e.g. "add a client first" warning) */
  hint?: ReactNode;
  compact?: boolean;
}

/**
 * Personality empty state. Copy rotates daily so it never repeats back to
 * back; callers pass through their existing action buttons unchanged.
 */
export default function EmptyState({ screen = 'generic', icon, action, hint, compact }: EmptyStateProps) {
  const copy = getEmptyCopy(screen);
  return (
    <div
      className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-center flex flex-col items-center ${compact ? 'py-8' : 'py-16'}`}
    >
      {icon}
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-1.5">{copy.headline}</h2>
      <p className="text-[13px] text-[var(--text-secondary)] max-w-xs mb-5">{copy.sub}</p>
      {hint}
      {action}
    </div>
  );
}
