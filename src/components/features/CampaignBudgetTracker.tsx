/**
 * Campaign Budget Tracker — tracks campaign budgets with spend progress visualization.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type CampaignBudget = {
  id: string;
  project_id: string;
  name: string;
  budget: number;
  spent: number;
  start_date?: string;
  end_date?: string;
  status?: string;
};

const STATUSES = ['planned', 'active', 'completed', 'paused'];

export default function CampaignBudgetTracker({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<CampaignBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', budget: '', spent: '', start_date: '', end_date: '', status: 'planned' });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(CampaignBudget & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, budget, spent, start_date, end_date, status FROM campaign_budgets WHERE project_id = ? ORDER BY id DESC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        name: r.name as string,
        budget: (r.budget as number) || 0,
        spent: (r.spent as number) || 0,
        start_date: r.start_date as string | undefined,
        end_date: r.end_date as string | undefined,
        status: r.status as string | undefined,
      })));
    } catch (e) { console.error('[CampaignBudgetTracker] load failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [projectId]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO campaign_budgets (id, project_id, name, budget, spent, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.name.trim(), form.budget ? parseFloat(form.budget) : 0, form.spent ? parseFloat(form.spent) : 0, form.start_date || null, form.end_date || null, form.status]
      );
      const item: CampaignBudget = { id, project_id: projectId, name: form.name.trim(), budget: form.budget ? parseFloat(form.budget) : 0, spent: form.spent ? parseFloat(form.spent) : 0, start_date: form.start_date || undefined, end_date: form.end_date || undefined, status: form.status };
      setItems(prev => [item, ...prev]);
      setForm({ name: '', budget: '', spent: '', start_date: '', end_date: '', status: 'planned' });
      setShowForm(false);
    } catch (e) { console.error('[CampaignBudgetTracker] save failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM campaign_budgets WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[CampaignBudgetTracker] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Campaign Budgets</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Campaign Budgets ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Budget
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Budget ($)" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Spent ($)" value={form.spent} onChange={(e) => setForm({ ...form, spent: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
          </div>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No campaign budgets yet. Add your first budget.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const pct = item.budget > 0 ? Math.min((item.spent / item.budget) * 100, 100) : 0;
            const overBudget = item.spent > item.budget;
            return (
              <div key={item.id} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                    {item.status && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">{item.status}</span>}
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                  <span>${item.spent.toLocaleString()} / ${item.budget.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${overBudget ? 'bg-[#E74C3C]' : 'bg-[var(--accent)]'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                  {item.start_date && <span>{item.start_date}{item.end_date && ` → ${item.end_date}`}</span>}
                  <span>{pct.toFixed(0)}% spent</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
