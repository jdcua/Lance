import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Check, Circle } from 'lucide-react';

type Stem = {
  id: string;
  project_id: string;
  name: string;
  format?: string;
  delivered: boolean;
  delivery_date?: string;
  notes?: string;
};

const FORMATS = ['WAV', 'AIFF', 'MP3', 'FLAC', 'other'];

export default function StemTracker({ projectId }: { projectId: string }) {
  const [stems, setStems] = useState<Stem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', format: FORMATS[0], delivery_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadStems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Stem & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, format, delivered, delivery_date, notes FROM stems WHERE project_id = ? ORDER BY delivered ASC, name ASC',
        [projectId],
      );
      setStems(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          name: r.name as string,
          format: r.format as string | undefined,
          delivered: !!r.delivered,
          delivery_date: r.delivery_date as string | undefined,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[StemTracker] loadStems failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadStems();
  }, [projectId, loadStems]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO stems (id, project_id, name, format, delivered, delivery_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.name.trim(),
          form.format,
          0,
          form.delivery_date || null,
          form.notes.trim() || null,
        ],
      );
      const stem: Stem = {
        id,
        project_id: projectId,
        name: form.name.trim(),
        format: form.format,
        delivered: false,
        delivery_date: form.delivery_date || undefined,
        notes: form.notes.trim() || undefined,
      };
      setStems((prev) => [...prev, stem]);
      setForm({ name: '', format: FORMATS[0], delivery_date: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[StemTracker] add failed:', e);
    }
    setSaving(false);
  };

  const handleToggle = async (stem: Stem) => {
    try {
      const next = stem.delivered ? 0 : 1;
      const db = await getDb();
      await db.execute('UPDATE stems SET delivered = ? WHERE id = ?', [next, stem.id]);
      setStems((prev) =>
        prev.map((s) => (s.id === stem.id ? { ...s, delivered: !s.delivered } : s)),
      );
    } catch (e) {
      console.error('[StemTracker] toggle failed:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM stems WHERE id = ?', [id]);
      setStems((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error('[StemTracker] delete failed:', e);
    }
  };

  const delivered = stems.filter((s) => s.delivered).length;
  const total = stems.length;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Stems
          </h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Stems ({delivered}/{total})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Stem
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Stem name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Format"
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className={inputClass}
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.delivery_date}
              onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <input
            type="text"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.name.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      {stems.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No stems yet. Add your first stem.
        </p>
      ) : (
        <div className="space-y-1">
          {stems.map((stem) => (
            <div
              key={stem.id}
              className={`flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs ${stem.delivered ? 'opacity-60' : ''}`}
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <button onClick={() => handleToggle(stem)} className="flex-shrink-0">
                  {stem.delivered ? (
                    <Check size={14} className="text-[#2ECC71]" />
                  ) : (
                    <Circle size={14} className="text-[var(--text-tertiary)]" />
                  )}
                </button>
                <span
                  className={`font-medium ${stem.delivered ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}
                >
                  {stem.name}
                </span>
                {stem.format && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)] flex-shrink-0">
                    {stem.format}
                  </span>
                )}
                {stem.delivery_date && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                    {stem.delivery_date}
                  </span>
                )}
                {stem.notes && (
                  <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                    -- {stem.notes}
                  </span>
                )}
              </div>
              <button
                aria-label="Delete stem tracker"
                onClick={() => handleDelete(stem.id)}
                className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
