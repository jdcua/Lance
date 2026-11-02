/**
 * Hypothesis Backlog · hypothesis tracking with status badges and test results.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type Hypothesis = {
  id: string;
  project_id: string;
  hypothesis?: string;
  test_design?: string;
  result?: string;
  status?: string;
  created_at?: string;
};

const STATUSES = ['proposed', 'testing', 'validated', 'rejected'];
const STATUS_COLORS: Record<string, string> = {
  proposed: 'bg-[#3498DB]/20 text-[#3498DB]',
  testing: 'bg-[#E67E22]/20 text-[#E67E22]',
  validated: 'bg-[#2ECC71]/20 text-[#2ECC71]',
  rejected: 'bg-[#E74C3C]/20 text-[#E74C3C]',
};

export default function HypothesisBacklog({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Hypothesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    hypothesis: '',
    test_design: '',
    result: '',
    status: 'proposed',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Hypothesis & Record<string, unknown>)[]>(
        'SELECT id, project_id, hypothesis, test_design, result, status, created_at FROM hypotheses WHERE project_id = ? ORDER BY created_at DESC',
        [projectId],
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          hypothesis: r.hypothesis as string | undefined,
          test_design: r.test_design as string | undefined,
          result: r.result as string | undefined,
          status: r.status as string | undefined,
          created_at: r.created_at as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[HypothesisBacklog] load failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadItems();
  }, [projectId, loadItems]);

  const counts = STATUSES.reduce(
    (acc, s) => {
      acc[s] = items.filter((i) => i.status === s).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const handleSave = async () => {
    if (!form.hypothesis.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const db = await getDb();
      await db.execute(
        'INSERT INTO hypotheses (id, project_id, hypothesis, test_design, result, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.hypothesis.trim(),
          form.test_design.trim() || null,
          form.result.trim() || null,
          form.status,
          now,
        ],
      );
      const item: Hypothesis = {
        id,
        project_id: projectId,
        hypothesis: form.hypothesis.trim(),
        test_design: form.test_design.trim() || undefined,
        result: form.result.trim() || undefined,
        status: form.status,
        created_at: now,
      };
      setItems((prev) => [item, ...prev]);
      setForm({ hypothesis: '', test_design: '', result: '', status: 'proposed' });
      setShowForm(false);
    } catch (e) {
      console.error('[HypothesisBacklog] save failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM hypotheses WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[HypothesisBacklog] delete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Hypothesis Backlog
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
          Hypotheses ({items.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Hypothesis
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <span
              key={s}
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[s]}`}
            >
              {s} {counts[s] || 0}
            </span>
          ))}
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Hypothesis statement"
            value={form.hypothesis}
            onChange={(e) => setForm({ ...form, hypothesis: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <textarea
            placeholder="Test design / methodology"
            value={form.test_design}
            onChange={(e) => setForm({ ...form, test_design: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <input
            type="text"
            placeholder="Result (if available)"
            value={form.result}
            onChange={(e) => setForm({ ...form, result: e.target.value })}
            className={inputClass}
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
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.hypothesis.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No hypotheses yet. Add your first hypothesis.
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{item.hypothesis}</span>
                  {item.status && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || ''}`}
                    >
                      {item.status}
                    </span>
                  )}
                </div>
                <button
                  aria-label="Delete hypothesis backlog"
                  onClick={() => handleDelete(item.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {item.test_design && (
                <div className="text-[10px] text-[var(--text-tertiary)]">
                  Test: {item.test_design}
                </div>
              )}
              {item.result && (
                <div className="text-[10px] text-[var(--text-tertiary)]">Result: {item.result}</div>
              )}
              {item.created_at && (
                <div className="text-[10px] text-[var(--text-tertiary)]">
                  {new Date(item.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
