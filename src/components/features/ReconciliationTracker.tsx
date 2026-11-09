/**
 * Reconciliation Tracker · Accountant feature.
 * List of account reconciliations with status badges.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type Reconciliation = {
  id: string;
  project_id: string;
  account_name?: string;
  expected: number;
  actual: number;
  date?: string;
  status: string;
};

const STATUSES = ['pending', 'matched', 'mismatch'] as const;

const statusBadgeClasses: Record<string, string> = {
  pending: 'bg-[#D97706]/15 text-[#D97706]',
  matched: 'bg-[#16A34A]/15 text-[#16A34A]',
  mismatch: 'bg-[#DC2626]/15 text-[#DC2626]',
};

const StatusIcon: Record<string, typeof CheckCircle2> = {
  pending: AlertTriangle,
  matched: CheckCircle2,
  mismatch: XCircle,
};

export default function ReconciliationTracker({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    account_name: '',
    expected: '',
    actual: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Reconciliation & Record<string, unknown>)[]>(
        'SELECT id, project_id, account_name, expected, actual, date, status FROM reconciliations WHERE project_id = ? ORDER BY date DESC, id DESC',
        [projectId],
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          account_name: r.account_name as string | undefined,
          expected: r.expected as number,
          actual: r.actual as number,
          date: r.date as string | undefined,
          status: r.status as string,
        })),
      );
    } catch (e) {
      console.error('[ReconciliationTracker] load failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadItems();
  }, [projectId, loadItems]);

  const handleAdd = async () => {
    if (!form.account_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO reconciliations (id, project_id, account_name, expected, actual, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.account_name.trim(),
          form.expected ? parseFloat(form.expected) : 0,
          form.actual ? parseFloat(form.actual) : 0,
          form.date || null,
          form.status,
        ],
      );
      const item: Reconciliation = {
        id,
        project_id: projectId,
        account_name: form.account_name.trim(),
        expected: form.expected ? parseFloat(form.expected) : 0,
        actual: form.actual ? parseFloat(form.actual) : 0,
        date: form.date || undefined,
        status: form.status,
      };
      setItems((prev) =>
        [item, ...prev].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
      );
      setForm({
        account_name: '',
        expected: '',
        actual: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[ReconciliationTracker] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM reconciliations WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[ReconciliationTracker] delete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Reconciliations
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
          Reconciliations ({items.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Reconciliation
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Account name"
            value={form.account_name}
            onChange={(e) => setForm({ ...form, account_name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Expected amount"
              value={form.expected}
              onChange={(e) => setForm({ ...form, expected: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Actual amount"
              value={form.actual}
              onChange={(e) => setForm({ ...form, actual: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
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
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              loading={saving}
              disabled={!form.account_name.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No reconciliations yet. Add your first reconciliation.
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = StatusIcon[item.status] || AlertTriangle;
            const diff = (item.actual || 0) - (item.expected || 0);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
              >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <Icon
                    size={12}
                    className={
                      item.status === 'matched'
                        ? 'text-[#16A34A]'
                        : item.status === 'mismatch'
                          ? 'text-[#DC2626]'
                          : 'text-[#D97706]'
                    }
                  />
                  <span className="font-medium text-[var(--text-primary)] truncate">
                    {item.account_name || '--'}
                  </span>
                  <span className="text-[var(--text-tertiary)]">
                    ${(item.expected || 0).toFixed(2)} / ${(item.actual || 0).toFixed(2)}
                  </span>
                  {item.status !== 'matched' && (
                    <span
                      className={`text-[10px] ${diff > 0 ? 'text-[#DC2626]' : diff < 0 ? 'text-[#D97706]' : ''}`}
                    >
                      {diff !== 0 ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)}` : ''}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ml-auto ${statusBadgeClasses[item.status] || ''}`}
                  >
                    {item.status}
                  </span>
                </div>
                <button
                  aria-label="Delete reconciliation tracker"
                  onClick={() => handleDelete(item.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
