/**
 * Task Log · Virtual Assistant feature.
 * Per-client VA task list with category filter tabs and hours summary.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Clock, Hash } from 'lucide-react';

type VATask = {
  id: string;
  client_id: string;
  title: string;
  duration_minutes?: number;
  category: string;
  completed_date?: string;
  created_at: string;
};

const CATEGORIES = ['email', 'scheduling', 'research', 'data-entry', 'social-media', 'bookkeeping', 'other'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  email: 'Email',
  scheduling: 'Scheduling',
  research: 'Research',
  'data-entry': 'Data Entry',
  'social-media': 'Social Media',
  bookkeeping: 'Bookkeeping',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  email: 'bg-[#3498DB]/15 text-[#3498DB]',
  scheduling: 'bg-[#2ECC71]/15 text-[#2ECC71]',
  research: 'bg-[#9B59B6]/15 text-[#9B59B6]',
  'data-entry': 'bg-[#E67E22]/15 text-[#E67E22]',
  'social-media': 'bg-[#1ABC9C]/15 text-[#1ABC9C]',
  bookkeeping: 'bg-[#F1C40F]/15 text-[#B8860B]',
  other: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
};

export default function TaskLog({ clientId }: { clientId: string }) {
  const [tasks, setTasks] = useState<VATask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [form, setForm] = useState({
    title: '',
    duration_minutes: '',
    category: 'other' as string,
    completed_date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(VATask & Record<string, unknown>)[]>(
        'SELECT id, client_id, title, duration_minutes, category, completed_date, created_at FROM va_tasks WHERE client_id = ? ORDER BY completed_date DESC, created_at DESC',
        [clientId]
      );
      setTasks(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          title: r.title as string,
          duration_minutes: r.duration_minutes as number | undefined,
          category: (r.category as string) || 'other',
          completed_date: r.completed_date as string | undefined,
          created_at: r.created_at as string,
        }))
      );
    } catch (e) {
      console.error('[TaskLog] loadTasks failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadTasks();
  }, [clientId, loadTasks]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const db = await getDb();
      const mins = form.duration_minutes ? parseInt(form.duration_minutes) : null;
      await db.execute(
        'INSERT INTO va_tasks (id, client_id, title, duration_minutes, category, completed_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, clientId, form.title.trim(), mins, form.category, form.completed_date || null, now]
      );
      const task: VATask = {
        id,
        client_id: clientId,
        title: form.title.trim(),
        duration_minutes: mins || undefined,
        category: form.category,
        completed_date: form.completed_date || undefined,
        created_at: now,
      };
      setTasks((prev) => [task, ...prev]);
      setForm({
        title: '',
        duration_minutes: '',
        category: 'other',
        completed_date: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
    } catch (e) {
      console.error('[TaskLog] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM va_tasks WHERE id = ?', [id]);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error('[TaskLog] delete failed:', e);
    }
  };

  const filtered = filterCategory === 'all' ? tasks : tasks.filter((t) => t.category === filterCategory);

  const totalMinutes = tasks.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
  const totalHours = totalMinutes / 60;

  const categoryHours: Record<string, number> = {};
  for (const t of tasks) {
    const hrs = (t.duration_minutes || 0) / 60;
    categoryHours[t.category] = (categoryHours[t.category] || 0) + hrs;
  }

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Tasks</h4>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-16 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Tasks ({tasks.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Task
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Duration (min)"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              className={inputClass}
              min={0}
            />
            <select aria-label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.completed_date}
              onChange={(e) => setForm({ ...form, completed_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.title.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Category filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
            filterCategory === 'all'
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)]'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
              filterCategory === c
                ? CATEGORY_COLORS[c]
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Summary */}
      {tasks.length > 0 && (
        <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <Clock size={12} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-primary)] font-medium">{totalHours.toFixed(1)} hours total</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--text-tertiary)]">
            {CATEGORIES.map((c) => {
              const hrs = categoryHours[c];
              if (!hrs) return null;
              return (
                <span key={c}>
                  <span className="font-medium text-[var(--text-secondary)]">{CATEGORY_LABELS[c]}:</span>{' '}
                  {hrs.toFixed(1)}h
                </span>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No tasks logged yet. Add your first task.</p>
      ) : (
        <div className="space-y-1">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)] truncate">{t.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.other}`}>
                  {CATEGORY_LABELS[t.category] || t.category}
                </span>
                {t.duration_minutes != null && (
                  <span className="text-[var(--text-tertiary)] flex items-center gap-0.5">
                    <Hash size={10} />
                    {t.duration_minutes}m
                  </span>
                )}
                {t.completed_date && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {new Date(t.completed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              <button aria-label="Delete task log"
                onClick={() => handleDelete(t.id)}
                className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
