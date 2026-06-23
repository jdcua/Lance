import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Expense } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate, formatMonth } from '../utils/format';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToasts } from '../store/toastStore';
import { checkAndNotify } from '../achievements/notify';
import { getUnlockedAchievementKeys } from '../achievements/checker';
import { Plus, Pencil, Trash2, BarChart3, TrendingUp } from 'lucide-react';

const categories = ['Software', 'Equipment', 'Office', 'Travel', 'Marketing', 'Taxes', 'Other'];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getNextMonths(count: number): { label: string; key: string }[] {
  const now = new Date();
  const months: { label: string; key: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    months.push({ label, key });
  }
  return months;
}

function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (ay - by) * 12 + (am - bm);
}

export default function Finance() {
  const { expenses, loadExpenses, addExpense, updateExpense, removeExpense, invoices, loadInvoices, profile, recurringInvoices, loadRecurringInvoices, projects, loadProjects } = useStore();
  const addToast = useToasts((s) => s.add);
  const currency = profile?.currency;
  const fmt = (amount: number) => formatCurrency(amount, currency);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; description: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ category: 'Other', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'forecast'>('overview');
  const [showForecast, setShowForecast] = useState(false);

  useEffect(() => {
    Promise.all([loadExpenses(), loadInvoices(), loadRecurringInvoices(), loadProjects()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadExpenses, loadInvoices, loadRecurringInvoices, loadProjects]);

  useEffect(() => {
    getUnlockedAchievementKeys().then((keys) => {
      setShowForecast(new Set(keys).has('first_recurring'));
    });
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ category: 'Other', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({ category: exp.category, description: exp.description, amount: exp.amount.toString(), date: exp.date });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      const data = {
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
      };
      if (editing) {
        await updateExpense({ ...editing, ...data });
      } else {
        await addExpense(data);
      }
      setShowModal(false);
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await removeExpense(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to delete expense', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  const totalOutstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + i.total, 0);
  const profit = totalPaid - totalExpenses;

  const expensesByCategory = categories.map((cat) => {
    const total = expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return { category: cat, total };
  }).filter((c) => c.total > 0);

  const monthlyExpenses: Record<string, number> = {};
  expenses.forEach((e) => {
    const month = e.date.substring(0, 7);
    monthlyExpenses[month] = (monthlyExpenses[month] || 0) + e.amount;
  });

  const monthlyPaid: Record<string, number> = {};
  invoices.filter((i) => i.status === 'paid' && i.paid_at).forEach((i) => {
    const month = i.paid_at!.substring(0, 7);
    monthlyPaid[month] = (monthlyPaid[month] || 0) + i.total;
  });

  const allMonths = Array.from(new Set([...Object.keys(monthlyExpenses), ...Object.keys(monthlyPaid)])).sort().reverse().slice(0, 12);

  // ── Forecast computation ──
  const forecastMonths = getNextMonths(6);
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1. Confirmed: recurring invoice projections
  const forecastConfirmed: Record<string, number> = {};
  const activeRecurring = recurringInvoices.filter((r) => r.active);
  for (const ri of activeRecurring) {
    const freqMonths = ri.frequency === 'weekly' ? 0.25 : ri.frequency === 'biweekly' ? 0.5 : ri.frequency === 'monthly' ? 1 : 3;
    const startKey = ri.next_due ? ri.next_due.substring(0, 7) : thisMonthKey;
    for (const fm of forecastMonths) {
      if (fm.key < startKey) continue;
      const diff = monthDiff(fm.key, startKey);
      let occurrences = 0;
      if (freqMonths < 1) {
        occurrences = Math.floor(diff / freqMonths) + 1;
      } else {
        occurrences = Math.floor(diff / freqMonths) + 1;
      }
      if (occurrences > 0 && diff % freqMonths < 1) {
        forecastConfirmed[fm.key] = (forecastConfirmed[fm.key] || 0) + ri.total;
      }
    }
  }

  // 2. Confirmed: milestone invoices with dates
  const activeMilestoneProjects = projects.filter((p) => p.status === 'active');
  for (const fm of forecastMonths) {
    // Approximate: projects with budgets split over months
    for (const p of activeMilestoneProjects) {
      if (p.budget && p.end_date) {
        const endKey = p.end_date.substring(0, 7);
        const startKey = p.start_date ? p.start_date.substring(0, 7) : thisMonthKey;
        if (fm.key >= startKey && fm.key <= endKey) {
          const totalMonths = monthDiff(endKey, startKey) + 1;
          if (totalMonths > 0) {
            forecastConfirmed[fm.key] = (forecastConfirmed[fm.key] || 0) + p.budget / totalMonths;
          }
        }
      }
    }
  }

  // 3. Baseline: average monthly revenue from last 3 months
  const pastMonths = [...allMonths].sort().reverse();
  const recentMonths = pastMonths.slice(0, 3);
  const avgMonthly = recentMonths.length > 0
    ? recentMonths.reduce((sum, m) => sum + (monthlyPaid[m] || 0), 0) / recentMonths.length
    : 0;

  // 4. Projected annual revenue
  const forecastAnnual = forecastMonths.reduce((sum, m) => {
    const confirmed = forecastConfirmed[m.key] || 0;
    const projected = Math.max(0, avgMonthly - confirmed);
    return sum + confirmed + projected;
  }, 0);

  // 5. Recurring revenue as % of total forecast
  const totalRecurringMonthly = activeRecurring.reduce((sum, r) => sum + r.total, 0);
  const recurringPct = avgMonthly > 0 ? Math.round((totalRecurringMonthly / avgMonthly) * 100) : 0;

  // Gather all forecast data
  const forecastData = forecastMonths.map((m) => {
    const confirmed = Math.round(forecastConfirmed[m.key] || 0);
    const projected = Math.max(0, Math.round(avgMonthly - confirmed));
    return {
      ...m,
      confirmed,
      projected,
      baseline: Math.round(avgMonthly),
    };
  });

  const maxForecast = Math.max(
    1,
    ...forecastData.map((d) => Math.max(d.confirmed, d.projected, d.baseline))
  );

  if (loading) return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />)}
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
        <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
      </div>
    </div>
  );

  const TabBar = () => (
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={() => setTab('overview')}
        className={`text-sm font-medium pb-1.5 border-b-2 transition-colors ${
          tab === 'overview'
            ? 'text-[var(--text-primary)] border-[var(--accent)]'
            : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
        }`}
      >
        Overview
      </button>
      {showForecast && (
        <button
          onClick={() => setTab('forecast')}
          className={`text-sm font-medium pb-1.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'forecast'
              ? 'text-[var(--text-primary)] border-[var(--accent)]'
              : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
          }`}
        >
          <TrendingUp size={14} />
          Forecast
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <TabBar />

      {tab === 'overview' ? (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <MetricCard label="Revenue (Paid)" value={fmt(totalPaid)} color="green" />
            <MetricCard label="Expenses" value={fmt(totalExpenses)} color="red" />
            <MetricCard
              label="Profit"
              value={fmt(profit)}
              trend={profit >= 0 ? 'up' : 'down'}
              subtext={profit >= 0 ? 'positive' : 'negative'}
              color={profit >= 0 ? 'green' : 'red'}
            />
            <MetricCard label="Outstanding" value={fmt(totalOutstanding)} subtext="unpaid invoices" color="amber" />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <Card>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Monthly Overview</h3>
              {allMonths.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">No data yet.</p>
              ) : (
                <div className="space-y-2">
                  {allMonths.map((month) => {
                    const expense = monthlyExpenses[month] || 0;
                    const income = monthlyPaid[month] || 0;
                    const net = income - expense;
                    return (
                      <div key={month} className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">{formatMonth(month)}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-[var(--accent)]">+{fmt(income)}</span>
                          <span className="text-[#A32D2D]">-{fmt(expense)}</span>
                          <span className={`font-medium ${net >= 0 ? 'text-[var(--accent)]' : 'text-[#A32D2D]'}`}>
                            {fmt(net)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Expenses by Category</h3>
              {expensesByCategory.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">No expenses recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {expensesByCategory.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        <span className="text-xs text-[var(--text-primary)]">{cat.category}</span>
                      </div>
                      <span className="text-xs font-medium text-[var(--text-primary)]">{fmt(cat.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Expenses</h3>
            <Button onClick={openNew} size="sm">
              <Plus size={14} />
              Add Expense
            </Button>
          </div>

          {expenses.length === 0 ? (
            <Card className="text-center py-16 flex flex-col items-center">
              <BarChart3 size={40} className="text-[var(--text-tertiary)] mb-4" />
              <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">No expenses yet</h3>
              <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs mb-5">Add an expense or mark an invoice paid to see your numbers.</p>
              <Button onClick={openNew} size="sm" variant="secondary">Add Expense</Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[8px]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-[var(--text-primary)]">{exp.description}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">&mdash;</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">{exp.category}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{formatDate(exp.date)}</span>
                  </div>
                  <span className="text-xs font-medium text-[#A32D2D] flex-shrink-0">-{fmt(exp.amount)}</span>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onClick={() => openEdit(exp)} aria-label="Edit expense" className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-[8px]">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmDelete({ id: exp.id, description: exp.description })} aria-label="Delete expense" className="p-1 text-[var(--text-tertiary)] hover:text-[#A32D2D] rounded-[8px]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── Forecast tab ── */
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <MetricCard
              label="Projected Annual Revenue"
              value={fmt(forecastAnnual)}
              color="green"
              subtext="based on next 6 months"
            />
            <MetricCard
              label="Recurring % of Revenue"
              value={`${recurringPct}%`}
              color="blue"
              subtext={`${activeRecurring.length} active recurring`}
            />
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">6-Month Revenue Forecast</h3>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">Projected revenue based on recurring invoices, project milestones, and historical averages.</p>

            <div className="space-y-4">
              {/* Bar chart */}
              <div className="flex items-end gap-3" style={{ minHeight: '180px' }}>
                {forecastData.map((m) => (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-[3px] h-[140px]">
                      {m.confirmed > 0 && (
                        <div
                          className="w-[30%] rounded-t-[3px] bg-[var(--accent)]"
                          style={{ height: `${(m.confirmed / maxForecast) * 100}%`, minHeight: m.confirmed > 0 ? '3px' : 0 }}
                          title={`Confirmed: ${fmt(m.confirmed)}`}
                        />
                      )}
                      <div
                        className="w-[30%] rounded-t-[3px] bg-[var(--accent)]/30"
                        style={{ height: `${(m.projected / maxForecast) * 100}%`, minHeight: m.projected > 0 ? '3px' : 0 }}
                        title={`Projected: ${fmt(m.projected)}`}
                      />
                      <div
                        className="w-[30%] rounded-t-[3px] bg-[var(--border-color)]"
                        style={{ height: `${(m.baseline / maxForecast) * 100}%` }}
                        title={`Baseline avg: ${fmt(m.baseline)}`}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 pt-3 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[var(--accent)]" />
                  <span className="text-[10px] text-[var(--text-secondary)]">Confirmed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[var(--accent)]/30" />
                  <span className="text-[10px] text-[var(--text-secondary)]">Projected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[var(--border-color)]" />
                  <span className="text-[10px] text-[var(--text-secondary)]">Baseline</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Monthly detail table */}
          <Card className="mt-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Monthly Detail</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="text-left py-2 font-medium text-[var(--text-secondary)]">Month</th>
                    <th className="text-right py-2 font-medium text-[var(--text-secondary)]">Confirmed</th>
                    <th className="text-right py-2 font-medium text-[var(--text-secondary)]">Projected</th>
                    <th className="text-right py-2 font-medium text-[var(--text-secondary)]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.map((m) => (
                    <tr key={m.key} className="border-b border-[var(--border-color)]/50">
                      <td className="py-2 text-[var(--text-primary)]">{m.label}</td>
                      <td className="py-2 text-right text-[var(--accent)]">{fmt(m.confirmed)}</td>
                      <td className="py-2 text-right text-[var(--text-secondary)]">{fmt(m.projected)}</td>
                      <td className="py-2 text-right font-medium text-[var(--text-primary)]">{fmt(m.confirmed + m.projected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Expense' : 'Add Expense'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description *</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What was this expense for?"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Amount *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} size="sm">Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.description.trim() || !form.amount} size="sm">
              {editing ? 'Save Changes' : 'Add Expense'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete "${confirmDelete?.description}"? This cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
