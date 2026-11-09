/**
 * Dependency Tracker · Project Manager feature.
 * Shows milestones with dependency visualization. Uses existing milestones from store.
 */
import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ArrowRight, CheckCircle2, Circle, DollarSign } from 'lucide-react';
import { parseDateString } from '../../utils/format';

type MilestoneWithDeps = {
  id: string;
  project_id: string;
  title: string;
  due_date?: string;
  completed: boolean;
  invoice_on_completion: boolean;
  depends_on?: string;
};

export default function DependencyTracker({ projectId }: { projectId: string }) {
  const { milestones, loadMilestones, addMilestone, removeMilestone } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    due_date: '',
    depends_on: '',
    invoice_on_completion: false,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const list = useMemo(() => {
    const raw = milestones.filter(m => m.project_id === projectId);
    return raw.map((m) => ({
      ...m,
      depends_on: undefined as string | undefined,
    })) as MilestoneWithDeps[];
  }, [milestones, projectId]);

  useEffect(() => {
    loadMilestones().then(() => setLoading(false));
  }, [projectId, loadMilestones]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await addMilestone({
        project_id: projectId,
        title: form.title.trim(),
        due_date: form.due_date || undefined,
        completed: false,
        invoice_on_completion: form.invoice_on_completion,
      });
      setForm({ title: '', due_date: '', depends_on: '', invoice_on_completion: false });
      setShowForm(false);
    } catch (e) {
      console.error('[DependencyTracker] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await removeMilestone(id);
    } catch (e) {
      console.error('[DependencyTracker] handleDelete failed:', e);
    }
  };

  const handleToggleComplete = async (id: string, current: boolean) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE milestones SET completed = ? WHERE id = ?', [current ? 0 : 1, id]);
      setForm((f) => ({ ...f }));
      await loadMilestones();
    } catch (e) {
      console.error('[DependencyTracker] handleToggleComplete failed:', e);
    }
  };

  // Simulate dependency links based on order: each milestone depends on the previous
  const deps = list.map((m, i) => ({
    ...m,
    depends_on: i > 0 ? list[i - 1].id : undefined,
  }));

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Dependencies</h4>
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
          Dependencies ({list.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Milestone
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Milestone title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className={inputClass}
            />
            <select aria-label="Depends On"
              value={form.depends_on}
              onChange={(e) => setForm({ ...form, depends_on: e.target.value })}
              className={inputClass}
            >
              <option value="">No dependency</option>
              {list.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.invoice_on_completion}
              onChange={(e) => setForm({ ...form, invoice_on_completion: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            Invoice on completion
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.title.trim()}>Save</Button>
          </div>
        </div>
      )}

      {deps.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No milestones yet.</p>
      ) : (
        <div className="space-y-1">
          {deps.map((m, i) => (
            <div key={m.id} className="flex items-center gap-1">
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs flex-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button onClick={() => handleToggleComplete(m.id, m.completed)}>
                    {m.completed ? (
                      <CheckCircle2 size={12} className="text-[#16A34A]" />
                    ) : (
                      <Circle size={12} className="text-[var(--text-tertiary)]" />
                    )}
                  </button>
                  <span
                    className={`font-medium truncate ${
                      m.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {m.title}
                  </span>
                  {m.due_date && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {parseDateString(m.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {m.invoice_on_completion && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#9B59B6]/15 text-[#9B59B6]" title="Invoices on completion">
                      <DollarSign size={10} className="inline" />
                    </span>
                  )}
                </div>
                <button
                  aria-label="Delete dependency tracker"
                  onClick={() => handleDelete(m.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                  <Trash2 size={12} />
                </button>
              </div>
              {i < deps.length - 1 && (
                <ArrowRight size={10} className="text-[var(--text-tertiary)] flex-shrink-0 mx-0.5" />
              )}
            </div>
          ))}
          <div className="flex items-center gap-3 px-3 py-1.5 mt-1 text-[10px] text-[var(--text-tertiary)]">
            <span>{deps.filter((m) => m.completed).length} done</span>
            <span>{deps.filter((m) => !m.completed).length} remaining</span>
          </div>
        </div>
      )}
    </div>
  );
}
