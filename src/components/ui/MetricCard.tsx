import type { ReactNode } from 'react';
import Sparkline from './Sparkline';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'amber' | 'red' | 'gray' | 'blue' | 'purple';
  tooltip?: string;
  icon?: ReactNode;
  delta?: string;
  sparkData?: number[];
}

const tintBg: Record<string, string> = {
  green: 'var(--accent-bg)',
  amber: 'var(--warning-bg)',
  red: 'var(--danger-bg)',
  gray: 'var(--bg-secondary)',
  blue: 'var(--info-bg)',
  purple: 'var(--accent-bg)',
};

const tintFg: Record<string, string> = {
  green: 'var(--accent)',
  amber: 'var(--warning-text)',
  red: 'var(--danger)',
  gray: 'var(--text-tertiary)',
  blue: 'var(--info)',
  purple: 'var(--metric-purple)',
};

export default function MetricCard({ label, value, subtext, trend, color = 'gray', tooltip, icon, delta, sparkData }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-[var(--accent-ink,var(--accent))]' : trend === 'down' ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]';
  // Pills carry explicit deltas only — never a bare arrow. The trend color
  // on the subtext below already communicates direction.
  const showDelta = delta ?? '';

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[14px] p-5 shadow-[var(--card-shadow)] transition-all duration-200 hover:border-[var(--text-tertiary)] hover:shadow-[var(--card-hover-shadow)] min-w-0 group" title={tooltip}>
      <div className="flex items-center gap-2 mb-2.5 min-w-0">
        {icon && (
          <span
            className="w-7 h-7 rounded-[8px] grid place-items-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
            style={{ background: tintBg[color], color: tintFg[color] }}
          >
            {icon}
          </span>
        )}
        <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-[0.6px] break-words flex-1 min-w-0">{label}</p>
        {showDelta && (
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 tnum"
            style={{ background: tintBg[trend === 'down' ? 'red' : color], color: tintFg[trend === 'down' ? 'red' : color] }}
          >
            {showDelta}
          </span>
        )}
      </div>
      <div className="text-[26px] font-semibold text-[var(--text-primary)] mb-1 break-words leading-tight tracking-tight tnum">{value}</div>
      {subtext && (
        <p className={`text-xs ${trendColor} break-words`}>
          {trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : ''}{subtext}
        </p>
      )}
      {sparkData && sparkData.length >= 2 && (
        <div className="mt-2 -mb-1">
          <Sparkline values={sparkData} width={120} height={26} color={tintFg[color]} className="w-full" />
        </div>
      )}
    </div>
  );
}
