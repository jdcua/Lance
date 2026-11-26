/**
 * Commission Calculator · Universal commission calculator.
 * Inputs: deal amount, commission rate %, split %.
 * Output: total commission, your share.
 */
import { useState } from 'react';
import { DollarSign, TrendingUp, Users } from 'lucide-react';

export default function CommissionCalculator() {
  const [dealAmount, setDealAmount] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [splitPct, setSplitPct] = useState('100');

  const amount = parseFloat(dealAmount) || 0;
  const rate = parseFloat(commissionRate) || 0;
  const split = parseFloat(splitPct) || 0;

  const totalCommission = amount * (rate / 100);
  const yourShare = totalCommission * (split / 100);
  const hasData = dealAmount.trim() !== '' || commissionRate.trim() !== '';

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Commission Calculator
        </h4>
      </div>

      <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-[var(--text-tertiary)] block mb-1">
              Deal Amount ($)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={dealAmount}
              onChange={(e) => setDealAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-tertiary)] block mb-1">
              Commission %
            </label>
            <input
              type="number"
              placeholder="e.g. 3"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className={inputClass}
              step="0.1"
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-tertiary)] block mb-1">
              Your Split %
            </label>
            <input
              type="number"
              placeholder="100"
              value={splitPct}
              onChange={(e) => setSplitPct(e.target.value)}
              className={inputClass}
              step="0.1"
            />
          </div>
        </div>

        {hasData && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 glass rounded-xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={12} className="text-[var(--accent-ink,var(--accent))]" />
                  <p className="text-[10px] text-[var(--text-tertiary)]">Total Commission</p>
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                  $
                  {totalCommission.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="p-2 glass rounded-xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign size={12} className="text-[#16A34A]" />
                  <p className="text-[10px] text-[var(--text-tertiary)]">Your Share</p>
                </div>
                <p className="text-sm font-semibold text-[#16A34A] tabular-nums">
                  $
                  {yourShare.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            {split < 100 && (
              <div className="flex items-center gap-2 px-3 py-2 glass rounded-xs text-xs">
                <Users size={12} className="text-[var(--text-tertiary)]" />
                <span className="text-[var(--text-secondary)]">
                  Split partner receives{' '}
                  <span className="font-medium text-[var(--text-primary)]">
                    $
                    {(totalCommission - yourShare).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {!hasData && (
          <p className="text-xs text-[var(--text-tertiary)] py-2">
            Enter deal amount and commission rate to calculate.
          </p>
        )}
      </div>
    </div>
  );
}
