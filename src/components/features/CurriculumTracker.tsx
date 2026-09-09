/**
 * Curriculum Tracker · Tutor feature.
 * Ordered list of curriculum items with status badges and up/down reorder.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

type CurriculumItem = {
  id: string;
  project_id: string;
  title: string;
  item_order: number;
  status: string;
  notes?: string;
};

const STATUS_OPTIONS = ['planned', 'in_progress', 'completed'] as const;

const statusBadgeClasses: Record<string, string> = {
  planned: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB]',
  completed: 'bg-[#16A34A]/15 text-[#16A34A]',
};

export default function CurriculumTracker({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', status: 'planned', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(CurriculumItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, title, item_order, status, notes FROM curriculum_items WHERE project_id = ? ORDER BY item_order ASC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        title: r.title as string,
        item_order: r.item_order as number,
        status: r.status as string,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[CurriculumTracker] loadItems failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const maxOrder = items.reduce((max, i) => Math.max(max, i.item_order), -1) + 1;
      await db.execute(
        'INSERT INTO curriculum_items (id, project_id, title, item_order, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [id, projectId, form.title.trim(), maxOrder, form.status, form.notes || null]
      );
      const item: CurriculumItem = { id, project_id: projectId, title: form.title.trim(), item_order: maxOrder, status: form.status, notes: form.notes || undefined };
      setItems(prev => [...prev, item]);
      setForm({ title: '', status: 'planned', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[CurriculumTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM curriculum_items WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[CurriculumTracker] delete failed:', e); }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = items.findIndex(i => i.id === id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === items.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const a = items[idx];
    const b = items[swapIdx];
    try {
      const db = await getDb();
      await db.execute('UPDATE curriculum_items SET item_order = ? WHERE id = ?', [b.item_order, a.id]);
      await db.execute('UPDATE curriculum_items SET item_order = ? WHERE id = ?', [a.item_order, b.id]);
      const swapped = [...items];
      swapped[idx] = { ...a, item_order: b.item_order };
      swapped[swapIdx] = { ...b, item_order: a.item_order };
      swapped.sort((x, y) => x.item_order - y.item_order);
      setItems(swapped);
    } catch (e) { console.error('[CurriculumTracker] move failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Curriculum</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Curriculum ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Item
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Item title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>Add</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No curriculum items yet. Add your first topic.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[10px] text-[var(--text-tertiary)] w-4 flex-shrink-0">{idx + 1}.</span>
                <span className={`font-medium ${item.status === 'completed' ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'} truncate`}>
                  {item.title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[item.status] || statusBadgeClasses.planned}`}>
                  {item.status === 'in_progress' ? 'in progress' : item.status}
                </span>
                {item.notes && (
                  <span className="text-[var(--text-tertiary)] truncate">{item.notes}</span>
                )}
              </div>
              <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                <button onClick={() => handleMove(item.id, 'up')} disabled={idx === 0} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30">
                  <ChevronUp size={12} />
                </button>
                <button onClick={() => handleMove(item.id, 'down')} disabled={idx === items.length - 1} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30">
                  <ChevronDown size={12} />
                </button>
                <button onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
