/**
 * Sprint Board · Developer feature.
 * Kanban board with 4 columns: backlog, in_progress, review, done.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Clock, AlertCircle } from 'lucide-react';

type SprintTask = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  priority: string;
  hours_estimated?: number;
  hours_actual?: number;
  sort_order: number;
  created_at: string;
};

const COLUMNS = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

const priorityBadgeClasses: Record<string, string> = {
  low: 'bg-[#16A34A]/15 text-[#16A34A]',
  medium: 'bg-[#D97706]/15 text-[#D97706]',
  high: 'bg-[#DC2626]/15 text-[#DC2626]',
};

export default function SprintBoard({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formColumn, setFormColumn] = useState('backlog');
  const [form, setForm] = useState({ title: '', priority: 'medium', hours_estimated: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SprintTask>>({});

  const loadTasks = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(SprintTask & Record<string, unknown>)[]>(
        'SELECT id, project_id, title, status, priority, hours_estimated, hours_actual, sort_order, created_at FROM sprint_tasks WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC',
        [projectId],
      );
      setTasks(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          title: r.title as string,
          status: r.status as string,
          priority: r.priority as string,
          hours_estimated: r.hours_estimated as number | undefined,
          hours_actual: r.hours_actual as number | undefined,
          sort_order: r.sort_order as number,
          created_at: r.created_at as string,
        })),
      );
    } catch (e) {
      console.error('[SprintBoard] loadTasks failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadTasks();
  }, [projectId, loadTasks]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const maxOrder = tasks.filter((t) => t.status === formColumn).length;
      await db.execute(
        'INSERT INTO sprint_tasks (id, project_id, title, status, priority, hours_estimated, hours_actual, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.title.trim(),
          formColumn,
          form.priority,
          form.hours_estimated ? parseFloat(form.hours_estimated) : null,
          null,
          maxOrder,
          new Date().toISOString(),
        ],
      );
      const task: SprintTask = {
        id,
        project_id: projectId,
        title: form.title.trim(),
        status: formColumn,
        priority: form.priority,
        hours_estimated: form.hours_estimated ? parseFloat(form.hours_estimated) : undefined,
        hours_actual: undefined,
        sort_order: maxOrder,
        created_at: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, task]);
      setForm({ title: '', priority: 'medium', hours_estimated: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[SprintBoard] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM sprint_tasks WHERE id = ?', [id]);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error('[SprintBoard] delete failed:', e);
    }
  };

  const handleEditToggle = (task: SprintTask) => {
    if (editingId === task.id) {
      setEditingId(null);
      setEditForm({});
    } else {
      setEditingId(task.id);
      setEditForm({
        title: task.title,
        status: task.status,
        priority: task.priority,
        hours_estimated: task.hours_estimated,
        hours_actual: task.hours_actual,
      });
    }
  };

  const handleEditSave = async (taskId: string) => {
    try {
      const db = await getDb();
      const updates: string[] = [];
      const values: unknown[] = [];
      if (editForm.title !== undefined) {
        updates.push('title = ?');
        values.push(editForm.title);
      }
      if (editForm.priority !== undefined) {
        updates.push('priority = ?');
        values.push(editForm.priority);
      }
      if (editForm.status !== undefined) {
        updates.push('status = ?');
        values.push(editForm.status);
      }
      if (editForm.hours_estimated !== undefined) {
        updates.push('hours_estimated = ?');
        values.push(editForm.hours_estimated);
      }
      if (editForm.hours_actual !== undefined) {
        updates.push('hours_actual = ?');
        values.push(editForm.hours_actual);
      }
      if (updates.length > 0) {
        values.push(taskId);
        await db.execute(`UPDATE sprint_tasks SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                title: editForm.title ?? t.title,
                status: editForm.status ?? t.status,
                priority: editForm.priority ?? t.priority,
                hours_estimated:
                  (editForm.hours_estimated as number | undefined) ?? t.hours_estimated,
                hours_actual: (editForm.hours_actual as number | undefined) ?? t.hours_actual,
              }
            : t,
        ),
      );
      setEditingId(null);
      setEditForm({});
    } catch (e) {
      console.error('[SprintBoard] edit failed:', e);
    }
  };

  const columnStats = (key: string) => {
    const colTasks = tasks.filter((t) => t.status === key);
    const total = colTasks.reduce((sum, t) => sum + (t.hours_estimated || 0), 0);
    return { count: colTasks.length, total };
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Sprint Board
          </h4>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Sprint Board ({tasks.length})
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowForm(!showForm);
            setFormColumn('backlog');
          }}
        >
          <Plus size={12} /> Add Task
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              aria-label="Column"
              value={formColumn}
              onChange={(e) => setFormColumn(e.target.value)}
              className={selectClass}
            >
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className={selectClass}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.5"
              placeholder="Est. hours"
              value={form.hours_estimated}
              onChange={(e) => setForm({ ...form, hours_estimated: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No sprint tasks yet. Add your first task.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            const stats = columnStats(col.key);
            return (
              <div key={col.key} className="flex flex-col">
                <div className="flex items-center justify-between px-1 py-1.5 mb-1">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                    {col.label}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {stats.count} · {stats.total}h
                  </span>
                </div>
                <div className="flex flex-col gap-1 min-h-[60px]">
                  {colTasks.map((task) => (
                    <div key={task.id} className="group">
                      {editingId === task.id ? (
                        <div className="p-2 glass border border-[var(--accent)] rounded-xs space-y-1.5">
                          <input
                            type="text"
                            value={(editForm.title as string) || ''}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className={inputClass}
                            autoFocus
                          />
                          <div className="grid grid-cols-2 gap-1">
                            <select
                              aria-label="Status as string || ''"
                              value={(editForm.status as string) || ''}
                              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                              className={selectClass}
                            >
                              {COLUMNS.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                            <select
                              aria-label="Priority as string || ''"
                              value={(editForm.priority as string) || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, priority: e.target.value })
                              }
                              className={selectClass}
                            >
                              {PRIORITY_OPTIONS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="number"
                              step="0.5"
                              placeholder="Est. hrs"
                              value={editForm.hours_estimated ?? ''}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  hours_estimated: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                })
                              }
                              className={inputClass}
                            />
                            <input
                              type="number"
                              step="0.5"
                              placeholder="Actual hrs"
                              value={editForm.hours_actual ?? ''}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  hours_actual: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingId(null);
                                setEditForm({});
                              }}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => handleEditSave(task.id)}>
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-xs text-xs cursor-pointer hover:brightness-110 transition-colors"
                          onClick={() => handleEditToggle(task)}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[var(--text-primary)] leading-tight flex-1 min-w-0">
                              {task.title}
                            </span>
                            <button
                              aria-label="Delete sprint board"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(task.id);
                              }}
                              className="text-[var(--text-tertiary)] hover:text-[#A32D2D] opacity-0 group-hover:opacity-100 flex-shrink-0"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className={`text-[10px] px-1 py-0.5 rounded-full ${priorityBadgeClasses[task.priority] || priorityBadgeClasses.medium}`}
                            >
                              {task.priority}
                            </span>
                            {task.hours_estimated != null && (
                              <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5">
                                <Clock size={9} /> {task.hours_estimated}h
                              </span>
                            )}
                            {task.hours_actual != null && (
                              <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5">
                                <AlertCircle size={9} /> {task.hours_actual}h
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
