/**
 * Publication Log · Writer feature.
 * Tracks published work by project: outlet, URL, date, byline.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ExternalLink, BookOpen } from 'lucide-react';

type Publication = {
  id: string;
  project_id: string;
  outlet_name?: string;
  url?: string;
  publish_date?: string;
  byline?: string;
  notes?: string;
};

export default function PublicationLog({ projectId }: { projectId: string }) {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    outlet_name: '',
    url: '',
    publish_date: '',
    byline: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadPublications = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Publication & Record<string, unknown>)[]>(
        'SELECT id, project_id, outlet_name, url, publish_date, byline, notes FROM publications WHERE project_id = ? ORDER BY publish_date DESC, rowid DESC',
        [projectId]
      );
      setPublications(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          outlet_name: r.outlet_name as string | undefined,
          url: r.url as string | undefined,
          publish_date: r.publish_date as string | undefined,
          byline: r.byline as string | undefined,
          notes: r.notes as string | undefined,
        }))
      );
    } catch (e) {
      console.error('[PublicationLog] loadPublications failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPublications();
  }, [projectId]);

  const handleAdd = async () => {
    if (!form.outlet_name.trim() && !form.url.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO publications (id, project_id, outlet_name, url, publish_date, byline, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.outlet_name.trim() || null,
          form.url.trim() || null,
          form.publish_date || null,
          form.byline.trim() || null,
          form.notes.trim() || null,
        ]
      );
      const item: Publication = {
        id,
        project_id: projectId,
        outlet_name: form.outlet_name.trim() || undefined,
        url: form.url.trim() || undefined,
        publish_date: form.publish_date || undefined,
        byline: form.byline.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      setPublications((prev) => {
        const next = [item, ...prev];
        next.sort((a, b) => {
          const da = a.publish_date ? new Date(a.publish_date).getTime() : 0;
          const db2 = b.publish_date ? new Date(b.publish_date).getTime() : 0;
          return db2 - da;
        });
        return next;
      });
      setForm({ outlet_name: '', url: '', publish_date: '', byline: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[PublicationLog] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM publications WHERE id = ?', [id]);
      setPublications((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('[PublicationLog] delete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Publications
          </h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Publications ({publications.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Publication
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Outlet name"
              value={form.outlet_name}
              onChange={(e) => setForm({ ...form, outlet_name: e.target.value })}
              className={inputClass}
              autoFocus
            />
            <input
              type="text"
              placeholder="URL"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.publish_date}
              onChange={(e) => setForm({ ...form, publish_date: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Byline"
              value={form.byline}
              onChange={(e) => setForm({ ...form, byline: e.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.outlet_name.trim() && !form.url.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {publications.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No publications recorded yet.</p>
      ) : (
        <div className="space-y-1">
          {publications.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <BookOpen size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline font-medium flex items-center gap-1 truncate"
                    >
                      {p.outlet_name || p.url}
                      <ExternalLink size={9} className="flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-[var(--text-primary)] font-medium truncate block">
                      {p.outlet_name || '--'}
                    </span>
                  )}
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    {p.byline && <>By {p.byline} · </>}
                    {p.publish_date
                      ? new Date(p.publish_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'No date'}
                    {p.notes && <> · {p.notes}</>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
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
