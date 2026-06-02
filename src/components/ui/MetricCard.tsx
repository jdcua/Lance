interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export default function MetricCard({ label, value, subtext, trend }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-[#1D9E75]' : trend === 'down' ? 'text-[#A32D2D]' : 'text-[#6B6B67]';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div className="bg-white border border-[#E5E5E3] rounded-[12px] p-5">
      <p className="text-xs font-medium text-[#6B6B67] uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-semibold text-[#1C1C1A] mb-1">{value}</p>
      {(subtext || trend) && (
        <p className={`text-xs ${trendColor}`}>
          {trendArrow && <span className="mr-1">{trendArrow}</span>}
          {subtext}
        </p>
      )}
    </div>
  );
}
