/**
 * Tax Deadline Calendar · Accountant feature.
 * List of tax deadlines sorted by due_date ascending. Overdue items in red.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Check, Circle, Calendar } from 'lucide-react';

type TaxDeadline = {
  id: string;
  client_id: string;
  title?: string;
  due_date?: string;
  tax_type?: string;
  amount: number;
  filed: boolean;
};

export default function TaxDeadlineCalendar({ clientId }: { clientId: string }) {
  const [deadlines, setDeadlines] = useState<TaxDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', due_date: '', tax_type: '', amount: '', filed: false });
  const [saving, setSaving] = useState(false);

  const loadDeadlines = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(TaxDeadline & Record<string, unknown>)[]>(
        'SELECT id, client_id, title, due_date, tax_type, amount, filed FROM tax_deadlines WHERE client_id = ? ORDER BY due_date ASC',
        [clientId]
      );
      setDeadlines(rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        title: r.title as string | undefined,
        due_date: r.due_date as string | undefined,
        tax_type: r.tax_type as string | undefined,
        amount: r.amount as number,
        filed: !!(r.filed),
      })));
    } catch (e) { console.error('[TaxDeadlineCalendar] load failed:', e); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadDeadlines(); }, [clientId, loadDeadlines]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO tax_deadlines (id, client_id, title, due_date, tax_type, amount, filed) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, clientId, form.title.trim(), form.due_date || null, form.tax_type.trim() || null, form.amount ? parseFloat(form.amount) : 0, form.filed ? 1 : 0]
      );
      const item: TaxDeadline = { id, client_id: clientId, title: form.title.trim(), due_date: form.due_date || undefined, tax_type: form.tax_type.trim() || undefined, amount: form.amount ? parseFloat(form.amount) : 0, filed: form.filed };
      setDeadlines(prev => {
        const next = [...prev, item];
        next.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
        return next;
      });
      setForm({ title: '', due_date: '', tax_type: '', amount: '', filed: false });
      setShowForm(false);
    } catch (e) { console.error('[TaxDeadlineCalendar] add failed:', e); }
    setSaving(false);
  };

  const handleToggleFiled = async (id: string, current: boolean) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE tax_deadlines SET filed = ? WHERE id = ?', [current ? 0 : 1, id]);
      setDeadlines(prev => prev.map(d => d.id === id ? { ...d, filed: !current } : d));
    } catch (e) { console.error('[TaxDeadlineCalendar] toggle failed:', e); }
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM tax_deadlines WHERE id = ?', [id]);
      setDeadlines(prev => prev.filter(d => d.id !== id));
    } catch (e) { console.error('[TaxDeadlineCalendar] delete failed:', e); }
  };

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = deadlines.filter(d => !d.filed && d.due_date && d.due_date < today).length;
  const pendingCount = deadlines.filter(d => !d.filed).length;

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Tax Deadlines</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Tax Deadlines ({deadlines.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Deadline
        </Button>
      </div>

      {deadlines.length > 0 && (
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Circle size={11} className="text-[var(--text-tertiary)]" />
            <span className="font-medium">{pendingCount}</span> pending
          </span>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-[#DC2626]">
              <Calendar size={11} />
              <span className="font-medium">{overdueCount}</span> overdue
            </span>
          )}
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Tax type" value={form.tax_type} onChange={(e) => setForm({ ...form, tax_type: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} />
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" checked={form.filed} onChange={(e) => setForm({ ...form, filed: e.target.checked })} className="accent-[var(--accent)]" />
              Filed
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>Save</Button>
          </div>
        </div>
      )}

      {deadlines.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No tax deadlines yet. Add your first deadline.</p>
      ) : (
        <div className="space-y-1">
          {deadlines.map((d) => {
            const isOverdue = !d.filed && d.due_date && d.due_date < today;
            return (
              <div key={d.id} className={`flex items-center justify-between px-3 py-2 rounded-[6px] text-xs ${isOverdue ? 'bg-[#DC2626]/10 border border-[#DC2626]/30' : 'bg-[var(--bg-secondary)]'}`}>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <button
                    onClick={() => handleToggleFiled(d.id, d.filed)}
                    className={`flex-shrink-0 p-0.5 rounded-full ${d.filed ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'}`}
                    title={d.filed ? 'Mark as unfiled' : 'Mark as filed'}
                  >
                    {d.filed ? <Check size={14} /> : <Circle size={14} />}
                  </button>
                  <span className={`font-medium truncate ${isOverdue ? 'text-[#DC2626]' : d.filed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                    {d.title || '--'}
                  </span>
                  {d.tax_type && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)] flex-shrink-0">{d.tax_type}</span>
                  )}
                  <span className="text-[var(--text-tertiary)] flex-shrink-0 ml-auto">${(d.amount || 0).toFixed(2)}</span>
                  <span className={`text-[10px] flex-shrink-0 ${isOverdue ? 'text-[#DC2626] font-medium' : 'text-[var(--text-tertiary)]'}`}>{d.due_date || '--'}</span>
                </div>
                <button onClick={() => handleDelete(d.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
