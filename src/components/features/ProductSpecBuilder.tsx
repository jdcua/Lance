/**
 * Product Spec Builder · Product Manager feature.
 * Product spec creation with problem, solution, success metrics.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronRight } from 'lucide-react';

type ProductSpec = {
  id: string;
  project_id: string;
  title: string;
  problem?: string;
  solution?: string;
  success_metrics?: string;
  status: string;
  created_at: string;
};

const STATUS_OPTIONS = ['draft', 'review', 'approved'] as const;

const statusBadge: Record<string, string> = {
  draft: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  review: 'bg-[#D97706]/15 text-[#D97706]',
  approved: 'bg-[#16A34A]/15 text-[#16A34A]',
};

export default function ProductSpecBuilder({ projectId }: { projectId: string }) {
  const [specs, setSpecs] = useState<ProductSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    problem: '',
    solution: '',
    success_metrics: '',
    status: 'draft',
  });
  const [saving, setSaving] = useState(false);

  const loadSpecs = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ProductSpec & Record<string, unknown>)[]>(
        'SELECT id, project_id, title, problem, solution, success_metrics, status, created_at FROM product_specs WHERE project_id = ? ORDER BY created_at DESC',
        [projectId],
      );
      setSpecs(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          title: r.title as string,
          problem: r.problem as string | undefined,
          solution: r.solution as string | undefined,
          success_metrics: r.success_metrics as string | undefined,
          status: r.status as string,
          created_at: r.created_at as string,
        })),
      );
    } catch (e) {
      console.error('[ProductSpecBuilder] loadSpecs failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadSpecs();
  }, [projectId, loadSpecs]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const db = await getDb();
      await db.execute(
        'INSERT INTO product_specs (id, project_id, title, problem, solution, success_metrics, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.title.trim(),
          form.problem || null,
          form.solution || null,
          form.success_metrics || null,
          form.status,
          now,
        ],
      );
      const spec: ProductSpec = {
        id,
        project_id: projectId,
        title: form.title.trim(),
        problem: form.problem || undefined,
        solution: form.solution || undefined,
        success_metrics: form.success_metrics || undefined,
        status: form.status,
        created_at: now,
      };
      setSpecs((prev) => [spec, ...prev]);
      setForm({ title: '', problem: '', solution: '', success_metrics: '', status: 'draft' });
      setShowForm(false);
    } catch (e) {
      console.error('[ProductSpecBuilder] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM product_specs WHERE id = ?', [id]);
      setSpecs((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error('[ProductSpecBuilder] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Product Specs
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
          Product Specs ({specs.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Spec
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Spec title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <textarea
            placeholder="Problem statement"
            value={form.problem}
            onChange={(e) => setForm({ ...form, problem: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <textarea
            placeholder="Proposed solution"
            value={form.solution}
            onChange={(e) => setForm({ ...form, solution: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <textarea
            placeholder="Success metrics"
            value={form.success_metrics}
            onChange={(e) => setForm({ ...form, success_metrics: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
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
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.title.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {specs.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No product specs yet.</p>
      ) : (
        <div className="space-y-1">
          {specs.map((spec) => (
            <div key={spec.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <button
                    aria-label="Next"
                    onClick={() => setExpanded(expanded === spec.id ? null : spec.id)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronRight
                      size={10}
                      className={`transition-transform ${expanded === spec.id ? 'rotate-90' : ''}`}
                    />
                  </button>
                  <span className="font-medium text-[var(--text-primary)] truncate">
                    {spec.title}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusBadge[spec.status] || statusBadge.draft}`}
                  >
                    {spec.status}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {new Date(spec.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  aria-label="Delete product spec builder"
                  onClick={() => handleDelete(spec.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {expanded === spec.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-[6px] text-xs space-y-2">
                  {spec.problem && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">
                        Problem
                      </p>
                      <p className="text-[var(--text-secondary)]">{spec.problem}</p>
                    </div>
                  )}
                  {spec.solution && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">
                        Solution
                      </p>
                      <p className="text-[var(--text-secondary)]">{spec.solution}</p>
                    </div>
                  )}
                  {spec.success_metrics && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">
                        Success Metrics
                      </p>
                      <p className="text-[var(--text-secondary)]">{spec.success_metrics}</p>
                    </div>
                  )}
                  {!spec.problem && !spec.solution && !spec.success_metrics && (
                    <p className="text-[var(--text-tertiary)] italic">No additional details.</p>
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
