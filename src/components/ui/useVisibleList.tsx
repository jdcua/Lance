import { useEffect, useState } from 'react';

const PAGE = 50;
const STEP = 100;

/**
 * Incremental list rendering: screens render .slice(0, visible) instead of
 * the whole array. At 10k rows an unbounded map builds ~350k DOM nodes and
 * multi-second loads; paging keeps first paint flat regardless of size.
 * `resetKey` must change whenever the filter/sort changes (e.g. the query
 * string) so a new result set starts at the first page.
 */
export function useVisibleList<T>(
  items: T[],
  resetKey: string,
  pageSize = PAGE,
): {
  visible: T[];
  total: number;
  hasMore: boolean;
  showMore: () => void;
} {
  const [count, setCount] = useState(pageSize);
  useEffect(() => {
    setCount(pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);
  return {
    visible: items.slice(0, count),
    total: items.length,
    hasMore: items.length > count,
    showMore: () => setCount((c) => c + STEP),
  };
}

/** "Showing X of Y" + Show more button. Render below a paged list. */
export function MoreRows({
  total,
  shown,
  hasMore,
  showMore,
}: {
  total: number;
  shown: number;
  hasMore: boolean;
  showMore: () => void;
}) {
  if (total <= shown && !hasMore) return null;
  return (
    <div className="flex items-center justify-between mt-3">
      <span className="text-[11px] text-[var(--text-tertiary)] tnum">
        Showing {shown.toLocaleString()} of {total.toLocaleString()}
      </span>
      {hasMore && (
        <button
          onClick={showMore}
          className="text-[11px] font-medium text-[var(--accent-ink,var(--accent))] hover:underline"
        >
          Show more
        </button>
      )}
    </div>
  );
}
