import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CalendarClock,
  FileText,
  Clock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../../store';
import Card from './Card';
import Fade from '../motion/Fade';
import { DAY_MS } from '../../utils/format';
import { celebrationLevel, recordCelebration, celebrationToast } from '../../lib/celebration';

interface QueueRow {
  id: string;
  icon: typeof AlertCircle;
  tone: 'danger' | 'warn' | 'accent' | 'neutral';
  text: string;
  sub: string;
  to: string;
}

const toneDot: Record<QueueRow['tone'], string> = {
  danger: 'bg-[var(--danger)]',
  warn: 'bg-[var(--warning)]',
  accent: 'bg-[var(--accent)]',
  neutral: 'bg-[var(--text-tertiary)]',
};

/**
 * Today home queue: what needs me now. Overdue → due-this-week → proposals
 * awaiting reply → unbilled time, each row navigating to its screen. Calm
 * after first paint: one Fade entrance, static rows, no ambient animation.
 * When the queue clears, an earned celebration fires through the decay
 * system (full once, reduced ×4, then quiet).
 */
export default function TodayQueue() {
  const navigate = useNavigate();
  const invoices = useStore((s) => s.invoices);
  const proposals = useStore((s) => s.proposals);
  const timeEntries = useStore((s) => s.timeEntries);
  const addToast = useStore((s) => s.addToast);

  const now = Date.now();
  const overdue = invoices.filter((i) => i.status === 'overdue');
  const dueSoon = invoices.filter((i) => {
    if (i.status !== 'sent' || !i.due_date) return false;
    const t = new Date(i.due_date).getTime();
    return !isNaN(t) && t >= now && t - now <= 7 * DAY_MS;
  });
  const awaiting = proposals.filter((p) => p.status === 'sent');
  const unbilledHours = timeEntries
    .filter((t) => !t.invoiced)
    .reduce((sum, t) => sum + (t.duration_minutes || 0) / 60, 0);

  const rows: QueueRow[] = [];
  if (overdue.length > 0)
    rows.push({
      id: 'overdue',
      icon: AlertCircle,
      tone: 'danger',
      text: `${overdue.length} overdue invoice${overdue.length === 1 ? '' : 's'}`,
      sub: 'Clients owe you — chase the oldest first',
      to: '/invoices',
    });
  if (dueSoon.length > 0)
    rows.push({
      id: 'due',
      icon: CalendarClock,
      tone: 'warn',
      text: `${dueSoon.length} due this week`,
      sub: 'Landing before the weekend keeps cash smooth',
      to: '/invoices',
    });
  if (awaiting.length > 0)
    rows.push({
      id: 'awaiting',
      icon: FileText,
      tone: 'accent',
      text: `${awaiting.length} proposal${awaiting.length === 1 ? '' : 's'} awaiting reply`,
      sub: 'A nudge today beats a rewrite next month',
      to: '/proposals',
    });
  if (unbilledHours > 0.5)
    rows.push({
      id: 'unbilled',
      icon: Clock,
      tone: 'neutral',
      text: `${Math.round(unbilledHours * 10) / 10}h unbilled`,
      sub: 'Logged work with no invoice attached',
      to: '/time',
    });

  // Earned celebration when the queue clears (transition >0 → 0 only).
  const prevCount = useRef<number | null>(null);
  useEffect(() => {
    if (prevCount.current === null) {
      prevCount.current = rows.length;
      return;
    }
    if (prevCount.current > 0 && rows.length === 0) {
      const level = celebrationLevel('queue-cleared');
      if (level === 'full') addToast(celebrationToast('queue-cleared'), 'success');
      else if (level === 'reduced') addToast(celebrationToast('queue-cleared'), 'success');
      recordCelebration('queue-cleared');
    }
    prevCount.current = rows.length;
  });

  return (
    <Fade className="mb-6">
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Today</h2>
          {rows.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] tnum">
              {rows.length}
            </span>
          )}
        </div>
        {rows.length === 0 ? (
          <div className="flex items-center gap-2 py-2">
            <CheckCircle2 size={14} className="text-[var(--accent-ink,var(--accent))]" />
            <p className="text-xs text-[var(--text-secondary)]">
              All clear. Nothing needs you right now.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(r.to)}
                className="w-full flex items-center gap-3 py-2.5 text-left group"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${toneDot[r.tone]}`}
                  aria-hidden="true"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-[var(--text-primary)]">
                    {r.text}
                  </span>
                  <span className="block text-[11px] text-[var(--text-tertiary)] truncate">
                    {r.sub}
                  </span>
                </span>
                <ChevronRight
                  size={14}
                  className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-[1px] transition-colors flex-shrink-0"
                />
              </button>
            ))}
          </div>
        )}
      </Card>
    </Fade>
  );
}
