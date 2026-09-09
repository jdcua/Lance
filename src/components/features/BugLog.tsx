/**
 * Bug Log · Developer feature.
 * Track bugs with priority dots, status, and resolution.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Circle, CheckCircle2 } from 'lucide-react';

type Bug = {
  id: string;
  project_id: string;
  title: string;
  priority: string;
  status: string;
  hours_spent?: number;
  created_at: string;
  resolved_at?: string;
};

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;
const STATUS_OPTIONS = ['open', 'in_progress', 'resolved'] as const;

const priorityDotColors: Record<string, string> = {
  low: 'text-[#16A34A]',
  medium: 'text-[#D97706]',
  high: 'text-[#DC2626]',
  critical: 'text-[#991B1B]',
};

const priorityBadgeClasses: Record<string, string> = {
  low: 'bg-[#16A34A]/15 text-[#16A34A]',
  medium: 'bg-[#D97706]/15 text-[#D97706]',
  high: 'bg-[#DC2626]/15 text-[#DC2626]',
  critical: 'bg-[#991B1B]/15 text-[#991B1B]',
};

const statusBadgeClasses: Record<string, string> = {
  open: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB]',
  resolved: 'bg-[#16A34A]/15 text-[#16A34A]',
};

export default function BugLog({ projectId }: { projectId: string }) {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'medium', status: 'open' });
  const [saving, setSaving] = useState(false);

  const loadBugs = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Bug & Record<string, unknown>)[]>(
        'SELECT id, project_id, title, priority, status, hours_spent, created_at, resolved_at FROM bugs WHERE project_id = ? ORDER BY CASE priority WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, created_at DESC',
        [projectId]
      );
      setBugs(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        title: r.title as string,
        priority: r.priority as string,
        status: r.status as string,
        hours_spent: r.hours_spent as number | undefined,
        created_at: r.created_at as string,
        resolved_at: r.resolved_at as string | undefined,
      })));
    } catch (e) { console.error('[BugLog] loadBugs failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadBugs(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO bugs (id, project_id, title, priority, status, hours_spent, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.title.trim(), form.priority, form.status, null, new Date().toISOString(), null]
      );
      const bug: Bug = { id, project_id: projectId, title: form.title.trim(), priority: form.priority, status: form.status, hours_spent: undefined, created_at: new Date().toISOString(), resolved_at: undefined };
      setBugs(prev => [bug, ...prev].sort((a, b) => {
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      }));
      setForm({ title: '', priority: 'medium', status: 'open' });
      setShowForm(false);
    } catch (e) { console.error('[BugLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM bugs WHERE id = ?', [id]);
      setBugs(prev => prev.filter(b => b.id !== id));
    } catch (e) { console.error('[BugLog] delete failed:', e); }
  };

  const handleResolve = async (id: string) => {
    try {
      const now = new Date().toISOString();
      const db = await getDb();
      await db.execute('UPDATE bugs SET status = ?, resolved_at = ? WHERE id = ?', ['resolved', now, id]);
      setBugs(prev => prev.map(b => b.id === id ? { ...b, status: 'resolved', resolved_at: now } : b));
    } catch (e) { console.error('[BugLog] resolve failed:', e); }
  };

  const openCount = bugs.filter(b => b.status !== 'resolved').length;
  const criticalCount = bugs.filter(b => b.status !== 'resolved' && b.priority === 'critical').length;
  const totalHours = bugs.reduce((sum, b) => sum + (b.hours_spent || 0), 0);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Bugs</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Bugs ({bugs.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Report Bug
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Bug title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selectClass}>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>Add</Button>
          </div>
        </div>
      )}

      {bugs.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No bugs reported yet.</p>
      ) : (
        <div className="space-y-1">
          {bugs.map((bug) => (
            <div key={bug.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Circle size={8} className={`${priorityDotColors[bug.priority] || priorityDotColors.medium} fill-current flex-shrink-0`} />
                <span className={`font-medium ${bug.status === 'resolved' ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'} truncate`}>
                  {bug.title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${priorityBadgeClasses[bug.priority] || priorityBadgeClasses.medium}`}>
                  {bug.priority}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[bug.status] || statusBadgeClasses.open}`}>
                  {bug.status === 'in_progress' ? 'in progress' : bug.status}
                </span>
                {bug.hours_spent != null && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{bug.hours_spent}h</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                {bug.status !== 'resolved' && (
                  <button onClick={() => handleResolve(bug.id)} className="text-[var(--text-tertiary)] hover:text-[#16A34A]">
                    <CheckCircle2 size={12} />
                  </button>
                )}
                <button onClick={() => handleDelete(bug.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 px-3 py-1.5 mt-1 text-[10px] text-[var(--text-tertiary)]">
            <span>{openCount} open</span>
            {criticalCount > 0 && <span className="text-[#DC2626]">{criticalCount} critical</span>}
            <span>{totalHours}h total</span>
          </div>
        </div>
      )}
    </div>
  );
}
