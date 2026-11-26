/**
 * Phase Tracker · Animator / Filmmaker / Data Analyst feature.
 * Tracks project phases with status, color, and a breakdown bar.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Circle, Check, X } from 'lucide-react';

type Phase = { id: string; project_id: string; phase_name: string; status: string; color?: string };

const PRESET_COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6'];
const DEFAULT_PHASES = [
  'Concept',
  'Storyboard',
  'Animatic',
  'Motion',
  'Render',
  'Revision',
  'Delivery',
];

export default function PhaseTracker({
  projectId,
  defaultPhases,
}: {
  projectId: string;
  defaultPhases?: string[];
}) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phase_name: '', color: PRESET_COLORS[3] });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Sweep pre-existing NULL orphans best-effort (harmless when absent).
  useEffect(() => {
    if (projectId) return;
    setLoading(false);
    getDb()
      .then((db) => db.execute('DELETE FROM project_phases WHERE project_id IS NULL'))
      .catch(() => {
        /* cleanup is best-effort */
      });
  }, [projectId]);

  const loadPhases = useCallback(async () => {
    if (!projectId) return;
    try {
      const db = await getDb();
      const rows = await db.select<(Phase & Record<string, unknown>)[]>(
        'SELECT id, project_id, phase_name, status, color FROM project_phases WHERE project_id = ? ORDER BY id ASC',
        [projectId],
      );
      const loaded = rows.map((r) => ({
        id: r.id as string,
        project_id: r.project_id as string,
        phase_name: r.phase_name as string,
        status: r.status as string,
        color: (r.color as string) || undefined,
      }));
      if (loaded.length === 0) {
        const names = defaultPhases || DEFAULT_PHASES;
        const created: Phase[] = [];
        for (let i = 0; i < names.length; i++) {
          const id = crypto.randomUUID();
          const color = PRESET_COLORS[i % PRESET_COLORS.length];
          await db.execute(
            'INSERT INTO project_phases (id, project_id, phase_name, status, color) VALUES (?, ?, ?, ?, ?)',
            [id, projectId, names[i], 'pending', color],
          );
          created.push({
            id,
            project_id: projectId,
            phase_name: names[i],
            status: 'pending',
            color,
          });
        }
        setPhases(created);
      } else {
        setPhases(loaded);
      }
    } catch (e) {
      console.error('[PhaseTracker] loadPhases failed:', e);
    }
    setLoading(false);
  }, [defaultPhases, projectId]);

  useEffect(() => {
    loadPhases();
  }, [projectId, loadPhases]);

  // No project context (e.g. the dashboard renders the widget bare): show a
  // prompt instead of the tracker. Every DB path above is gated on
  // projectId, so without one nothing loads, seeds, or saves — previously
  // this mounted the full tracker, and loading with `project_id = NULL`
  // matched nothing, so auto-seed wrote 7 orphan rows per mount (plus one
  // per save), all invisible forever since every read filters by project_id.
  if (!projectId) {
    return (
      <div className="text-center py-6">
        <p className="text-sm font-medium text-[var(--text-primary)]">Phase Tracker</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Open a project to track its phases here.
        </p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!form.phase_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO project_phases (id, project_id, phase_name, status, color) VALUES (?, ?, ?, ?, ?)',
        [id, projectId, form.phase_name.trim(), 'pending', form.color],
      );
      const item: Phase = {
        id,
        project_id: projectId,
        phase_name: form.phase_name.trim(),
        status: 'pending',
        color: form.color,
      };
      setPhases((prev) => [item, ...prev]);
      setForm({ phase_name: '', color: PRESET_COLORS[3] });
      setShowForm(false);
    } catch (e) {
      console.error('[PhaseTracker] addPhase failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM project_phases WHERE id = ?', [id]);
      setPhases((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('[PhaseTracker] deletePhase failed:', e);
    }
    setConfirmDelete(null);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
      in_progress: 'bg-[#3498DB]/20 text-[#3498DB]',
      completed: 'bg-[#2ECC71]/20 text-[#2ECC71]',
    };
    return (
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors[status] || colors.pending}`}
      >
        {status.replace('_', ' ')}
      </span>
    );
  };

  const handleStatusToggle = async (phase: Phase) => {
    const next =
      phase.status === 'completed'
        ? 'pending'
        : phase.status === 'in_progress'
          ? 'completed'
          : 'in_progress';
    try {
      const db = await getDb();
      await db.execute('UPDATE project_phases SET status = ? WHERE id = ?', [next, phase.id]);
      setPhases((prev) => prev.map((p) => (p.id === phase.id ? { ...p, status: next } : p)));
    } catch (e) {
      console.error('[PhaseTracker] updateStatus failed:', e);
    }
  };

  const completed = phases.filter((p) => p.status === 'completed').length;
  const total = phases.length;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Phases</h4>
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
          Phases {total > 0 && `(${completed}/${total})`}
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Phase
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Phase name"
            value={form.phase_name}
            onChange={(e) => setForm({ ...form, phase_name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-tertiary)]">Color:</span>
            <div className="flex gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-5 h-5 rounded-full border-2 ${form.color === c ? 'border-[var(--text-primary)] scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.phase_name.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {phases.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No phases yet. Add your first project phase.
        </p>
      ) : (
        <>
          {total > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden bg-[var(--border-color)]">
              {phases.map((p) => (
                <div
                  key={p.id}
                  style={{ width: `${(1 / total) * 100}%`, backgroundColor: p.color || '#888' }}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                />
              ))}
            </div>
          )}
          <div className="space-y-1">
            {phases.map((p) => (
              <div key={p.id}>
                {confirmDelete === p.id ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
                    <span className="text-[var(--text-primary)]">Delete "{p.phase_name}"?</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(p.id)}
                        aria-label={`Confirm delete ${p.phase_name}`}
                        className="text-[#A32D2D] px-1"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        aria-label="Cancel delete"
                        className="text-[var(--text-tertiary)] px-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <button
                        onClick={() => handleStatusToggle(p)}
                        aria-label={`Cycle status of ${p.phase_name}`}
                        title="Click to cycle status"
                      >
                        <Circle size={12} fill={p.color || '#888'} stroke={p.color || '#888'} />
                      </button>
                      <span
                        className={`font-medium ${p.status === 'completed' ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}
                      >
                        {p.phase_name}
                      </span>
                      <span className="ml-1">{statusBadge(p.status)}</span>
                    </div>
                    <button
                      onClick={() => setConfirmDelete(p.id)}
                      aria-label={`Delete ${p.phase_name}`}
                      className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
