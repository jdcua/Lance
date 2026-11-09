/**
 * Handoff Checklist · UX Designer feature.
 * Checklist with auto-populated defaults, progress bar, and toggleable completion.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Check, Circle } from 'lucide-react';

type HandoffItem = {
  id: string;
  project_id: string;
  item: string;
  completed: boolean;
  sort_order: number;
};

const DEFAULT_ITEMS = [
  'Components documented',
  'Annotations complete',
  'Assets exported',
  'Specs written',
  'Dev QA session scheduled',
  'Redlines added',
];

export default function HandoffChecklist({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<HandoffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(HandoffItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, item, completed, sort_order FROM handoff_items WHERE project_id = ? ORDER BY sort_order ASC, id ASC',
        [projectId]
      );
      const loaded = rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        item: r.item as string,
        completed: !!(r.completed),
        sort_order: (r.sort_order as number) || 0,
      }));

      if (loaded.length === 0) {
        const created: HandoffItem[] = [];
        for (let i = 0; i < DEFAULT_ITEMS.length; i++) {
          const id = crypto.randomUUID();
          await db.execute(
            'INSERT INTO handoff_items (id, project_id, item, completed, sort_order) VALUES (?, ?, ?, ?, ?)',
            [id, projectId, DEFAULT_ITEMS[i], 0, i]
          );
          created.push({ id, project_id: projectId, item: DEFAULT_ITEMS[i], completed: false, sort_order: i });
        }
        setItems(created);
      } else {
        setItems(loaded);
      }
    } catch (e) { console.error('[HandoffChecklist] loadItems failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 1 : 0;
      const db = await getDb();
      await db.execute(
        'INSERT INTO handoff_items (id, project_id, item, completed, sort_order) VALUES (?, ?, ?, ?, ?)',
        [id, projectId, newItem.trim(), 0, nextOrder]
      );
      const item: HandoffItem = { id, project_id: projectId, item: newItem.trim(), completed: false, sort_order: nextOrder };
      setItems(prev => [...prev, item]);
      setNewItem('');
      setShowForm(false);
    } catch (e) { console.error('[HandoffChecklist] add failed:', e); }
    setSaving(false);
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE handoff_items SET completed = ? WHERE id = ?', [current ? 0 : 1, id]);
      setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !current } : i));
    } catch (e) { console.error('[HandoffChecklist] toggle failed:', e); }
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM handoff_items WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[HandoffChecklist] delete failed:', e); }
  };

  const completed = items.filter(i => i.completed).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Default items are those with sort_order < DEFAULT_ITEMS.length (created during auto-populate)
  const defaultIds = new Set(items.filter(i => i.sort_order < DEFAULT_ITEMS.length).map(i => i.id));
  const isDefault = (item: HandoffItem) => defaultIds.has(item.id);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Handoff Checklist</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Handoff ({completed}/{total})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Item
        </Button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex h-2 rounded-full overflow-hidden bg-[var(--border-color)]">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-colors duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] text-right">{percent}% complete</p>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Custom checklist item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            className={inputClass}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!newItem.trim()}>Add</Button>
          </div>
        </div>
      )}

      {/* Checklist */}
      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No handoff items yet. Add your first checklist item.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
              <button
                onClick={() => handleToggle(item.id, item.completed)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                {item.completed ? (
                  <Check size={14} className="text-[#16A34A] flex-shrink-0" />
                ) : (
                  <Circle size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
                )}
                <span className={`${item.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'} truncate`}>
                  {item.item}
                </span>
              </button>
              {!isDefault(item) && (
                <button
                  aria-label="Delete handoff checklist"
                  onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
