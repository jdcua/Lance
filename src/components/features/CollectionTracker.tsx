/**
 * Collection Tracker · Fashion Designer feature.
 * Track fashion collections with name, season, status, pieces count, and launch date.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Palette } from 'lucide-react';

type Collection = {
  id: string;
  project_id: string;
  name: string;
  season: string;
  status: string;
  pieces_count: number;
  launch_date: string;
  notes: string;
};

const SEASONS = ['SS', 'AW', 'Resort', 'Pre-Fall', 'Capsule'] as const;
const STATUS_OPTIONS = ['planning', 'designing', 'sampling', 'production', 'launched'] as const;

const statusBadgeClasses: Record<string, string> = {
  planning: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  designing: 'bg-[#7C3AED]/15 text-[#7C3AED]',
  sampling: 'bg-[#D97706]/15 text-[#D97706]',
  production: 'bg-[#2563EB]/15 text-[#2563EB]',
  launched: 'bg-[#16A34A]/15 text-[#16A34A]',
};

export default function CollectionTracker({ projectId }: { projectId: string }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', season: 'SS', status: 'planning', pieces_count: '', launch_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadCollections = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Collection & Record<string, unknown>)[]>(
        'SELECT * FROM collections WHERE project_id = ? ORDER BY launch_date DESC, name',
        [projectId]
      );
      setCollections(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        name: r.name as string,
        season: r.season as string,
        status: r.status as string,
        pieces_count: r.pieces_count as number,
        launch_date: r.launch_date as string,
        notes: r.notes as string,
      })));
    } catch (e) { console.error('[CollectionTracker] loadCollections failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadCollections(); }, [projectId, loadCollections]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const piecesCount = parseInt(form.pieces_count) || 0;
      await db.execute(
        'INSERT INTO collections (id, project_id, name, season, status, pieces_count, launch_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.name.trim(), form.season, form.status, piecesCount, form.launch_date || null, form.notes.trim() || null]
      );
      const item: Collection = {
        id, project_id: projectId, name: form.name.trim(), season: form.season, status: form.status,
        pieces_count: piecesCount, launch_date: form.launch_date || '', notes: form.notes.trim() || '',
      };
      setCollections(prev => [...prev, item]);
      setForm({ name: '', season: 'SS', status: 'planning', pieces_count: '', launch_date: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[CollectionTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM collections WHERE id = ?', [id]);
      setCollections(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error('[CollectionTracker] delete failed:', e); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE collections SET status = ? WHERE id = ?', [status, id]);
      setCollections(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    } catch (e) { console.error('[CollectionTracker] status update failed:', e); }
  };

  const totalPieces = collections.reduce((sum, c) => sum + (c.pieces_count || 0), 0);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Collections</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Collections ({collections.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Collection
        </Button>
      </div>

      {collections.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
          <Palette size={12} className="text-[var(--accent)]" />
          <span>{collections.length} collections · {totalPieces} total pieces</span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Collection name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} className={selectClass}>
              {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Pieces count" value={form.pieces_count} onChange={(e) => setForm({ ...form, pieces_count: e.target.value })} className={inputClass} />
            <input type="date" value={form.launch_date} onChange={(e) => setForm({ ...form, launch_date: e.target.value })} className={inputClass} />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {collections.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No collections yet. Add your first collection.</p>
      ) : (
        <div className="space-y-1">
          {collections.map((col) => (
            <div key={col.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Palette size={10} className="text-[var(--accent)] flex-shrink-0" />
                  <button
                    onClick={() => setExpanded(expanded === col.id ? null : col.id)}
                    className="font-medium text-[var(--text-primary)] truncate hover:underline text-left"
                  >
                    {col.name}
                  </button>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex-shrink-0">{col.season}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[col.status] || ''}`}>
                    {col.status.replace('_', ' ')}
                  </span>
                  {col.pieces_count > 0 && <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{col.pieces_count} pcs</span>}
                  {col.launch_date && <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{col.launch_date}</span>}
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  <select
                    value={col.status}
                    onChange={(e) => handleStatusChange(col.id, e.target.value)}
                    className="text-[10px] bg-transparent border-none text-[var(--text-tertiary)] cursor-pointer"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  <button onClick={() => handleDelete(col.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {expanded === col.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-[6px] text-xs space-y-1">
                  {col.notes && <p className="text-[var(--text-secondary)]">{col.notes}</p>}
                  {!col.notes && <p className="text-[var(--text-tertiary)] italic">No additional notes.</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
