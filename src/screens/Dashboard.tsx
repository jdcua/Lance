import { useEffect, useState, Suspense, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { recordTelemetry } from '../utils/telemetry';
import { buildWeeklyDigest, weekKey } from '../utils/weeklyDigest';
import { evaluateStruggle, getTelemetryEvents, markTipFired, wasTipFired } from '../utils/telemetry';
import type { Invoice, TimeEntry, UserProfile, Project } from '../types';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import Fade from '../components/motion/Fade';
import { StaggerGroup, StaggerItem } from '../components/motion/Stagger';
import AnimatedNumber from '../components/motion/AnimatedNumber';
import Magnetic from '../components/motion/Magnetic';
import { relativeDate, formatCurrency, DAY_MS } from '../utils/format';
import { useToasts } from '../store/toastStore';
import { Play, Receipt, FileText, Users, FolderKanban, Clock, Plus, ArrowRight, CheckCircle2, Circle, Bell, Send, X, Link, Banknote, Clock3, Target } from 'lucide-react';
import { generateFollowUpDraft } from '../utils/followUpTemplates';
import { getArchetype } from '../archetypes';
import type { ArchetypeConfig } from '../archetypes';
import { getDb } from '../db';
import type Database from '@tauri-apps/plugin-sql';
import * as queries from '../archetypes/queries';
import { getFeatureComponent } from '../components/features/registry';

export default function Dashboard() {
  const { invoices, loadInvoices, proposals, loadProposals, projects, loadProjects, clients, loadClients, timeEntries, loadTimeEntries, profile, loadProfile, loadExpenses, pendingFollowUps, loadPendingFollowUps, updateFollowUpStatus, followUpSettings, loadContracts, portalActivity, loadPortalActivity } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [archetype, setArchetype] = useState<ArchetypeConfig | null>(null);
  const [metricValues, setMetricValues] = useState<Record<string, string | number>>({});
  const [lastBackupInfo, setLastBackupInfo] = useState<{
    enabled: boolean;
    last_backup_at: string | null;
    daysAgo: number | null;
  } | null>(null);
  // Hooks must stay above the loading early-return below.
  const [checklistDismissed, setChecklistDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('lance:checklist-dismissed') === 'true',
  );
  const [digestDismissedWeek, setDigestDismissedWeek] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDigestDismissedWeek(localStorage.getItem('lance:digest-dismissed'));
    } catch { /* private mode */ }
  }, []);
  const digestWeek = weekKey();
  const digest = useMemo(
    () => buildWeeklyDigest(invoices, timeEntries, proposals),
    [invoices, timeEntries, proposals],
  );

  useEffect(() => {
    Promise.all([loadInvoices(), loadProposals(), loadProjects(), loadClients(), loadTimeEntries(), loadExpenses(), loadProfile(), loadPendingFollowUps()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadInvoices, loadProposals, loadProjects, loadClients, loadTimeEntries, loadExpenses, loadProfile, loadPendingFollowUps, addToast]);

  useEffect(() => {
    if (loading) return;
    if (localStorage.getItem('lance:seeded') === 'true' && localStorage.getItem('lance:seeded-toast-shown') !== 'true') {
      addToast('Sample data loaded · explore freely. Clear it anytime in Settings → Data.', 'info');
      localStorage.setItem('lance:seeded-toast-shown', 'true');
    }
    const loadBackupInfo = async () => {
      try {
        const { getLastBackupInfo } = await import('../utils/backup');
        const info = await getLastBackupInfo();
        if (info && info.enabled && info.last_backup_at) {
          const daysAgo = Math.floor(
            (Date.now() - new Date(info.last_backup_at).getTime()) / DAY_MS
          );
          setLastBackupInfo({ enabled: info.enabled, last_backup_at: info.last_backup_at, daysAgo });
        } else if (info && info.enabled) {
          setLastBackupInfo({ enabled: true, last_backup_at: null, daysAgo: null });
        }
      } catch {
        /* non-critical */
      }
    };
    loadPortalActivity();
    loadBackupInfo();
  }, [loading, addToast, loadPortalActivity]);

  // Portal feed lives in the store (shared with proposal badges and the
  // App-level open alerts). This keeps the response toasts: accepted, signed
  // or declined activity refreshes proposals and contracts.
  const seenPortalRef = useRef<Set<string>>(new Set());
  const refreshPortalActivity = async () => {
    const firstLoad = seenPortalRef.current.size === 0;
    const before = new Set(seenPortalRef.current);
    await loadPortalActivity();
    const activity = useStore.getState().portalActivity;
    for (const item of activity) {
      const key = `${item.token}:${item.timestamp}`;
      if (before.has(key)) continue;
      seenPortalRef.current.add(key);
      if (firstLoad) continue;
      if (item.activity.includes('accepted') || item.activity.includes('signed') || item.activity.includes('declined')) {
        addToast(item.activity, 'info');
        loadProposals();
        loadContracts();
      }
    }
  };

  const portalPollRef = useRef<() => Promise<void>>();
  portalPollRef.current = refreshPortalActivity;

  useEffect(() => {
    const interval = setInterval(() => portalPollRef.current?.(), 30000);
    return () => clearInterval(interval);
  }, []);

  // Coach nudges: local telemetry spots struggle and helps once each.
  // Never nags: every tip fires a single time, ever.
  useEffect(() => {
    if (loading) return;
    const launches = getTelemetryEvents().filter((e) => e.event === 'app_launch').length;
    const checklistDone =
      (clients.length > 0 ? 1 : 0) +
      (projects.length > 0 ? 1 : 0) +
      (timeEntries.length > 0 ? 1 : 0) +
      (proposals.length > 0 ? 1 : 0) +
      (invoices.length > 0 ? 1 : 0);
    const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
    const tips = evaluateStruggle({
      launches,
      checklistDone,
      checklistTotal: 5,
      validationErrors: {},
      overdueCount,
      followUpsEnabled: followUpSettings.enabled,
    });
    for (const tip of tips) {
      if (wasTipFired(tip)) continue;
      markTipFired(tip);
      if (tip === 'stalled_checklist') {
        addToast('Still getting set up? Your first client takes about 30 seconds.', 'info', 8000);
      } else if (tip === 'overdue_no_followups') {
        addToast(
          `${overdueCount} overdue invoice${overdueCount === 1 ? '' : 's'} and reminders are off. Switch them on in Settings.`,
          'info',
          8000,
          [{ label: 'Open settings', onClick: () => navigate('/settings') }],
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (!profile) return;
    let config: ArchetypeConfig;
    if (profile.profession === 'custom' && profile.custom_archetype_config) {
      try {
        config = JSON.parse(profile.custom_archetype_config);
      } catch { /* invalid custom config JSON; fall back to profession archetype */
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
      try {
        const db = await getDb();
        const values: Record<string, string | number> = {};
        for (const card of archetype.dashboard.metricCards) {
          try {
            if (card.query) {
              values[card.id] = await card.query(db, profile?.id || 1);
            } else {
              const queryFn = (queries as Record<string, (db: Database, profileId: number) => Promise<string | number>>)[card.id];
              if (queryFn) {
                values[card.id] = await queryFn(db, profile?.id || 1);
              } else {
                values[card.id] = '--';
              }
            }
          } catch { /* metric query failed; show em-dash as fallback */
            values[card.id] = '--';
          }
        }
        setMetricValues(values);
      } catch { /* db not available in browser mode */ }
    };
    loadMetrics();
  }, [archetype, profile]);

  if (!archetype) {
    const config = getArchetype('default');
    setArchetype(config);
  }

  const recentInvoices = [...invoices].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const recentTime = [...timeEntries].filter(t => t.duration_minutes).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()).slice(0, 5);

  // Hero money stats: sorted by money at risk, computed from live data.
  const UNPAID = ['sent', 'partial', 'overdue'];
  const unpaidInvoices = invoices.filter((i) => UNPAID.includes(i.status));
  const outstandingTotal = unpaidInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const draftProposals = proposals.filter((p) => p.status === 'draft').length;
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  // Six-month trend series for KPI sparklines, computed from live data.
  // A series is only attached when it actually contains values.
  const monthBuckets = (() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  })();
  const bucketize = <T,>(items: T[], dateOf: (t: T) => string, valueOf: (t: T) => number): number[] =>
    monthBuckets.map((m) =>
      items
        .filter((t) => (dateOf(t) || '').slice(0, 7) === m)
        .reduce((sum, t) => sum + valueOf(t), 0),
    );
  const revenueSeries = bucketize(
    invoices.filter((i) => i.status === 'paid'),
    (i) => i.created_at,
    (i) => i.total || 0,
  );
  const hoursSeries = bucketize(
    timeEntries.filter((t) => t.billable),
    (t) => t.start_time,
    (t) => (t.duration_minutes || 0) / 60,
  );
  const pipelineSeries = bucketize(proposals, (p) => p.created_at, () => 1);
  const pickSeries = (s: number[]): number[] | undefined =>
    s.reduce((a, b) => a + b, 0) > 0 ? s : undefined;
  function cardIcon(id: string) {
    const k = id.toLowerCase();
    if (/revenue|income|profit|paid|outstanding|money|earning/.test(k)) return <Banknote size={15} />;
    if (/hour|time|unbilled|utiliz|billable/.test(k)) return <Clock3 size={15} />;
    if (/win|rate|conversion/.test(k)) return <Target size={15} />;
    if (/proposal/.test(k)) return <FileText size={15} />;
    if (/client/.test(k)) return <Users size={15} />;
    if (/project/.test(k)) return <FolderKanban size={15} />;
    if (/invoice|expense|payment/.test(k)) return <Receipt size={15} />;
    return undefined;
  }
  function cardSpark(id: string): number[] | undefined {
    const k = id.toLowerCase();
    if (/revenue|income|profit|paid|outstanding|money|earning/.test(k)) return pickSeries(revenueSeries);
    if (/hour|time|unbilled|utiliz|billable/.test(k)) return pickSeries(hoursSeries);
    if (/win|rate|proposal|client|project|invoice|expense/.test(k)) return pickSeries(pipelineSeries);
    return undefined;
  }

  const hasData = clients.length > 0 || invoices.length > 0 || projects.length > 0;
  const effectiveArchetype = archetype || getArchetype('default');

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-6 w-32 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-1" />
        <div className="h-4 w-48 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
          <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
        </div>
      </div>
    );
  }

  // Each step deep-links AND opens the real create form: landing on a list
  // is not activation, doing the thing is. The time step needs no navigation
  // because the quick-log modal is global.
  const runStep = (to: string | null, event: string | null, index: number) => {
    recordTelemetry('checklist_step_done', { step: index });
    if (to) navigate(to);
    if (event) {
      setTimeout(() => document.dispatchEvent(new CustomEvent(event)), 350);
    }
  };

  const steps = [
    { done: clients.length > 0, label: 'Add your first client', to: '/clients', icon: Users, event: 'lance:add-client' },
    { done: projects.length > 0, label: 'Create a project', to: '/projects', icon: FolderKanban, event: 'lance:add-project' },
    { done: timeEntries.length > 0, label: 'Log some time', to: null, icon: Clock, event: 'lance:add-time' },
    { done: proposals.length > 0, label: 'Send a proposal', to: '/proposals/new', icon: FileText, event: null },
    { done: invoices.length > 0, label: 'Send an invoice', to: '/invoices', icon: Receipt, event: 'lance:add-invoice' },
  ];
  const allDone = steps.every(s => s.done);
  const showChecklist = !checklistDismissed && !allDone;

  const dismissChecklist = () => {
    localStorage.setItem('lance:checklist-dismissed', 'true');
    setChecklistDismissed(true);
  };

  // Weekly digest: a Monday habit loop. Shows once the checklist is out of
  // the way (or dismissed), hides for the rest of the week on dismiss.
  const showDigest = !showChecklist && digestDismissedWeek !== digestWeek;
  const dismissDigest = () => {
    try {
      localStorage.setItem('lance:digest-dismissed', digestWeek);
    } catch { /* private mode */ }
    setDigestDismissedWeek(digestWeek);
  };

  return (
    <div className="p-6 max-w-[1120px]">
      <Fade className="relative overflow-hidden rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-card)] shadow-[var(--card-shadow)] p-6 mb-6" y={18}>
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[var(--accent)] opacity-[0.13] blur-[80px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 w-72 h-72 rounded-full bg-[var(--accent)] opacity-[0.07] blur-[80px]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[var(--text-secondary)] mb-1.5">{todayLabel}</p>
          <h2 className="text-[30px] leading-[1.1] font-bold tracking-tight text-balance text-[var(--text-primary)]">
            {effectiveArchetype.dashboard.greeting}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {profile?.name?.trim()
              ? `${effectiveArchetype.dashboard.subgreeting.replace('Your', `${profile.name.split(' ')[0]}'s`)}`
              : effectiveArchetype.dashboard.subgreeting}
          </p>
          {hasData && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs font-semibold tnum px-2.5 py-1 rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">
                <AnimatedNumber value={outstandingTotal} format={(n) => formatCurrency(n, profile?.currency)} /> outstanding
              </span>
              {overdueCount > 0 && (
                <span className="text-xs font-semibold tnum px-2.5 py-1 rounded-full bg-[var(--danger-bg)] text-[var(--danger)]">
                  {overdueCount} overdue
                </span>
              )}
              {activeProjects > 0 && (
                <span className="text-xs font-medium tnum px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  {activeProjects} active
                </span>
              )}
              {draftProposals > 0 && (
                <span className="text-xs font-medium tnum px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  {draftProposals} drafts
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => document.dispatchEvent(new CustomEvent('lance:add-time'))}
          >
            <Clock size={13} /> Log time
          </Button>
          <Magnetic className="inline-flex">
            <Button
              size="sm"
              variant="primary"
              onClick={() => { navigate('/invoices'); setTimeout(() => document.dispatchEvent(new CustomEvent('lance:add-invoice')), 350); }}
            >
              <Plus size={13} /> New invoice
            </Button>
          </Magnetic>
        </div>
      </div>
      </Fade>

      {showChecklist && (
        <Card className="mb-6 border-[var(--accent)]/20 bg-[var(--accent-bg)]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
              <Play size={20} className="text-[var(--accent)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Let's get you set up</h3>
                <span className="text-[10px] font-semibold tnum px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                  {steps.filter((s) => s.done).length}/{steps.length}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-2.5">Everything in Lance starts with a client. Each step opens the real thing.</p>
              <div className="h-1 rounded-full bg-[var(--bg-secondary)] overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] transition-all duration-500"
                  style={{ width: `${Math.round((steps.filter((s) => s.done).length / steps.length) * 100)}%` }}
                />
              </div>
              <div className="space-y-2 mb-1">
                {steps.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => runStep(s.to, s.event, i + 1)}
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
            </div>
            <button
              onClick={dismissChecklist}
              aria-label="Dismiss setup checklist"
              title="Dismiss"
              className="p-1 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </Card>
      )}

      {showDigest && (
        <Card className="mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                Your week <span className="font-normal text-[var(--text-tertiary)]">({digest.weekLabel})</span>
              </h3>
              {digest.hasActivity ? (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {digest.paidCount > 0 && (
                    <>Got paid <strong className="text-[var(--accent-ink,var(--accent))]">{digest.paidCount}x</strong>{' '}</>
                  )}
                  {digest.hoursLogged > 0 && (
                    <>{digest.hoursLogged}h logged{' '}</>
                  )}
                  {digest.openProposals > 0 && (
                    <>{digest.openProposals} proposal{digest.openProposals === 1 ? '' : 's'} awaiting reply{' '}</>
                  )}
                  {digest.overdueCount > 0 && (
                    <span className="text-[var(--danger)]">{digest.overdueCount} overdue</span>
                  )}
                  {digest.paidCount === 0 && digest.hoursLogged === 0 && digest.openProposals === 0 && digest.overdueCount === 0 && (
                    <>Quiet so far.</>
                  )}
                </p>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Nothing yet this week. Log time or send an invoice to get moving.
                </p>
              )}
            </div>
            <button
              onClick={dismissDigest}
              aria-label="Dismiss weekly digest"
              title="Dismiss for this week"
              className="p-1 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </Card>
      )}

      <StaggerGroup className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" stagger={0.08}>
        {effectiveArchetype.dashboard.metricCards.map((card) => (
          <StaggerItem key={card.id}>
          <MetricCard
            label={card.label}
            value={metricValues[card.id] ?? '...'}
            color={card.color || 'gray'}
            tooltip={card.tooltip}
            icon={cardIcon(card.id)}
            sparkData={cardSpark(card.id)}
          />
          </StaggerItem>
        ))}
      </StaggerGroup>

      {/* Portal Activity */}
      {portalActivity.length > 0 && (
        <Card className="mb-6 border-[var(--accent)]/20">
          <div className="flex items-center gap-2 mb-3">
            <Link size={14} className="text-[var(--accent)]" />
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Portal Activity</h3>
          </div>
          <div className="space-y-1.5">
            {portalActivity.slice(0, 5).map((act, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-[6px] text-xs">
                <span className="text-[var(--text-primary)]">{act.activity}</span>
                <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-3">{relativeDate(act.timestamp)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Needs Attention · Follow-ups */}
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
              const daysElapsed = Math.floor((Date.now() - (isProposal ? new Date((entity as typeof proposals[0]).sent_at || (entity as typeof proposals[0]).created_at).getTime() : new Date((entity as typeof invoices[0]).due_date || '').getTime())) / DAY_MS);
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
                      await updateFollowUpStatus(fu.id, 'dismissed', 'dismissed');
                      addToast('Copied to clipboard · dismissed from queue', 'success');
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardWidgets archetype={effectiveArchetype} recentInvoices={recentInvoices} recentTime={recentTime} profile={profile} projects={projects} navigate={navigate} />
      </div>

      {lastBackupInfo && lastBackupInfo.enabled && (
        <div className="mt-6 pt-3 border-t border-[var(--border-color)]">
          <button
            onClick={() => navigate('/settings')}
            className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {lastBackupInfo.last_backup_at && lastBackupInfo.daysAgo !== null
              ? `Last backed up: ${lastBackupInfo.daysAgo === 0 ? 'today' : lastBackupInfo.daysAgo === 1 ? '1 day ago' : `${lastBackupInfo.daysAgo} days ago`}`
              : 'Auto-backup enabled but not yet run'}
          </button>
        </div>
      )}
    </div>
  );
}

function DashboardWidgets({ archetype, recentInvoices, recentTime, profile, projects, navigate }: {
  archetype: ArchetypeConfig;
  recentInvoices: Invoice[];
  recentTime: TimeEntry[];
  profile: UserProfile | null;
  projects: Project[];
  navigate: (path: string) => void;
}) {
  const widgets = archetype.dashboard.widgets || [];
  const hasCustomWidgets = widgets.length > 0;

  const renderWidget = (widget: { id: string; component: string; priority: number; props?: Record<string, unknown> }) => {
    const Component = getFeatureComponent(widget.component);
    if (Component) {
      return (
        <Card key={widget.id}>
          <Suspense fallback={<div className="h-32 skeleton-pulse rounded" />}>
            <Component />
          </Suspense>
        </Card>
      );
    }
    return null;
  };

  if (hasCustomWidgets) {
    const sorted = [...widgets].sort((a, b) => b.priority - a.priority);
    return <>{sorted.map(renderWidget)}</>;
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Invoices</h3>
          <button onClick={() => navigate('/invoices')} className="text-xs text-[var(--accent-ink,var(--accent))] hover:underline">View all</button>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="text-center py-8">
            <Receipt size={32} className="text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">No invoices yet.</p>
            <Button onClick={() => { navigate('/invoices'); setTimeout(() => document.dispatchEvent(new CustomEvent('lance:add-invoice')), 350); }} size="sm" variant="secondary" className="mt-3">
              <Plus size={12} /> New Invoice
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-[var(--bg-secondary)] transition-colors">
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)]">{inv.invoice_number}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{relativeDate(inv.created_at)}</p>
                </div>
                <div className="text-right">
                    <p className={`text-xs font-medium ${inv.status === 'overdue' ? 'text-[var(--danger)]' : inv.status === 'paid' ? 'text-[var(--accent-ink,var(--accent))]' : 'text-[var(--text-primary)]'}`}>
                    {formatCurrency(inv.total, inv.currency || profile?.currency)}
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
          <button onClick={() => navigate('/time')} className="text-xs text-[var(--accent-ink,var(--accent))] hover:underline">View all</button>
        </div>
        {recentTime.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={32} className="text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">No time tracked yet.</p>
            <Button onClick={() => navigate('/time')} size="sm" variant="secondary" className="mt-3">
              <Play size={12} /> Track Time
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTime.map((entry) => {
              const project = projects.find((p) => p.id === entry.project_id);
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
    </>
  );
}
