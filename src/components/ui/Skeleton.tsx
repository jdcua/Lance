export type SkeletonVariant = 'dashboard' | 'table' | 'cards' | 'detail' | 'form' | 'list';

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--bg-secondary)] rounded-lg skeleton-pulse ${className}`} />;
}

/**
 * Per-screen loading skeletons. Each variant mirrors its screen's layout so
 * first paint already teaches the shape — no more one generic 4-bar block.
 * Pure CSS pulse; disabled under prefers-reduced-motion / motion-off globally.
 */
export default function Skeleton({ variant = 'list' }: { variant?: SkeletonVariant }) {
  return (
    <div className="p-6 space-y-4" role="status" aria-label="Loading">
      {variant === 'dashboard' && (
        <>
          <Bar className="h-8 w-56" />
          <Bar className="h-4 w-80" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <Bar key={i} className="h-28" />
            ))}
          </div>
          <Bar className="h-40" />
        </>
      )}
      {variant === 'table' && (
        <>
          <div className="flex gap-2">
            <Bar className="h-9 w-40" />
            <Bar className="h-9 w-24" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <Bar key={i} className="h-14" />
          ))}
        </>
      )}
      {variant === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Bar key={i} className="h-36" />
          ))}
        </div>
      )}
      {variant === 'detail' && (
        <div className="flex gap-4">
          <Bar className="h-[60vh] w-64 hidden md:block" />
          <div className="flex-1 space-y-3">
            <Bar className="h-7 w-48" />
            <Bar className="h-4 w-72" />
            <Bar className="h-44" />
            <Bar className="h-32" />
          </div>
        </div>
      )}
      {variant === 'form' && (
        <>
          <Bar className="h-7 w-52" />
          {[0, 1, 2].map((i) => (
            <Bar key={i} className="h-12" />
          ))}
          <Bar className="h-32" />
          <Bar className="h-10 w-32" />
        </>
      )}
      {variant === 'list' && (
        <>
          <Bar className="h-6 w-40" />
          {[0, 1, 2, 3].map((i) => (
            <Bar key={i} className="h-16" />
          ))}
        </>
      )}
    </div>
  );
}
