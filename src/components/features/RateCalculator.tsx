/**
 * Rate Calculator · Pure computation UI.
 * Calculates required hourly rate and compares against profile rate.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Calculator, DollarSign, Clock, TrendingUp } from 'lucide-react';

export default function RateCalculator() {
  const { profile, loadProfile, saveProfile } = useStore();
  const [target, setTarget] = useState('');
  const [hours, setHours] = useState('');
  const [expenses, setExpenses] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile().then(() => setLoading(false));
  }, [loadProfile]);

  useEffect(() => {
    if (profile) {
      setTarget(profile.income_target != null ? String(profile.income_target) : '');
    }
  }, [profile]);

  const targetNum = Math.max(0, parseFloat(target) || 0);
  const hoursNum = Math.max(0, parseFloat(hours) || 0);
  const expensesNum = Math.max(0, parseFloat(expenses) || 0);

  const requiredRate = hoursNum > 0 ? (targetNum + expensesNum) / hoursNum : 0;
  const annualRequired = requiredRate * 2080;

  const currentRate = profile?.hourly_rate || 0;
  const hoursNeededAtCurrentRate = currentRate > 0 && targetNum + expensesNum > 0
    ? Math.ceil((targetNum + expensesNum) / currentRate)
    : null;

  const handleSaveTarget = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await saveProfile({ ...profile, income_target: targetNum || undefined });
    } catch (e) { console.error('[RateCalculator] saveTarget failed:', e); }
    setSaving(false);
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Rate Calculator</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Rate Calculator</h3>
        <Button variant="ghost" size="sm" onClick={handleSaveTarget} loading={saving} disabled={!profile}>
          <Calculator size={12} /> Save Target
        </Button>
      </div>

      <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide block mb-1">Monthly Target ($)</label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 8000"
              value={target}
              onChange={(e) => { const v = e.target.value; setTarget(Number(v) < 0 ? '0' : v); }}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide block mb-1">Avail. Hours/Mo</label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 120"
              value={hours}
              onChange={(e) => { const v = e.target.value; setHours(Number(v) < 0 ? '0' : v); }}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide block mb-1">Expenses ($)</label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 500"
              value={expenses}
              onChange={(e) => { const v = e.target.value; setExpenses(Number(v) < 0 ? '0' : v); }}
              className={inputClass}
            />
          </div>
        </div>

        {requiredRate > 0 && (
          <div className="space-y-2 mt-1">
            <div className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-card)] rounded-[6px]">
              <div className="flex items-center gap-1.5">
                <DollarSign size={14} className="text-[var(--accent-ink,var(--accent))]" />
                <div>
                  <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">Required Rate</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    ${requiredRate.toFixed(2)}<span className="text-[10px] font-normal text-[var(--text-tertiary)]"> /hr</span>
                  </div>
                </div>
              </div>
              <div className="h-8 w-px bg-[var(--border-color)]" />
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-[var(--accent-ink,var(--accent))]" />
                <div>
                  <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">Annual Equivalent</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    ${annualRequired.toLocaleString(undefined, { maximumFractionDigits: 0 })}<span className="text-[10px] font-normal text-[var(--text-tertiary)]"> /yr</span>
                  </div>
                </div>
              </div>
              {hoursNeededAtCurrentRate != null && (
                <>
                  <div className="h-8 w-px bg-[var(--border-color)]" />
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[var(--accent-ink,var(--accent))]" />
                    <div>
                      <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">At ${currentRate}/hr</div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {hoursNeededAtCurrentRate}<span className="text-[10px] font-normal text-[var(--text-tertiary)]"> hrs/mo</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {currentRate > 0 && requiredRate > 0 && (
              <div className="px-3 py-1.5 text-[10px] text-[var(--text-tertiary)]">
                {requiredRate > currentRate
                  ? `Your required rate is ${((requiredRate / currentRate - 1) * 100).toFixed(0)}% above your current rate of $${currentRate}/hr.`
                  : `Your current rate of $${currentRate}/hr exceeds the required rate by ${((1 - requiredRate / currentRate) * 100).toFixed(0)}%.`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
