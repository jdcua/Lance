import { useStore } from '../../store';
import { Clock } from 'lucide-react';

export default function RecentTimeWidget() {
  const timeEntries = useStore((s) => s.timeEntries);
  const projects = useStore((s) => s.projects);

  const recent = [...timeEntries]
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .slice(0, 5);

  if (recent.length === 0) {
    return <p className="text-xs text-[var(--text-secondary)] py-2">No time entries yet.</p>;
  }

  return (
    <div className="space-y-1">
      {recent.map((t) => {
        const project = projects.find((p) => p.id === t.project_id);
        return (
          <div key={t.id} className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <div className="flex-1 min-w-0">
              <span className="text-[var(--text-primary)]">
                {t.description || 'Time Entry'}
              </span>
              {project && (
                <span className="text-[var(--text-tertiary)] ml-1">-- {project.title}</span>
              )}
            </div>
            <span className="text-[var(--text-tertiary)] flex items-center gap-1 ml-2 shrink-0">
              <Clock size={10} />
              {t.duration_minutes != null ? `${t.duration_minutes}m` : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
