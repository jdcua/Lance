/**
 * Remediation Tracker · Cybersecurity feature.
 * Track remediation actions with due dates, assignment, and completion toggle.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, CheckSquare, Square, AlertTriangle } from 'lucide-react';

type Remediation = {
  id: string;
  project_id: string;
  title: string;
  vulnerability_id: string;
  action: string;
  assigned_to: string;
  due_date: string;
  completed: number;
};

export default function RemediationTracker({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Remediation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', vulnerability_id: '', action: '', assigned_to: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Remediation & Record<string, unknown>)[]>(
        'SELECT * FROM remediation_tracker WHERE project_id = ? ORDER BY completed ASC, due_date ASC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        title: r.title as string,
        vulnerability_id: r.vulnerability_id as string,
        action: r.action as string,
        assigned_to: r.assigned_to as string,
        due_date: r.due_date as string,
        completed: r.completed as number,
      })));
    } catch (e) { console.error('[RemediationTracker] loadItems failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO remediation_tracker (id, project_id, title, vulnerability_id, action, assigned_to, due_date, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.title.trim(), form.vulnerability_id.trim() || null, form.action.trim() || null, form.assigned_to.trim() || null, form.due_date || null, 0]
      );
      const item: Remediation = {
        id, project_id: projectId, title: form.title.trim(),
        vulnerability_id: form.vulnerability_id.trim() || '',
        action: form.action.trim() || '', assigned_to: form.assigned_to.trim() || '',
        due_date: form.due_date || '', completed: 0,
      };
      setItems(prev => [...prev, item].sort((a, b) => a.completed - b.completed || a.due_date.localeCompare(b.due_date)));
      setForm({ title: '', vulnerability_id: '', action: '', assigned_to: '', due_date: '' });
      setShowForm(false);
    } catch (e) { console.error('[RemediationTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM remediation_tracker WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[RemediationTracker] delete failed:', e); }
  };

  const handleToggle = async (id: string, current: number) => {
    const next = current ? 0 : 1;
    try {
      const db = await getDb();
      await db.execute('UPDATE remediation_tracker SET completed = ? WHERE id = ?', [next, id]);
      setItems(prev => prev.map(i => i.id === id ? { ...i, completed: next } : i));
    } catch (e) { console.error('[RemediationTracker] toggle failed:', e); }
  };

  const isOverdue = (item: Remediation) => {
    if (item.completed || !item.due_date) return false;
    return new Date(item.due_date) < new Date(new Date().toISOString().split('T')[0]);
  };

  const completedCount = items.filter(i => i.completed).length;
  const overdueCount = items.filter(i => isOverdue(i)).length;

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Remediation</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Remediation ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Action
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Action title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Vulnerability ID" value={form.vulnerability_id} onChange={(e) => setForm({ ...form, vulnerability_id: e.target.value })} className={inputClass} />
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputClass} />
          </div>
          <textarea placeholder="Action details" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <input type="text" placeholder="Assigned to" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>Add</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No remediation actions yet.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className={`flex items-center justify-between px-3 py-2 rounded-[6px] text-xs ${isOverdue(item) ? 'bg-[#991B1B]/10 border border-[#DC2626]/30' : 'bg-[var(--bg-secondary)]'}`}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button onClick={() => handleToggle(item.id, item.completed)} className={`flex-shrink-0 ${item.completed ? 'text-[#16A34A]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>
                  {item.completed ? <CheckSquare size={14} /> : <Square size={14} />}
                </button>
                <span className={`font-medium truncate ${item.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                  {item.title}
                </span>
                {item.assigned_to && <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{item.assigned_to}</span>}
                {item.due_date && (
                  <span className={`text-[10px] flex-shrink-0 ${isOverdue(item) ? 'text-[#DC2626] font-medium' : 'text-[var(--text-tertiary)]'}`}>
                    {isOverdue(item) && <AlertTriangle size={10} className="inline mr-0.5 text-[#DC2626]" />}
                    {item.due_date}
                  </span>
                )}
              </div>
              <button
                aria-label="Delete remediation tracker"
                onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-3 px-3 py-1.5 mt-1 text-[10px] text-[var(--text-tertiary)]">
            <span>{completedCount} completed</span>
            {overdueCount > 0 && <span className="text-[#DC2626]">{overdueCount} overdue</span>}
          </div>
        </div>
      )}
    </div>
  );
}
