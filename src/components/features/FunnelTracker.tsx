/**
 * Funnel Tracker -- conversion funnels grouped by name with auto-calculated rate.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type FunnelItem = {
  id: string;
  project_id: string;
  name?: string;
  stage?: string;
  entries: number;
  conversions: number;
  rate: number;
  date?: string;
};

export default function FunnelTracker({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<FunnelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', stage: '', entries: '', conversions: '', date: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(FunnelItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, stage, entries, conversions, rate, date FROM funnels WHERE project_id = ? ORDER BY name ASC, stage ASC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        name: r.name as string | undefined,
        stage: r.stage as string | undefined,
        entries: (r.entries as number) || 0,
        conversions: (r.conversions as number) || 0,
        rate: (r.rate as number) || 0,
        date: r.date as string | undefined,
      })));
    } catch (e) { console.error('[FunnelTracker] load failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [projectId]);

  const funnelsByName = items.reduce((acc, item) => {
    const key = item.name || 'Unnamed';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, FunnelItem[]>);

  const handleSave = async () => {
    if (!form.name.trim() || !form.stage.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const entries = form.entries ? parseInt(form.entries) : 0;
      const conversions = form.conversions ? parseInt(form.conversions) : 0;
      const rate = entries > 0 ? (conversions / entries) * 100 : 0;
      const db = await getDb();
      await db.execute(
        'INSERT INTO funnels (id, project_id, name, stage, entries, conversions, rate, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.name.trim(), form.stage.trim(), entries, conversions, rate, form.date || null]
      );
      const item: FunnelItem = { id, project_id: projectId, name: form.name.trim(), stage: form.stage.trim(), entries, conversions, rate, date: form.date || undefined };
      setItems(prev => [...prev, item]);
      setForm({ name: '', stage: '', entries: '', conversions: '', date: '' });
      setShowForm(false);
    } catch (e) { console.error('[FunnelTracker] save failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM funnels WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[FunnelTracker] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Funnels</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Funnels ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Stage
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Funnel name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} autoFocus />
          <input type="text" placeholder="Stage (e.g. Landing → Trial → Purchase)" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Entries" value={form.entries} onChange={(e) => setForm({ ...form, entries: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Conversions" value={form.conversions} onChange={(e) => setForm({ ...form, conversions: e.target.value })} className={inputClass} />
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.name.trim() || !form.stage.trim()}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No funnels yet. Add your first funnel stage.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(funnelsByName).map(([funnelName, stages]) => (
            <div key={funnelName} className="space-y-1">
              <h5 className="text-[11px] font-semibold text-[var(--text-primary)] px-1">{funnelName}</h5>
              {stages.map((item, si) => (
                <div key={item.id} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text-tertiary)] font-medium">{si + 1}</span>
                      <span className="font-medium text-[var(--text-primary)]">{item.stage}</span>
                    </div>
                    <button onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
                    <span>{item.entries.toLocaleString()} entries</span>
                    <span>{item.conversions.toLocaleString()} conv</span>
                    <span className="font-medium text-[var(--text-primary)]">{item.rate.toFixed(1)}% rate</span>
                    {item.date && <span>{item.date}</span>}
                  </div>
                  <div className="w-full h-1 bg-[var(--border-color)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${Math.min(item.rate, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
