/**
 * Sparkline · Tiny inline SVG line chart for metric history.
 * Renders a simple polyline with optional min/max/trend display.
 */

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export default function Sparkline({
  values,
  width = 80,
  height = 24,
  color = 'var(--accent)',
  className = '',
}: SparklineProps) {
  if (values.length < 2) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <span className="text-[10px] text-[var(--text-tertiary)]">--</span>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = 2;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * plotWidth;
      const y = padding + plotHeight - ((v - min) / range) * plotHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const trend = values[values.length - 1] >= values[0];

  return (
    <svg width={width} height={height} className={`flex-shrink-0 ${className}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last value dot */}
      {values.length > 0 &&
        (() => {
          const lastV = values[values.length - 1];
          const lastX = padding + ((values.length - 1) / (values.length - 1)) * plotWidth;
          const lastY = padding + plotHeight - ((lastV - min) / range) * plotHeight;
          return <circle cx={lastX} cy={lastY} r="2" fill={trend ? color : 'var(--danger)'} />;
        })()}
    </svg>
  );
}
