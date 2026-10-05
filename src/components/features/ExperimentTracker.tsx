/**
 * Experiment Tracker · AI Engineer feature.
 * Track experiments with type, status, metrics, and notes.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, FlaskConical } from 'lucide-react';

type Experiment = {
  id: string;
  project_id: string;
  name: string;
  type: string;
  status: string;
  metrics?: string;
  notes?: string;
  created_at: string;
};

const TYPE_OPTIONS = ['model', 'data', 'hyperparameter', 'ablation', 'other'] as const;
const STATUS_OPTIONS = ['planned', 'running', 'completed', 'failed'] as const;

const typeBadgeClasses: Record<string, string> = {
  model: 'bg-[#7C3AED]/15 text-[#7C3AED]',
  data: 'bg-[#2563EB]/15 text-[#2563EB]',
  hyperparameter: 'bg-[#D97706]/15 text-[#D97706]',
  ablation: 'bg-[#059669]/15 text-[#059669]',
  other: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
};

const statusBadgeClasses: Record<string, string> = {
  planned: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  running: 'bg-[#2563EB]/15 text-[#2563EB]',
  completed: 'bg-[#16A34A]/15 text-[#16A34A]',
  failed: 'bg-[#DC2626]/15 text-[#DC2626]',
};

export default function ExperimentTracker({ projectId }: { projectId: string }) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'model', status: 'planned', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadExperiments = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Experiment & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, type, status, metrics, notes, created_at FROM experiments WHERE project_id = ? ORDER BY created_at DESC',
        [projectId],
      );
      setExperiments(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          name: r.name as string,
          type: r.type as string,
          status: r.status as string,
          metrics: r.metrics as string | undefined,
          notes: r.notes as string | undefined,
          created_at: r.created_at as string,
        })),
      );
    } catch (e) {
      console.error('[ExperimentTracker] loadExperiments failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadExperiments();
  }, [projectId, loadExperiments]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO experiments (id, project_id, name, type, status, metrics, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.name.trim(),
          form.type,
          form.status,
          null,
          form.notes || null,
          new Date().toISOString(),
        ],
      );
      const experiment: Experiment = {
        id,
        project_id: projectId,
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        metrics: undefined,
        notes: form.notes || undefined,
        created_at: new Date().toISOString(),
      };
      setExperiments((prev) => [experiment, ...prev]);
      setForm({ name: '', type: 'model', status: 'planned', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[ExperimentTracker] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM experiments WHERE id = ?', [id]);
      setExperiments((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      console.error('[ExperimentTracker] delete failed:', e);
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
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Experiments
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
          Experiments ({experiments.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> New Experiment
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Experiment name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className={selectClass}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              aria-label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={selectClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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

      {experiments.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No experiments tracked yet.</p>
      ) : (
        <div className="space-y-1">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className="flex items-start justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <FlaskConical size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                  <span className="font-medium text-[var(--text-primary)] truncate">
                    {exp.name}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${typeBadgeClasses[exp.type] || typeBadgeClasses.other}`}
                  >
                    {exp.type}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[exp.status] || statusBadgeClasses.planned}`}
                  >
                    {exp.status}
                  </span>
                </div>
                {exp.notes && (
                  <p className="text-[var(--text-secondary)] mt-0.5 ml-5">{exp.notes}</p>
                )}
              </div>
              <button
                aria-label="Delete experiment tracker"
                onClick={() => handleDelete(exp.id)}
                className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0 mt-0.5"
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
