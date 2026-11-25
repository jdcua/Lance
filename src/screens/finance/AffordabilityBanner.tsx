import { getMonthKey } from '../../lib/forecast';
import { loadSetAsidePct } from '../../components/ui/MoneyFlow';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type AffordabilityState = 'covered' | 'tight' | 'short';

/** Pure presentation: tone class and the single factual sentence. */
function affordabilityText(
  state: AffordabilityState,
  keep: number,
  pct: number | null,
  fmt: (n: number) => string,
): { tone: string; line: string } {
  const tone =
    state === 'covered'
      ? 'text-[var(--accent-ink,var(--accent))]'
      : state === 'tight'
        ? 'text-[var(--warning-text)]'
        : 'text-[var(--danger)]';
  const line =
    state === 'covered'
      ? `Covered — ${fmt(Math.round(keep))} left after expenses${pct != null ? ` and ${pct}% set aside` : ''}.`
      : state === 'tight'
        ? `Tight — ${fmt(Math.round(keep))} left. Watch new spending.`
        : `Short ${fmt(Math.round(-keep))} — expenses${pct != null ? ' and set-aside' : ''} exceed what's landed.`;
  return { tone, line };
}

/**
 * "Can I afford this month?" — current month's paid income minus expenses
 * minus the user's own set-aside %, stated as a fact (covered / tight /
 * short). No advice, no predictions, read-only over existing records.
 */
export default function AffordabilityBanner({
  monthlyPaid,
  monthlyExpenses,
  fmt,
}: {
  monthlyPaid: Record<string, number>;
  monthlyExpenses: Record<string, number>;
  fmt: (n: number) => string;
}) {
  const key = getMonthKey(new Date());
  const income = monthlyPaid[key] || 0;
  const expenses = monthlyExpenses[key] || 0;
  const pct = loadSetAsidePct();
  const setAside = pct == null ? 0 : Math.max(0, income * (pct / 100));
  const keep = income - expenses - setAside;

  if (income <= 0 && expenses <= 0) return null;

  const state: AffordabilityState = keep < 0 ? 'short' : keep < income * 0.1 ? 'tight' : 'covered';
  const Icon = state === 'covered' ? CheckCircle2 : state === 'tight' ? AlertTriangle : XCircle;
  const { tone, line } = affordabilityText(state, keep, pct, fmt);

  return (
    <div
      className="mb-4 px-3 py-2.5 rounded-sm bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center gap-2.5"
      role="status"
    >
      <Icon size={15} className={`${tone} flex-shrink-0`} />
      <p className="text-xs text-[var(--text-primary)]">
        <strong className="font-semibold">This month: </strong>
        {line}
      </p>
    </div>
  );
}
