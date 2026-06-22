import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import { relativeDate, formatCurrency } from '../utils/format';
import { useToasts } from '../store/toastStore';
import { Play, Receipt, FileText, Users, FolderKanban, Clock, Plus, ArrowRight, CheckCircle2, Circle, Bell, Send, Check, X } from 'lucide-react';
import { generateFollowUpDraft } from '../utils/followUpTemplates';
import { getArchetype } from '../archetypes';
import type { ArchetypeConfig } from '../archetypes';
import { getDb } from '../db';
import * as queries from '../archetypes/queries';

export default function Dashboard() {
  const { invoices, loadInvoices, proposals, loadProposals, projects, loadProjects, clients, loadClients, timeEntries, loadTimeEntries, profile, loadProfile, expenses, loadExpenses, pendingFollowUps, loadPendingFollowUps, updateFollowUpStatus, followUpSettings } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [archetype, setArchetype] = useState<ArchetypeConfig | null>(null);
  const [metricValues, setMetricValues] = useState<Record<string, string | number>>({});

  useEffect(() => {
    Promise.all([loadInvoices(), loadProposals(), loadProjects(), loadClients(), loadTimeEntries(), loadExpenses(), loadProfile(), loadPendingFollowUps()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadInvoices, loadProposals, loadProjects, loadClients, loadTimeEntries, loadExpenses, loadProfile, loadPendingFollowUps]);

  useEffect(() => {
    if (!profile) return;
    let config: ArchetypeConfig;
    if (profile.profession === 'custom' && (profile as any).custom_archetype_config) {
      try {
        config = JSON.parse((profile as any).custom_archetype_config);
      } catch {
        config = getArchetype(profile.profession || 'default');
      }
    } else {
      config = getArchetype(profile.profession || 'default');
    }
    setArchetype(config);
  }, [profile]);

  useEffect(() => {
    if (!archetype) return;
    const loadMetrics = async () => {
      const db = await getDb();
      const values: Record<string, string | number> = {};
      for (const card of archetype.dashboard.metricCards) {
        try {
          if (card.query) {
            values[card.id] = await card.query(db, profile?.id || 1);
          } else {
            const queryFn = (queries as any)[card.id];
            if (queryFn) {
              values[card.id] = await queryFn(db, profile?.id || 1);
            } else {
              values[card.id] = '—';
            }
          }
        } catch {
          values[card.id] = '—';
        }
      }
      setMetricValues(values);
    };
    loadMetrics();
  }, [archetype, profile]);

  if (!archetype) {
    const config = getArchetype('default');
    setArchetype(config);
  }

  const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const activeProjects = projects.filter(p => p.status === 'active');
  const draftProposals = proposals.filter(p => p.status === 'draft');
  const totalOutstanding = unpaidInvoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const todaysMinutes = timeEntries.filter(t => t.start_time.startsWith(new Date().toISOString().split('T')[0])).reduce((s, t) => s + (t.duration_minutes || 0), 0);

  const recentInvoices = [...invoices].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const recentTime = [...timeEntries].filter(t => t.duration_minutes).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()).slice(0, 5);

  const hasData = clients.length > 0 || invoices.length > 0 || projects.length > 0;
  const effectiveArchetype = archetype || getArchetype('default');

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-6 w-32 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-1" />
        <div className="h-4 w-48 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-4" />
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
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
        {effectiveArchetype.dashboard.greeting}
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        {profile?.name?.trim()
          ? `${effectiveArchetype.dashboard.subgreeting.replace('Your', `${profile.name.split(' ')[0]}'s`)}`
          : effectiveArchetype.dashboard.subgreeting}
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
        {effectiveArchetype.dashboard.metricCards.map((card) => (
          <MetricCard
            key={card.id}
            label={card.label}
            value={metricValues[card.id] ?? '...'}
            color={card.color || 'gray'}
            tooltip={card.tooltip}
          />
        ))}
      </div>

      {/* Needs Attention — Follow-ups */}
      {pendingFollowUps.length > 0 && (
        <Card className="mb-6 border-[var(--accent)]/20">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={14} className="text-[var(--accent)]" />
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Needs Attention</h3>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">{pendingFollowUps.length}</span>
          </div>
          <div className="space-y-2">
            {pendingFollowUps.slice(0, 3).map((fu) => {
              const isProposal = fu.entity_type === 'proposal';
              const entity = isProposal
                ? proposals.find((p) => p.id === fu.entity_id)
                : invoices.find((i) => i.id === fu.entity_id);
              if (!entity) return null;
              const client = clients.find((c) => c.id === (isProposal ? (entity as typeof proposals[0]).client_id : (entity as typeof invoices[0]).client_id));
              const daysElapsed = Math.floor((Date.now() - (isProposal ? new Date((entity as typeof proposals[0]).sent_at || (entity as typeof proposals[0]).created_at).getTime() : new Date((entity as typeof invoices[0]).due_date || '').getTime())) / 86400000);
              const templateKey = isProposal
                ? (daysElapsed >= 10 ? 'proposal_day14' : daysElapsed >= 4 ? 'proposal_day7' : 'proposal_day3')
                : (daysElapsed >= 10 ? 'invoice_day14' : daysElapsed >= 4 ? 'invoice_day7' : 'invoice_day1');
              const draft = generateFollowUpDraft(templateKey, {
                clientName: client?.name || 'Unknown',
                proposalTitle: isProposal ? (entity as typeof proposals[0]).title : undefined,
                invoiceNumber: isProposal ? undefined : (entity as typeof invoices[0]).invoice_number,
                amount: isProposal ? undefined : formatCurrency((entity as typeof invoices[0]).total),
                dueDate: isProposal ? undefined : (entity as typeof invoices[0]).due_date,
                daysElapsed,
                projectName: '',
                freelancerName: profile?.name || 'Freelancer',
              }, followUpSettings.templates);
              return (
                <div key={fu.id} className="flex items-start justify-between px-3 py-2 rounded-[8px] bg-[var(--bg-secondary)]/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      {isProposal ? 'Proposal' : 'Invoice'}: {isProposal ? (entity as typeof proposals[0]).title : (entity as typeof invoices[0]).invoice_number}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{client?.name || 'Unknown'} &middot; {daysElapsed}d</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1 line-clamp-2">{draft.split('\n')[0]}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                    <button onClick={async () => { await updateFollowUpStatus(fu.id, 'dismissed', 'dismissed'); }} className="p-1 rounded-[6px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="Dismiss"><X size={12} /></button>
                    <button onClick={async () => {
                      await navigator.clipboard.writeText(draft);
                      await updateFollowUpStatus(fu.id, 'sent', 'sent');
                      addToast('Copied to clipboard', 'success');
                    }} className="p-1 rounded-[6px] text-[var(--accent)] hover:bg-[var(--accent-bg)]" title="Copy & dismiss"><Send size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      {hasData && effectiveArchetype.dashboard.quickActions.length > 0 && (
        <div className="flex gap-2 mb-6">
          {effectiveArchetype.dashboard.quickActions.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              size="sm"
              onClick={() => {
                if (action.action.startsWith('/')) {
                  navigate(action.action);
                } else {
                  document.dispatchEvent(new CustomEvent(`lance:${action.action}`));
                }
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

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
