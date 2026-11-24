/**
 * Metric Snapshot · metric tracking with performance vs target display.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type MetricItem = {
  id: string;
  project_id: string;
  metric?: string;
  value: number;
  target: number;
  date?: string;
};

export default function MetricSnapshot({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<MetricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ metric: '', value: '', target: '', date: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(MetricItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, metric, value, target, date FROM metric_snapshots WHERE project_id = ? ORDER BY metric ASC, date DESC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        metric: r.metric as string | undefined,
        value: (r.value as number) || 0,
        target: (r.target as number) || 0,
        date: r.date as string | undefined,
      })));
    } catch (e) { console.error('[MetricSnapshot] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const handleSave = async () => {
    if (!form.metric.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const value = form.value ? parseFloat(form.value) : 0;
      const target = form.target ? parseFloat(form.target) : 0;
      const db = await getDb();
      await db.execute(
        'INSERT INTO metric_snapshots (id, project_id, metric, value, target, date) VALUES (?, ?, ?, ?, ?, ?)',
        [id, projectId, form.metric.trim(), value, target, form.date || null]
      );
      const item: MetricItem = { id, project_id: projectId, metric: form.metric.trim(), value, target, date: form.date || undefined };
      setItems(prev => [...prev, item]);
      setForm({ metric: '', value: '', target: '', date: '' });
      setShowForm(false);
    } catch (e) { console.error('[MetricSnapshot] save failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM metric_snapshots WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[MetricSnapshot] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Metric Snapshots</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Metric Snapshots ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Metric
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input type="text" placeholder="Metric name" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className={inputClass} />
          </div>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.metric.trim()}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No metrics yet. Add your first metric.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const pct = item.target !== 0 ? (item.value / item.target) * 100 : 0;
            const onTarget = item.value >= item.target;
            return (
              <div key={item.id} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{item.metric}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${onTarget ? 'bg-[#2ECC71]/20 text-[#2ECC71]' : 'bg-[#E74C3C]/20 text-[#E74C3C]'}`}>
                      {onTarget ? 'On target' : 'Behind'}
                    </span>
                  </div>
                  <button
                    aria-label="Delete metric snapshot"
                    onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
                  <span>Value: <span className="font-medium text-[var(--text-primary)]">{item.value}</span></span>
                  <span>Target: {item.target}</span>
                  <span>{pct.toFixed(0)}% of target</span>
                  {item.date && <span>{item.date}</span>}
                </div>
                <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-colors ${onTarget ? 'bg-[#2ECC71]' : 'bg-[var(--accent)]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
