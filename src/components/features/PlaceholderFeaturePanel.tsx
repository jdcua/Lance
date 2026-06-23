/**
 * PlaceholderFeaturePanel — renders when an archetype feature has no dedicated component yet.
 * Shows the feature name and description in a styled panel so the UI is wired end-to-end.
 */
export default function PlaceholderFeaturePanel({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="flex items-center justify-center py-6 text-center">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{title || 'Feature Panel'}</p>
        <p className="text-[11px] text-[var(--text-tertiary)]">{description || 'This panel is ready for a custom component.'}</p>
      </div>
    </div>
  );
}
