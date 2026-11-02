import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import MetricCard from '../../components/ui/MetricCard';
import { MoreRows } from '../../components/ui/useVisibleList';
import YearSummary from '../../components/features/YearSummary';
import RetainerBurnDown from '../../components/features/RetainerBurnDown';
import { formatMonth, formatDate, formatCurrency } from '../../utils/format';
import { Plus, Pencil, Trash2, BarChart3, ChevronDown, Upload } from 'lucide-react';
import { MoneyLines, type FinanceBag } from './shared';
import AffordabilityBanner from './AffordabilityBanner';

/**
 * Finance overview tab: summary cards, monthly table, expenses, rates.
 * Pure relocation from Finance.tsx; computations stay in the shell.
 */
export default function OverviewSection({ bag }: { bag: FinanceBag }) {
  const {
    fmt, hasMixedCurrencies, showConverted, profCur, rates, invoiceCurrencies,
    curFilter, setCurFilter, expandedMonth, setExpandedMonth, showRates, setShowRates,
    rateDrafts, setRateDrafts, savingRates, saveRate, ratesCoverAll, foreignCurs,
    revenueByCurrency, outstandingByCurrency, atRiskSlowPayers, atRiskProfTotal, totalPaidRevenue, totalExpenses,
    totalOutstanding, profit, convRevenue, convOutstanding, convProfit,
    monthlyPaidByCurrency, monthlyExpenses, monthlyPaid, allMonths,
    expensesByCategory, pagedExpenses, openNew, openEdit, setConfirmDelete,
    setShowBankImport, expenses, foreignFiltered,
  } = bag;
  return (
    <>
      <AffordabilityBanner monthlyPaid={monthlyPaid} monthlyExpenses={monthlyExpenses} fmt={fmt} />
          {hasMixedCurrencies && (
            <div className="mb-4 px-3 py-2 rounded-[8px] bg-[var(--info-bg)] border border-[var(--info)]/20 flex items-start gap-2 text-xs">
              <span className="text-[var(--info-ink,var(--info))] mt-px flex-shrink-0">ⓘ</span>
              <span className="text-[var(--text-secondary)]">
                {showConverted ? (
                  <>
                    Totals converted to {profCur} at your manual rates (≈). Per-currency lines stay
                    exact. Expenses are tracked in {profCur}.
                  </>
                ) : (
                  <>
                    Revenue and outstanding are shown per currency — never converted, never summed.
                    Expenses are tracked in {profCur}.
                  </>
                )}
              </span>
            </div>
          )}
          {hasMixedCurrencies && (
            <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Currency filter">
              {['all', ...Array.from(invoiceCurrencies).sort()].map((c) => (
                <button
                  key={c}
                  onClick={() => setCurFilter(c)}
                  aria-pressed={curFilter === c}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                    curFilter === c
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] ring-1 ring-[var(--accent)]/40 font-semibold'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {c === 'all' ? 'All currencies' : c}
                </button>
              ))}
            </div>
          )}
          {hasMixedCurrencies && (
            <div className="mb-4">
              <button
                onClick={() => setShowRates((s) => !s)}
                aria-expanded={showRates}
                className="text-xs font-medium text-[var(--accent-ink,var(--accent))] hover:underline"
              >
                {showRates
                  ? 'Hide exchange rates'
                  : ratesCoverAll
                    ? 'Edit exchange rates'
                    : 'Add exchange rates to convert totals'}
              </button>
              {showRates && (
                <div className="mt-2 p-3 rounded-[8px] bg-[var(--bg-secondary)] space-y-2 max-w-sm">
                  {foreignCurs.map((c) => (
                    <label
                      key={c}
                      className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                    >
                      <span className="tnum font-medium text-[var(--text-primary)]">1 {c} =</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        disabled={savingRates}
                        value={rateDrafts[c] ?? rates[c]?.toString() ?? ''}
                        onChange={(e) => setRateDrafts((d) => ({ ...d, [c]: e.target.value }))}
                        onBlur={(e) => saveRate(c, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        aria-label={`Exchange rate: 1 ${c} in ${profCur}`}
                        placeholder="—"
                        className="w-24 px-2 py-1 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] tnum"
                      />
                      <span>{profCur}</span>
                    </label>
                  ))}
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Manual rates · display totals only, never changed automatically. Clear a field
                    to remove its rate.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <MetricCard
              label="Revenue (Paid)"
              value={
                showConverted && convRevenue != null ? (
                  <span className="inline-flex flex-col gap-1">
                    <span title={`Converted to ${profCur} at your manual rates`}>
                      ≈ {fmt(convRevenue)}
                    </span>
                    <MoneyLines byCurrency={revenueByCurrency} size="sm" fallbackCur={profCur} />
                  </span>
                ) : hasMixedCurrencies ? (
                  <MoneyLines
                    byCurrency={revenueByCurrency}
                    fallbackCur={curFilter !== 'all' ? curFilter : profCur}
                  />
                ) : (
                  fmt(totalPaidRevenue)
                )
              }
              color="green"
              subtext={showConverted ? `converted to ${profCur} at your rates` : undefined}
            />
            <MetricCard label={`Expenses · ${profCur}`} value={fmt(totalExpenses)} color="red" />
            <MetricCard
              label="Profit"
              value={
                showConverted && convProfit != null ? (
                  fmt(convProfit)
                ) : hasMixedCurrencies ? (
                  curFilter !== 'all' && curFilter !== profCur ? (
                    <MoneyLines byCurrency={revenueByCurrency} fallbackCur={curFilter} />
                  ) : (
                    fmt((revenueByCurrency[profCur] || 0) - totalExpenses)
                  )
                ) : (
                  fmt(profit)
                )
              }
              trend={!hasMixedCurrencies ? (profit >= 0 ? 'up' : 'down') : undefined}
              subtext={
                showConverted
                  ? `after ${fmt(totalExpenses)} expenses · converted at your rates`
                  : hasMixedCurrencies
                    ? curFilter !== 'all' && curFilter !== profCur
                      ? `before expenses · tracked in ${profCur}`
                      : `after ${fmt(totalExpenses)} expenses · other currencies untouched`
                    : profit >= 0
                      ? 'positive'
                      : 'negative'
              }
              color={
                (showConverted && convProfit != null
                  ? convProfit
                  : hasMixedCurrencies
                    ? (revenueByCurrency[profCur] || 0) - totalExpenses
                    : profit) >= 0
                  ? 'green'
                  : 'red'
              }
            />
            <MetricCard
              label="Outstanding"
              value={
                showConverted && convOutstanding != null ? (
                  <span className="inline-flex flex-col gap-1">
                    <span title={`Converted to ${profCur} at your manual rates`}>
                      ≈ {fmt(convOutstanding)}
                    </span>
                    <MoneyLines
                      byCurrency={outstandingByCurrency}
                      size="sm"
                      fallbackCur={profCur}
                    />
                  </span>
                ) : hasMixedCurrencies ? (
                  <MoneyLines
                    byCurrency={outstandingByCurrency}
                    fallbackCur={curFilter !== 'all' ? curFilter : profCur}
                  />
                ) : (
                  fmt(totalOutstanding)
                )
              }
              subtext={
                showConverted
                  ? `converted to ${profCur} at your rates`
                  : atRiskSlowPayers > 0
                    ? hasMixedCurrencies
                      ? `unpaid invoices · ${atRiskSlowPayers} slow payer${atRiskSlowPayers === 1 ? '' : 's'}`
                      : `unpaid invoices · ${fmt(atRiskProfTotal)} from ${atRiskSlowPayers} slow payer${atRiskSlowPayers === 1 ? '' : 's'}`
                    : 'unpaid invoices'
              }
              color="amber"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Monthly Overview{hasMixedCurrencies ? ' · per currency' : ''}
              </h2>
              {allMonths.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3
                    size={32}
                    className="mx-auto mb-2 text-[var(--text-tertiary)] opacity-40"
                  />
                  <p className="text-xs text-[var(--text-secondary)]">No data yet.</p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                    Paid invoices and expenses will show up here by month.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                    <span>Month</span>
                    {hasMixedCurrencies ? (
                      <span className="text-right">Income by currency</span>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 w-64 text-right">
                        <span>Income</span>
                        <span>Expenses</span>
                        <span>Net</span>
                      </div>
                    )}
                  </div>
                  {allMonths.map((month) => {
                    const expense = monthlyExpenses[month] || 0;
                    const income = monthlyPaid[month] || 0;
                    const net = income - expense;
                    if (!hasMixedCurrencies) {
                      return (
                        <div key={month} className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">{formatMonth(month)}</span>
                          <div className="grid grid-cols-3 gap-3 w-64 text-right">
                            <span
                              className="text-[var(--accent-ink,var(--accent))] truncate"
                              title={`Income ${fmt(income)}`}
                            >
                              +{fmt(income)}
                            </span>
                            <span
                              className="text-[var(--danger)] truncate"
                              title={`Expenses ${fmt(expense)}`}
                            >
                              -{fmt(expense)}
                            </span>
                            <span
                              className={`font-medium truncate ${net >= 0 ? 'text-[var(--accent-ink,var(--accent))]' : 'text-[var(--danger)]'}`}
                              title={`Net ${fmt(net)}`}
                            >
                              {fmt(net)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    const byCur = monthlyPaidByCurrency[month] || {};
                    const curs = Object.keys(byCur).sort();
                    const isOpen = expandedMonth === month;
                    const monthExpense = monthlyExpenses[month] || 0;
                    return (
                      <div key={month}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <button
                              onClick={() => setExpandedMonth(isOpen ? null : month)}
                              aria-label={
                                isOpen
                                  ? `Collapse ${month}`
                                  : `Expand ${month} per-currency breakdown`
                              }
                              aria-expanded={isOpen}
                              className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-[4px]"
                            >
                              <ChevronDown
                                size={13}
                                className={`transition-transform ${isOpen ? '' : '-rotate-90'}`}
                              />
                            </button>
                            <span className="text-[var(--text-secondary)]">
                              {formatMonth(month)}
                            </span>
                            <span className="text-[10px] text-[var(--text-tertiary)] tnum">
                              {curs.length === 0
                                ? 'no income'
                                : `${curs.length} ${curs.length === 1 ? 'currency' : 'currencies'}`}
                            </span>
                          </span>
                          <MoneyLines
                            byCurrency={byCur}
                            size="sm"
                            fallbackCur={curFilter !== 'all' ? curFilter : profCur}
                          />
                        </div>
                        {isOpen && (
                          <div className="mt-1.5 ml-5 pl-3 border-l-2 border-[var(--border-color)] space-y-1.5">
                            {curs.map((cur) => {
                              const inc = byCur[cur];
                              const exp = cur === profCur ? monthExpense : 0;
                              const net = inc - exp;
                              return (
                                <div
                                  key={cur}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-[4px] px-1.5 py-0.5 tnum">
                                    {cur}
                                  </span>
                                  <div className="grid grid-cols-3 gap-3 w-64 text-right">
                                    <span
                                      className="text-[var(--accent-ink,var(--accent))] truncate"
                                      title={`Income ${formatCurrency(inc, cur)}`}
                                    >
                                      +{formatCurrency(inc, cur)}
                                    </span>
                                    {cur === profCur ? (
                                      <span
                                        className="text-[var(--danger)] truncate"
                                        title={`Expenses ${fmt(exp)}`}
                                      >
                                        -{fmt(exp)}
                                      </span>
                                    ) : (
                                      <span
                                        className="text-[var(--text-tertiary)] truncate"
                                        title={`Expenses tracked in ${profCur}`}
                                      >
                                        —
                                      </span>
                                    )}
                                    <span
                                      className={`font-medium truncate ${net >= 0 ? 'text-[var(--accent-ink,var(--accent))]' : 'text-[var(--danger)]'}`}
                                      title={`Net ${formatCurrency(net, cur)}`}
                                    >
                                      {formatCurrency(net, cur)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {monthExpense > 0 && !curs.includes(profCur) && (
                              <p className="text-[10px] text-[var(--text-tertiary)]">
                                + {fmt(monthExpense)} expenses tracked in {profCur}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* TODO(v1.5): add exchange rate API or manual rate input for finance rollups */}
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Expenses by Category
              </h2>
              {expensesByCategory.length === 0 ? (
                <EmptyState
                  screen="expenses"
                  compact
                />
              ) : (
                <div className="space-y-2">
                  {expensesByCategory.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        <span className="text-xs text-[var(--text-primary)]">{cat.category}</span>
                      </div>
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        {fmt(cat.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Expenses</h2>
              {foreignFiltered && (
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Tracked in {profCur} · invoices filtered to {curFilter}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setShowBankImport(true)} size="sm">
                <Upload size={14} />
                Import bank CSV
              </Button>
              <Button onClick={openNew} size="sm">
                <Plus size={14} />
                Add Expense
              </Button>
            </div>
          </div>

          {expenses.length === 0 ? (
            <Card className="text-center py-16 flex flex-col items-center">
              <BarChart3 size={40} className="text-[var(--text-tertiary)] mb-4" />
              <h2 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">
                No expenses yet
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)] max-w-xs mb-5">
                Add an expense or mark an invoice paid to see your numbers.
              </p>
              <Button onClick={openNew} size="sm" variant="secondary">
                Add Expense
              </Button>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {pagedExpenses.visible.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[8px]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          {exp.description}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">&middot;</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {exp.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {formatDate(exp.date)}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-[var(--danger)] flex-shrink-0">
                      -{fmt(exp.amount)}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => openEdit(exp)}
                        aria-label="Edit expense"
                        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-[8px]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() =>
                          setConfirmDelete({ id: exp.id, description: exp.description })
                        }
                        aria-label="Delete expense"
                        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)] rounded-[8px]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <MoreRows
                total={pagedExpenses.total}
                shown={pagedExpenses.visible.length}
                hasMore={pagedExpenses.hasMore}
                showMore={pagedExpenses.showMore}
              />
            </>
          )}
          <div className="mt-6">
            <YearSummary />
          </div>
          <div className="mt-6">
            <RetainerBurnDown />
          </div>
        </>
);
}
