import { formatCurrency } from '../../utils/format';
import type {
  CashFlowItem,
  RevenueForecastItem,
  ExpenseForecastItem,
  ForecastMetrics,
  ScenarioParams,
} from '../../lib/forecast';
import type { Expense } from '../../types';

/** Shared bits for the Finance split (wave3/4). MoneyLines moved verbatim. */

export function MoneyLines({
  byCurrency,
  size = 'md',
  fallbackCur = 'CAD',
}: {
  byCurrency: Record<string, number>;
  size?: 'md' | 'sm';
  fallbackCur?: string;
}) {
  const rows = Object.entries(byCurrency)
    .filter(([, amt]) => amt !== 0)
    .sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) {
    return (
      <span
        className={`inline-flex tnum ${size === 'md' ? 'text-[19px] leading-snug' : 'text-xs'} font-semibold text-[var(--text-primary)] whitespace-nowrap`}
      >
        {formatCurrency(0, fallbackCur)}{' '}
        <span
          className={`${size === 'md' ? 'text-[11px]' : 'text-[10px]'} font-medium text-[var(--text-secondary)]`}
        >
          {fallbackCur}
        </span>
      </span>
    );
  }
  return (
    <span className={`inline-flex flex-col tnum ${size === 'md' ? 'gap-1' : 'gap-0.5'}`}>
      {rows.map(([cur, amt]) => (
        <span
          key={cur}
          className={`${size === 'md' ? 'text-[19px] leading-snug' : 'text-xs'} font-semibold text-[var(--text-primary)] whitespace-nowrap`}
          title={`${formatCurrency(amt, cur)} ${cur}`}
        >
          {formatCurrency(amt, cur)}{' '}
          <span
            className={`${size === 'md' ? 'text-[11px]' : 'text-[10px]'} font-medium text-[var(--text-secondary)]`}
          >
            {cur}
          </span>
        </span>
      ))}
    </span>
  );
}

export interface OverviewVisible {
  total: number;
  visible: Expense[];
  hasMore: boolean;
  showMore: () => void;
}

/**
 * Shell-owned computations + handlers passed to Finance sections.
 * Sections read store data directly where already subscribed; the bag
 * carries shell-local state, handlers, and derived figures.
 */
export interface FinanceBag {
  fmt: (n: number) => string;
  profCur: string;
  currency: string | undefined;
  rates: Record<string, number>;
  hasMixedCurrencies: boolean;
  showConverted: boolean;
  ratesCoverAll: boolean;
  foreignCurs: string[];
  invoiceCurrencies: Set<string>;
  curFilter: string;
  setCurFilter: (c: string) => void;
  expandedMonth: string | null;
  setExpandedMonth: (m: string | null) => void;
  showRates: boolean;
  setShowRates: (v: boolean | ((s: boolean) => boolean)) => void;
  rateDrafts: Record<string, string>;
  setRateDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  savingRates: boolean;
  saveRate: (cur: string, raw: string) => void;
  revenueByCurrency: Record<string, number>;
  outstandingByCurrency: Record<string, number>;
  atRiskSlowPayers: number;
  atRiskProfTotal: number;
  totalPaidRevenue: number;
  totalExpenses: number;
  totalOutstanding: number;
  profit: number;
  convRevenue: number | null;
  convOutstanding: number | null;
  convProfit: number | null;
  monthlyPaidByCurrency: Record<string, Record<string, number>>;
  monthlyExpenses: Record<string, number>;
  monthlyPaid: Record<string, number>;
  allMonths: string[];
  expensesByCategory: { category: string; total: number }[];
  pagedExpenses: OverviewVisible;
  expenses: Expense[];
  foreignFiltered: boolean;
  openNew: () => void;
  openEdit: (e: Expense) => void;
  setConfirmDelete: (v: { id: string; description: string } | null) => void;
  setShowBankImport: (v: boolean) => void;
  forecastMetrics: ForecastMetrics;
  revenueForecast: RevenueForecastItem[];
  expenseForecast: ExpenseForecastItem[];
  cashFlow: CashFlowItem[];
  maxRevenue: number;
  maxExpense: number;
  avgIncome: number;
  avgExpenses: number;
  avgClientRevenue: number;
  currentBalance: string;
  setCurrentBalance: (v: string) => void;
  scenario: ScenarioParams;
  setScenario: (v: ScenarioParams) => void;
}
