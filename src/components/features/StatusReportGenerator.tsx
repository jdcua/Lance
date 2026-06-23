/**
 * Status Report Generator — simple project status report.
 * Reads store.timeEntries + store.milestones. Shows total hours, completed/total milestones, last activity date.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Clock, CheckCircle2, Calendar } from 'lucide-react';

export default function StatusReportGenerator({ projectId }: { projectId: string }) {
  const { timeEntries, loadTimeEntries, milestones, loadMilestones } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadTimeEntries(), loadMilestones(projectId)]);
      setLoading(false);
    };
    load();
  }, [projectId, loadTimeEntries, loadMilestones]);

  const projectEntries = timeEntries.filter(t => t.project_id === projectId);
  const totalMinutes = projectEntries.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
  const totalHours = totalMinutes / 60;
  const projectMilestones = milestones[projectId] || [];
  const completedCount = projectMilestones.filter(m => m.completed).length;
  const lastActivity = projectEntries.length > 0
    ? projectEntries.reduce((latest, t) => {
        const d = t.start_time || '';
        return d > latest ? d : latest;
      }, '')
    : null;

  if (loading) {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Status Report</h4>
        <div className="space-y-2">
          <div className="h-8 bg-[var(--bg-secondary)] rounded-[4px] animate-pulse" />
          <div className="h-8 bg-[var(--bg-secondary)] rounded-[4px] animate-pulse" />
          <div className="h-8 bg-[var(--bg-secondary)] rounded-[4px] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Status Report</h4>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Clock size={14} className="text-[var(--accent)]" />
            Total Hours
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{totalHours.toFixed(1)}h</span>
        </div>

        <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <CheckCircle2 size={14} className="text-[#2ECC71]" />
            Milestones
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {completedCount}/{projectMilestones.length}
          </span>
        </div>

        {lastActivity && (
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Calendar size={14} className="text-[var(--text-tertiary)]" />
              Last Activity
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">{lastActivity}</span>
          </div>
        )}
      </div>
    </div>
  );
}
