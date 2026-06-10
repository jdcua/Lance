interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'amber' | 'red' | 'gray';
}

const topBorderColors: Record<string, string> = {
  green: '#1D9E75',
  amber: '#F59E0B',
  red: '#A32D2D',
  gray: '#A3A39E',
};

export default function MetricCard({ label, value, subtext, trend, color = 'gray' }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-[#1D9E75]' : trend === 'down' ? 'text-[#A32D2D]' : 'text-[#6B6B67]';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[12px] py-5 px-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150" style={{ borderTop: `2px solid ${topBorderColors[color]}` }}>
      <p className="text-[11px] text-[#A3A39E] uppercase tracking-[0.6px] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>{label}</p>
      <p className="text-2xl font-semibold text-[#1C1C1A] mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{value}</p>
      {(subtext || trend) && (
        <p className={`text-xs ${trendColor}`}>
          {trendArrow && <span className="mr-1">{trendArrow}</span>}
          {subtext}
        </p>
      )}
    </div>
  );
}
