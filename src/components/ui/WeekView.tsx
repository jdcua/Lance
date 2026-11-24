import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from './Card';
import { getDateKey } from '../../lib/heatmap';
import type { TimeEntry } from '../../types';

function startOfWeek(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const monday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - monday + offset * 7);
  return d;
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function fmt(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Week view: Mon–Sun grid of logged minutes, read-only. Entries attribute to
 * their start day (midnight-spanning entries are not split — noted, not
 * faked). Bars draw in once; week stepping is instant.
 */
export default function WeekView({ entries }: { entries: TimeEntry[] }) {
  const [offset, setOffset] = useState(0);
  const monday = startOfWeek(offset);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
  const keys = days.map((d) => getDateKey(d));
  const perDay = keys.map((k) =>
    entries
      .filter((e) => e.end_time && getDateKey(new Date(e.start_time)) === k)
      .reduce((s, e) => s + (e.duration_minutes || 0), 0),
  );
  const total = perDay.reduce((s, v) => s + v, 0);
  const max = Math.max(60, ...perDay);
  const todayKey = getDateKey(new Date());

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">This week</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Previous week"
            className="p-1.5 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-[var(--text-secondary)] tnum min-w-[72px] text-center">
            {offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${-offset}w ago`}
          </span>
          <button
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset >= 0}
            aria-label="Next week"
            className="p-1.5 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, i) => (
          <div key={keys[i]} className="flex flex-col items-center gap-1.5 min-w-0">
            <div className="w-full h-[110px] rounded-sm bg-[var(--bg-secondary)]/60 relative overflow-hidden flex items-end justify-center">
              <div
                className="w-3/5 rounded-t-[3px] chart-draw origin-bottom"
                style={{
                  height: `${Math.max(perDay[i] > 0 ? 6 : 0, (perDay[i] / max) * 100)}%`,
                  background: keys[i] === todayKey ? 'var(--accent)' : 'var(--accent-bg)',
                  border: keys[i] === todayKey ? 'none' : '1px solid var(--accent-bg)',
                }}
              />
            </div>
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">{DAY_SHORT[i]}</span>
            <span className="text-[10px] text-[var(--text-tertiary)] tnum">{fmt(perDay[i])}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-3">
        Total <strong className="text-[var(--text-primary)] tnum">{fmt(total)}</strong> logged
        {offset === 0 ? ' this week' : ''}
      </p>
    </Card>
  );
}
