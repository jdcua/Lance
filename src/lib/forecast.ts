import type { RecurringInvoice, Invoice, Expense, Project, Milestone } from '../types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface ForecastMonth {
  label: string;
  key: string;
}

export interface RevenueForecastItem {
  month: ForecastMonth;
  confirmed: number;
  probable: number;
  projected: number;
  baseline: number;
}

export interface ExpenseForecastItem {
  month: ForecastMonth;
  known: number;
  projected: number;
  baseline: number;
}

export interface CashFlowItem {
  month: ForecastMonth;
  income: number;
  expenses: number;
  net: number;
  runningBalance?: number;
}

export interface ScenarioParams {
  newClientsPerMonth: number;
  rateIncrease: number;
  expenseGrowth: number;
  mode: 'optimistic' | 'base' | 'conservative';
}

export interface ForecastMetrics {
  projectedNextMonth: number;
  projectedNextQuarter: number;
  revenueCertainty: number;
  monthsOfRunway: number | null;
}

export function getNextMonths(count: number): ForecastMonth[] {
  const now = new Date();
  const months: ForecastMonth[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    months.push({ label, key });
  }
  return months;
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (ay - by) * 12 + (am - bm);
}

function frequencyMonths(freq: string): number {
  switch (freq) {
    case 'weekly': return 1 / 4;
    case 'biweekly': return 0.5;
    case 'monthly': return 1;
    case 'quarterly': return 3;
    default: return 1;
  }
}

function occurrencesInMonth(sourceKey: string, freqMonths: number, monthKey: string): number {
  const diff = monthDiff(monthKey, sourceKey);
  if (diff < 0) return 0;

  const kMin = Math.ceil(diff / freqMonths);
  const kMax = Math.ceil((diff + 1) / freqMonths) - 1;
  return Math.max(0, kMax - kMin + 1);
}

function computeRecurringInvoicesByMonth(
  recurringInvoices: RecurringInvoice[],
  forecastMonths: ForecastMonth[],
  thisMonthKey: string,
): Record<string, number> {
  const result: Record<string, number> = {};
  const active = recurringInvoices.filter((r) => r.active);

  for (const ri of active) {
    const freqMonths = frequencyMonths(ri.frequency);
    const startKey = ri.next_due ? ri.next_due.substring(0, 7) : thisMonthKey;

    for (const fm of forecastMonths) {
      if (fm.key < startKey) continue;
      const occurs = occurrencesInMonth(startKey, freqMonths, fm.key);
      if (occurs > 0) {
        result[fm.key] = (result[fm.key] || 0) + ri.total * occurs;
      }
    }
  }

  return result;
}

function computeMilestoneInvoicesByMonth(
  projects: Project[],
  milestonesByProject: Record<string, Milestone[]>,
  forecastMonths: ForecastMonth[],
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const project of projects) {
    if (project.status !== 'active' || !project.budget) continue;

    const milestones = milestonesByProject[project.id] || [];
    const invoiceMilestones = milestones.filter(
      (m) => m.invoice_on_completion && m.due_date,
    );

    if (invoiceMilestones.length > 0) {
      const sharePerMilestone = project.budget / invoiceMilestones.length;
      for (const ms of invoiceMilestones) {
        const msMonth = ms.due_date!.substring(0, 7);
        for (const fm of forecastMonths) {
          if (fm.key === msMonth) {
            result[fm.key] = (result[fm.key] || 0) + sharePerMilestone;
          }
        }
      }
    } else if (project.end_date) {
      const startKey = project.start_date
        ? project.start_date.substring(0, 7)
        : thisMonthKeyFromMonths(forecastMonths);
      const endKey = project.end_date.substring(0, 7);
      const totalMonths = monthDiff(endKey, startKey) + 1;
      if (totalMonths > 0) {
        const perMonth = project.budget / totalMonths;
        for (const fm of forecastMonths) {
          if (fm.key >= startKey && fm.key <= endKey) {
            result[fm.key] = (result[fm.key] || 0) + perMonth;
          }
        }
      }
    }
  }

  return result;
}

function thisMonthKeyFromMonths(forecastMonths: ForecastMonth[]): string {
  if (forecastMonths.length > 0) return forecastMonths[0].key;
  return getMonthKey(new Date());
}

function computeSentInvoicesByMonth(
  invoices: Invoice[],
  forecastMonths: ForecastMonth[],
): Record<string, number> {
  const result: Record<string, number> = {};
  const sent = invoices.filter((i) => i.status === 'sent' && i.due_date);

  for (const inv of sent) {
    const invMonth = inv.due_date!.substring(0, 7);
    for (const fm of forecastMonths) {
      if (fm.key === invMonth) {
        result[fm.key] = (result[fm.key] || 0) + inv.total;
      }
    }
  }

  return result;
}

export function computeAvgMonthlyPaid(
  monthlyPaid: Record<string, number>,
): number {
  const months = Object.keys(monthlyPaid).sort().reverse().slice(0, 3);
  if (months.length === 0) return 0;
  return months.reduce((sum, m) => sum + monthlyPaid[m], 0) / months.length;
}

export function computeAvgMonthlyExpenses(
  monthlyExpenses: Record<string, number>,
): number {
  const months = Object.keys(monthlyExpenses).sort().reverse().slice(0, 3);
  if (months.length === 0) return 0;
  return months.reduce((sum, m) => sum + monthlyExpenses[m], 0) / months.length;
}

export function computeAvgClientRevenue(
  invoices: Invoice[],
): number {
  const paid = invoices.filter((i) => i.status === 'paid');
  if (paid.length === 0) return 0;
  const uniqueClients = new Set(paid.map((i) => i.client_id));
  if (uniqueClients.size === 0) return 0;
  const totalPaid = paid.reduce((sum, i) => sum + i.total, 0);
  return totalPaid / uniqueClients.size;
}

export function computeRevenueForecast(
  recurringInvoices: RecurringInvoice[],
  invoices: Invoice[],
  projects: Project[],
  milestonesByProject: Record<string, Milestone[]>,
  monthlyPaid: Record<string, number>,
  forecastMonths: ForecastMonth[],
): RevenueForecastItem[] {
  const thisMonth = forecastMonths.length > 0 ? forecastMonths[0].key : getMonthKey(new Date());

  const recurring = computeRecurringInvoicesByMonth(recurringInvoices, forecastMonths, thisMonth);
  const milestone = computeMilestoneInvoicesByMonth(projects, milestonesByProject, forecastMonths);
  const sent = computeSentInvoicesByMonth(invoices, forecastMonths);
  const baseline = computeAvgMonthlyPaid(monthlyPaid);

  return forecastMonths.map((m) => {
    const confirmed = Math.round((recurring[m.key] || 0) + (milestone[m.key] || 0));
    const probable = Math.round(sent[m.key] || 0);
    const totalCommitted = confirmed + probable;
    const projected = Math.max(0, Math.round(baseline - totalCommitted));
    return {
      month: m,
      confirmed,
      probable,
      projected,
      baseline: Math.round(baseline),
    };
  });
}

export function computeExpenseForecast(
  expenses: Expense[],
  monthlyExpenses: Record<string, number>,
  forecastMonths: ForecastMonth[],
): ExpenseForecastItem[] {
  const thisMonth = forecastMonths.length > 0 ? forecastMonths[0].key : getMonthKey(new Date());
  const baseline = computeAvgMonthlyExpenses(monthlyExpenses);

  const knownByMonth: Record<string, number> = {};

  const recurring = expenses.filter((e) => e.recurring);
  for (const exp of recurring) {
    const freq = exp.frequency || 'monthly';
    const freqMonths = frequencyMonths(freq);
    const startKey = exp.date.substring(0, 7);

    for (const fm of forecastMonths) {
      if (fm.key < startKey) continue;
      const occurs = occurrencesInMonth(startKey, freqMonths, fm.key);
      if (occurs > 0) {
        knownByMonth[fm.key] = (knownByMonth[fm.key] || 0) + exp.amount * occurs;
      }
    }
  }

  return forecastMonths.map((m) => {
    const known = Math.round(knownByMonth[m.key] || 0);
    const baselineRound = Math.round(baseline);
    const projected = Math.max(0, Math.round(baseline - known));
    return {
      month: m,
      known,
      projected,
      baseline: baselineRound,
    };
  });
}

export function computeCashFlow(
  revenueItems: RevenueForecastItem[],
  expenseItems: ExpenseForecastItem[],
  currentBalance?: number,
): CashFlowItem[] {
  let running = currentBalance ?? 0;

  return revenueItems.map((rev, i) => {
    const exp = expenseItems[i];
    const income = rev.confirmed + rev.probable + rev.projected;
    const expenses = exp.known + exp.projected;
    const net = income - expenses;
    running += net;
    return {
      month: rev.month,
      income,
      expenses,
      net,
      runningBalance: currentBalance !== undefined ? running : undefined,
    };
  });
}

export function applyScenario(
  revenueItems: RevenueForecastItem[],
  expenseItems: ExpenseForecastItem[],
  avgClientRevenue: number,
  params: ScenarioParams,
): { revenue: RevenueForecastItem[]; expenses: ExpenseForecastItem[] } {
  const modeMultiplier = params.mode === 'optimistic' ? 1.2 : params.mode === 'conservative' ? 0.8 : 1.0;
  const rateMultiplier = (1 + params.rateIncrease / 100) * modeMultiplier;
  const expenseMultiplier = 1 + params.expenseGrowth / 100;

  const newRevenue: RevenueForecastItem[] = revenueItems.map((item, i) => {
    if (i === 0) {
      return {
        ...item,
        confirmed: Math.round(item.confirmed * rateMultiplier),
        probable: Math.round(item.probable * rateMultiplier),
        projected: Math.round(item.projected * rateMultiplier),
        baseline: Math.round(item.baseline * rateMultiplier),
      };
    }
    const extraClients = Math.round(params.newClientsPerMonth * avgClientRevenue * rateMultiplier * i);
    return {
      ...item,
      confirmed: Math.round(item.confirmed * rateMultiplier) + extraClients,
      probable: Math.round(item.probable * rateMultiplier),
      projected: Math.round(item.projected * rateMultiplier),
      baseline: Math.round(item.baseline * rateMultiplier),
    };
  });

  const newExpenses: ExpenseForecastItem[] = expenseItems.map((item) => ({
    ...item,
    known: Math.round(item.known * expenseMultiplier),
    projected: Math.round(item.projected * expenseMultiplier),
    baseline: Math.round(item.baseline * expenseMultiplier),
  }));

  return { revenue: newRevenue, expenses: newExpenses };
}

export function computeForecastMetrics(
  revenueItems: RevenueForecastItem[],
  expenseItems: ExpenseForecastItem[],
  forecastMonths: ForecastMonth[],
  currentBalance?: number,
): ForecastMetrics {
  if (revenueItems.length === 0) {
    return {
      projectedNextMonth: 0,
      projectedNextQuarter: 0,
      revenueCertainty: 0,
      monthsOfRunway: currentBalance !== undefined ? null : null,
    };
  }

  const nextMonth = revenueItems[0];
  const projectedNextMonth = nextMonth.confirmed + nextMonth.probable + nextMonth.projected;

  const quarterItems = revenueItems.slice(0, 3);
  const projectedNextQuarter = quarterItems.reduce(
    (sum, item) => sum + item.confirmed + item.probable + item.projected,
    0,
  );

  const totalConfirmed = revenueItems.reduce((sum, item) => sum + item.confirmed, 0);
  const totalProjected = revenueItems.reduce(
    (sum, item) => sum + item.confirmed + item.probable + item.projected,
    0,
  );
  const revenueCertainty = totalProjected > 0 ? Math.round((totalConfirmed / totalProjected) * 100) : 0;

  let monthsOfRunway: number | null = null;
  if (currentBalance !== undefined && currentBalance > 0) {
    const cashFlowItems = computeCashFlow(revenueItems, expenseItems, currentBalance);
    let balance = currentBalance;
    let months = 0;
    for (const cf of cashFlowItems) {
      balance = cf.runningBalance!;
      if (balance <= 0) break;
      months++;
    }
    monthsOfRunway = months > 0 ? months : null;
  }

  return {
    projectedNextMonth,
    projectedNextQuarter,
    revenueCertainty,
    monthsOfRunway,
  };
}
