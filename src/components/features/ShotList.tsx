/**
 * Shot List · Filmmaker feature.
 * Tracks project shots with status, scene, inline editing, and reordering.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

type Shot = { id: string; project_id: string; scene?: string; description?: string; status: string; sort_order: number };

const STATUSES = ['planned', 'shot', 'cut', 'delivered'];
const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-[#3498DB]/20 text-[#3498DB]',
  shot: 'bg-[#E67E22]/20 text-[#E67E22]',
  cut: 'bg-[#9B59B6]/20 text-[#9B59B6]',
  delivered: 'bg-[#2ECC71]/20 text-[#2ECC71]',
};

export default function ShotList({ projectId }: { projectId: string }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ scene: '', description: '', status: 'planned' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ description?: string; status?: string }>({});

  const loadShots = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Shot & Record<string, unknown>)[]>('SELECT id, project_id, scene, description, status, sort_order FROM shots WHERE project_id = ? ORDER BY sort_order ASC', [projectId]);
      setShots(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        scene: r.scene as string | undefined,
        description: r.description as string | undefined,
        status: r.status as string,
        sort_order: r.sort_order as number,
      })));
    } catch (e) { console.error('[ShotList] loadShots failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadShots(); }, [projectId, loadShots]);

  const handleSave = async () => {
    if (!form.scene.trim() && !form.description.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const maxSort = shots.length > 0 ? Math.max(...shots.map(s => s.sort_order)) : -1;
      const sortOrder = maxSort + 1;
      await db.execute(
        'INSERT INTO shots (id, project_id, scene, description, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [id, projectId, form.scene.trim() || null, form.description.trim() || null, form.status, sortOrder]
      );
      const item: Shot = { id, project_id: projectId, scene: form.scene.trim() || undefined, description: form.description.trim() || undefined, status: form.status, sort_order: sortOrder };
      setShots(prev => [...prev, item]);
      setForm({ scene: '', description: '', status: 'planned' });
      setShowForm(false);
    } catch (e) { console.error('[ShotList] addShot failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM shots WHERE id = ?', [id]);
      setShots(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error('[ShotList] deleteShot failed:', e); }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = shots.findIndex(s => s.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= shots.length) return;
    const a = shots[idx];
    const b = shots[swapIdx];
    const newSortA = b.sort_order;
    const newSortB = a.sort_order;
    try {
      const db = await getDb();
      await db.execute('UPDATE shots SET sort_order = ? WHERE id = ?', [newSortA, a.id]);
      await db.execute('UPDATE shots SET sort_order = ? WHERE id = ?', [newSortB, b.id]);
      setShots(prev => {
        const updated = prev.map(s => {
          if (s.id === a.id) return { ...s, sort_order: newSortA };
          if (s.id === b.id) return { ...s, sort_order: newSortB };
          return s;
        });
        return updated.sort((x, y) => x.sort_order - y.sort_order);
      });
    } catch (e) { console.error('[ShotList] moveShot failed:', e); }
  };

  const handleInlineSave = async (id: string) => {
    if (!editValues.description?.trim() && editValues.status === undefined) {
      setEditingId(null);
      return;
    }
    try {
      const db = await getDb();
      const parts: string[] = [];
      const params: unknown[] = [];
      if (editValues.description !== undefined) { parts.push('description = ?'); params.push(editValues.description.trim() || null); }
      if (editValues.status !== undefined) { parts.push('status = ?'); params.push(editValues.status); }
      if (parts.length > 0) {
        params.push(id);
        await db.execute(`UPDATE shots SET ${parts.join(', ')} WHERE id = ?`, params);
      }
      setShots(prev => prev.map(s => s.id === id ? {
        ...s,
        description: editValues.description !== undefined ? (editValues.description.trim() || undefined) : s.description,
        status: editValues.status !== undefined ? editValues.status : s.status,
      } : s));
    } catch (e) { console.error('[ShotList] inlineSave failed:', e); }
    setEditingId(null);
    setEditValues({});
  };

  const startEdit = (shot: Shot) => {
    setEditingId(shot.id);
    setEditValues({ description: shot.description || '', status: shot.status });
  };

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = shots.filter(x => x.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Shot List</h4>
      </div>
      <div className="space-y-1">
        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Shot List ({shots.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Shot
        </Button>
      </div>

      {shots.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {STATUSES.map(s => (
            <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[s]}`}>
              {s} &middot; {counts[s] || 0}
            </span>
          ))}
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Scene (e.g. 2A)" value={form.scene} onChange={(e) => setForm({ ...form, scene: e.target.value })} className={inputClass} autoFocus />
          <input type="text" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.scene.trim() && !form.description.trim()}>Save</Button>
          </div>
        </div>
      )}

      {shots.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No shots yet. Add your first shot.</p>
      ) : (
        <div className="space-y-1">
          {shots.map((shot, i) => (
            <div key={shot.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              {editingId === shot.id ? (
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <GripVertical size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                  <span className="text-[var(--text-tertiary)] flex-shrink-0 w-8">{shot.scene || '--'}</span>
                  <input
                    type="text"
                    value={editValues.description || ''}
                    onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                    className={inputClass + ' flex-1 min-w-0'}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleInlineSave(shot.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                  />
                  <select
                    value={editValues.status || shot.status}
                    onChange={(e) => setEditValues({ ...editValues, status: e.target.value })}
                    className={inputClass + ' w-24 flex-shrink-0'}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Button size="sm" onClick={() => handleInlineSave(shot.id)}>Save</Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <GripVertical size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                    <span className="text-[var(--text-tertiary)] flex-shrink-0 w-8">{shot.scene || '--'}</span>
                    <span className="text-[var(--text-primary)] truncate" onClick={() => startEdit(shot)} title="Click to edit">{shot.description || '--'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[shot.status] || ''}`} onClick={() => startEdit(shot)} title="Click to edit">{shot.status}</span>
                  </div>
                  <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                    <button
                      aria-label="Move up"
                      onClick={() => handleMove(shot.id, 'up')} disabled={i === 0} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30">
                      <ChevronUp size={12} />
                    </button>
                    <button
                      aria-label="Move down"
                      onClick={() => handleMove(shot.id, 'down')} disabled={i === shots.length - 1} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30">
                      <ChevronDown size={12} />
                    </button>
                    <button
                      aria-label="Delete shot list"
                      onClick={() => handleDelete(shot.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
