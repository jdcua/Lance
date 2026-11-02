/**
 * Run of Show Builder · ordered event timeline with up/down reorder.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

type RunOfShowItem = {
  id: string;
  project_id: string;
  time_slot?: string;
  activity?: string;
  owner?: string;
  duration_min: number;
  notes?: string;
  sort_order: number;
};

export default function RunOfShowBuilder({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<RunOfShowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ time_slot: '', activity: '', owner: '', duration_min: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(RunOfShowItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, time_slot, activity, owner, duration_min, notes, sort_order FROM run_of_show WHERE project_id = ? ORDER BY sort_order ASC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        time_slot: r.time_slot as string | undefined,
        activity: r.activity as string | undefined,
        owner: r.owner as string | undefined,
        duration_min: (r.duration_min as number) || 0,
        notes: r.notes as string | undefined,
        sort_order: r.sort_order as number,
      })));
    } catch (e) { console.error('[RunOfShowBuilder] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const handleSave = async () => {
    if (!form.activity.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const maxSort = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) : -1;
      const sortOrder = maxSort + 1;
      const db = await getDb();
      await db.execute(
        'INSERT INTO run_of_show (id, project_id, time_slot, activity, owner, duration_min, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.time_slot.trim() || null, form.activity.trim(), form.owner.trim() || null, form.duration_min ? parseInt(form.duration_min) : 0, form.notes.trim() || null, sortOrder]
      );
      const item: RunOfShowItem = { id, project_id: projectId, time_slot: form.time_slot.trim() || undefined, activity: form.activity.trim(), owner: form.owner.trim() || undefined, duration_min: form.duration_min ? parseInt(form.duration_min) : 0, notes: form.notes.trim() || undefined, sort_order: sortOrder };
      setItems(prev => [...prev, item]);
      setForm({ time_slot: '', activity: '', owner: '', duration_min: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[RunOfShowBuilder] save failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM run_of_show WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[RunOfShowBuilder] delete failed:', e); }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const a = items[idx];
    const b = items[swapIdx];
    try {
      const db = await getDb();
      await db.execute('UPDATE run_of_show SET sort_order = ? WHERE id = ?', [b.sort_order, a.id]);
      await db.execute('UPDATE run_of_show SET sort_order = ? WHERE id = ?', [a.sort_order, b.id]);
      setItems(prev => {
        const updated = prev.map(i => {
          if (i.id === a.id) return { ...i, sort_order: b.sort_order };
          if (i.id === b.id) return { ...i, sort_order: a.sort_order };
          return i;
        });
        return updated.sort((x, y) => x.sort_order - y.sort_order);
      });
    } catch (e) { console.error('[RunOfShowBuilder] move failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  const totalDuration = items.reduce((sum, i) => sum + i.duration_min, 0);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Run of Show</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Run of Show ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Item
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Activity" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Time slot (e.g. 9:00 AM)" value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Duration (min)" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} className={inputClass} />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.activity.trim()}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No items yet. Build your run of show.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-tertiary)] font-medium w-8 text-right">{item.time_slot || '--'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)]">{item.activity}</div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                    {item.owner && <span>{item.owner}</span>}
                    {item.duration_min > 0 && <span>{item.duration_min}min</span>}
                    {item.notes && <span className="italic">{item.notes}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                <button
                  aria-label="Move up"
                  onClick={() => handleMove(item.id, 'up')} disabled={i === 0} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30">
                  <ChevronUp size={12} />
                </button>
                <button
                  aria-label="Move down"
                  onClick={() => handleMove(item.id, 'down')} disabled={i === items.length - 1} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30">
                  <ChevronDown size={12} />
                </button>
                <button
                  aria-label="Delete run of show builder"
                  onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-1">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {totalDuration > 0 && (
            <div className="px-3 py-1.5 text-[10px] text-[var(--text-tertiary)]">
              Total duration: {totalDuration} min ({Math.floor(totalDuration / 60)}h {totalDuration % 60}m)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
