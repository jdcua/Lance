/**
 * Client Financial Summary · Accountant feature.
 * Timeline of financial statements with auto-calculated profit.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

type Financial = {
  id: string;
  client_id: string;
  statement_type?: string;
  period?: string;
  revenue: number;
  expenses: number;
  profit: number;
  notes?: string;
};

const STATEMENT_TYPES = ['income', 'balance', 'cash_flow', 'other'] as const;

export default function ClientFinancialSummary({ clientId }: { clientId: string }) {
  const [financials, setFinancials] = useState<Financial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    statement_type: 'income',
    period: '',
    revenue: '',
    expenses: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadFinancials = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Financial & Record<string, unknown>)[]>(
        'SELECT id, client_id, statement_type, period, revenue, expenses, profit, notes FROM client_financials WHERE client_id = ? ORDER BY period DESC',
        [clientId],
      );
      setFinancials(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          statement_type: r.statement_type as string | undefined,
          period: r.period as string | undefined,
          revenue: r.revenue as number,
          expenses: r.expenses as number,
          profit: r.profit as number,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[ClientFinancialSummary] load failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadFinancials();
  }, [clientId, loadFinancials]);

  const handleAdd = async () => {
    if (!form.period.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const revenue = form.revenue ? parseFloat(form.revenue) : 0;
      const expenses = form.expenses ? parseFloat(form.expenses) : 0;
      const profit = revenue - expenses;
      await db.execute(
        'INSERT INTO client_financials (id, client_id, statement_type, period, revenue, expenses, profit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.statement_type,
          form.period.trim(),
          revenue,
          expenses,
          profit,
          form.notes.trim() || null,
        ],
      );
      const item: Financial = {
        id,
        client_id: clientId,
        statement_type: form.statement_type,
        period: form.period.trim(),
        revenue,
        expenses,
        profit,
        notes: form.notes.trim() || undefined,
      };
      setFinancials((prev) => {
        const next = [...prev, item];
        next.sort((a, b) => (b.period || '').localeCompare(a.period || ''));
        return next;
      });
      setForm({ statement_type: 'income', period: '', revenue: '', expenses: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[ClientFinancialSummary] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM client_financials WHERE id = ?', [id]);
      setFinancials((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      console.error('[ClientFinancialSummary] delete failed:', e);
    }
  };

  const totalProfit = financials.reduce((sum, f) => sum + (f.profit || 0), 0);
  const totalRevenue = financials.reduce((sum, f) => sum + (f.revenue || 0), 0);

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Financials
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
          Financials ({financials.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Statement
        </Button>
      </div>

      {financials.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <span className="text-[var(--text-tertiary)]">Total Revenue</span>
            <span className="font-medium text-[var(--text-primary)] block">
              ${totalRevenue.toFixed(2)}
            </span>
          </div>
          <div className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <span className="text-[var(--text-tertiary)]">Total Profit</span>
            <span
              className={`font-medium block ${totalProfit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}
            >
              ${totalProfit.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Statement Type"
              value={form.statement_type}
              onChange={(e) => setForm({ ...form, statement_type: e.target.value })}
              className={inputClass}
            >
              {STATEMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Period (e.g. Q1 2025)"
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              className={inputClass}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Revenue"
              value={form.revenue}
              onChange={(e) => setForm({ ...form, revenue: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Expenses"
              value={form.expenses}
              onChange={(e) => setForm({ ...form, expenses: e.target.value })}
              className={inputClass}
            />
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
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.period.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {financials.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No financial statements yet. Add your first statement.
        </p>
      ) : (
        <div className="space-y-1">
          {financials.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)] flex-shrink-0">
                  {f.statement_type?.replace('_', ' ') || 'other'}
                </span>
                <span className="font-medium text-[var(--text-primary)]">{f.period || '--'}</span>
                <span className="text-[var(--text-tertiary)] flex items-center gap-0.5">
                  <TrendingUp size={10} className="text-[#16A34A]" /> ${(f.revenue || 0).toFixed(0)}
                </span>
                <span className="text-[var(--text-tertiary)] flex items-center gap-0.5">
                  <TrendingDown size={10} className="text-[#DC2626]" /> $
                  {(f.expenses || 0).toFixed(0)}
                </span>
                <span
                  className={`font-medium ml-auto flex-shrink-0 ${(f.profit || 0) >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}
                >
                  ${(f.profit || 0).toFixed(2)}
                </span>
              </div>
              <button
                aria-label="Delete client financial summary"
                onClick={() => handleDelete(f.id)}
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
