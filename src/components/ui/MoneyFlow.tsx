import { useState } from 'react';
import Card from './Card';

const KEY = 'lance:set-aside-pct';

/** The user's own set-aside %, shared read-only with the affordability banner. */
export function loadSetAsidePct(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return null;
    const v = parseFloat(raw);
    return isFinite(v) && v >= 0 && v <= 100 ? v : null;
  } catch {
    return null;
  }
}

/**
 * Money-flow visual: income → expenses → set-aside → keep, for a typical
 * month. The set-aside % is the user's own number (slider, local-only) —
 * Lance shows the arithmetic and advises nothing. No tax content, no FX.
 */
export default function MoneyFlow({
  income,
  expenses,
  fmt,
}: {
  income: number;
  expenses: number;
  fmt: (n: number) => string;
}) {
  const [pct, setPct] = useState<number | null>(loadSetAsidePct);
  const setAside = pct == null ? 0 : Math.max(0, income * (pct / 100));
  const keep = Math.max(0, income - expenses - setAside);
  const max = Math.max(1, income);

  const set = (v: number) => {
    setPct(v);
    try {
      localStorage.setItem(KEY, String(v));
    } catch {
      /* private mode */
    }
  };

  const rows = [
    { label: 'In', amount: income, width: (income / max) * 100, color: 'var(--accent)' },
    { label: 'Out', amount: expenses, width: (Math.min(expenses, income) / max) * 100, color: 'var(--danger)' },
    { label: 'Set aside', amount: setAside, width: (setAside / max) * 100, color: 'var(--warning)' },
    { label: 'Keep', amount: keep, width: (keep / max) * 100, color: 'var(--metric-blue)' },
  ];

  return (
    <Card>
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Money flow</h2>
      <p className="text-xs text-[var(--text-tertiary)] mb-4">
        A typical month, split four ways. Your percentage, your call.
      </p>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-16 text-[11px] text-[var(--text-secondary)] flex-shrink-0">{r.label}</span>
            <div className="flex-1 h-3 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
              <div
                className="h-full rounded-full chart-draw-x origin-left"
                style={{ width: `${Math.max(0, Math.min(100, r.width))}%`, background: r.color }}
              />
            </div>
            <span className="w-20 text-right text-xs font-medium text-[var(--text-primary)] tnum flex-shrink-0">
              {fmt(Math.round(r.amount))}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="set-aside" className="text-[11px] text-[var(--text-secondary)]">
            Set-aside {pct == null ? '— move the slider' : `${pct}%`}
          </label>
        </div>
        <input
          id="set-aside"
          type="range"
          min={0}
          max={50}
          value={pct ?? 0}
          onChange={(e) => set(Number(e.target.value))}
          aria-label="Set-aside percentage (your own number)"
          className="w-full accent-[var(--warning)]"
        />
        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
          A label for your own planning — not financial advice.
        </p>
      </div>
    </Card>
  );
}
