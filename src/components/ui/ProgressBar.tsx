interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ProgressBar({ value, max = 100, label, showPercent = true, size = 'md', className }: ProgressBarProps) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  const height = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className={`w-full ${className || ''}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-[#6B6B67]">{label}</span>}
          {showPercent && <span className="text-xs font-medium text-[#1C1C1A]">{pct}%</span>}
        </div>
      )}
      <div className={`w-full bg-[#F2F2F0] rounded-full ${height}`}>
        <div
          className={`${height} bg-[#1D9E75] rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
