/**
 * Journey Map Builder — customer journey stages with priority badges.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type JourneyItem = {
  id: string;
  project_id: string;
  stage?: string;
  touchpoint?: string;
  pain_point?: string;
  opportunity?: string;
  priority?: string;
};

const PRIORITIES = ['low', 'medium', 'high'];
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-[#2ECC71]/20 text-[#2ECC71]',
  medium: 'bg-[#E67E22]/20 text-[#E67E22]',
  high: 'bg-[#E74C3C]/20 text-[#E74C3C]',
};

export default function JourneyMapBuilder({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<JourneyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ stage: '', touchpoint: '', pain_point: '', opportunity: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(JourneyItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, stage, touchpoint, pain_point, opportunity, priority FROM journey_maps WHERE project_id = ? ORDER BY id ASC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        stage: r.stage as string | undefined,
        touchpoint: r.touchpoint as string | undefined,
        pain_point: r.pain_point as string | undefined,
        opportunity: r.opportunity as string | undefined,
        priority: r.priority as string | undefined,
      })));
    } catch (e) { console.error('[JourneyMapBuilder] load failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [projectId]);

  const handleSave = async () => {
    if (!form.stage.trim() && !form.touchpoint.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO journey_maps (id, project_id, stage, touchpoint, pain_point, opportunity, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.stage.trim() || null, form.touchpoint.trim() || null, form.pain_point.trim() || null, form.opportunity.trim() || null, form.priority]
      );
      const item: JourneyItem = { id, project_id: projectId, stage: form.stage.trim() || undefined, touchpoint: form.touchpoint.trim() || undefined, pain_point: form.pain_point.trim() || undefined, opportunity: form.opportunity.trim() || undefined, priority: form.priority };
      setItems(prev => [...prev, item]);
      setForm({ stage: '', touchpoint: '', pain_point: '', opportunity: '', priority: 'medium' });
      setShowForm(false);
    } catch (e) { console.error('[JourneyMapBuilder] save failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM journey_maps WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[JourneyMapBuilder] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Journey Map</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Journey Map ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Stage
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Stage (e.g. Awareness)" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className={inputClass} autoFocus />
          <input type="text" placeholder="Touchpoint" value={form.touchpoint} onChange={(e) => setForm({ ...form, touchpoint: e.target.value })} className={inputClass} />
          <input type="text" placeholder="Pain point" value={form.pain_point} onChange={(e) => setForm({ ...form, pain_point: e.target.value })} className={inputClass} />
          <input type="text" placeholder="Opportunity" value={form.opportunity} onChange={(e) => setForm({ ...form, opportunity: e.target.value })} className={inputClass} />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.stage.trim() && !form.touchpoint.trim()}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No journey stages yet. Add your first stage.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={item.id} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-tertiary)] font-medium w-5">{i + 1}</span>
                  <span className="font-medium text-[var(--text-primary)]">{item.stage || item.touchpoint || '—'}</span>
                  {item.priority && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority] || ''}`}>{item.priority}</span>
                  )}
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
              {item.touchpoint && item.stage && <div className="text-[10px] text-[var(--text-tertiary)]">Touchpoint: {item.touchpoint}</div>}
              {item.pain_point && <div className="text-[10px] text-[var(--text-tertiary)]">Pain: {item.pain_point}</div>}
              {item.opportunity && <div className="text-[10px] text-[var(--text-tertiary)]">Opportunity: {item.opportunity}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
