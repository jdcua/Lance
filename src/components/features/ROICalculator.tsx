/**
 * ROI Calculator · Finance tool.
 * Simple two-input ROI calculator with percentage, ratio, and profit/loss.
 */
import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

function roiPctColor(roiPct: number): string {
  if (roiPct > 0) return 'text-[#2ECC71]';
  if (roiPct < 0) return 'text-[#E74C3C]';
  return 'text-[var(--text-primary)]';
}

function profitStyle(profit: number): string {
  if (profit > 0) return 'bg-[#2ECC71]/10 text-[#2ECC71]';
  if (profit < 0) return 'bg-[#E74C3C]/10 text-[#E74C3C]';
  return 'bg-[var(--border-color)]/50 text-[var(--text-secondary)]';
}

function profitIcon(profit: number) {
  if (profit > 0) return <TrendingUp size={14} />;
  if (profit < 0) return <TrendingDown size={14} />;
  return null;
}

export default function ROICalculator() {
  const [cost, setCost] = useState('');
  const [revenue, setRevenue] = useState('');

  const costNum = parseFloat(cost) || 0;
  const revenueNum = parseFloat(revenue) || 0;
  const profit = revenueNum - costNum;
  const roiPct = costNum > 0 ? (profit / costNum) * 100 : 0;
  const roiRatio = costNum > 0 ? revenueNum / costNum : 0;
  const hasData = cost.trim() !== '' || revenue.trim() !== '';

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">ROI Calculator</h4>
      </div>

      <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[var(--text-tertiary)] block mb-1">
              Campaign Cost ($)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-tertiary)] block mb-1">
              Revenue Generated ($)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {hasData && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 glass rounded-xs text-center">
              <p className="text-[10px] text-[var(--text-tertiary)]">ROI %</p>
              <p className={`text-sm font-semibold tabular-nums ${roiPctColor(roiPct)}`}>
                {roiPct >= 0 ? '+' : ''}
                {roiPct.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 glass rounded-xs text-center">
              <p className="text-[10px] text-[var(--text-tertiary)]">ROI Ratio</p>
              <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {roiRatio.toFixed(2)}x
              </p>
            </div>
          </div>
        )}

        {hasData && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xs text-xs font-medium ${profitStyle(profit)}`}
          >
            {profitIcon(profit)}
            {profit >= 0 ? 'Profit' : 'Loss'}: $
            {Math.abs(profit).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        )}

        {!hasData && (
          <p className="text-xs text-[var(--text-tertiary)] py-2">
            Enter campaign cost and revenue to calculate ROI.
          </p>
        )}
      </div>
    </div>
  );
}
