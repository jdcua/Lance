import { useEffect, useState } from 'react';
import { useStore } from '../store';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';
import ProgressBar from '../components/ui/ProgressBar';
import { TrendingUp, TrendingDown, DollarSign, Clock, FileText, Users } from 'lucide-react';

export default function Insights() {
  const { projects, loadProjects, invoices, loadInvoices, timeEntries, loadTimeEntries, clients, loadClients, proposals, loadProposals, expenses, loadExpenses } = useStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      loadProjects(),
      loadInvoices(),
      loadTimeEntries(),
      loadClients(),
      loadProposals(),
      loadExpenses(),
    ]).then(() => setLoaded(true));
  }, [loadProjects, loadInvoices, loadTimeEntries, loadClients, loadProposals, loadExpenses]);

  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const totalProjects = projects.length;

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  const totalOutstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + i.total, 0);
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue').length;

  const totalHoursTracked = timeEntries.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
  const hoursThisWeek = timeEntries.filter((t) => {
    const d = new Date(t.start_time);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return d >= weekAgo;
  }).reduce((sum, t) => sum + (t.duration_minutes || 0), 0);

  const proposalsAccepted = proposals.filter((p) => p.status === 'accepted').length;
  const totalProposals = proposals.length;
  const winRate = totalProposals > 0 ? Math.round((proposalsAccepted / totalProposals) * 100) : 0;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profitMargin = totalPaid > 0 ? Math.round(((totalPaid - totalExpenses) / totalPaid) * 100) : 0;

  // Client revenue ranking
  const clientRevenue: Record<string, { name: string; total: number; count: number }> = {};
  invoices.filter((i) => i.status === 'paid').forEach((inv) => {
    const client = clients.find((c) => c.id === inv.client_id);
    const name = client?.name || inv.client_id;
    if (!clientRevenue[inv.client_id]) {
      clientRevenue[inv.client_id] = { name, total: 0, count: 0 };
    }
    clientRevenue[inv.client_id].total += inv.total;
    clientRevenue[inv.client_id].count += 1;
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

  if (!loaded) {
    return (
      <div className="p-6">
        <p className="text-sm text-[#A3A39E]">Loading insights...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-[#1C1C1A] mb-6">Business Insights</h2>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Projects" value={activeProjects} subtext={`${completedProjects} completed`} />
        <MetricCard label="Total Revenue" value={`$${totalPaid.toLocaleString()}`} subtext={`${invoices.filter((i) => i.status === 'paid').length} paid invoices`} trend="up" />
        <MetricCard label="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} subtext={overdueInvoices > 0 ? `${overdueInvoices} overdue` : 'all current'} trend={overdueInvoices > 0 ? 'down' : 'neutral'} />
        <MetricCard label="Win Rate" value={`${winRate}%`} subtext={`${proposalsAccepted}/${totalProposals} proposals`} trend={winRate >= 50 ? 'up' : 'down'} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Project Health */}
        <Card>
          <h3 className="text-sm font-semibold text-[#1C1C1A] mb-4">Project Health</h3>
          {totalProjects === 0 ? (
            <p className="text-xs text-[#A3A39E]">No projects yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between text-xs">
                <span className="text-[#6B6B67]">Active</span>
                <span className="font-medium text-[#1C1C1A]">{activeProjects}</span>
              </div>
              <ProgressBar value={activeProjects} max={totalProjects || 1} label="Active" />
              <div className="flex justify-between text-xs">
                <span className="text-[#6B6B67]">Completed</span>
                <span className="font-medium text-[#1C1C1A]">{completedProjects}</span>
              </div>
              <ProgressBar value={completedProjects} max={totalProjects || 1} label="Completed" />
              <div className="flex justify-between text-xs mt-4 pt-3 border-t border-[#E5E5E3]">
                <span className="text-[#6B6B67]">Total Tracked</span>
                <span className="font-medium text-[#1C1C1A]">{Math.round(totalHoursTracked / 60)} hours</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6B6B67]">This Week</span>
                <span className="font-medium text-[#1C1C1A]">{Math.round(hoursThisWeek / 6) / 10} hours</span>
              </div>
            </div>
          )}
        </Card>

        {/* Financial Summary */}
        <Card>
          <h3 className="text-sm font-semibold text-[#1C1C1A] mb-4">Financial Health</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-xs">
              <span className="text-[#6B6B67]">Revenue</span>
              <span className="font-medium text-[#1D9E75]">${totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#6B6B67]">Expenses</span>
              <span className="font-medium text-[#A32D2D]">${totalExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs pt-3 border-t border-[#E5E5E3]">
              <span className="text-[#6B6B67]">Profit Margin</span>
              <span className={`font-medium ${profitMargin >= 0 ? 'text-[#1D9E75]' : 'text-[#A32D2D]'}`}>{profitMargin}%</span>
            </div>
            <ProgressBar value={Math.max(profitMargin, 0)} max={100} label="Margin %" />
            <div className="flex justify-between text-xs pt-3 border-t border-[#E5E5E3]">
              <span className="text-[#6B6B67]">Outstanding</span>
              <span className="font-medium text-[#854F0B]">${totalOutstanding.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#6B6B67]">Overdue Invoices</span>
              <span className={`font-medium ${overdueInvoices > 0 ? 'text-[#A32D2D]' : 'text-[#6B6B67]'}`}>{overdueInvoices}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Clients */}
        <Card>
          <h3 className="text-sm font-semibold text-[#1C1C1A] mb-4">Top Clients by Revenue</h3>
          {topClients.length === 0 ? (
            <p className="text-xs text-[#A3A39E]">No revenue data yet.</p>
          ) : (
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#A3A39E] w-4">#{i + 1}</span>
                    <span className="text-xs text-[#1C1C1A]">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#A3A39E]">{c.count} invoice{c.count !== 1 ? 's' : ''}</span>
                    <span className="text-xs font-medium text-[#1C1C1A]">${c.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Projects by Time */}
        <Card>
          <h3 className="text-sm font-semibold text-[#1C1C1A] mb-4">Top Projects by Time</h3>
          {topProjectsByTime.length === 0 ? (
            <p className="text-xs text-[#A3A39E]">No time tracked yet.</p>
          ) : (
            <div className="space-y-3">
              {topProjectsByTime.map((p, i) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#A3A39E] w-4">#{i + 1}</span>
                      <span className="text-xs text-[#1C1C1A] truncate">{p.name}</span>
                    </div>
                    <span className="text-xs font-medium text-[#1C1C1A]">{Math.round(p.minutes / 6) / 10}h</span>
                  </div>
                  <ProgressBar
                    value={p.minutes}
                    max={topProjectsByTime[0]?.minutes || 1}
                    size="sm"
                    showPercent={false}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
