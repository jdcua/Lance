/**
 * Component Count · UX Designer feature.
 * Simple list of components with counts, inline editing, and total.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Edit3, Check, X, Box } from 'lucide-react';

type ComponentCount = {
  id: string;
  project_id: string;
  component_name: string;
  count: number;
};

export default function ComponentCounts({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ComponentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ component_name: '', count: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ComponentCount & Record<string, unknown>)[]>(
        'SELECT id, project_id, component_name, count FROM component_counts WHERE project_id = ? ORDER BY component_name ASC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        component_name: r.component_name as string,
        count: (r.count as number) || 0,
      })));
    } catch (e) { console.error('[ComponentCounts] loadItems failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const handleAdd = async () => {
    if (!form.component_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const count = parseInt(form.count, 10) || 0;
      const db = await getDb();
      await db.execute(
        'INSERT INTO component_counts (id, project_id, component_name, count) VALUES (?, ?, ?, ?)',
        [id, projectId, form.component_name.trim(), count]
      );
      const item: ComponentCount = { id, project_id: projectId, component_name: form.component_name.trim(), count };
      setItems(prev => [...prev, item].sort((a, b) => a.component_name.localeCompare(b.component_name)));
      setForm({ component_name: '', count: '' });
      setShowForm(false);
    } catch (e) { console.error('[ComponentCounts] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM component_counts WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[ComponentCounts] delete failed:', e); }
  };

  const startEdit = (item: ComponentCount) => {
    setEditingId(item.id);
    setEditValue(String(item.count));
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    const count = parseInt(editValue, 10);
    if (isNaN(count) || count < 0) return;
    try {
      const db = await getDb();
      await db.execute('UPDATE component_counts SET count = ? WHERE id = ?', [count, editingId]);
      setItems(prev => prev.map(i => i.id === editingId ? { ...i, count } : i));
    } catch (e) { console.error('[ComponentCounts] update failed:', e); }
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const totalComponents = items.reduce((s, i) => s + (i.count || 0), 0);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Component Count</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Components ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Component
        </Button>
      </div>

      {/* Total */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--accent)]/10 rounded-xs text-xs">
          <Box size={14} className="text-[var(--accent-ink,var(--accent))]" />
          <span className="text-[var(--text-primary)] font-medium">Total components:</span>
          <span className="text-[var(--accent-ink,var(--accent))] font-semibold">{totalComponents}</span>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Component name"
              value={form.component_name}
              onChange={(e) => setForm({ ...form, component_name: e.target.value })}
              className={inputClass + ' flex-1'}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            />
            <input
              type="number"
              placeholder="Count"
              value={form.count}
              onChange={(e) => setForm({ ...form, count: e.target.value })}
              className={inputClass + ' w-[80px]'}
              min="0"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.component_name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No components yet. Start tracking your components.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Box size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="text-[var(--text-primary)] truncate">{item.component_name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {editingId === item.id ? (
                  <>
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className={inputClass + ' w-[60px] text-center'}
                      min="0"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    />
                    <button
                      aria-label="Confirm component count"
                      onClick={handleSaveEdit} className="text-[#16A34A] hover:text-[#15803D]">
                      <Check size={12} />
                    </button>
                    <button
                      aria-label="Close"
                      onClick={cancelEdit} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-[var(--text-primary)] min-w-[24px] text-right">{item.count}</span>
                    <button
                      aria-label="Edit component count"
                      onClick={() => startEdit(item)} className="text-[var(--text-tertiary)] hover:text-[var(--accent-ink,var(--accent))]">
                      <Edit3 size={11} />
                    </button>
                    <button
                      aria-label="Delete component count"
                      onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
