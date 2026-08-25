/**
 * ROI Calculator -- Finance tool.
 * Simple two-input ROI calculator with percentage, ratio, and profit/loss.
 */
import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function ROICalculator() {
  const [cost, setCost] = useState('');
  const [revenue, setRevenue] = useState('');

  const costNum = parseFloat(cost) || 0;
  const revenueNum = parseFloat(revenue) || 0;
  const profit = revenueNum - costNum;
  const roiPct = costNum > 0 ? ((profit / costNum) * 100) : 0;
  const roiRatio = costNum > 0 ? (revenueNum / costNum) : 0;
  const hasData = cost.trim() !== '' || revenue.trim() !== '';

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">ROI Calculator</h4>
      </div>

      <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[var(--text-tertiary)] block mb-1">Campaign Cost ($)</label>
            <input type="number" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-tertiary)] block mb-1">Revenue Generated ($)</label>
            <input type="number" placeholder="0.00" value={revenue} onChange={(e) => setRevenue(e.target.value)} className={inputClass} />
          </div>
        </div>

        {hasData && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-[var(--bg-card)] rounded-[6px] text-center">
              <p className="text-[10px] text-[var(--text-tertiary)]">ROI %</p>
              <p className={`text-sm font-bold tabular-nums ${roiPct > 0 ? 'text-[#2ECC71]' : roiPct < 0 ? 'text-[#E74C3C]' : 'text-[var(--text-primary)]'}`}>
                {roiPct >= 0 ? '+' : ''}{roiPct.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 bg-[var(--bg-card)] rounded-[6px] text-center">
              <p className="text-[10px] text-[var(--text-tertiary)]">ROI Ratio</p>
              <p className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
                {roiRatio.toFixed(2)}x
              </p>
            </div>
          </div>
        )}

        {hasData && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-[6px] text-xs font-medium ${profit > 0 ? 'bg-[#2ECC71]/10 text-[#2ECC71]' : profit < 0 ? 'bg-[#E74C3C]/10 text-[#E74C3C]' : 'bg-[var(--border-color)]/50 text-[var(--text-secondary)]'}`}>
            {profit > 0 ? <TrendingUp size={14} /> : profit < 0 ? <TrendingDown size={14} /> : null}
            {profit >= 0 ? 'Profit' : 'Loss'}: ${Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}

        {!hasData && (
          <p className="text-xs text-[var(--text-tertiary)] py-2">Enter campaign cost and revenue to calculate ROI.</p>
        )}
      </div>
    </div>
  );
}
