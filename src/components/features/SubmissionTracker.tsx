import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

type Submission = {
  id: string;
  project_id: string;
  type: string;
  submitted_date?: string;
  response_date?: string;
  status: string;
  resubmit: boolean;
  notes?: string;
};

const STATUSES = ['submitted', 'under-review', 'approved', 'rejected', 'resubmitted'];

const statusBadgeClasses: Record<string, string> = {
  submitted: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  'under-review': 'bg-[#3498DB]/15 text-[#3498DB]',
  approved: 'bg-[#2ECC71]/15 text-[#2ECC71]',
  rejected: 'bg-[#DC2626]/15 text-[#DC2626]',
  resubmitted: 'bg-[#F1C40F]/15 text-[#D97706]',
};

export default function SubmissionTracker({ projectId }: { projectId: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: '',
    submitted_date: '',
    response_date: '',
    status: STATUSES[0],
    resubmit: false,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadSubmissions = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Submission & Record<string, unknown>)[]>(
        'SELECT id, project_id, type, submitted_date, response_date, status, resubmit, notes FROM submissions WHERE project_id = ? ORDER BY submitted_date DESC',
        [projectId],
      );
      setSubmissions(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          type: r.type as string,
          submitted_date: r.submitted_date as string | undefined,
          response_date: r.response_date as string | undefined,
          status: r.status as string,
          resubmit: !!r.resubmit,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[SubmissionTracker] load failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadSubmissions();
  }, [projectId, loadSubmissions]);

  const handleAdd = async () => {
    if (!form.type.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO submissions (id, project_id, type, submitted_date, response_date, status, resubmit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.type.trim(),
          form.submitted_date || null,
          form.response_date || null,
          form.status,
          form.resubmit ? 1 : 0,
          form.notes.trim() || null,
        ],
      );
      const sub: Submission = {
        id,
        project_id: projectId,
        type: form.type.trim(),
        submitted_date: form.submitted_date || undefined,
        response_date: form.response_date || undefined,
        status: form.status,
        resubmit: form.resubmit,
        notes: form.notes.trim() || undefined,
      };
      setSubmissions((prev) => [sub, ...prev]);
      setForm({
        type: '',
        submitted_date: '',
        response_date: '',
        status: STATUSES[0],
        resubmit: false,
        notes: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[SubmissionTracker] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM submissions WHERE id = ?', [id]);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error('[SubmissionTracker] delete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Submissions
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
          Submissions ({submissions.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Submission
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Submission type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="date"
              value={form.submitted_date}
              onChange={(e) => setForm({ ...form, submitted_date: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={form.response_date}
              onChange={(e) => setForm({ ...form, response_date: e.target.value })}
              className={inputClass}
              placeholder="Response date"
            />
            <select
              aria-label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={form.resubmit}
                onChange={(e) => setForm({ ...form, resubmit: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              Needs resubmit
            </label>
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
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.type.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      {submissions.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No submissions yet. Add your first submission.
        </p>
      ) : (
        <div className="space-y-1">
          {submissions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">{s.type}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusBadgeClasses[s.status] || statusBadgeClasses['submitted']}`}
                >
                  {s.status}
                </span>
                {s.resubmit && (
                  <span className="text-[#DC2626]">
                    <AlertTriangle size={12} />
                  </span>
                )}
                {s.submitted_date && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {s.submitted_date}
                  </span>
                )}
                {s.response_date && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    → {s.response_date}
                  </span>
                )}
                {s.notes && (
                  <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                    -- {s.notes}
                  </span>
                )}
              </div>
              <button
                aria-label="Delete submission tracker"
                onClick={() => handleDelete(s.id)}
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
