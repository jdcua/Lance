/**
 * Infra Dashboard · DevOps feature.
 * Track infrastructure services with provider, monthly cost, and status.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Server, DollarSign } from 'lucide-react';

type InfraItem = {
  id: string;
  project_id: string;
  service_name: string;
  provider?: string;
  cost_monthly?: number;
  status: string;
};

const STATUS_OPTIONS = ['active', 'inactive', 'deprecated'] as const;

const statusBadgeClasses: Record<string, string> = {
  active: 'bg-[#16A34A]/15 text-[#16A34A]',
  inactive: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
  deprecated: 'bg-[#DC2626]/15 text-[#DC2626]',
};

export default function InfraDashboard({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<InfraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    service_name: '',
    provider: '',
    cost_monthly: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(InfraItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, service_name, provider, cost_monthly, status FROM infrastructure WHERE project_id = ? ORDER BY cost_monthly DESC',
        [projectId],
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          service_name: r.service_name as string,
          provider: r.provider as string | undefined,
          cost_monthly: r.cost_monthly as number | undefined,
          status: r.status as string,
        })),
      );
    } catch (e) {
      console.error('[InfraDashboard] loadItems failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadItems();
  }, [projectId, loadItems]);

  const handleAdd = async () => {
    if (!form.service_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO infrastructure (id, project_id, service_name, provider, cost_monthly, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.service_name.trim(),
          form.provider || null,
          form.cost_monthly ? parseFloat(form.cost_monthly) : null,
          form.status,
        ],
      );
      const item: InfraItem = {
        id,
        project_id: projectId,
        service_name: form.service_name.trim(),
        provider: form.provider || undefined,
        cost_monthly: form.cost_monthly ? parseFloat(form.cost_monthly) : undefined,
        status: form.status,
      };
      setItems((prev) =>
        [...prev, item].sort((a, b) => (b.cost_monthly || 0) - (a.cost_monthly || 0)),
      );
      setForm({ service_name: '', provider: '', cost_monthly: '', status: 'active' });
      setShowForm(false);
    } catch (e) {
      console.error('[InfraDashboard] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM infrastructure WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[InfraDashboard] delete failed:', e);
    }
  };

  const totalMonthly = items
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + (i.cost_monthly || 0), 0);

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';
  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Infrastructure
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
          Infrastructure ({items.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Service
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-[var(--bg-secondary)] text-xs">
          <DollarSign size={10} className="text-[var(--accent-ink,var(--accent))]" />
          <span className="text-[var(--text-primary)]">
            Total monthly cost: <span className="font-semibold">${totalMonthly.toFixed(2)}</span>
          </span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Service name"
            value={form.service_name}
            onChange={(e) => setForm({ ...form, service_name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Provider (e.g. AWS, GCP)"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Cost / month"
              value={form.cost_monthly}
              onChange={(e) => setForm({ ...form, cost_monthly: e.target.value })}
              className={inputClass}
            />
          </div>
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
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              loading={saving}
              disabled={!form.service_name.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No infrastructure services tracked yet.
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Server size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="font-medium text-[var(--text-primary)] truncate">
                  {item.service_name}
                </span>
                {item.provider && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                    {item.provider}
                  </span>
                )}
                {item.cost_monthly != null && (
                  <span className="text-[10px] font-medium text-[var(--text-primary)] flex-shrink-0">
                    ${item.cost_monthly.toFixed(2)}/mo
                  </span>
                )}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[item.status] || statusBadgeClasses.inactive}`}
                >
                  {item.status}
                </span>
              </div>
              <button
                aria-label="Delete infra dashboard"
                onClick={() => handleDelete(item.id)}
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
