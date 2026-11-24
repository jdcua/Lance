/**
 * Resource Allocation · Project Manager feature.
 * Shows hours per week breakdown using existing time entries from store.
 */
import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';

type WeekBucket = {
  weekStart: string;
  weekLabel: string;
  totalHours: number;
  totalMinutes: number;
};

export default function ResourceAllocation({ projectId }: { projectId: string }) {
  const { timeEntries, loadTimeEntries } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeEntries().then(() => setLoading(false));
  }, [loadTimeEntries]);

  const projectEntries = useMemo(
    () => timeEntries.filter((te) => te.project_id === projectId),
    [timeEntries, projectId]
  );

  const totalHours = useMemo(
    () => projectEntries.reduce((sum, te) => sum + (te.duration_minutes || 0), 0) / 60,
    [projectEntries]
  );

  const weeklyBuckets = useMemo(() => {
    const bucketMap: Record<string, WeekBucket> = {};
    for (const te of projectEntries) {
      if (!te.duration_minutes) continue;
      const d = new Date(te.start_time);
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      const key = monday.toISOString().split('T')[0];
      if (!bucketMap[key]) {
        bucketMap[key] = {
          weekStart: key,
          weekLabel: `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          totalHours: 0,
          totalMinutes: 0,
        };
      }
      bucketMap[key].totalMinutes += te.duration_minutes;
      bucketMap[key].totalHours = bucketMap[key].totalMinutes / 60;
    }
    return Object.values(bucketMap).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }, [projectEntries]);

  const billableHours = useMemo(
    () => projectEntries.filter((te) => te.billable).reduce((sum, te) => sum + (te.duration_minutes || 0), 0) / 60,
    [projectEntries]
  );

  const maxWeeklyHours = Math.max(...weeklyBuckets.map((b) => b.totalHours), 1);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Resources</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Resource Allocation
        </h4>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-center">
          <p className="text-[10px] text-[var(--text-tertiary)]">Total Hours</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-center">
          <p className="text-[10px] text-[var(--text-tertiary)]">Billable</p>
          <p className="text-sm font-semibold text-[#16A34A]">{billableHours.toFixed(1)}h</p>
        </div>
        <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-center">
          <p className="text-[10px] text-[var(--text-tertiary)]">Entries</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{projectEntries.length}</p>
        </div>
      </div>

      {weeklyBuckets.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No time entries recorded yet.</p>
      ) : (
        <div className="space-y-1">
          {weeklyBuckets.map((bucket) => (
            <div key={bucket.weekStart} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[var(--text-secondary)]">{bucket.weekLabel}</span>
                <span className="font-semibold text-[var(--text-primary)]">{bucket.totalHours.toFixed(1)}h</span>
              </div>
              <div className="w-full h-1.5 glass rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-colors"
                  style={{ width: `${Math.min((bucket.totalHours / maxWeeklyHours) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
