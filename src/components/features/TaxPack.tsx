import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { getFeatureFlags } from '../../lib/constants';
import { commands } from '../../lib/commands';
import { buildTaxPack, taxPackCsv, taxPackYears, downloadTextFile } from '../../utils/taxPack';
import { formatCurrency } from '../../utils/format';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import { Download, Lock, ReceiptText } from 'lucide-react';

/**
 * Tax pack: year summary anyone can read, accountant-ready CSV for Pro.
 * Summary is trust-building free value; the CSV that saves an afternoon
 * with the accountant is the upgrade.
 */
export default function TaxPack() {
  const { invoices, expenses, clients, profile, getActiveTier } = useStore();
  const unlocked = getFeatureFlags(getActiveTier()).advancedInsights === true;
  const currency = profile?.currency;

  const years = useMemo(() => taxPackYears(invoices, expenses), [invoices, expenses]);
  const [year, setYear] = useState<number>(years[0] || new Date().getFullYear());
  const pack = useMemo(
    () => buildTaxPack(invoices, expenses, clients, years.includes(year) ? year : years[0]),
    [invoices, expenses, clients, year, years],
  );

  const maxQ = Math.max(1, ...pack.quarters.map((q) => Math.max(q.revenue, q.expenses)));

  const handleDownload = () => {
    if (!unlocked) {
      commands.dispatch('lance:open-upgrade', 'tax pack CSV');
      return;
    }
    downloadTextFile(`lance-tax-pack-${pack.year}.csv`, taxPackCsv(pack));
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ReceiptText size={16} className="text-[var(--text-tertiary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tax Pack</h3>
          {!unlocked && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]">
              CSV: PRO
            </span>
          )}
        </div>
        <select
          value={pack.year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          aria-label="Tax year"
          className="px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)] mb-4">
        Summaries for your records. Lance is not a tax advisor; confirm everything with your accountant.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[10px] text-[var(--text-secondary)]">Revenue</p>
          <p className="text-lg font-semibold text-[var(--accent-ink,var(--accent))]">
            {formatCurrency(Math.round(pack.revenuePaid), currency)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-secondary)]">Expenses</p>
          <p className="text-lg font-semibold text-[var(--danger)]">
            {formatCurrency(Math.round(pack.expenses), currency)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-secondary)]">Profit</p>
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {formatCurrency(Math.round(pack.profit), currency)}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {pack.quarters.map((q) => (
          <div key={q.quarter} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">{q.quarter}</span>
              <span className="font-medium text-[var(--text-primary)]">
                {formatCurrency(Math.round(q.revenue), currency)}
              </span>
            </div>
            <ProgressBar value={q.revenue} max={maxQ} size="sm" showPercent={false} />
          </div>
        ))}
      </div>

      {pack.perClient.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-[var(--text-secondary)] mb-2">Top clients</p>
          <div className="space-y-1.5">
            {pack.perClient.slice(0, 4).map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-primary)] truncate">{c.name}</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatCurrency(Math.round(c.revenue), currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button size="sm" className="w-full" onClick={handleDownload}>
        {unlocked ? <Download size={13} /> : <Lock size={13} />}
        {unlocked ? 'Download accountant CSV' : 'Unlock accountant CSV with Pro'}
      </Button>
      <p className="text-[11px] text-[var(--text-tertiary)] mt-2 leading-relaxed">
        Revenue, quarters, per-client totals, and expenses by category in one file your accountant can open.
      </p>
    </Card>
  );
}
