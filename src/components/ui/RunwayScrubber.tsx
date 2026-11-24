import { useState } from 'react';
import Card from './Card';
import AnimatedNumber from '../motion/AnimatedNumber';
import type { CashFlowItem } from '../../lib/forecast';

/**
 * Cash runway scrubber. READ-ONLY over forecast.ts math: the parent passes
 * computed cash-flow months; this component only selects which month to
 * display. Bars draw in once (transform scaleY); scrubbing is instant.
 */
export default function RunwayScrubber({
  cashFlow,
  fmt,
}: {
  cashFlow: CashFlowItem[];
  fmt: (n: number) => string;
}) {
  const [idx, setIdx] = useState(() => Math.min(1, Math.max(0, cashFlow.length - 1)));
  if (cashFlow.length === 0) return null;
  const cur = cashFlow[Math.min(idx, cashFlow.length - 1)];
  const maxAbs = Math.max(1, ...cashFlow.map((m) => Math.abs(m.net)));

  return (
    <Card>
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Runway scrubber</h2>
      <p className="text-xs text-[var(--text-tertiary)] mb-4">
        Drag through the coming months. Projected only — plans change, math doesn't judge.
      </p>
      <div className="flex items-end gap-1.5 h-[72px] mb-3" aria-hidden="true">
        {cashFlow.map((m, i) => (
          <div
            key={m.month.key}
            className="flex-1 rounded-t-[3px] chart-draw origin-bottom"
            style={{
              height: `${Math.max(4, (Math.abs(m.net) / maxAbs) * 100)}%`,
              background: m.net >= 0 ? 'var(--accent)' : 'var(--danger)',
              opacity: i === Math.min(idx, cashFlow.length - 1) ? 1 : 0.45,
            }}
          />
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={cashFlow.length - 1}
        value={Math.min(idx, cashFlow.length - 1)}
        onChange={(e) => setIdx(Number(e.target.value))}
        aria-label="Scrub forecast months"
        className="w-full accent-[var(--accent)]"
      />
      <div className="flex items-baseline justify-between mt-2">
        <span className="text-xs text-[var(--text-secondary)]">{cur.month.label}</span>
        <span className="text-xl font-semibold text-[var(--text-primary)] tnum">
          <AnimatedNumber
            value={cur.runningBalance ?? cur.net}
            format={(n) => fmt(Math.round(n))}
          />
        </span>
      </div>
      <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
        {cur.runningBalance != null
          ? `Projected balance · net ${fmt(Math.round(cur.net))} that month`
          : `Projected net · enter a current balance above for full runway`}
      </p>
    </Card>
  );
}
