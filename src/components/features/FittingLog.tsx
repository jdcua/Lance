/**
 * Fitting Log · Fashion Designer feature.
 * Track garment fittings with fit model, date, adjustments, and status.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Scissors } from 'lucide-react';

type Fitting = {
  id: string;
  project_id: string;
  garment: string;
  fit_model: string;
  date: string;
  adjustments: string;
  status: string;
};

const STATUS_OPTIONS = ['scheduled', 'in_progress', 'completed', 'approved'] as const;

const statusBadgeClasses: Record<string, string> = {
  scheduled: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB]',
  completed: 'bg-[#D97706]/15 text-[#D97706]',
  approved: 'bg-[#16A34A]/15 text-[#16A34A]',
};

export default function FittingLog({ projectId }: { projectId: string }) {
  const [fittings, setFittings] = useState<Fitting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    garment: '',
    fit_model: '',
    date: new Date().toISOString().split('T')[0],
    adjustments: '',
    status: 'scheduled',
  });
  const [saving, setSaving] = useState(false);

  const loadFittings = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Fitting & Record<string, unknown>)[]>(
        'SELECT * FROM fittings WHERE project_id = ? ORDER BY date DESC',
        [projectId],
      );
      setFittings(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          garment: r.garment as string,
          fit_model: r.fit_model as string,
          date: r.date as string,
          adjustments: r.adjustments as string,
          status: r.status as string,
        })),
      );
    } catch (e) {
      console.error('[FittingLog] loadFittings failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadFittings();
  }, [projectId, loadFittings]);

  const handleAdd = async () => {
    if (!form.garment.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO fittings (id, project_id, garment, fit_model, date, adjustments, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.garment.trim(),
          form.fit_model.trim() || null,
          form.date || null,
          form.adjustments.trim() || null,
          form.status,
        ],
      );
      const item: Fitting = {
        id,
        project_id: projectId,
        garment: form.garment.trim(),
        fit_model: form.fit_model.trim() || '',
        date: form.date || '',
        adjustments: form.adjustments.trim() || '',
        status: form.status,
      };
      setFittings((prev) => [item, ...prev]);
      setForm({
        garment: '',
        fit_model: '',
        date: new Date().toISOString().split('T')[0],
        adjustments: '',
        status: 'scheduled',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[FittingLog] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM fittings WHERE id = ?', [id]);
      setFittings((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      console.error('[FittingLog] delete failed:', e);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE fittings SET status = ? WHERE id = ?', [status, id]);
      setFittings((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    } catch (e) {
      console.error('[FittingLog] status update failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';
  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Fittings
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Fittings ({fittings.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Fitting
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Garment name"
            value={form.garment}
            onChange={(e) => setForm({ ...form, garment: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Fit model"
              value={form.fit_model}
              onChange={(e) => setForm({ ...form, fit_model: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Adjustments / notes"
            value={form.adjustments}
            onChange={(e) => setForm({ ...form, adjustments: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <select
            aria-label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.garment.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      {fittings.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No fittings logged yet.</p>
      ) : (
        <div className="space-y-1">
          {fittings.map((fitting) => (
            <div key={fitting.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Scissors
                    size={10}
                    className="text-[var(--accent-ink,var(--accent))] flex-shrink-0"
                  />
                  <button
                    onClick={() => setExpanded(expanded === fitting.id ? null : fitting.id)}
                    className="font-medium text-[var(--text-primary)] truncate hover:underline text-left"
                  >
                    {fitting.garment}
                  </button>
                  {fitting.fit_model && (
                    <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                      {fitting.fit_model}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[fitting.status] || ''}`}
                  >
                    {fitting.status.replace('_', ' ')}
                  </span>
                  {fitting.date && (
                    <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                      {fitting.date}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  <select aria-label="Fitting.status"
                    value={fitting.status}
                    onChange={(e) => handleStatusChange(fitting.id, e.target.value)}
                    className="text-[10px] bg-transparent border-none text-[var(--text-tertiary)] cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <button
                    aria-label="Delete fitting log"
                    onClick={() => handleDelete(fitting.id)}
                    className="text-[var(--text-tertiary)] hover:text-[#A32D2D]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {expanded === fitting.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-[6px] text-xs space-y-1">
                  {fitting.adjustments && (
                    <p className="text-[var(--text-secondary)]">{fitting.adjustments}</p>
                  )}
                  {!fitting.adjustments && (
                    <p className="text-[var(--text-tertiary)] italic">No adjustments noted.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
