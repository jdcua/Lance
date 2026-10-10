import Card from '../../components/ui/Card';
import MetricCard from '../../components/ui/MetricCard';
import RunwayScrubber from '../../components/ui/RunwayScrubber';
import MoneyFlow from '../../components/ui/MoneyFlow';
import type { FinanceBag } from './shared';

/**
 * Finance forecast tab: metric cards, runway scrubber, money flow,
 * revenue/expense/cash-flow panels, scenario modeling. Pure relocation;
 * forecast.ts math stays untouched in the shell.
 */
export default function ForecastSection({ bag }: { bag: FinanceBag }) {
  const {
    fmt, hasMixedCurrencies, showConverted, profCur, curFilter,
    forecastMetrics, revenueForecast, expenseForecast, cashFlow,
    maxRevenue, maxExpense, avgIncome, avgExpenses,
    currentBalance, setCurrentBalance, scenario, setScenario, avgClientRevenue,
  } = bag;
  return (
        <>
          {hasMixedCurrencies && (
            <div className="mb-4 px-3 py-2 rounded-[8px] bg-[var(--info-bg)] border border-[var(--info)]/20 flex items-start gap-2 text-xs">
              <span className="text-[var(--info-ink,var(--info))] mt-px flex-shrink-0">ⓘ</span>
              <span className="text-[var(--text-secondary)]">
                {showConverted ? (
                  <>
                    Projections converted to {profCur} at your manual rates (≈). Tweak them under
                    Overview → exchange rates.
                  </>
                ) : curFilter !== 'all' ? (
                  <>
                    Projections scoped to {curFilter} by the Overview currency filter — switch it to
                    All currencies for the full picture.
                  </>
                ) : (
                  <>
                    Projections blend all currencies without conversion — treat them as directional,
                    and use the {profCur} filter on Overview for exact figures.
                  </>
                )}
              </span>
            </div>
          )}
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
              color={
                forecastMetrics.revenueCertainty >= 50
                  ? 'green'
                  : forecastMetrics.revenueCertainty >= 25
                    ? 'amber'
                    : 'red'
              }
              subtext="confirmed / projected"
              tooltip="Percentage of projected revenue that comes from confirmed sources"
            />
            <MetricCard
              label="Months of Runway"
              value={
                forecastMetrics.monthsOfRunway !== null ? `${forecastMetrics.monthsOfRunway}` : '--'
              }
              color={
                forecastMetrics.monthsOfRunway !== null && forecastMetrics.monthsOfRunway >= 6
                  ? 'green'
                  : forecastMetrics.monthsOfRunway !== null
                    ? 'amber'
                    : 'gray'
              }
              subtext={
                forecastMetrics.monthsOfRunway !== null
                  ? 'with current balance'
                  : 'enter balance to see'
              }
              tooltip="Months until projected balance reaches zero (requires current balance input)"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <RunwayScrubber cashFlow={cashFlow} fmt={fmt} />
            <MoneyFlow income={avgIncome} expenses={avgExpenses} fmt={fmt} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* PANEL 1 · Revenue Forecast */}
            <Card>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                Revenue Forecast
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mb-4">
                Projected revenue based on recurring invoices, milestones, sent invoices, and
                historical trends.
              </p>
              <div className="flex items-end gap-2" style={{ minHeight: '160px' }}>
                {revenueForecast.map((m) => (
                  <div
                    key={m.month.key}
                    className="flex-1 flex flex-col items-center gap-1 min-w-0"
                  >
                    <div className="w-full flex items-end justify-center gap-[2px] h-[120px]">
                      <div
                        className="w-[28%] rounded-t-[3px] bg-[var(--accent)]"
                        style={{
                          height: `${(m.confirmed / maxRevenue) * 100}%`,
                          minHeight: m.confirmed > 0 ? '3px' : 0,
                        }}
                        title={`Confirmed: ${fmt(m.confirmed)}`}
                      />
                      <div
                        className="w-[28%] rounded-t-[3px] bg-[var(--accent)]/50"
                        style={{
                          height: `${(m.probable / maxRevenue) * 100}%`,
                          minHeight: m.probable > 0 ? '3px' : 0,
                        }}
                        title={`Probable: ${fmt(m.probable)}`}
                      />
                      <div
                        className="w-[28%] rounded-t-[3px] bg-[var(--accent)]/20"
                        style={{
                          height: `${(m.projected / maxRevenue) * 100}%`,
                          minHeight: m.projected > 0 ? '3px' : 0,
                        }}
                        title={`Projected: ${fmt(m.projected)}`}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium truncate max-w-full">
                      {m.month.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-5 pt-3 mt-2 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[var(--accent)]" />
                  <span className="text-[10px] text-[var(--text-secondary)]">Confirmed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[var(--accent)]/50" />
                  <span className="text-[10px] text-[var(--text-secondary)]">Probable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[var(--accent)]/20" />
                  <span className="text-[10px] text-[var(--text-secondary)]">Projected</span>
                </div>
              </div>
            </Card>

            {/* PANEL 2 · Expense Forecast */}
            <Card>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                Expense Forecast
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mb-4">
                Projected expenses based on known recurring expenses and historical averages.
              </p>
              <div className="flex items-end gap-2" style={{ minHeight: '160px' }}>
                {expenseForecast.map((m) => (
                  <div
                    key={m.month.key}
                    className="flex-1 flex flex-col items-center gap-1 min-w-0"
                  >
                    <div className="w-full flex items-end justify-center gap-[2px] h-[120px]">
                      <div
                        className="w-[45%] rounded-t-[3px] bg-[var(--danger)]"
                        style={{
                          height: `${(m.known / maxExpense) * 100}%`,
                          minHeight: m.known > 0 ? '3px' : 0,
                        }}
                        title={`Known: ${fmt(m.known)}`}
                      />
                      <div
                        className="w-[45%] rounded-t-[3px] bg-[var(--danger)]/30"
                        style={{
                          height: `${(m.projected / maxExpense) * 100}%`,
                          minHeight: m.projected > 0 ? '3px' : 0,
                        }}
                        title={`Projected: ${fmt(m.projected)}`}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium truncate max-w-full">
                      {m.month.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-5 pt-3 mt-2 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[var(--danger)]" />
                  <span className="text-[10px] text-[var(--text-secondary)]">Known Recurring</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[var(--danger)]/30" />
                  <span className="text-[10px] text-[var(--text-secondary)]">Trend Projection</span>
                </div>
              </div>
            </Card>
          </div>

          {/* PANEL 3 · Cash Flow Projection */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Cash Flow Projection
                </h2>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Estimated. Month-by-month net: income - expenses.
                </p>
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
                <div key={cf.month.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="w-full flex flex-col items-center justify-end h-[110px]">
                    <div
                      className={`w-full rounded-t-[3px] ${cf.net >= 0 ? 'bg-[var(--accent)]' : 'bg-[var(--danger)]'}`}
                      style={{
                        height: `${Math.min(100, (Math.abs(cf.net) / Math.max(1, ...cashFlow.map((c) => Math.abs(c.net)))) * 100)}%`,
                        minHeight: cf.net !== 0 ? '3px' : 0,
                      }}
                      title={`Net: ${fmt(cf.net)}`}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium truncate max-w-full">
                    {cf.month.label}
                  </span>
                  <span
                    className={`text-[10px] font-medium truncate max-w-full ${cf.net >= 0 ? 'text-[var(--accent-ink,var(--accent))]' : 'text-[var(--danger)]'}`}
                  >
                    {fmt(cf.net)}
                  </span>
                  {cf.runningBalance !== undefined && (
                    <span
                      className={`text-[9px] truncate max-w-full ${cf.runningBalance >= 0 ? 'text-[var(--text-secondary)]' : 'text-[var(--danger)]'}`}
                    >
                      Bal: {fmt(cf.runningBalance)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* PANEL 4 · Scenario Modeling */}
          <Card className="mb-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              Scenario Modeling
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">
              Adjust sliders to see how changes affect projections. All values are estimates.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[var(--text-secondary)]">
                    New clients / month
                  </label>
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {scenario.newClientsPerMonth}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={scenario.newClientsPerMonth}
                  onChange={(e) =>
                    setScenario({ ...scenario, newClientsPerMonth: parseInt(e.target.value) })
                  }
                  className="w-full h-1.5 rounded-full appearance-none bg-[var(--border-color)] cursor-pointer accent-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  Each adds ~{fmt(avgClientRevenue)} to monthly projection
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[var(--text-secondary)]">Rate increase (%)</label>
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {scenario.rateIncrease}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={scenario.rateIncrease}
                  onChange={(e) =>
                    setScenario({ ...scenario, rateIncrease: parseInt(e.target.value) })
                  }
                  className="w-full h-1.5 rounded-full appearance-none bg-[var(--border-color)] cursor-pointer accent-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  Multiplies projected revenue by (1 + rate%)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[var(--text-secondary)]">Expense growth (%)</label>
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {scenario.expenseGrowth}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={scenario.expenseGrowth}
                  onChange={(e) =>
                    setScenario({ ...scenario, expenseGrowth: parseInt(e.target.value) })
                  }
                  className="w-full h-1.5 rounded-full appearance-none bg-[var(--border-color)] cursor-pointer accent-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  Scales projected expenses by (1 + growth%)
                </p>
              </div>

              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-2 block">
                  Projection Mode
                </label>
                <div className="flex gap-2">
                  {(['optimistic', 'base', 'conservative'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setScenario({ ...scenario, mode })}
                      className={`px-3 py-1.5 text-xs rounded-[8px] border transition-colors ${
                        scenario.mode === mode
                          ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent-ink,var(--accent))] font-medium'
                          : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {mode === 'optimistic' ? '+20%' : mode === 'conservative' ? '−20%' : 'Base'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  Adjusts projected revenue by ±20%
                </p>
              </div>
            </div>
          </Card>

          {/* Projected totals after scenario */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Scenario: 6-Mo Revenue"
              value={fmt(
                revenueForecast.reduce((s, m) => s + m.confirmed + m.probable + m.projected, 0),
              )}
              color="green"
              subtext="total 6-mo revenue"
            />
            <MetricCard
              label="Scenario: Next Quarter"
              value={fmt(
                revenueForecast
                  .slice(0, 3)
                  .reduce((s, m) => s + m.confirmed + m.probable + m.projected, 0),
              )}
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
                  expenseForecast.reduce((s, m) => s + m.known + m.projected, 0),
              )}
              color="purple"
              subtext="income - expenses"
            />
          </div>
        </>
);
}
