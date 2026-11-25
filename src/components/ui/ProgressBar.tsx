interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  size = 'md',
  className,
}: ProgressBarProps) {
  const safeMax = max <= 0 ? 100 : max;
  const pct = Math.min(Math.round((value / safeMax) * 100), 100);
  const height = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className={`w-full ${className || ''}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-[var(--text-secondary)]">{label}</span>}
          {showPercent && (
            <span className="text-xs font-medium text-[var(--text-primary)]">{pct}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-[var(--bg-secondary)] rounded-full ${height}`}>
        <div
          role="progressbar"
          aria-label={label || `${pct}% complete`}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={safeMax}
          className={`${height} bg-[var(--accent)] rounded-full transition-colors duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
