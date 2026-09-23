/**
 * Deadline Board · Writer feature.
 * Visual deadline tracker for all projects with end dates.
 * Color-coded by time remaining.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';

export default function DeadlineBoard() {
  const { projects, clients, loadProjects, loadClients, updateProject } = useStore();
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadProjects();
      await loadClients();
      setLoading(false);
    };
    load();
  }, [loadClients, loadProjects]);

  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Unknown';
  };

  const getDaysRemaining = (endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getDeadlineColor = (days: number) => {
    if (days < 0) return { text: 'text-[#991B1B]', bg: 'bg-[#991B1B]/10', label: 'Overdue' };
    if (days < 7) return { text: 'text-[#DC2626]', bg: 'bg-[#DC2626]/10', label: 'Urgent' };
    if (days <= 14) return { text: 'text-[#D97706]', bg: 'bg-[#D97706]/10', label: 'Soon' };
    return { text: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10', label: 'On track' };
  };

  const handleStartEdit = (project: (typeof projects)[0]) => {
    setEditingId(project.id);
    setEditDate(project.end_date?.slice(0, 10) || '');
  };

  const handleSaveDate = async (project: (typeof projects)[0]) => {
    setSaving(true);
    try {
      await updateProject({ ...project, end_date: editDate ? new Date(editDate).toISOString().slice(0, 10) : undefined });
      setEditingId(null);
      setEditDate('');
    } catch (e) {
      console.error('[DeadlineBoard] handleSaveDate failed:', e);
    }
    setSaving(false);
  };

  const projectsWithDates = projects
    .filter((p) => p.end_date)
    .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime());

  const projectsWithoutDates = projects.filter((p) => !p.end_date);

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Deadlines
          </h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Deadlines ({projectsWithDates.length})
        </h4>
      </div>

      {projectsWithDates.length === 0 && projectsWithoutDates.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No projects found.</p>
      ) : (
        <>
          <div className="space-y-1">
            {projectsWithDates.map((project) => {
              const days = getDaysRemaining(project.end_date!);
              const color = getDeadlineColor(days);
              const isEditing = editingId === project.id;

              return (
                <div
                  key={project.id}
                  className={`flex items-center gap-3 px-3 py-2.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs ${color.bg} border-l-2`}
                  style={{ borderLeftColor: color.text.replace('text-[', '').replace(']', '') }}
                >
                  <div className={`flex flex-col items-center justify-center min-w-[40px] ${color.text}`}>
                    <span className="text-lg font-bold leading-none">
                      {days < 0 ? Math.abs(days) : days}
                    </span>
                    <span className="text-[9px] uppercase leading-none mt-0.5">
                      {days < 0 ? 'days late' : 'days'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[var(--text-primary)] font-medium truncate">{project.title}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">
                      {getClientName(project.client_id)} · {color.label}
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className={inputClass + ' w-36'}
                        />
                        <Button size="sm" onClick={() => handleSaveDate(project)} loading={saving}>
                          Save
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditDate('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 mt-0.5">
                        <Calendar size={9} />
                        {new Date(project.end_date!).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => handleStartEdit(project)}
                      className="text-[var(--text-tertiary)] hover:text-[var(--accent-ink,var(--accent))] flex-shrink-0"
                    >
                      <Clock size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {projectsWithoutDates.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide px-1">
                Needs Deadline ({projectsWithoutDates.length})
              </h5>
              {projectsWithoutDates.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <AlertTriangle size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                    <div>
                      <div className="text-[var(--text-primary)] font-medium truncate">{project.title}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)]">
                        {getClientName(project.client_id)}
                      </div>
                    </div>
                  </div>
                  {editingId === project.id ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className={inputClass + ' w-36'}
                      />
                      <Button size="sm" onClick={() => handleSaveDate(project)} loading={saving}>
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditDate('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handleStartEdit(project)}>
                      Add Deadline
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
