interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'amber' | 'red' | 'gray';
}

const topBorderColors: Record<string, string> = {
  green: 'var(--accent)',
  amber: 'var(--warning)',
  red: 'var(--danger)',
  gray: 'var(--text-tertiary)',
};

export default function MetricCard({ label, value, subtext, trend, color = 'gray' }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-[var(--accent)]' : trend === 'down' ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[12px] py-5 px-6 shadow-[var(--card-shadow)] transition-all duration-150" style={{ borderTop: `2px solid ${topBorderColors[color]}` }}>
      <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-[0.6px] mb-2">{label}</p>
      <p className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{value}</p>
      {(subtext || trend) && (
        <p className={`text-xs ${trendColor}`}>
          {trendArrow && <span className="mr-1">{trendArrow}</span>}
          {subtext}
        </p>
      )}
    </div>
  );
}
