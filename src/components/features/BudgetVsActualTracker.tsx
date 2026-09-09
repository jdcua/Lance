/**
 * Budget vs Actual Tracker · category-based budget comparison with variance display.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type BudgetItem = {
  id: string;
  project_id: string;
  category?: string;
  budgeted: number;
  actual: number;
  notes?: string;
};

export default function BudgetVsActualTracker({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', budgeted: '', actual: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(BudgetItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, category, budgeted, actual, notes FROM budget_vs_actual WHERE project_id = ? ORDER BY category ASC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        category: r.category as string | undefined,
        budgeted: (r.budgeted as number) || 0,
        actual: (r.actual as number) || 0,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[BudgetVsActualTracker] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const totalBudgeted = items.reduce((sum, i) => sum + i.budgeted, 0);
  const totalActual = items.reduce((sum, i) => sum + i.actual, 0);
  const totalVariance = totalActual - totalBudgeted;

  const handleSave = async () => {
    if (!form.category.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const budgeted = form.budgeted ? parseFloat(form.budgeted) : 0;
      const actual = form.actual ? parseFloat(form.actual) : 0;
      const db = await getDb();
      await db.execute(
        'INSERT INTO budget_vs_actual (id, project_id, category, budgeted, actual, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [id, projectId, form.category.trim(), budgeted, actual, form.notes.trim() || null]
      );
      const item: BudgetItem = { id, project_id: projectId, category: form.category.trim(), budgeted, actual, notes: form.notes.trim() || undefined };
      setItems(prev => [...prev, item]);
      setForm({ category: '', budgeted: '', actual: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[BudgetVsActualTracker] save failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM budget_vs_actual WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[BudgetVsActualTracker] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Budget vs Actual</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Budget vs Actual ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Category
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
          <span>Budgeted: <span className="font-medium text-[var(--text-primary)]">${totalBudgeted.toLocaleString()}</span></span>
          <span>Actual: <span className="font-medium text-[var(--text-primary)]">${totalActual.toLocaleString()}</span></span>
          <span className={`font-medium ${totalVariance >= 0 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}`}>
            Variance: {totalVariance >= 0 ? '+' : ''}${totalVariance.toLocaleString()}
          </span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Category name" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Budgeted ($)" value={form.budgeted} onChange={(e) => setForm({ ...form, budgeted: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Actual ($)" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.category.trim()}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No budget categories yet. Add your first category.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const variance = item.actual - item.budgeted;
            const under = variance <= 0;
            return (
              <div key={item.id} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{item.category}</span>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                  <span>Budgeted: ${item.budgeted.toLocaleString()}</span>
                  <span>Actual: ${item.actual.toLocaleString()}</span>
                  <span className={`font-medium ${under ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                    {variance >= 0 ? '+' : ''}{variance.toLocaleString()}
                  </span>
                </div>
                {item.notes && <div className="text-[10px] text-[var(--text-tertiary)] italic">{item.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
