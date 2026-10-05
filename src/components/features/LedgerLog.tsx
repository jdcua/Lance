/**
 * Ledger Log · Accountant feature.
 * Income/expense list with summary (total income - total expenses = net).
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

type Entry = {
  id: string;
  project_id: string;
  description?: string;
  amount: number;
  entry_type: string;
  date?: string;
  category?: string;
};

const ENTRY_TYPES = ['income', 'expense'] as const;

export default function LedgerLog({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', entry_type: 'expense', date: new Date().toISOString().split('T')[0], category: '' });
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Entry & Record<string, unknown>)[]>(
        'SELECT id, project_id, description, amount, entry_type, date, category FROM ledger_entries WHERE project_id = ? ORDER BY date DESC, id DESC',
        [projectId]
      );
      setEntries(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        description: r.description as string | undefined,
        amount: r.amount as number,
        entry_type: r.entry_type as string,
        date: r.date as string | undefined,
        category: r.category as string | undefined,
      })));
    } catch (e) { console.error('[LedgerLog] loadEntries failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadEntries(); }, [projectId, loadEntries]);

  const handleAdd = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const amount = form.amount ? parseFloat(form.amount) : 0;
      await db.execute(
        'INSERT INTO ledger_entries (id, project_id, description, amount, entry_type, date, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.description.trim(), amount, form.entry_type, form.date || null, form.category.trim() || null]
      );
      const entry: Entry = { id, project_id: projectId, description: form.description.trim(), amount, entry_type: form.entry_type, date: form.date || undefined, category: form.category.trim() || undefined };
      setEntries(prev => [entry, ...prev].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      setForm({ description: '', amount: '', entry_type: 'expense', date: new Date().toISOString().split('T')[0], category: '' });
      setShowForm(false);
    } catch (e) { console.error('[LedgerLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM ledger_entries WHERE id = ?', [id]);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error('[LedgerLog] delete failed:', e); }
  };

  const totalIncome = entries.filter(e => e.entry_type === 'income').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalExpenses = entries.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + (e.amount || 0), 0);
  const net = totalIncome - totalExpenses;

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Ledger</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Ledger ({entries.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Entry
        </Button>
      </div>

      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <span className="text-[var(--text-tertiary)] flex items-center gap-1">
              <TrendingUp size={10} /> Income
            </span>
            <span className="font-medium text-[#16A34A]">${totalIncome.toFixed(2)}</span>
          </div>
          <div className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <span className="text-[var(--text-tertiary)] flex items-center gap-1">
              <TrendingDown size={10} /> Expenses
            </span>
            <span className="font-medium text-[#DC2626]">${totalExpenses.toFixed(2)}</span>
          </div>
          <div className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <span className="text-[var(--text-tertiary)] flex items-center gap-1">
              <DollarSign size={10} /> Net
            </span>
            <span className={`font-medium ${net >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>${net.toFixed(2)}</span>
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} />
            <select value={form.entry_type} onChange={(e) => setForm({ ...form, entry_type: e.target.value })} className={inputClass}>
              {ENTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.description.trim()}>Save</Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No ledger entries yet. Add your first entry.</p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className={`font-medium ${entry.entry_type === 'income' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {entry.entry_type === 'income' ? '+' : '-'}${(entry.amount || 0).toFixed(2)}
                </span>
                <span className="text-[var(--text-primary)] truncate">{entry.description || '--'}</span>
                {entry.category && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)] flex-shrink-0">{entry.category}</span>
                )}
                {entry.date && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-auto">{entry.date}</span>
                )}
              </div>
              <button
                aria-label="Delete ledger log"
                onClick={() => handleDelete(entry.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
