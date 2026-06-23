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
import { Plus, Pencil, Trash2, BarChart3, TrendingUp } from 'lucide-react';

const categories = ['Software', 'Equipment', 'Office', 'Travel', 'Marketing', 'Taxes', 'Other'];

export default function Finance() {
  const { expenses, loadExpenses, addExpense, updateExpense, removeExpense, invoices, loadInvoices, profile, recurringInvoices, loadRecurringInvoices, projects, loadProjects, milestones, loadMilestones } = useStore();
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
  const [tab, setTab] = useState<'overview' | 'forecast'>('overview');
  const [showForecast, setShowForecast] = useState(false);
  const [currentBalance, setCurrentBalance] = useState('');
  const [scenario, setScenario] = useState<ScenarioParams>({ newClientsPerMonth: 0, rateIncrease: 0, expenseGrowth: 0, mode: 'base' });

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([loadExpenses(), loadInvoices(), loadRecurringInvoices(), loadProjects()]);
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
                        className="w-[45%] rounded-t-[3px] bg-[#A32D2D]"
                        style={{ height: `${(m.known / maxExpense) * 100}%`, minHeight: m.known > 0 ? '3px' : 0 }}
                        title={`Known: ${fmt(m.known)}`}
                      />
                      <div
                        className="w-[45%] rounded-t-[3px] bg-[#A32D2D]/30"
                        style={{ height: `${(m.projected / maxExpense) * 100}%`, minHeight: m.projected > 0 ? '3px' : 0 }}
                        title={`Projected: ${fmt(m.projected)}`}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">{m.month.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-5 pt-3 mt-2 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#A32D2D]" /><span className="text-[10px] text-[var(--text-secondary)]">Known Recurring</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#A32D2D]/30" /><span className="text-[10px] text-[var(--text-secondary)]">Trend Projection</span></div>
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
                      className={`w-full rounded-t-[3px] ${cf.net >= 0 ? 'bg-[var(--accent)]' : 'bg-[#A32D2D]'}`}
                      style={{ height: `${Math.min(100, (Math.abs(cf.net) / Math.max(1, ...cashFlow.map((c) => Math.abs(c.net)))) * 100)}%`, minHeight: cf.net !== 0 ? '3px' : 0 }}
                      title={`Net: ${fmt(cf.net)}`}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">{cf.month.label}</span>
                  <span className={`text-[10px] font-medium ${cf.net >= 0 ? 'text-[var(--accent)]' : 'text-[#A32D2D]'}`}>{fmt(cf.net)}</span>
                  {cf.runningBalance !== undefined && (
                    <span className={`text-[9px] ${cf.runningBalance >= 0 ? 'text-[var(--text-secondary)]' : 'text-[#A32D2D]'}`}>Bal: {fmt(cf.runningBalance)}</span>
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
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.recurring ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {form.recurring && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]"
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
    </div>
  );
}
