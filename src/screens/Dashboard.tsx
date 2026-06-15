import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import { relativeDate, formatCurrency, formatMonth } from '../utils/format';
import { useToasts } from '../store/toastStore';
import { Play, Receipt, FileText, Users, FolderKanban, Clock, Plus, ArrowRight, CheckCircle2, Circle } from 'lucide-react';

export default function Dashboard() {
  const { invoices, loadInvoices, proposals, loadProposals, projects, loadProjects, clients, loadClients, timeEntries, loadTimeEntries, profile, loadProfile, expenses, loadExpenses } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadInvoices(), loadProposals(), loadProjects(), loadClients(), loadTimeEntries(), loadExpenses(), loadProfile()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadInvoices, loadProposals, loadProjects, loadClients, loadTimeEntries, loadExpenses, loadProfile]);

  const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const activeProjects = projects.filter(p => p.status === 'active');
  const draftProposals = proposals.filter(p => p.status === 'draft');
  const totalOutstanding = unpaidInvoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const todaysMinutes = timeEntries.filter(t => t.start_time.startsWith(new Date().toISOString().split('T')[0])).reduce((s, t) => s + (t.duration_minutes || 0), 0);

  const recentInvoices = [...invoices].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const recentTime = [...timeEntries].filter(t => t.duration_minutes).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()).slice(0, 5);

  const hasData = clients.length > 0 || invoices.length > 0 || projects.length > 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
          <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
        </div>
      </div>
    );
  }

  const steps = [
    { done: clients.length > 0, label: 'Add your first client', to: '/clients', icon: Users },
    { done: projects.length > 0, label: 'Create a project', to: '/projects', icon: FolderKanban },
    { done: timeEntries.length > 0, label: 'Log some time', to: '/time', icon: Clock },
    { done: proposals.length > 0, label: 'Send a proposal', to: '/proposals/new', icon: FileText },
    { done: invoices.length > 0, label: 'Send an invoice', to: '/invoices', icon: Receipt },
  ];
  const allDone = steps.every(s => s.done);
  const nextStep = steps.find(s => !s.done);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Dashboard</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        {profile?.name ? `Welcome back, ${profile.name.split(' ')[0]}.` : 'Welcome to Lance.'}
      </p>

      {!hasData && (
        <Card className="mb-6 border-[var(--accent)]/20 bg-[var(--accent-bg)]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
              <Play size={20} className="text-[var(--accent)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Let's get you set up</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Everything in Lance starts with a client. Follow these steps to get going.</p>
              <div className="space-y-2 mb-4">
                {steps.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(s.to)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-left text-xs transition-colors ${
                      s.done
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] line-through cursor-default'
                        : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)]'
                    }`}
                    disabled={s.done}
                  >
                    {s.done ? <CheckCircle2 size={14} className="text-[var(--accent)]" /> : <Circle size={14} className="text-[var(--text-tertiary)]" />}
                    <s.icon size={14} className={s.done ? 'text-[var(--text-tertiary)]' : 'text-[var(--accent)]'} />
                    {s.label}
                    {!s.done && <ArrowRight size={12} className="ml-auto text-[var(--text-tertiary)]" />}
                  </button>
                ))}
              </div>
              {allDone && (
                <p className="text-xs text-[var(--accent)] font-medium">You're all set. Explore the sections in the sidebar.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-3 mb-6">
        <MetricCard label="Outstanding" value={formatCurrency(totalOutstanding, profile?.currency)} subtext={`${unpaidInvoices.length} unpaid`} color={unpaidInvoices.length > 0 ? 'amber' : 'gray'} />
        <MetricCard label="Paid (Lifetime)" value={formatCurrency(totalPaid, profile?.currency)} subtext={`${invoices.filter(i => i.status === 'paid').length} invoices`} color="green" />
        <MetricCard label="Active Projects" value={activeProjects.length} subtext={`${projects.length} total`} color={activeProjects.length > 0 ? 'green' : 'gray'} />
        <MetricCard label="Today" value={todaysMinutes > 0 ? `${Math.floor(todaysMinutes / 60)}h ${todaysMinutes % 60}m` : '—'} subtext="time tracked" color={todaysMinutes > 0 ? 'green' : 'gray'} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Invoices</h3>
            <button onClick={() => navigate('/invoices')} className="text-xs text-[var(--accent)] hover:underline">View all</button>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8">
              <Receipt size={32} className="text-[var(--text-tertiary)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-tertiary)]">No invoices yet.</p>
              <Button onClick={() => navigate('/invoices')} size="sm" variant="secondary" className="mt-3">
                <Plus size={12} /> New Invoice
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-[var(--bg-secondary)] transition-colors">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">{inv.invoice_number}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{relativeDate(inv.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium ${inv.status === 'overdue' ? 'text-[#A32D2D]' : inv.status === 'paid' ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                      {formatCurrency(inv.total, profile?.currency)}
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)] capitalize">{inv.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Time</h3>
            <button onClick={() => navigate('/time')} className="text-xs text-[var(--accent)] hover:underline">View all</button>
          </div>
          {recentTime.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={32} className="text-[var(--text-tertiary)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-tertiary)]">No time tracked yet.</p>
              <Button onClick={() => navigate('/time')} size="sm" variant="secondary" className="mt-3">
                <Play size={12} /> Start Timer
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTime.map(entry => {
                const project = projects.find(p => p.id === entry.project_id);
                const mins = entry.duration_minutes || 0;
                return (
                  <div key={entry.id} className="flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-[var(--bg-secondary)] transition-colors">
                    <div>
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                        {entry.description || project?.title || 'Untitled'}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{relativeDate(entry.start_time)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-[var(--text-primary)]">{Math.floor(mins / 60)}h {mins % 60}m</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{entry.billable ? 'billable' : 'non-billable'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
