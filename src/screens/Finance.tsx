import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Expense, Invoice, InvoicePayment, Milestone } from '../types';
import Button from '../components/ui/Button';
import LoadError from '../components/ui/LoadError';
import Modal from '../components/ui/Modal';
import {
  formatCurrency,
  todayLocalISO,
} from '../utils/format';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useVisibleList } from '../components/ui/useVisibleList';
import BankImportModal from '../components/features/BankImportModal';
import { useToasts } from '../store/toastStore';
import type { ToastType } from '../store/toastStore';
import { checkAndNotify } from '../achievements/notify';
import { sanitizeInput, MAX_LENGTHS } from '../utils/sanitize';
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
import { TrendingUp } from 'lucide-react';
import { clientPaymentBehavior } from '../utils/paymentBehavior';
import { convertAmount, convertByCurrency, ratesCover, sanitizeRates } from '../lib/currency';
import OverviewSection from './finance/OverviewSection';
import ForecastSection from './finance/ForecastSection';
import AgingReport from './finance/AgingReport';
import type { FinanceBag } from './finance/shared';

const categories = ['Software', 'Equipment', 'Office', 'Travel', 'Marketing', 'Fees', 'Other'];


export default function Finance() {
  const {
    expenses,
    loadExpenses,
    addExpense,
    updateExpense,
    removeExpense,
    invoices,
    loadInvoices,
    profile,
    saveProfile,
    recurringInvoices,
    loadRecurringInvoices,
    projects,
    loadProjects,
    milestones,
    loadMilestones,
    payments,
    loadAllPayments,
    addPayment,
    updateInvoice,
    clients,
    loadClients,
    getFinanceSummary,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const financeError = useStore((s) => s.errors.expenses || s.errors.invoices);
  const currency = profile?.currency;
  const fmt = (amount: number) => formatCurrency(amount, currency);
  const [showModal, setShowModal] = useState(false);
  const [showBankImport, setShowBankImport] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; description: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    category: 'Other',
    description: '',
    amount: '',
    date: todayLocalISO(),
    recurring: false,
    frequency: 'monthly',
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'aging' | 'forecast'>('overview');
  const [curFilter, setCurFilter] = useState<string>('all');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [showRates, setShowRates] = useState(false);
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [savingRates, setSavingRates] = useState(false);
  const [currentBalance, setCurrentBalance] = useState('');
  const [scenario, setScenario] = useState<ScenarioParams>({
    newClientsPerMonth: 0,
    rateIncrease: 0,
    expenseGrowth: 0,
    mode: 'base',
  });

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([
        loadExpenses(),
        loadInvoices(),
        loadRecurringInvoices(),
        loadProjects(),
        loadAllPayments(),
        loadClients(),
      ]);
      const state = useStore.getState();
      const active = state.projects.filter((p) => p.status === 'active');
      if (active.length > 0) await loadMilestones();
    };
    loadAll()
      .catch((err) => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [
    loadExpenses,
    loadInvoices,
    loadRecurringInvoices,
    loadProjects,
    loadMilestones,
    addToast,
    loadAllPayments,
    loadClients,
  ]);

  const openNew = () => {
    setEditing(null);
    setForm({
      category: 'Other',
      description: '',
      amount: '',
      date: todayLocalISO(),
      recurring: false,
      frequency: 'monthly',
    });
    setShowModal(true);
  };

  // Global ⌘N dispatch (see App shortcuts).
  useEffect(() => {
    const handler = () => openNew();
    document.addEventListener('lance:add-expense', handler);
    return () => document.removeEventListener('lance:add-expense', handler);
  }, []);

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({
      category: exp.category,
      description: exp.description,
      amount: exp.amount.toString(),
      date: exp.date,
      recurring: exp.recurring || false,
      frequency: exp.frequency || 'monthly',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      const data = {
        category: form.category,
        description: sanitizeInput(form.description).slice(0, MAX_LENGTHS.description),
        amount: Math.max(0, parseFloat(form.amount) || 0),
        date: form.date,
        recurring: form.recurring,
        frequency: form.recurring ? form.frequency : undefined,
      };
      if (data.amount <= 0) {
        setSaving(false);
        addToast('Expense amount must be greater than zero', 'error');
        return;
      }
      // Typo guard: no real expense approaches a billion. Bank imports bypass
      // this (bank data is authoritative); the manual form does not.
      if (data.amount > 999999999.99) {
        setSaving(false);
        addToast('That amount looks off — please check for typos', 'error');
        return;
      }
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

  const { paidFromPayments, totalExpenses, totalPaidRevenue, totalOutstanding, profit } =
    getFinanceSummary();

  const expensesByCategory = categories
    .map((cat) => {
      const total = expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
      return { category: cat, total };
    })
    .filter((c) => c.total > 0);

  const monthlyExpenses: Record<string, number> = {};
  expenses.forEach((e) => {
    const month = e.date.substring(0, 7);
    monthlyExpenses[month] = (monthlyExpenses[month] || 0) + e.amount;
  });

  const invCurOf = (i: { currency?: string }) => i.currency || currency || 'CAD';
  const profCur = currency || 'CAD';
  // Currency filter scopes every invoice-derived number below. Expenses
  // carry no currency of their own and always stay in the profile currency.
  const finvoices =
    curFilter === 'all' ? invoices : invoices.filter((i) => invCurOf(i) === curFilter);
  const finIds = new Set(finvoices.map((i) => i.id));
  const foreignFiltered = curFilter !== 'all' && curFilter !== profCur;
  const pagedExpenses = useVisibleList(expenses, `${expenses.length}`);
  // Manual exchange rates: 1 foreign unit = N profile units. When every
  // non-draft invoice currency is covered, summary totals convert honestly
  // (forecast included); otherwise everything stays per-currency — never a
  // partial conversion. Converted display only applies to the unfiltered
  // view; a currency filter is already exact on its own.
  const rates = profile?.exchange_rates || {};
  const invoiceCurrencies = new Set(invoices.filter((i) => i.status !== 'draft').map(invCurOf));
  const hasMixedCurrencies = invoiceCurrencies.size > 1;
  const ratesCoverAll = ratesCover(invoiceCurrencies, profCur, rates);
  const showConverted = hasMixedCurrencies && ratesCoverAll && curFilter === 'all';
  const foreignCurs = [...invoiceCurrencies].filter((c) => c !== profCur).sort();
  const toProf = (amt: number, cur: string) => convertAmount(amt, cur, profCur, rates) ?? amt;
  const monthlyPaidByCurrency: Record<string, Record<string, number>> = {};
  const addMonthlyPaid = (month: string, cur: string, amount: number) => {
    monthlyPaidByCurrency[month] = monthlyPaidByCurrency[month] || {};
    monthlyPaidByCurrency[month][cur] = (monthlyPaidByCurrency[month][cur] || 0) + amount;
  };

  const monthlyPaid: Record<string, number> = {};
  if (paidFromPayments > 0) {
    Object.values(payments)
      .flat()
      .forEach((p) => {
        const inv = invoices.find((i) => i.id === p.invoice_id);
        // Orphan payments (invoice gone) are excluded from revenue, same as
        // getFinanceSummary — phantom money must never inflate totals.
        if (!inv) return;
        if (!finIds.has(inv.id)) return;
        const month = p.payment_date.substring(0, 7);
        const cur = invCurOf(inv);
        // Converted when rates cover everything so the forecast engine works
        // in one currency; otherwise the legacy mixed sum (marked directional).
        monthlyPaid[month] =
          (monthlyPaid[month] || 0) + (showConverted ? toProf(p.amount, cur) : p.amount);
        addMonthlyPaid(month, cur, p.amount);
      });
  } else {
    finvoices
      .filter((i) => i.status === 'paid' && i.paid_at)
      .forEach((i) => {
        const month = i.paid_at!.substring(0, 7);
        monthlyPaid[month] =
          (monthlyPaid[month] || 0) + (showConverted ? toProf(i.total, invCurOf(i)) : i.total);
        addMonthlyPaid(month, invCurOf(i), i.total);
      });
  }

  const allMonths = Array.from(
    new Set([...Object.keys(monthlyExpenses), ...Object.keys(monthlyPaid)]),
  )
    .sort()
    .reverse()
    .slice(0, 12);

  // ── Forecast computations ──
  const forecastMonths = getNextMonths(6);
  const avgClientRevenue = computeAvgClientRevenue(invoices);
  const milestonesByProject = milestones.reduce<Record<string, Milestone[]>>((acc, m) => {
    (acc[m.project_id] ??= []).push(m);
    return acc;
  }, {});

  const baseRevenue = computeRevenueForecast(
    recurringInvoices,
    invoices,
    projects,
    milestonesByProject,
    monthlyPaid,
    forecastMonths,
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

  const maxRevenue = Math.max(
    1,
    ...revenueForecast.map((d) => Math.max(d.confirmed, d.probable, d.projected, d.baseline)),
  );
  const maxExpense = Math.max(
    1,
    ...expenseForecast.map((d) => Math.max(d.known, d.projected, d.baseline)),
  );

  const outstandingByCurrency: Record<string, number> = {};
  finvoices
    .filter((i) => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue')
    .forEach((i) => {
      const cur = i.currency || currency || 'CAD';
      outstandingByCurrency[cur] = (outstandingByCurrency[cur] || 0) + i.total;
    });

  // At-risk revenue: unpaid totals owed by slow/risky payers, from their own
  // history. Amounts shown only in the profile currency; mixed-currency
  // views show the slow-payer count, never a cross-currency sum.
  const riskCache = new Map<string, string>();
  const atRiskRows = finvoices
    .filter((i) => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue')
    .filter((i) => {
      let r = riskCache.get(i.client_id || '');
      if (r === undefined) {
        r = clientPaymentBehavior(i.client_id || '', invoices, payments).risk;
        riskCache.set(i.client_id || '', r);
      }
      return r === 'slow' || r === 'risky';
    });
  const atRiskSlowPayers = new Set(atRiskRows.map((i) => i.client_id)).size;
  const atRiskProfTotal = atRiskRows
    .filter((i) => (i.currency || currency || 'CAD') === profCur)
    .reduce((s, i) => s + i.total, 0);

  const revenueByCurrency: Record<string, number> = {};
  finvoices
    .filter((i) => i.status === 'paid')
    .forEach((i) => {
      const cur = i.currency || currency || 'CAD';
      revenueByCurrency[cur] = (revenueByCurrency[cur] || 0) + i.total;
    });

  const convRevenue = showConverted ? convertByCurrency(revenueByCurrency, profCur, rates) : null;
  const convOutstanding = showConverted
    ? convertByCurrency(outstandingByCurrency, profCur, rates)
    : null;
  const convProfit = showConverted && convRevenue != null ? convRevenue - totalExpenses : null;

  // Typical-month inputs for MoneyFlow: trailing averages, read-only.
  const paidVals = Object.values(monthlyPaid);
  const expVals = Object.values(monthlyExpenses);
  const avgIncome = paidVals.length > 0 ? paidVals.reduce((s, v) => s + v, 0) / paidVals.length : 0;
  const avgExpenses = expVals.length > 0 ? expVals.reduce((s, v) => s + v, 0) / expVals.length : 0;

  const saveRate = async (cur: string, raw: string) => {
    if (!profile) return;
    const clean = sanitizeRates(rates);
    if (raw.trim() === '') {
      delete clean[cur];
    } else {
      const v = parseFloat(raw);
      if (!isFinite(v) || v <= 0) {
        addToast(`Rate for ${cur} must be a positive number`, 'error');
        setRateDrafts((d) => ({ ...d, [cur]: clean[cur]?.toString() || '' }));
        return;
      }
      clean[cur] = v;
    }
    setSavingRates(true);
    try {
      await saveProfile({ ...profile, exchange_rates: clean });
      setRateDrafts((d) => {
        const next = { ...d };
        delete next[cur];
        return next;
      });
    } catch {
      addToast('Could not save exchange rate', 'error');
    } finally {
      setSavingRates(false);
    }
  };

  // Section prop bag: shell-local state, handlers, and derived figures.
  // Sections are verbatim relocation; computations stay here.
  const bag: FinanceBag = {
    fmt, profCur, currency, rates,
    hasMixedCurrencies, showConverted, ratesCoverAll, foreignCurs, invoiceCurrencies,
    curFilter, setCurFilter, expandedMonth, setExpandedMonth,
    showRates, setShowRates, rateDrafts, setRateDrafts, savingRates, saveRate,
    revenueByCurrency, outstandingByCurrency, atRiskSlowPayers, atRiskProfTotal,
    totalPaidRevenue, totalExpenses, totalOutstanding, profit,
    convRevenue, convOutstanding, convProfit,
    monthlyPaidByCurrency, monthlyExpenses, monthlyPaid, allMonths,
    expensesByCategory, pagedExpenses, expenses, foreignFiltered,
    openNew, openEdit, setConfirmDelete, setShowBankImport,
    forecastMetrics, revenueForecast, expenseForecast, cashFlow,
    maxRevenue, maxExpense, avgIncome, avgExpenses, avgClientRevenue,
    currentBalance, setCurrentBalance, scenario, setScenario,
  };

  if (loading)
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
            ? 'text-[var(--accent-ink,var(--accent))] border-[var(--accent)]'
            : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
        }`}
      >
        Overview
      </button>
      <button
        onClick={() => setTab('aging')}
        className={`text-sm font-medium pb-1.5 border-b-2 transition-colors flex items-center gap-1.5 ${
          tab === 'aging'
            ? 'text-[var(--accent-ink,var(--accent))] border-[var(--accent)]'
            : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
        }`}
      >
        Aging
      </button>
      {/*
        Forecast tab is always visible. The projections engine (scenarios,
        cash flow, runway) shipped in the codebase but the tab was gated
        behind a flag that was never wired, so no user could reach it.
      */}
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
    </div>
  );

  return (
    <div className="p-6">
      <TabBar />
      <LoadError
        error={financeError}
        onRetry={() => {
          loadExpenses();
          loadInvoices();
        }}
      />

      {tab === 'overview' ? (
        <OverviewSection bag={bag} />
      ) : tab === 'aging' ? (
        <AgingReport
          invoices={finvoices}
          payments={payments.reduce<Record<string, InvoicePayment[]>>((acc, p) => {
            (acc[p.invoice_id] ??= []).push(p);
            return acc;
          }, {})}
          getClientName={(id: string) => clients.find((c) => c.id === id)?.name || 'Unknown'}
          fmt={fmt}
          addPayment={addPayment}
          updateInvoice={updateInvoice}
          addToast={(msg: string, type?: ToastType) => addToast(msg, type)}
          curFallback={profCur}
        />
      ) : (
        <ForecastSection bag={bag} />
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Expense' : 'Add Expense'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Category
            </label>
            <select aria-label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Description *
            </label>
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
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Amount *
              </label>
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, amount: Number(v) < 0 ? '0' : v });
                }}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Date
              </label>
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
              <label className="text-xs font-medium text-[var(--text-primary)]">
                Mark as Recurring
              </label>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    recurring: !form.recurring,
                    frequency: form.frequency || 'monthly',
                  })
                }
                className={`relative w-9 h-5 rounded-full transition-colors ${form.recurring ? 'bg-[var(--accent)]' : 'bg-[var(--border-color)]'}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--bg-card)] shadow transition-transform ${form.recurring ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
            {form.recurring && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Frequency
                </label>
                <select aria-label="Frequency"
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
            <Button variant="secondary" onClick={() => setShowModal(false)} size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!form.description.trim() || !form.amount}
              size="sm"
            >
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
      <BankImportModal open={showBankImport} onClose={() => setShowBankImport(false)} />
      <ArchetypeFeatureTabs screen="finance" />
    </div>
  );
}

