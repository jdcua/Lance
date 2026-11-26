/**
 * Audition Log · Voice Actor feature.
 * Track auditions with status badges and callback dates.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Clock } from 'lucide-react';

type Audition = {
  id: string;
  client_id: string;
  project_title: string;
  role?: string;
  callback_date?: string;
  status: string;
  notes?: string;
};

const STATUS_OPTIONS = ['submitted', 'callback', 'booked', 'declined'] as const;

const statusBadge: Record<string, string> = {
  submitted: 'bg-[#2563EB]/15 text-[#2563EB]',
  callback: 'bg-[#D97706]/15 text-[#D97706]',
  booked: 'bg-[#16A34A]/15 text-[#16A34A]',
  declined: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
};

export default function AuditionLog({ clientId }: { clientId: string }) {
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    project_title: '',
    role: '',
    callback_date: '',
    status: 'submitted',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadAuditions = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Audition & Record<string, unknown>)[]>(
        'SELECT id, client_id, project_title, role, callback_date, status, notes FROM auditions WHERE client_id = ? ORDER BY callback_date ASC, project_title ASC',
        [clientId],
      );
      setAuditions(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          project_title: r.project_title as string,
          role: r.role as string | undefined,
          callback_date: r.callback_date as string | undefined,
          status: r.status as string,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[AuditionLog] loadAuditions failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadAuditions();
  }, [clientId, loadAuditions]);

  const handleSave = async () => {
    if (!form.project_title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO auditions (id, client_id, project_title, role, callback_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.project_title.trim(),
          form.role || null,
          form.callback_date || null,
          form.status,
          form.notes || null,
        ],
      );
      const audition: Audition = {
        id,
        client_id: clientId,
        project_title: form.project_title.trim(),
        role: form.role || undefined,
        callback_date: form.callback_date || undefined,
        status: form.status,
        notes: form.notes || undefined,
      };
      setAuditions((prev) =>
        [...prev, audition].sort(
          (a, b) =>
            (a.callback_date || '').localeCompare(b.callback_date || '') ||
            a.project_title.localeCompare(b.project_title),
        ),
      );
      setForm({ project_title: '', role: '', callback_date: '', status: 'submitted', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[AuditionLog] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM auditions WHERE id = ?', [id]);
      setAuditions((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error('[AuditionLog] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Auditions</h4>
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
          Auditions ({auditions.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Audition
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Project title"
            value={form.project_title}
            onChange={(e) => setForm({ ...form, project_title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={form.callback_date}
              onChange={(e) => setForm({ ...form, callback_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <select
            aria-label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.project_title.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {auditions.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No auditions logged yet.</p>
      ) : (
        <div className="space-y-1">
          {auditions.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)] truncate">
                  {a.project_title}
                </span>
                {a.role && <span className="text-[var(--text-tertiary)]">{a.role}</span>}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusBadge[a.status] || statusBadge.submitted}`}
                >
                  {a.status}
                </span>
                {a.callback_date && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    <Clock size={10} className="inline mr-0.5" />
                    {new Date(a.callback_date).toLocaleDateString()}
                  </span>
                )}
                {a.notes && (
                  <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                    {a.notes}
                  </span>
                )}
              </div>
              <button
                aria-label="Delete audition log"
                onClick={() => handleDelete(a.id)}
                className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2"
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
