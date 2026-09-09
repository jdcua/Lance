/**
 * Timeline View · Generic timeline for milestones.
 * Reads store.milestones. Shows milestones sorted by due_date with date badges.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Calendar, Circle, CheckCircle2 } from 'lucide-react';

export default function TimelineView({ projectId }: { projectId: string }) {
  const { milestones, loadMilestones } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadMilestones();
      setLoading(false);
    };
    load();
  }, [projectId, loadMilestones]);

  const items = milestones.filter(m => m.project_id === projectId).slice().sort(
    (a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime()
  );

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Timeline</h4>
        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[4px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Timeline</h4>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)]">No milestones yet.</p>
      ) : (
        <div className="relative pl-4 border-l border-[var(--border-color)] space-y-0">
          {items.map((m, _i) => {
            const isComplete = m.completed;
            const isPast = new Date(m.due_date || '') < new Date() && !isComplete;
            return (
              <div key={m.id} className="relative pb-3 last:pb-0">
                <div className="absolute -left-[21px] top-0.5">
                  {isComplete ? (
                    <CheckCircle2 size={14} className="text-[#2ECC71]" />
                  ) : isPast ? (
                    <Circle size={14} className="text-[#DC2626]" />
                  ) : (
                    <Circle size={14} className="text-[var(--accent)]" />
                  )}
                </div>
                <div className="ml-2">
                  <p className={`text-xs font-medium ${m.completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>
                    {m.title}
                  </p>
                  {m.due_date && (
                    <span className={`inline-flex items-center gap-1 text-[10px] ${isPast ? 'text-[#DC2626]' : 'text-[var(--text-tertiary)]'}`}>
                      <Calendar size={10} />
                      {m.due_date}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
