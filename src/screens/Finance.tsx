import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Expense, Invoice, InvoicePayment } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate, formatMonth } from '../utils/format';
import { getCurrencySymbol } from '../lib/currency';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToasts } from '../store/toastStore';
import type { ToastType } from '../store/toastStore';
import { checkAndNotify } from '../achievements/notify';
import { getUnlockedAchievementKeys } from '../achievements/checker';
import ArchetypeFeatureTabs from '../components/features/ArchetypeFeatureTabs';
import {
  getNextMonths,
  computeRevenueForecast,
  computeExpenseForecast,
  computeCashFlow,
  computeAvgClientRevenue,
  computeForecastMetrics,
  applyScenario,
  type ScenarioParams,
} from '../lib/forecast';
import { Plus, Pencil, Trash2, BarChart3, TrendingUp, AlertTriangle, Check, DollarSign, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

const categories = ['Software', 'Equipment', 'Office', 'Travel', 'Marketing', 'Taxes', 'Other'];

export default function Finance() {
  const { expenses, loadExpenses, addExpense, updateExpense, removeExpense, invoices, loadInvoices, profile, recurringInvoices, loadRecurringInvoices, projects, loadProjects, milestones, loadMilestones, payments, loadAllPayments, addPayment, updateInvoice, clients, loadClients } = useStore();
  const addToast = useToasts((s) => s.add);
  const currency = profile?.currency;
  const fmt = (amount: number) => formatCurrency(amount, currency);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; description: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ category: 'Other', description: '', amount: '', date: new Date().toISOString().split('T')[0], recurring: false, frequency: 'monthly' });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'aging' | 'forecast'>('overview');
  const [showForecast, setShowForecast] = useState(false);
  const [currentBalance, setCurrentBalance] = useState('');
  const [scenario, setScenario] = useState<ScenarioParams>({ newClientsPerMonth: 0, rateIncrease: 0, expenseGrowth: 0, mode: 'base' });

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([loadExpenses(), loadInvoices(), loadRecurringInvoices(), loadProjects(), loadAllPayments(), loadClients()]);
      const state = useStore.getState();
      const active = state.projects.filter((p) => p.status === 'active');
      await Promise.all(active.map((p) => loadMilestones(p.id)));
    };
    loadAll()
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadExpenses, loadInvoices, loadRecurringInvoices, loadProjects, loadMilestones]);

  useEffect(() => {
    getUnlockedAchievementKeys().then((keys) => {
      setShowForecast(new Set(keys).has('first_recurring'));
    });
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ category: 'Other', description: '', amount: '', date: new Date().toISOString().split('T')[0], recurring: false, frequency: 'monthly' });
    setShowModal(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({ category: exp.category, description: exp.description, amount: exp.amount.toString(), date: exp.date, recurring: exp.recurring || false, frequency: exp.frequency || 'monthly' });
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
        recurring: form.recurring,
        frequency: form.recurring ? form.frequency : undefined,
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

  const paidFromPayments = Object.values(payments).flat().reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  const totalPaidRevenue = paidFromPayments > 0 ? paidFromPayments : totalPaid;
  const totalInvoiced = invoices.filter((i) => i.status !== 'draft').reduce((sum, i) => sum + i.total, 0);
  const totalOutstanding = totalInvoiced - totalPaidRevenue;
  const profit = totalPaidRevenue - totalExpenses;

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
  if (paidFromPayments > 0) {
    Object.values(payments).flat().forEach((p) => {
      const month = p.payment_date.substring(0, 7);
      monthlyPaid[month] = (monthlyPaid[month] || 0) + p.amount;
    });
  } else {
    invoices.filter((i) => i.status === 'paid' && i.paid_at).forEach((i) => {
      const month = i.paid_at!.substring(0, 7);
      monthlyPaid[month] = (monthlyPaid[month] || 0) + i.total;
    });
  }

  const allMonths = Array.from(new Set([...Object.keys(monthlyExpenses), ...Object.keys(monthlyPaid)])).sort().reverse().slice(0, 12);

  // ── Forecast computations ──
  const forecastMonths = getNextMonths(6);
  const avgClientRevenue = computeAvgClientRevenue(invoices);

  const baseRevenue = computeRevenueForecast(
    recurringInvoices, invoices, projects, milestones, monthlyPaid, forecastMonths,
  );
  const baseExpenses = computeExpenseForecast(expenses, monthlyExpenses, forecastMonths);

  const scenarioResult = applyScenario(baseRevenue, baseExpenses, avgClientRevenue, scenario);
  const revenueForecast = scenarioResult.revenue;
  const expenseForecast = scenarioResult.expenses;
  const cashFlow = computeCashFlow(
    revenueForecast,
    expenseForecast,
    currentBalance ? parseFloat(currentBalance) : undefined,
  );

  const forecastMetrics = computeForecastMetrics(
    revenueForecast,
    expenseForecast,
    forecastMonths,
    currentBalance ? parseFloat(currentBalance) : undefined,
  );

  const maxRevenue = Math.max(1, ...revenueForecast.map((d) => Math.max(d.confirmed, d.probable, d.projected, d.baseline)));
  const maxExpense = Math.max(1, ...expenseForecast.map((d) => Math.max(d.known, d.projected, d.baseline)));

  const invoiceCurrencies = new Set(invoices.filter(i => i.status !== 'draft').map(i => i.currency || currency || 'CAD'));
  const hasMixedCurrencies = invoiceCurrencies.size > 1;

  const outstandingByCurrency: Record<string, number> = {};
  invoices.filter(i => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue').forEach(i => {
    const cur = i.currency || currency || 'CAD';
    outstandingByCurrency[cur] = (outstandingByCurrency[cur] || 0) + i.total;
  });

  const revenueByCurrency: Record<string, number> = {};
  invoices.filter(i => i.status === 'paid').forEach(i => {
    const cur = i.currency || currency || 'CAD';
    revenueByCurrency[cur] = (revenueByCurrency[cur] || 0) + i.total;
  });

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
            ? 'text-[var(--accent)] border-[var(--accent)]'
            : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
        }`}
      >
        Overview
      </button>
      <button
        onClick={() => setTab('aging')}
        className={`text-sm font-medium pb-1.5 border-b-2 transition-colors flex items-center gap-1.5 ${
          tab === 'aging'
            ? 'text-[var(--accent)] border-[var(--accent)]'
            : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
        }`}
      >
        Aging
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
          {hasMixedCurrencies && (
            <div className="mb-4 px-3 py-2 rounded-[8px] bg-[var(--info-bg)] border border-[var(--info)]/20 flex items-start gap-2 text-xs">
              <span className="text-[var(--info)] mt-px flex-shrink-0">ⓘ</span>
              <span className="text-[var(--text-secondary)]">
                Your finances include invoices in multiple currencies. Amounts are shown in their original currency — totals may not reflect actual value.
              </span>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3 mb-6">
            <MetricCard label="Revenue (Paid)" value={hasMixedCurrencies
              ? Object.entries(revenueByCurrency).map(([cur, amt]) => `${formatCurrency(amt, cur)} ${cur}`).join(' · ')
              : fmt(totalPaidRevenue)
            } color="green" />
            <MetricCard label="Expenses" value={fmt(totalExpenses)} color="red" />
            <MetricCard
              label="Profit"
              value={fmt(profit)}
              trend={profit >= 0 ? 'up' : 'down'}
              subtext={profit >= 0 ? 'positive' : 'negative'}
              color={profit >= 0 ? 'green' : 'red'}
            />
            <MetricCard
              label="Outstanding"
              value={hasMixedCurrencies
                ? Object.entries(outstandingByCurrency).filter(([, amt]) => amt > 0).map(([cur, amt]) => `${formatCurrency(amt, cur)} ${cur}`).join(' · ')
                : fmt(totalOutstanding)
              }
              subtext="unpaid invoices"
              color="amber"
            />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <Card>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Monthly Overview{hasMixedCurrencies ? ' (profile currency)' : ''}</h3>
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
                          <span className="text-[var(--danger)]">-{fmt(expense)}</span>
                          <span className={`font-medium ${net >= 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`}>
                            {fmt(net)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* TODO(v1.5): add exchange rate API or manual rate input for finance rollups */}
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
                  <span className="text-xs font-medium text-[var(--danger)] flex-shrink-0">-{fmt(exp.amount)}</span>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onClick={() => openEdit(exp)} aria-label="Edit expense" className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-[8px]">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmDelete({ id: exp.id, description: exp.description })} aria-label="Delete expense" className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)] rounded-[8px]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : tab === 'aging' ? (
        <AgingReport invoices={invoices} payments={payments} getClientName={(id: string) => clients.find((c) => c.id === id)?.name || 'Unknown'} fmt={fmt} addPayment={addPayment} updateInvoice={updateInvoice} addToast={(msg: string, type?: ToastType) => addToast(msg, type)} />
      ) : (
        /* ── Forecast tab ── */
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <MetricCard
              label="Projected Next Month"
              value={fmt(forecastMetrics.projectedNextMonth)}
              color="green"
              subtext="estimated"
              tooltip="Projected revenue for the upcoming month (confirmed + probable + projected)"
            />
            <MetricCard
              label="Projected Next Quarter"
              value={fmt(forecastMetrics.projectedNextQuarter)}
              color="blue"
              subtext="estimated"
              tooltip="Projected revenue for the next 3 months"
            />
            <MetricCard
              label="Revenue Certainty"
              value={`${forecastMetrics.revenueCertainty}%`}
              color={forecastMetrics.revenueCertainty >= 50 ? 'green' : forecastMetrics.revenueCertainty >= 25 ? 'amber' : 'red'}
              subtext="confirmed / projected"
              tooltip="Percentage of projected revenue that comes from confirmed sources"
            />
            <MetricCard
              label="Months of Runway"
              value={forecastMetrics.monthsOfRunway !== null ? `${forecastMetrics.monthsOfRunway}` : '—'}
              color={forecastMetrics.monthsOfRunway !== null && forecastMetrics.monthsOfRunway >= 6 ? 'green' : forecastMetrics.monthsOfRunway !== null ? 'amber' : 'gray'}
              subtext={forecastMetrics.monthsOfRunway !== null ? 'with current balance' : 'enter balance to see'}
              tooltip="Months until projected balance reaches zero (requires current balance input)"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* PANEL 1 — Revenue Forecast */}
            <Card>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Revenue Forecast</h3>
              <p className="text-xs text-[var(--text-tertiary)] mb-4">Projected revenue based on recurring invoices, milestones, sent invoices, and historical trends.</p>
              <div className="flex items-end gap-2" style={{ minHeight: '160px' }}>
                {revenueForecast.map((m) => (
                  <div key={m.month.key} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-[2px] h-[120px]">
                      <div
                        className="w-[28%] rounded-t-[3px] bg-[var(--accent)]"
                        style={{ height: `${(m.confirmed / maxRevenue) * 100}%`, minHeight: m.confirmed > 0 ? '3px' : 0 }}
                        title={`Confirmed: ${fmt(m.confirmed)}`}
                      />
                      <div
                        className="w-[28%] rounded-t-[3px] bg-[var(--accent)]/50"
                        style={{ height: `${(m.probable / maxRevenue) * 100}%`, minHeight: m.probable > 0 ? '3px' : 0 }}
                        title={`Probable: ${fmt(m.probable)}`}
                      />
                      <div
                        className="w-[28%] rounded-t-[3px] bg-[var(--accent)]/20"
                        style={{ height: `${(m.projected / maxRevenue) * 100}%`, minHeight: m.projected > 0 ? '3px' : 0 }}
                        title={`Projected: ${fmt(m.projected)}`}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">{m.month.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-5 pt-3 mt-2 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[var(--accent)]" /><span className="text-[10px] text-[var(--text-secondary)]">Confirmed</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[var(--accent)]/50" /><span className="text-[10px] text-[var(--text-secondary)]">Probable</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[var(--accent)]/20" /><span className="text-[10px] text-[var(--text-secondary)]">Projected</span></div>
              </div>
            </Card>

            {/* PANEL 2 — Expense Forecast */}
            <Card>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Expense Forecast</h3>
              <p className="text-xs text-[var(--text-tertiary)] mb-4">Projected expenses based on known recurring expenses and historical averages.</p>
              <div className="flex items-end gap-2" style={{ minHeight: '160px' }}>
                {expenseForecast.map((m) => (
                  <div key={m.month.key} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-[2px] h-[120px]">
                      <div
                        className="w-[45%] rounded-t-[3px] bg-[var(--danger)]"
                        style={{ height: `${(m.known / maxExpense) * 100}%`, minHeight: m.known > 0 ? '3px' : 0 }}
                        title={`Known: ${fmt(m.known)}`}
                      />
                      <div
                        className="w-[45%] rounded-t-[3px] bg-[var(--danger)]/30"
                        style={{ height: `${(m.projected / maxExpense) * 100}%`, minHeight: m.projected > 0 ? '3px' : 0 }}
                        title={`Projected: ${fmt(m.projected)}`}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">{m.month.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-5 pt-3 mt-2 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[var(--danger)]" /><span className="text-[10px] text-[var(--text-secondary)]">Known Recurring</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[var(--danger)]/30" /><span className="text-[10px] text-[var(--text-secondary)]">Trend Projection</span></div>
              </div>
            </Card>
          </div>

          {/* PANEL 3 — Cash Flow Projection */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cash Flow Projection</h3>
                <p className="text-xs text-[var(--text-tertiary)]">Estimated. Month-by-month net: income - expenses.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-[var(--text-secondary)]">Current Balance</label>
                <input
                  type="number"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-28 px-2 py-1 text-xs border border-[var(--border-color)] rounded-[6px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
            <div className="flex items-end gap-3" style={{ minHeight: '140px' }}>
              {cashFlow.map((cf) => (
                <div key={cf.month.key} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-[110px]">
                    <div
                      className={`w-full rounded-t-[3px] ${cf.net >= 0 ? 'bg-[var(--accent)]' : 'bg-[var(--danger)]'}`}
                      style={{ height: `${Math.min(100, (Math.abs(cf.net) / Math.max(1, ...cashFlow.map((c) => Math.abs(c.net)))) * 100)}%`, minHeight: cf.net !== 0 ? '3px' : 0 }}
                      title={`Net: ${fmt(cf.net)}`}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">{cf.month.label}</span>
                  <span className={`text-[10px] font-medium ${cf.net >= 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`}>{fmt(cf.net)}</span>
                  {cf.runningBalance !== undefined && (
                    <span className={`text-[9px] ${cf.runningBalance >= 0 ? 'text-[var(--text-secondary)]' : 'text-[var(--danger)]'}`}>Bal: {fmt(cf.runningBalance)}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* PANEL 4 — Scenario Modeling */}
          <Card className="mb-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Scenario Modeling</h3>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">Adjust sliders to see how changes affect projections. All values are estimates.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[var(--text-secondary)]">New clients / month</label>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{scenario.newClientsPerMonth}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={scenario.newClientsPerMonth}
                  onChange={(e) => setScenario({ ...scenario, newClientsPerMonth: parseInt(e.target.value) })}
                  className="w-full h-1.5 rounded-full appearance-none bg-[var(--border-color)] cursor-pointer accent-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Each adds ~{fmt(avgClientRevenue)} to monthly projection</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[var(--text-secondary)]">Rate increase (%)</label>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{scenario.rateIncrease}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={scenario.rateIncrease}
                  onChange={(e) => setScenario({ ...scenario, rateIncrease: parseInt(e.target.value) })}
                  className="w-full h-1.5 rounded-full appearance-none bg-[var(--border-color)] cursor-pointer accent-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Multiplies projected revenue by (1 + rate%)</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[var(--text-secondary)]">Expense growth (%)</label>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{scenario.expenseGrowth}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={scenario.expenseGrowth}
                  onChange={(e) => setScenario({ ...scenario, expenseGrowth: parseInt(e.target.value) })}
                  className="w-full h-1.5 rounded-full appearance-none bg-[var(--border-color)] cursor-pointer accent-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Scales projected expenses by (1 + growth%)</p>
              </div>

              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-2 block">Projection Mode</label>
                <div className="flex gap-2">
                  {(['optimistic', 'base', 'conservative'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setScenario({ ...scenario, mode })}
                      className={`px-3 py-1.5 text-xs rounded-[8px] border transition-colors ${
                        scenario.mode === mode
                          ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] font-medium'
                          : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {mode === 'optimistic' ? '+20%' : mode === 'conservative' ? '−20%' : 'Base'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Adjusts projected revenue by ±20%</p>
              </div>
            </div>
          </Card>

          {/* Projected totals after scenario */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Scenario: 6-Mo Revenue"
              value={fmt(revenueForecast.reduce((s, m) => s + m.confirmed + m.probable + m.projected, 0))}
              color="green"
              subtext="total 6-mo revenue"
            />
            <MetricCard
              label="Scenario: Next Quarter"
              value={fmt(revenueForecast.slice(0, 3).reduce((s, m) => s + m.confirmed + m.probable + m.projected, 0))}
              color="blue"
              subtext="first 3 months"
            />
            <MetricCard
              label="Scenario: 6-Mo Expenses"
              value={fmt(expenseForecast.reduce((s, m) => s + m.known + m.projected, 0))}
              color="red"
              subtext="total projected"
            />
            <MetricCard
              label="Scenario: 6-Mo Net"
              value={fmt(
                revenueForecast.reduce((s, m) => s + m.confirmed + m.probable + m.projected, 0) -
                expenseForecast.reduce((s, m) => s + m.known + m.projected, 0)
              )}
              color="purple"
              subtext="income - expenses"
            />
          </div>
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
          <div className="border-t border-[var(--border-color)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-[var(--text-primary)]">Mark as Recurring</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, recurring: !form.recurring, frequency: form.frequency || 'monthly' })}
                className={`relative w-9 h-5 rounded-full transition-colors ${form.recurring ? 'bg-[var(--accent)]' : 'bg-[var(--border-color)]'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--bg-card)] shadow transition-transform ${form.recurring ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {form.recurring && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
            )}
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
      <ArchetypeFeatureTabs screen="finance" />
    </div>
  );
}

type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

interface AgingInvoice {
  invoice: Invoice;
  clientName: string;
  remaining: number;
  daysOverdue: number;
  bucket: AgingBucket;
}

function getBucket(dueDate: string | undefined): AgingBucket {
  if (!dueDate) return 'current';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((now.getTime() - due.getTime()) / 86400000);
  if (diffDays < 0) return 'current';
  if (diffDays <= 30) return '1-30';
  if (diffDays <= 60) return '31-60';
  if (diffDays <= 90) return '61-90';
  return '90+';
}

const bucketOrder: AgingBucket[] = ['current', '1-30', '31-60', '61-90', '90+'];

const bucketLabel: Record<AgingBucket, string> = {
  current: 'Current',
  '1-30': '1–30 days',
  '31-60': '31–60 days',
  '61-90': '61–90 days',
  '90+': '90+ days',
};

const bucketColor: Record<AgingBucket, string> = {
  current: 'var(--accent)',
  '1-30': 'var(--warning)',
  '31-60': '#f59e0b',
  '61-90': '#ef4444',
  '90+': '#b91c1c',
};

const bucketBg: Record<AgingBucket, string> = {
  current: 'var(--accent-bg)',
  '1-30': 'var(--warning-bg)',
  '31-60': 'rgba(245,158,11,0.12)',
  '61-90': 'rgba(239,68,68,0.12)',
  '90+': 'rgba(185,28,28,0.15)',
};

type AgingSortKey = 'number' | 'client' | 'total' | 'remaining' | 'due_date' | 'days_overdue' | 'status';

function AgingReport({ invoices, payments, getClientName, fmt, addPayment, updateInvoice, addToast }: {
  invoices: Invoice[];
  payments: Record<string, InvoicePayment[]>;
  getClientName: (id: string) => string;
  fmt: (n: number) => string;
  addPayment: (data: { invoice_id: string; amount: number; payment_date: string; payment_method: string; reference?: string; notes?: string }) => Promise<any>;
  updateInvoice: (data: Invoice) => Promise<void>;
  addToast: (msg: string, type?: ToastType) => void;
}) {
  const [sortKey, setSortKey] = useState<AgingSortKey>('days_overdue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvId, setPaymentInvId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer',
    reference: '',
    notes: '',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);

  const agingInvoices: AgingInvoice[] = invoices
    .filter((inv) => inv.status !== 'draft' && inv.status !== 'paid')
    .map((inv) => {
      const paidTotal = (payments[inv.id] || []).reduce((s, p) => s + p.amount, 0);
      const remaining = Math.max(0, inv.total - paidTotal);
      if (remaining <= 0) return null;
      const bucket = getBucket(inv.due_date);
      const daysOverdue = inv.due_date
        ? Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / 86400000)
        : 0;
      return {
        invoice: inv,
        clientName: getClientName(inv.client_id),
        remaining,
        daysOverdue,
        bucket,
      };
    })
    .filter((a): a is AgingInvoice => a !== null);

  const bucketTotals: Record<AgingBucket, number> = {
    current: 0,
    '1-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
  };

  const bucketCounts: Record<AgingBucket, number> = { ...bucketTotals };

  for (const ai of agingInvoices) {
    bucketTotals[ai.bucket] += ai.remaining;
    bucketCounts[ai.bucket]++;
  }

  const totalAging = Object.values(bucketTotals).reduce((s, v) => s + v, 0);

  const sorted = [...agingInvoices].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'number': return dir * a.invoice.invoice_number.localeCompare(b.invoice.invoice_number);
      case 'client': return dir * a.clientName.localeCompare(b.clientName);
      case 'total': return dir * (a.invoice.total - b.invoice.total);
      case 'remaining': return dir * (a.remaining - b.remaining);
      case 'due_date': {
        const da = a.invoice.due_date || '';
        const db = b.invoice.due_date || '';
        return dir * da.localeCompare(db);
      }
      case 'days_overdue': return dir * (a.daysOverdue - b.daysOverdue);
      case 'status': return dir * a.invoice.status.localeCompare(b.invoice.status);
      default: return 0;
    }
  });

  const toggleSort = (key: AgingSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: AgingSortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={10} className="text-[var(--text-tertiary)]" />;
    return sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  };

  const openPaymentModal = (invId: string) => {
    const inv = invoices.find((i) => i.id === invId);
    if (!inv) return;
    const paidTotal = (payments[invId] || []).reduce((s, p) => s + p.amount, 0);
    const remaining = Math.max(0, inv.total - paidTotal);
    setPaymentInvId(invId);
    setPaymentForm({
      amount: remaining > 0 ? remaining.toString() : inv.total.toString(),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Bank Transfer',
      reference: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentInvId || !paymentForm.amount) return;
    setPaymentSaving(true);
    try {
      const amount = parseFloat(paymentForm.amount);
      const inv = invoices.find((i) => i.id === paymentInvId);
      await addPayment({
        invoice_id: paymentInvId,
        amount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      if (inv) {
        const existingPayments = payments[paymentInvId] || [];
        const paidTotal = existingPayments.reduce((s, p) => s + p.amount, 0) + amount;
        if (paidTotal >= inv.total) {
          await updateInvoice({ ...inv, status: 'paid' as const, paid_at: paymentForm.payment_date });
        } else if (paidTotal > 0 && inv.status !== 'partial') {
          await updateInvoice({ ...inv, status: 'partial' as const });
        }
      }
      setShowPaymentModal(false);
      addToast('Payment recorded', 'success');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to record payment', 'error');
    } finally { setPaymentSaving(false); }
  };

  if (agingInvoices.length === 0) {
    return (
      <Card className="text-center py-16 flex flex-col items-center">
        <Check size={40} className="text-[var(--accent)] mb-4" />
        <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">All invoices are paid. Nice work.</h3>
      </Card>
    );
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {bucketOrder.map((bucket) => (
          <div key={bucket} style={{ borderTop: `3px solid ${bucketColor[bucket]}` }}>
            <Card className="text-center">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">{bucketLabel[bucket]}</p>
              <p className="text-sm font-semibold" style={{ color: bucketColor[bucket] }}>{fmt(bucketTotals[bucket])}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{bucketCounts[bucket]} invoice{bucketCounts[bucket] !== 1 ? 's' : ''}</p>
            </Card>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Outstanding & Partial Invoices</h3>
        <span className="text-xs text-[var(--text-secondary)]">Total: <strong className="text-[var(--text-primary)]">{fmt(totalAging)}</strong> across {agingInvoices.length} invoice{agingInvoices.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-color)]">
              {([
                ['number', 'Invoice #'],
                ['client', 'Client'],
                ['total', 'Amount'],
                ['remaining', 'Remaining'],
                ['due_date', 'Due Date'],
                ['days_overdue', 'Days Overdue'],
                ['status', 'Status'],
              ] as [AgingSortKey, string][]).map(([key, label]) => (
                <th key={key} className="text-left px-3 py-2 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] select-none whitespace-nowrap" onClick={() => toggleSort(key)}>
                  <span className="flex items-center gap-1">{label}<SortIcon col={key} /></span>
                </th>
              ))}
              <th className="text-right px-3 py-2 font-medium text-[var(--text-secondary)]">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ai) => {
              const { invoice: inv } = ai;
              return (
                <tr key={inv.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-secondary)]/50">
                  <td className="px-3 py-2 text-[var(--text-primary)] font-medium">{inv.invoice_number}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{ai.clientName}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] tabular-nums">{fmt(inv.total)}</td>
                  <td className="px-3 py-2 tabular-nums font-medium" style={{ color: ai.remaining > 0 ? bucketColor[ai.bucket] : 'var(--accent)' }}>{fmt(ai.remaining)}</td>
                  <td className="px-3 py-2 text-[var(--text-tertiary)]">{inv.due_date ? relativeDate(inv.due_date) : '—'}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1" style={{ color: bucketColor[ai.bucket] }}>
                      {ai.bucket === '90+' && <AlertTriangle size={10} />}
                      <span className="font-medium">{ai.daysOverdue > 0 ? ai.daysOverdue : '—'}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium`} style={{ backgroundColor: bucketBg[ai.bucket], color: bucketColor[ai.bucket] }}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => openPaymentModal(inv.id)} className="text-[10px] text-[var(--accent)] hover:underline whitespace-nowrap">
                      <DollarSign size={10} className="inline mr-0.5" />Record Payment
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--border-color)] font-medium">
              <td className="px-3 py-2 text-[var(--text-secondary)]" colSpan={2}>Total ({agingInvoices.length})</td>
              <td className="px-3 py-2 text-[var(--text-primary)] tabular-nums">{fmt(agingInvoices.reduce((s, a) => s + a.invoice.total, 0))}</td>
              <td className="px-3 py-2 text-[var(--text-primary)] tabular-nums">{fmt(totalAging)}</td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment" size="sm">
        <div className="space-y-4">
          {(() => {
            const inv = invoices.find((i) => i.id === paymentInvId);
            return inv ? (
              <div className="px-3 py-2 rounded-[8px] bg-[var(--bg-secondary)]">
                <p className="text-xs font-medium text-[var(--text-primary)]">{inv.invoice_number}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{getClientName(inv.client_id)} &middot; {fmt(inv.total)}</p>
              </div>
            ) : null;
          })()}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Payment Date</label>
            <input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Amount Received</label>
            <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Payment Method</label>
            <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
              {['Bank Transfer', 'E-Transfer', 'Cash', 'Cheque', 'Credit Card', 'PayPal', 'Stripe', 'Wise', 'Crypto', 'Other'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Reference / Transaction ID</label>
            <input type="text" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="Optional" className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Optional" rows={2} className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)} size="sm">Cancel</Button>
            <Button onClick={handleRecordPayment} loading={paymentSaving} disabled={!paymentForm.amount} size="sm">Record Payment</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function relativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}
