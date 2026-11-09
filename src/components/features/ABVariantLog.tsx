/**
 * A/B Variant Log · Copywriter feature.
 * A/B test variant tracking with control flag and results.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';

type ABVariant = {
  id: string;
  project_id: string;
  test_name: string;
  variant_name: string;
  is_control: boolean;
  results?: string;
  status: string;
};

const STATUS_OPTIONS = ['running', 'completed', 'archived'] as const;

const statusBadge: Record<string, string> = {
  running: 'bg-[#2563EB]/15 text-[#2563EB]',
  completed: 'bg-[#16A34A]/15 text-[#16A34A]',
  archived: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
};

export default function ABVariantLog({ projectId }: { projectId: string }) {
  const [variants, setVariants] = useState<ABVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    test_name: '',
    variant_name: '',
    is_control: false,
    results: '',
    status: 'running',
  });
  const [saving, setSaving] = useState(false);

  const loadVariants = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ABVariant & Record<string, unknown>)[]>(
        'SELECT id, project_id, test_name, variant_name, is_control, results, status FROM ab_variants WHERE project_id = ? ORDER BY test_name ASC, variant_name ASC',
        [projectId],
      );
      setVariants(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          test_name: r.test_name as string,
          variant_name: r.variant_name as string,
          is_control: !!r.is_control,
          results: r.results as string | undefined,
          status: r.status as string,
        })),
      );
    } catch (e) {
      console.error('[ABVariantLog] loadVariants failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadVariants();
  }, [projectId, loadVariants]);

  const handleSave = async () => {
    if (!form.test_name.trim() || !form.variant_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO ab_variants (id, project_id, test_name, variant_name, is_control, results, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.test_name.trim(),
          form.variant_name.trim(),
          form.is_control ? 1 : 0,
          form.results || null,
          form.status,
        ],
      );
      const variant: ABVariant = {
        id,
        project_id: projectId,
        test_name: form.test_name.trim(),
        variant_name: form.variant_name.trim(),
        is_control: form.is_control,
        results: form.results || undefined,
        status: form.status,
      };
      setVariants((prev) =>
        [...prev, variant].sort(
          (a, b) =>
            a.test_name.localeCompare(b.test_name) || a.variant_name.localeCompare(b.variant_name),
        ),
      );
      setForm({
        test_name: '',
        variant_name: '',
        is_control: false,
        results: '',
        status: 'running',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[ABVariantLog] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM ab_variants WHERE id = ?', [id]);
      setVariants((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      console.error('[ABVariantLog] handleDelete failed:', e);
    }
  };

  const groupedTests = variants.reduce<Record<string, ABVariant[]>>((acc, v) => {
    if (!acc[v.test_name]) acc[v.test_name] = [];
    acc[v.test_name].push(v);
    return acc;
  }, {});

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            A/B Variants
          </h4>
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
          A/B Variants ({variants.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Variant
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Test name"
            value={form.test_name}
            onChange={(e) => setForm({ ...form, test_name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <input
            type="text"
            placeholder="Variant name"
            value={form.variant_name}
            onChange={(e) => setForm({ ...form, variant_name: e.target.value })}
            className={inputClass}
          />
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_control}
              onChange={(e) => setForm({ ...form, is_control: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            Is control
          </label>
          <textarea
            placeholder="Results"
            value={form.results}
            onChange={(e) => setForm({ ...form, results: e.target.value })}
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
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.test_name.trim() || !form.variant_name.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {variants.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No A/B variants yet.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedTests).map(([testName, testVariants]) => (
            <div key={testName} className="space-y-1">
              <div className="text-[10px] font-semibold text-[var(--text-tertiary)] px-1">
                {testName} ({testVariants.length})
              </div>
              {testVariants.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {v.is_control ? (
                      <CheckCircle2 size={10} className="text-[#16A34A] flex-shrink-0" />
                    ) : (
                      <span className="w-2.5 flex-shrink-0" />
                    )}
                    <span className="font-medium text-[var(--text-primary)]">{v.variant_name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusBadge[v.status] || statusBadge.running}`}
                    >
                      {v.status}
                    </span>
                    {v.results && (
                      <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                        {v.results}
                      </span>
                    )}
                  </div>
                  <button
                    aria-label="Delete ab variant log"
                    onClick={() => handleDelete(v.id)}
                    className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
