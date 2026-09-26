import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Load-failure banner. Stores record per-table errors, but screens
 * previously never read them — a failed load rendered the "empty" state,
 * indistinguishable from genuinely having no data. Render this above
 * content (not instead of it: cached rows may still be usable).
 */
export default function LoadError({ error, onRetry }: { error: string | null | undefined; onRetry: () => void }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mb-4 px-3 py-2 rounded-[8px] bg-[var(--danger-bg)] border border-[var(--danger)]/20 flex items-start gap-2 text-xs"
    >
      <AlertTriangle size={14} className="text-[var(--danger)] mt-px flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--text-primary)]">Couldn't load the latest data</p>
        <p className="text-[var(--text-secondary)] truncate" title={error}>
          {error}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 flex-shrink-0 text-[11px] font-medium text-[var(--accent-ink,var(--accent))] hover:underline"
      >
        <RotateCcw size={11} /> Retry
      </button>
    </div>
  );
}
