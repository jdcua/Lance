/**
 * Compute Cost Log · AI Engineer feature.
 * Track compute costs with provider, instance type, hours, cost, and date.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Cloud, DollarSign, Calendar } from 'lucide-react';

type ComputeCost = {
  id: string;
  project_id: string;
  provider?: string;
  instance_type?: string;
  hours?: number;
  cost?: number;
  date?: string;
};

const PROVIDER_OPTIONS = ['AWS', 'GCP', 'Azure', 'Lambda', 'Colab', 'other'] as const;

const providerBadgeClasses: Record<string, string> = {
  AWS: 'bg-[#FF9900]/15 text-[#FF9900]',
  GCP: 'bg-[#4285F4]/15 text-[#4285F4]',
  Azure: 'bg-[#0078D4]/15 text-[#0078D4]',
  Lambda: 'bg-[#7C3AED]/15 text-[#7C3AED]',
  Colab: 'bg-[#F9AB00]/15 text-[#C27C00]',
  other: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
};

export default function ComputeCostLog({ projectId }: { projectId: string }) {
  const [costs, setCosts] = useState<ComputeCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    provider: 'AWS',
    instance_type: '',
    hours: '',
    cost: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const loadCosts = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ComputeCost & Record<string, unknown>)[]>(
        'SELECT id, project_id, provider, instance_type, hours, cost, date FROM compute_costs WHERE project_id = ? ORDER BY date DESC, id DESC',
        [projectId],
      );
      setCosts(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          provider: r.provider as string | undefined,
          instance_type: r.instance_type as string | undefined,
          hours: r.hours as number | undefined,
          cost: r.cost as number | undefined,
          date: r.date as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[ComputeCostLog] loadCosts failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadCosts();
  }, [projectId, loadCosts]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO compute_costs (id, project_id, provider, instance_type, hours, cost, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.provider,
          form.instance_type || null,
          form.hours ? parseFloat(form.hours) : null,
          form.cost ? parseFloat(form.cost) : null,
          form.date || null,
        ],
      );
      const item: ComputeCost = {
        id,
        project_id: projectId,
        provider: form.provider,
        instance_type: form.instance_type || undefined,
        hours: form.hours ? parseFloat(form.hours) : undefined,
        cost: form.cost ? parseFloat(form.cost) : undefined,
        date: form.date || undefined,
      };
      setCosts((prev) => {
        const next = [item, ...prev];
        next.sort(
          (a, b) =>
            new Date(b.date || '').getTime() - new Date(a.date || '').getTime() ||
            b.id.localeCompare(a.id),
        );
        return next;
      });
      setForm({
        provider: 'AWS',
        instance_type: '',
        hours: '',
        cost: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
    } catch (e) {
      console.error('[ComputeCostLog] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM compute_costs WHERE id = ?', [id]);
      setCosts((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('[ComputeCostLog] delete failed:', e);
    }
  };

  const totalCost = costs.reduce((sum, c) => sum + (c.cost || 0), 0);
  const totalHours = costs.reduce((sum, c) => sum + (c.hours || 0), 0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';
  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Compute Costs
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
          Compute Costs ({costs.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Cost
        </Button>
      </div>

      {costs.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xs bg-[var(--bg-secondary)] text-xs">
          <span className="flex items-center gap-1 text-[var(--text-primary)]">
            <DollarSign size={10} className="text-[var(--accent-ink,var(--accent))]" />
            <span className="font-semibold">${totalCost.toFixed(2)}</span> total
          </span>
          <span className="text-[var(--text-tertiary)]">{totalHours.toFixed(1)}h used</span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <select
            aria-label="Provider"
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className={selectClass}
          >
            {PROVIDER_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Instance type"
              value={form.instance_type}
              onChange={(e) => setForm({ ...form, instance_type: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Hours"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Cost ($)"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              className={inputClass}
              autoFocus
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>
              Add
            </Button>
          </div>
        </div>
      )}

      {costs.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No compute costs logged yet.</p>
      ) : (
        <div className="space-y-1">
          {costs.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Cloud size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                {c.provider && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${providerBadgeClasses[c.provider] || providerBadgeClasses.other}`}
                  >
                    {c.provider}
                  </span>
                )}
                {c.instance_type && (
                  <span className="text-[var(--text-tertiary)] flex-shrink-0">
                    {c.instance_type}
                  </span>
                )}
                {c.hours != null && (
                  <span className="text-[var(--text-tertiary)] flex-shrink-0">{c.hours}h</span>
                )}
                <span className="font-medium text-[var(--text-primary)] flex-shrink-0">
                  ${(c.cost || 0).toFixed(2)}
                </span>
                {c.date && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5 flex-shrink-0">
                    <Calendar size={9} />
                    {formatDate(c.date)}
                  </span>
                )}
              </div>
              <button
                aria-label="Delete compute cost log"
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
