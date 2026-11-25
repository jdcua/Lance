import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ExternalLink } from 'lucide-react';

type Credit = {
  id: string;
  project_id: string;
  artist?: string;
  role?: string;
  release_link?: string;
  release_date?: string;
  notes?: string;
};

const ROLES = ['producer', 'mixer', 'mastering', 'composer', 'performer', 'co-writer', 'other'];

export default function CreditLog({ projectId }: { projectId: string }) {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    artist: '',
    role: ROLES[0],
    release_link: '',
    release_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadCredits = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Credit & Record<string, unknown>)[]>(
        'SELECT id, project_id, artist, role, release_link, release_date, notes FROM credits WHERE project_id = ? ORDER BY release_date DESC, artist ASC',
        [projectId],
      );
      setCredits(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          artist: r.artist as string | undefined,
          role: r.role as string | undefined,
          release_link: r.release_link as string | undefined,
          release_date: r.release_date as string | undefined,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[CreditLog] load failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadCredits();
  }, [projectId, loadCredits]);

  const handleAdd = async () => {
    if (!form.artist.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO credits (id, project_id, artist, role, release_link, release_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.artist.trim(),
          form.role,
          form.release_link.trim() || null,
          form.release_date || null,
          form.notes.trim() || null,
        ],
      );
      const credit: Credit = {
        id,
        project_id: projectId,
        artist: form.artist.trim(),
        role: form.role,
        release_link: form.release_link.trim() || undefined,
        release_date: form.release_date || undefined,
        notes: form.notes.trim() || undefined,
      };
      setCredits((prev) => [credit, ...prev]);
      setForm({ artist: '', role: ROLES[0], release_link: '', release_date: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[CreditLog] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM credits WHERE id = ?', [id]);
      setCredits((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('[CreditLog] delete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Credits</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Credits ({credits.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Credit
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Artist"
            value={form.artist}
            onChange={(e) => setForm({ ...form, artist: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.release_date}
              onChange={(e) => setForm({ ...form, release_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <input
            type="text"
            placeholder="Release link (URL)"
            value={form.release_link}
            onChange={(e) => setForm({ ...form, release_link: e.target.value })}
            className={inputClass}
          />
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
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.artist.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      {credits.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No credits yet. Add your first credit.
        </p>
      ) : (
        <div className="space-y-1">
          {credits.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">{c.artist}</span>
                {c.role && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">
                    {c.role}
                  </span>
                )}
                {c.release_link && (
                  <a
                    href={c.release_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-ink,var(--accent))] inline-flex items-center gap-0.5 hover:underline"
                  >
                    <ExternalLink size={10} /> release
                  </a>
                )}
                {c.release_date && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">{c.release_date}</span>
                )}
                {c.notes && (
                  <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                    -- {c.notes}
                  </span>
                )}
              </div>
              <button
                aria-label="Delete credit log"
                onClick={() => handleDelete(c.id)}
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
