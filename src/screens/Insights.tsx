
import { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';
import ProgressBar from '../components/ui/ProgressBar';
import Sparkline from '../components/ui/Sparkline';
import { formatCurrency, DAY_MS } from '../utils/format';
import { useToasts } from '../store/toastStore';
import { Lightbulb, BarChart3, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';
import { getArchetype } from '../archetypes';
import ProInsights from '../components/features/ProInsights';

export default function Insights() {
  const { projects, loadProjects, invoices, loadInvoices, timeEntries, loadTimeEntries, clients, loadClients, proposals, loadProposals, expenses, loadExpenses, profile, loadProfile, headlineMetrics, loadHeadlineMetrics, getFinanceSummary } = useStore();
  const addToast = useToasts((s) => s.add);
  const [loaded, setLoaded] = useState(false);

  const archetype = useMemo(() => getArchetype(profile?.profession || 'default'), [profile?.profession]);

  useEffect(() => {
    Promise.all([
      loadProjects(),
      loadInvoices(),
      loadTimeEntries(),
      loadClients(),
      loadProposals(),
      loadExpenses(),
      loadProfile(),
      loadHeadlineMetrics(),
    ])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoaded(true));
  }, [loadProjects, loadInvoices, loadTimeEntries, loadClients, loadProposals, loadExpenses, loadProfile, addToast, loadHeadlineMetrics]);

  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const totalProjects = projects.length;

  // Money totals come from the one payment-aware summary (per-invoice
  // payment caps) — local status-sum copies drifted from Finance, showing
  // contradictory Outstanding balances for the same data.
  const { totalPaidRevenue: totalPaid, totalOutstanding } = getFinanceSummary();
  const overdueInvoices = invoices.filter((i) => i.status === 'partial' || i.status === 'overdue').length;

  const totalHoursTracked = timeEntries.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
  const hoursThisWeek = timeEntries.filter((t) => {
    const d = new Date(t.start_time);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    return d >= weekAgo;
  }).reduce((sum, t) => sum + (t.duration_minutes || 0), 0);

  const proposalsAccepted = proposals.filter((p) => p.status === 'accepted').length;
  const proposalsResolved = proposals.filter((p) => p.status !== 'draft' && p.status !== 'sent' && p.status !== 'expired').length;
  const winRate = proposalsResolved > 0 ? Math.round((proposalsAccepted / proposalsResolved) * 100) : 0;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profitMargin = totalPaid > 0 ? Math.round(((totalPaid - totalExpenses) / totalPaid) * 100) : 0;
  const invCur = (i: { currency?: string }) => i.currency || profile?.currency || 'CAD';
  const mixedInvoiceCurrencies = new Set(invoices.filter((i) => i.status !== 'draft').map(invCur)).size > 1;
  const moneyByCurrency = (list: { currency?: string; total: number }[]) => {
    const by: Record<string, number> = {};
    list.forEach((i) => { by[invCur(i)] = (by[invCur(i)] || 0) + i.total; });
    return Object.entries(by).map(([cur, amt]) => `${formatCurrency(amt, cur)} ${cur}`).join(' · ');
  };
  const formatMetricCurrency = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return v;
    return formatCurrency(n, profile?.currency);
  };

  // Client revenue ranking
  const clientRevenue: Record<string, { name: string; total: number; count: number; currencies: Set<string> }> = {};
  invoices.filter((i) => i.status === 'paid').forEach((inv) => {
    const client = clients.find((c) => c.id === inv.client_id);
    const name = client?.name || inv.client_id;
    if (!clientRevenue[inv.client_id]) {
      clientRevenue[inv.client_id] = { name, total: 0, count: 0, currencies: new Set() };
    }
    clientRevenue[inv.client_id].total += inv.total;
    clientRevenue[inv.client_id].count += 1;
    clientRevenue[inv.client_id].currencies.add(inv.currency || profile?.currency || 'CAD');
  });
  const topClients = Object.values(clientRevenue).sort((a, b) => b.total - a.total).slice(0, 5);

  // Time by project
  const projectTime: Record<string, { name: string; minutes: number }> = {};
  timeEntries.forEach((t) => {
    const project = projects.find((p) => p.id === t.project_id);
    const name = project?.title || t.project_id;
    if (!projectTime[t.project_id]) {
      projectTime[t.project_id] = { name, minutes: 0 };
    }
    projectTime[t.project_id].minutes += t.duration_minutes || 0;
  });
  const topProjectsByTime = Object.values(projectTime).sort((a, b) => b.minutes - a.minutes).slice(0, 5);

  const hiddenPanels = archetype.insights.hidePanels || [];

  if (!loaded) return (
    <div className="p-6">
      <div className="h-6 w-48 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
        <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
      </div>
    </div>
  );

  const hasMinimalData = invoices.length > 0 || projects.length > 0;

  if (!hasMinimalData) {
    return (
      <div className="p-6">
        <h1 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-6">{archetype.insights.headline}</h1>
        <Card className="text-center py-16 flex flex-col items-center">
          <Lightbulb size={40} className="text-[var(--text-tertiary)] mb-4" />
          <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">Not enough data yet</h3>
          <p className="text-[13px] text-[var(--text-secondary)] max-w-xs mb-5">Insights appear after you create an invoice or project. Start tracking to see your data.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">{archetype.insights.headline}</h2>

      {mixedInvoiceCurrencies && (
        <p className="text-[11px] text-[var(--text-tertiary)] mb-3">
          Invoices span multiple currencies · totals are shown per currency, not converted.
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Active Projects" value={activeProjects} subtext={`${completedProjects} completed`} color="gray" />
        <MetricCard label="Total Revenue" value={mixedInvoiceCurrencies ? moneyByCurrency(invoices.filter((i) => i.status === 'paid')) : formatCurrency(totalPaid, profile?.currency)} subtext={`${invoices.filter((i) => i.status === 'paid').length} paid invoices`} trend="up" color="green" />
        <MetricCard label="Outstanding" value={mixedInvoiceCurrencies ? moneyByCurrency(invoices.filter((i) => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue')) : formatCurrency(totalOutstanding, profile?.currency)} subtext={overdueInvoices > 0 ? `${overdueInvoices} overdue` : 'all current'} trend={overdueInvoices > 0 ? 'down' : 'neutral'} color={overdueInvoices > 0 ? 'red' : 'amber'} />
        <MetricCard label="Win Rate" value={`${winRate}%`} subtext={`${proposalsAccepted}/${proposalsResolved} resolved`} trend={winRate >= 50 ? 'up' : 'down'} color={winRate >= 50 ? 'green' : 'gray'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Project Health */}
        {!hiddenPanels.includes('project-health') && (
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Project Health</h3>
            {totalProjects === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)]">No projects yet.</p>
            ) : (
              <div className="space-y-4">
                <ProgressBar value={activeProjects} max={totalProjects || 1} label={`Active · ${activeProjects}`} className="insight-bar-animate insight-bar-0" />
                <ProgressBar value={completedProjects} max={totalProjects || 1} label={`Completed · ${completedProjects}`} className="insight-bar-animate insight-bar-1" />
                <div className="flex justify-between text-xs mt-4 pt-3 border-t border-[var(--border-color)]">
                  <span className="text-[var(--text-secondary)]">Total Tracked</span>
                  <span className="font-medium text-[var(--text-primary)]">{Math.round(totalHoursTracked / 60)} hours</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">This Week</span>
                  <span className="font-medium text-[var(--text-primary)]">{Math.round(hoursThisWeek / 60 * 10) / 10} hours</span>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Financial Health */}
        {!hiddenPanels.includes('financial-health') && (
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Financial Health</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Revenue</span>
                <span className="font-medium text-[var(--accent-ink,var(--accent))]">{formatCurrency(totalPaid, profile?.currency)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Expenses</span>
                <span className="font-medium text-[var(--danger)]">{formatCurrency(totalExpenses, profile?.currency)}</span>
              </div>
              <div className="pt-3 border-t border-[var(--border-color)]">
                <ProgressBar value={Math.max(profitMargin, 0)} max={100} label="Profit margin" className="insight-bar-animate insight-bar-2" />
              </div>
              <div className="flex justify-between text-xs pt-3 border-t border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Outstanding</span>
                <span className="font-medium text-[var(--warning-text)]">{formatCurrency(totalOutstanding, profile?.currency)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Overdue Invoices</span>
                <span className={`font-medium ${overdueInvoices > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'}`}>{overdueInvoices}</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Clients */}
        {!hiddenPanels.includes('top-clients') && (
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Top Clients by Revenue</h3>
            {topClients.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)]">No revenue data yet.</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-tertiary)] w-4">#{i + 1}</span>
                      <span className="text-xs text-[var(--text-primary)]">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--text-tertiary)]">{c.count} invoice{c.count !== 1 ? 's' : ''}</span>
                      <span className="text-xs font-medium text-[var(--text-primary)]">{formatCurrency(c.total, c.currencies.size === 1 ? [...c.currencies][0] : profile?.currency)}{c.currencies.size === 1 ? ` ${[...c.currencies][0]}` : ' ∗'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mixedInvoiceCurrencies && (
              <p className="text-[10px] text-[var(--text-tertiary)] mt-3">∗ spans multiple currencies · not converted.</p>
            )}
          </Card>
        )}

        {/* Top Projects by Time */}
        {!hiddenPanels.includes('top-projects') && (
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Top Projects by Time</h3>
            {topProjectsByTime.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)]">No time tracked yet.</p>
            ) : (
              <div className="space-y-3">
                {topProjectsByTime.map((p, i) => (
                  <div key={p.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-tertiary)] w-4">#{i + 1}</span>
                        <span className="text-xs text-[var(--text-primary)] truncate">{p.name}</span>
                      </div>
                      <span className="text-xs font-medium text-[var(--text-primary)]">{Math.round(p.minutes / 6) / 10}h</span>
                    </div>
                    <ProgressBar
                      value={p.minutes}
                      max={topProjectsByTime[0]?.minutes || 1}
                      size="sm"
                      showPercent={false}
                      className="insight-bar-animate insight-bar-3"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Pro depth: forecast, effective rate, per-client win rates.
          Free tiers see locked teasers with real headline numbers. */}
      <ProInsights />

      {/* Client Performance */}
      {!hiddenPanels.includes('client-performance') && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-[var(--text-tertiary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Client Performance</h3>
          </div>

          {headlineMetrics.length === 0 ? (
            <Card className="text-center py-10 flex flex-col items-center">
              <Star size={32} className="text-[var(--text-tertiary)] mb-3" />
              <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-1">No client metrics yet</h4>
              <p className="text-xs text-[var(--text-tertiary)] max-w-sm leading-relaxed">
                Define custom metrics on any client profile and mark them as "Headline" to see them here. Track CPM, ROAS, story points, revision rounds · whatever matters to your craft.
              </p>
            </Card>
          ) : (
            <Card className="!p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--text-secondary)]">Client</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--text-secondary)]">Metric</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-[var(--text-secondary)]">Trend</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[var(--text-secondary)]">Latest</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-[var(--text-secondary)]">Previous</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headlineMetrics.map((hm) => {
                      const numericValues = hm.values
                        .map((v) => parseFloat(v.value))
                        .filter((v) => !isNaN(v));

                      const latest = parseFloat(hm.latest_value || '');
                      const previous = parseFloat(hm.previous_value || '');
                      const isUp = !isNaN(latest) && !isNaN(previous) && latest > previous;
                      const isDown = !isNaN(latest) && !isNaN(previous) && latest < previous;

                      const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                      const trendColor = isUp ? 'text-[var(--accent-ink,var(--accent))]' : isDown ? 'text-[var(--danger)]' : 'text-[var(--text-tertiary)]';

                      return (
                        <tr key={`${hm.client_id}:${hm.definition_id}`} className="border-t border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-[var(--text-primary)]">{hm.client_name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[var(--text-primary)]">{hm.metric_name}</span>
                            {hm.unit_label && (
                              <span className="text-[var(--text-tertiary)] ml-1">({hm.unit_label})</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {numericValues.length >= 2 ? (
                              <div className="flex items-center justify-center gap-2">
                                <TrendIcon size={12} className={trendColor} />
                                <Sparkline values={[...numericValues].reverse()} width={60} height={22} color={isUp ? 'var(--accent)' : isDown ? 'var(--danger)' : 'var(--text-tertiary)'} />
                              </div>
                            ) : (
                              <span className="text-[var(--text-tertiary)]">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                            {hm.latest_value
                              ? hm.metric_type === 'currency' ? formatMetricCurrency(hm.latest_value) :
                                hm.metric_type === 'percentage' ? `${formatMetricVal(hm.latest_value)}%` :
                                hm.latest_value
                              : '--'}
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--text-tertiary)]">
                            {hm.previous_value
                              ? hm.metric_type === 'currency' ? formatMetricCurrency(hm.previous_value) :
                                hm.metric_type === 'percentage' ? `${formatMetricVal(hm.previous_value)}%` :
                                hm.previous_value
                              : '--'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function formatMetricVal(v: string): string {
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}
