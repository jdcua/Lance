/**
 * Software Subscription Tracker · 3D Artist / General finance feature.
 * Lists expenses with category "Software" from the expenses table.
 * Shows monthly total and an inline expense form.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, DollarSign, Calendar } from 'lucide-react';

type Expense = {
  id: string;
  user_id?: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  recurring?: number;
  frequency?: string;
};

export default function SoftwareSubscriptionTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', date: '', recurring: false });
  const [saving, setSaving] = useState(false);

  const loadExpenses = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Expense & Record<string, unknown>)[]>(
        "SELECT id, user_id, category, description, amount, date, recurring, frequency FROM expenses WHERE category = 'Software' ORDER BY date DESC"
      );
      setExpenses(rows.map(r => ({
        id: r.id as string,
        user_id: r.user_id as number | undefined,
        category: r.category as string,
        description: r.description as string,
        amount: r.amount as number,
        date: r.date as string,
        recurring: r.recurring as number | undefined,
        frequency: r.frequency as string | undefined,
      })));
    } catch (e) { console.error('[SoftwareSubscriptionTracker] loadExpenses failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadExpenses(); }, []);

  const handleAdd = async () => {
    if (!form.description.trim() || !form.amount.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO expenses (id, user_id, category, description, amount, date, recurring, frequency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, 1, 'Software', form.description.trim(), parseFloat(form.amount), form.date || new Date().toISOString().split('T')[0], form.recurring ? 1 : 0, 'monthly']
      );
      const exp: Expense = {
        id,
        user_id: 1,
        category: 'Software',
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        date: form.date || new Date().toISOString().split('T')[0],
        recurring: form.recurring ? 1 : 0,
        frequency: 'monthly',
      };
      setExpenses(prev => [exp, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setForm({ description: '', amount: '', date: '', recurring: false });
      setShowForm(false);
    } catch (e) { console.error('[SoftwareSubscriptionTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM expenses WHERE id = ?', [id]);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error('[SoftwareSubscriptionTracker] delete failed:', e); }
  };

  const monthlyTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const recurringTotal = expenses.filter(e => e.recurring).reduce((sum, e) => sum + e.amount, 0);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Software Subscriptions</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Software Subscriptions ({expenses.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Expense
        </Button>
      </div>

      {expenses.length > 0 && (
        <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-sm flex items-center gap-4 text-xs">
          <span className="text-[var(--text-tertiary)]">
            <DollarSign size={10} className="inline mr-0.5" />
            Monthly: <span className="font-medium text-[var(--text-primary)]">${monthlyTotal.toFixed(2)}</span>
          </span>
          {recurringTotal > 0 && (
            <span className="text-[var(--text-tertiary)]">
              Recurring: <span className="font-medium text-[var(--accent-ink,var(--accent))]">${recurringTotal.toFixed(2)}</span>
            </span>
          )}
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Software name"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Amount"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            Recurring monthly
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.description.trim() || !form.amount.trim()}>Add</Button>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No software subscription expenses yet. Add your first one.</p>
      ) : (
        <div className="space-y-1">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">{e.description}</span>
                <span className="text-[var(--accent-ink,var(--accent))] font-medium">${e.amount.toFixed(2)}</span>
                {e.recurring ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent-ink,var(--accent))]">recurring</span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">one-time</span>
                )}
                <span className="text-[var(--text-tertiary)] flex items-center gap-0.5">
                  <Calendar size={9} />
                  {e.date}
                </span>
              </div>
              <button
                aria-label="Delete software subscription tracker"
                onClick={() => handleDelete(e.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
