/**
 * Impact Measurement · KPI tracking with baseline, target, actual, and variance display.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type ImpactItem = {
  id: string;
  project_id: string;
  metric_name?: string;
  baseline: number;
  target: number;
  actual: number;
  date?: string;
};

export default function ImpactMeasurement({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ImpactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ metric_name: '', baseline: '', target: '', actual: '', date: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ImpactItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, metric_name, baseline, target, actual, date FROM impact_measurements WHERE project_id = ? ORDER BY date DESC, id DESC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        metric_name: r.metric_name as string | undefined,
        baseline: (r.baseline as number) || 0,
        target: (r.target as number) || 0,
        actual: (r.actual as number) || 0,
        date: r.date as string | undefined,
      })));
    } catch (e) { console.error('[ImpactMeasurement] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const handleSave = async () => {
    if (!form.metric_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const baseline = form.baseline ? parseFloat(form.baseline) : 0;
      const target = form.target ? parseFloat(form.target) : 0;
      const actual = form.actual ? parseFloat(form.actual) : 0;
      const db = await getDb();
      await db.execute(
        'INSERT INTO impact_measurements (id, project_id, metric_name, baseline, target, actual, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.metric_name.trim(), baseline, target, actual, form.date || null]
      );
      const item: ImpactItem = { id, project_id: projectId, metric_name: form.metric_name.trim(), baseline, target, actual, date: form.date || undefined };
      setItems(prev => [item, ...prev]);
      setForm({ metric_name: '', baseline: '', target: '', actual: '', date: '' });
      setShowForm(false);
    } catch (e) { console.error('[ImpactMeasurement] save failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM impact_measurements WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[ImpactMeasurement] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Impact</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Impact Measurement ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Metric
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Metric name" value={form.metric_name} onChange={(e) => setForm({ ...form, metric_name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Baseline" value={form.baseline} onChange={(e) => setForm({ ...form, baseline: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Actual" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} className={inputClass} />
          </div>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.metric_name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No metrics yet. Add your first measurement.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const variance = item.actual - item.target;
            const pctFromBaseline = item.baseline !== 0 ? ((item.actual - item.baseline) / Math.abs(item.baseline)) * 100 : 0;
            const hitTarget = item.target !== 0 ? item.actual >= item.target : false;
            return (
              <div key={item.id} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{item.metric_name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${hitTarget ? 'bg-[#2ECC71]/20 text-[#2ECC71]' : 'bg-[#E74C3C]/20 text-[#E74C3C]'}`}>
                      {hitTarget ? 'On target' : 'Below target'}
                    </span>
                  </div>
                  <button
                    aria-label="Delete impact measurement"
                    onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                  <span>Baseline: {item.baseline}</span>
                  <span>Target: {item.target}</span>
                  <span>Actual: <span className={`font-medium ${hitTarget ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>{item.actual}</span></span>
                  <span className={`font-medium ${variance >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                    {variance >= 0 ? '+' : ''}{variance.toFixed(1)} vs target
                  </span>
                </div>
                {item.baseline !== 0 && (
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    {pctFromBaseline >= 0 ? '+' : ''}{pctFromBaseline.toFixed(1)}% from baseline
                    {item.date && <span className="ml-2">{item.date}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
