/**
 * Spend Pacing · budget pacing tracker with auto-calculated variance and progress bar.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type PacingItem = {
  id: string;
  project_id: string;
  period?: string;
  budget: number;
  actual: number;
  variance: number;
};

export default function SpendPacing({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<PacingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ period: '', budget: '', actual: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(PacingItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, period, budget, actual, variance FROM spend_pacing WHERE project_id = ? ORDER BY period DESC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        period: r.period as string | undefined,
        budget: (r.budget as number) || 0,
        actual: (r.actual as number) || 0,
        variance: (r.variance as number) || 0,
      })));
    } catch (e) { console.error('[SpendPacing] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const handleSave = async () => {
    if (!form.period.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const budget = form.budget ? parseFloat(form.budget) : 0;
      const actual = form.actual ? parseFloat(form.actual) : 0;
      const variance = actual - budget;
      const db = await getDb();
      await db.execute(
        'INSERT INTO spend_pacing (id, project_id, period, budget, actual, variance) VALUES (?, ?, ?, ?, ?, ?)',
        [id, projectId, form.period.trim(), budget, actual, variance]
      );
      const item: PacingItem = { id, project_id: projectId, period: form.period.trim(), budget, actual, variance };
      setItems(prev => [item, ...prev]);
      setForm({ period: '', budget: '', actual: '' });
      setShowForm(false);
    } catch (e) { console.error('[SpendPacing] save failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM spend_pacing WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[SpendPacing] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Spend Pacing</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Spend Pacing ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Period
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Period (e.g. Q1 2025)" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Budget ($)" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Actual spend ($)" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.period.trim()}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No pacing data yet. Add your first period.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const pct = item.budget > 0 ? Math.min((item.actual / item.budget) * 100, 100) : 0;
            const over = item.actual > item.budget;
            const varianceSign = item.variance >= 0 ? '+' : '';
            return (
              <div key={item.id} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{item.period}</span>
                    <span className={`text-[10px] font-medium ${over ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}`}>
                      {varianceSign}${item.variance.toLocaleString()}
                    </span>
                  </div>
                  <button
                    aria-label="Delete spend pacing"
                    onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                  <span>${item.actual.toLocaleString()} / ${item.budget.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-colors ${over ? 'bg-[#E74C3C]' : 'bg-[var(--accent)]'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
