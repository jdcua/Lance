import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { recordTelemetry } from '../utils/telemetry';
import { buildWeeklyDigest, weekKey } from '../utils/weeklyDigest';
import {
  evaluateStruggle,
  getTelemetryEvents,
  markTipFired,
  wasTipFired,
} from '../utils/telemetry';
import type { Invoice, TimeEntry, UserProfile, Project, Proposal, FollowUpLog } from '../types';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';
import Button from '../components/ui/Button';
import LoadError from '../components/ui/LoadError';
import TodayQueue from '../components/ui/TodayQueue';
import Fade from '../components/motion/Fade';
import { StaggerGroup, StaggerItem } from '../components/motion/Stagger';
import AnimatedNumber from '../components/motion/AnimatedNumber';
import { usePrefs } from '../lib/prefs';
import { commands, type CommandName } from '../lib/commands';
import { relativeDate, formatCurrency, DAY_MS } from '../utils/format';
import { useToasts } from '../store/toastStore';
import {
  Play,
  Receipt,
  FileText,
  Users,
  FolderKanban,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  Circle,
  Bell,
  Send,
  X,
  Link,
  Banknote,
  Clock3,
  Target,
} from 'lucide-react';
import { generateFollowUpDraft } from '../utils/followUpTemplates';
import { getDb } from '../db';
import type { Database } from '../utils/tauri';
import * as queries from '../lib/metrics';

type FollowUpEntity = Proposal | Invoice;

// Pure, behavior-preserving splits of the "needs attention" row builder.
// Resolve the entity/client/age first, then build the draft text — each pure
// step stays well under the complexity budget and the row itself just renders.
function resolveFollowUpContext(
  fu: FollowUpLog,
  proposals: Proposal[],
  invoices: Invoice[],
  clients: { id: string; name?: string }[],
): { isProposal: boolean; entity: FollowUpEntity; clientName: string; daysElapsed: number } | null {
  const isProposal = fu.entity_type === 'proposal';
  const entity = isProposal
    ? proposals.find((p) => p.id === fu.entity_id)
    : invoices.find((i) => i.id === fu.entity_id);
  if (!entity) return null;
  const clientId = isProposal ? (entity as Proposal).client_id : (entity as Invoice).client_id;
  const client = clients.find((c) => c.id === clientId);
  const from = isProposal
    ? (entity as Proposal).sent_at || (entity as Proposal).created_at
    : (entity as Invoice).due_date || '';
  const daysElapsed = Math.floor((Date.now() - new Date(from).getTime()) / DAY_MS);
  return { isProposal, entity, clientName: client?.name || 'Unknown', daysElapsed };
}

function followUpTemplateKey(isProposal: boolean, daysElapsed: number): string {
  if (isProposal) {
    if (daysElapsed >= 10) return 'proposal_day14';
    if (daysElapsed >= 4) return 'proposal_day7';
    return 'proposal_day3';
  }
  if (daysElapsed >= 10) return 'invoice_day14';
  if (daysElapsed >= 4) return 'invoice_day7';
  return 'invoice_day1';
}

function buildFollowUpDraftText(
  ctx: { isProposal: boolean; entity: FollowUpEntity; clientName: string; daysElapsed: number },
  profile: UserProfile | null,
  templates: Record<string, string>,
): string {
  const { isProposal, entity, clientName, daysElapsed } = ctx;
  return generateFollowUpDraft(
    followUpTemplateKey(isProposal, daysElapsed),
    {
      clientName,
      proposalTitle: isProposal ? (entity as Proposal).title : undefined,
      invoiceNumber: isProposal ? undefined : (entity as Invoice).invoice_number,
      amount: isProposal ? undefined : formatCurrency((entity as Invoice).total),
      dueDate: isProposal ? undefined : (entity as Invoice).due_date,
      daysElapsed,
      projectName: '',
      freelancerName: profile?.name || 'Freelancer',
    },
    templates,
  );
}

// Module-level stable constant; re-created per render it would retrigger this effect.
const DEFAULT_METRIC_CARDS = [
  { id: 'activeProjectsCount', label: 'Active projects', color: 'blue' as const },
  { id: 'totalOutstanding', label: 'Outstanding', color: 'amber' as const },
  { id: 'totalPaidRevenue', label: 'Paid revenue', color: 'green' as const },
  { id: 'todaysHours', label: 'Today', color: 'purple' as const },
];

export default function Dashboard() {
  const {
    invoices,
    loadInvoices,
    proposals,
    loadProposals,
    projects,
    loadProjects,
    clients,
    loadClients,
    timeEntries,
    loadTimeEntries,
    profile,
    loadProfile,
    loadExpenses,
    pendingFollowUps,
    loadPendingFollowUps,
    updateFollowUpStatus,
    followUpSettings,
    loadContracts,
    portalActivity,
    loadPortalActivity,
    getFinanceSummary,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const dashboardError = useStore(
    (s) => s.errors.invoices || s.errors.clients || s.errors.projects,
  );
  const navigate = useNavigate();
  const prefs = usePrefs();
  const [loading, setLoading] = useState(true);
  const [metricValues, setMetricValues] = useState<Record<string, string | number>>({});
  const [lastBackupInfo, setLastBackupInfo] = useState<{
    enabled: boolean;
    last_backup_at: string | null;
    daysAgo: number | null;
  } | null>(null);
  // Hooks must stay above the loading early-return below.
  const [checklistDismissed, setChecklistDismissed] = useState(
    () =>
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('lance:checklist-dismissed') === 'true',
  );
  const [digestDismissedWeek, setDigestDismissedWeek] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDigestDismissedWeek(localStorage.getItem('lance:digest-dismissed'));
    } catch {
      /* private mode */
    }
  }, []);
  const digestWeek = weekKey();
  const digest = useMemo(
    () => buildWeeklyDigest(invoices, timeEntries, proposals),
    [invoices, timeEntries, proposals],
  );
  // Badge and rows read the same orphan-filtered list, so the count can
  // never exceed the rendered rows (legacy pending rows whose invoice or
  // proposal is gone stay hidden instead of rendering nulls).
  const getActiveFollowUps = useStore((s) => s.getActiveFollowUps);
  const activeFollowUps = useMemo(() => {
    // getActiveFollowUps() reads these arrays from the store; its own identity
    // is stable, so reference them to refresh the memo with the source data.
    void [pendingFollowUps, invoices, proposals];
    return getActiveFollowUps();
  }, [getActiveFollowUps, pendingFollowUps, invoices, proposals]);

  useEffect(() => {
    Promise.all([
      loadInvoices(),
      loadProposals(),
      loadProjects(),
      loadClients(),
      loadTimeEntries(),
      loadExpenses(),
      loadProfile(),
      loadPendingFollowUps(),
    ])
      .catch((err) => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [
    loadInvoices,
    loadProposals,
    loadProjects,
    loadClients,
    loadTimeEntries,
    loadExpenses,
    loadProfile,
    loadPendingFollowUps,
    addToast,
  ]);

  useEffect(() => {
    if (loading) return;
    if (
      localStorage.getItem('lance:seeded') === 'true' &&
      localStorage.getItem('lance:seeded-toast-shown') !== 'true'
    ) {
      addToast('Sample data loaded · explore freely. Clear it anytime in Settings → Data.', 'info');
      localStorage.setItem('lance:seeded-toast-shown', 'true');
    }
    const loadBackupInfo = async () => {
      try {
        const { getLastBackupInfo } = await import('../utils/backup');
        const info = await getLastBackupInfo();
        if (info && info.enabled && info.last_backup_at) {
          const daysAgo = Math.floor(
            (Date.now() - new Date(info.last_backup_at).getTime()) / DAY_MS,
          );
          setLastBackupInfo({
            enabled: info.enabled,
            last_backup_at: info.last_backup_at,
            daysAgo,
          });
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
      if (
        item.activity.includes('accepted') ||
        item.activity.includes('signed') ||
        item.activity.includes('declined')
      ) {
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
  // Never nags: every tip fires a single time, ever. Off switch lives in
  // Settings → Personalize.
  useEffect(() => {
    if (loading || !prefs.coachTips) return;
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
  }, [loading, prefs.coachTips]);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const db = await getDb();
        const values: Record<string, string | number> = {};
        for (const card of DEFAULT_METRIC_CARDS) {
          try {
            const queryFn = (
              queries as Record<
                string,
                (db: Database, profileId: number) => Promise<string | number>
              >
            )[card.id];
            if (queryFn) {
              values[card.id] = await queryFn(db, profile?.id || 1);
            } else {
              values[card.id] = '--';
            }
          } catch {
            /* metric query failed; show em-dash as fallback */
            values[card.id] = '--';
          }
        }
        setMetricValues(values);
      } catch {
        /* db not available in browser mode */
      }
    };
    loadMetrics();
  }, [profile]);

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const recentTime = [...timeEntries]
    .filter((t) => t.duration_minutes)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .slice(0, 5);

  // Hero money stats: the one payment-aware summary, so the hero agrees
  // with Finance (a status-sum here ignored partial payments).
  const outstandingTotal = getFinanceSummary().totalOutstanding;
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const draftProposals = proposals.filter((p) => p.status === 'draft').length;
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Six-month trend series for KPI sparklines, computed from live data.
  // A series is only attached when it actually contains values.
  const monthBuckets = (() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  })();
  const bucketize = <T,>(
    items: T[],
    dateOf: (t: T) => string,
    valueOf: (t: T) => number,
  ): number[] =>
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
  const pipelineSeries = bucketize(
    proposals,
    (p) => p.created_at,
    () => 1,
  );
  const pickSeries = (s: number[]): number[] | undefined =>
    s.reduce((a, b) => a + b, 0) > 0 ? s : undefined;
  function cardIcon(id: string) {
    const k = id.toLowerCase();
    if (/revenue|income|profit|paid|outstanding|money|earning/.test(k))
      return <Banknote size={15} />;
    if (/hour|time|unbilled|utiliz|billable/.test(k)) return <Clock3 size={15} />;
    if (/win|rate|conversion/.test(k)) return <Target size={15} />;
    if (/proposal/.test(k)) return <FileText size={15} />;
    if (/client/.test(k)) return <Users size={15} />;
    if (/project/.test(k)) return <FolderKanban size={15} />;
    if (/invoice|expense|payment/.test(k)) return <Receipt size={15} />;
    return undefined;
  }
  function cardSpark(id: string): number[] | undefined {
    if (!prefs.sparklines) return undefined;
    const k = id.toLowerCase();
    if (/revenue|income|profit|paid|outstanding|money|earning/.test(k))
      return pickSeries(revenueSeries);
    if (/hour|time|unbilled|utiliz|billable/.test(k)) return pickSeries(hoursSeries);
    if (/win|rate|proposal|client|project|invoice|expense/.test(k))
      return pickSeries(pipelineSeries);
    return undefined;
  }

  const hasData = clients.length > 0 || invoices.length > 0 || projects.length > 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-6 w-32 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-1" />
        <div className="h-4 w-48 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
          <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
        </div>
      </div>
    );
  }

  // Each step deep-links AND opens the real create form: landing on a list
  // is not activation, doing the thing is.
  const runStep = (to: string | null, event: string | null, index: number) => {
    recordTelemetry('checklist_step_done', { step: index });
    if (to) navigate(to);
    if (event) {
      commands.dispatchAfterMount(event as CommandName);
    }
  };

  const steps = [
    {
      done: clients.length > 0,
      label: 'Add your first client',
      to: '/clients',
      icon: Users,
      event: 'lance:add-client',
    },
    {
      done: projects.length > 0,
      label: 'Create a project',
      to: '/projects',
      icon: FolderKanban,
      event: 'lance:add-project',
    },
    {
      done: timeEntries.length > 0,
      label: 'Log some time',
      to: null,
      icon: Clock,
      event: 'lance:add-time',
    },
    {
      done: proposals.length > 0,
      label: 'Send a proposal',
      to: '/proposals/new',
      icon: FileText,
      event: null,
    },
    {
      done: invoices.length > 0,
      label: 'Send an invoice',
      to: '/invoices',
      icon: Receipt,
      event: 'lance:add-invoice',
    },
  ];
  const allDone = steps.every((s) => s.done);
  const showChecklist = !checklistDismissed && !allDone;

  const dismissChecklist = () => {
    localStorage.setItem('lance:checklist-dismissed', 'true');
    setChecklistDismissed(true);
  };

  // Weekly digest: a Monday habit loop. Shows once the checklist is out of
  // the way (or dismissed), hides for the rest of the week on dismiss.
  const showDigest = prefs.digest && !showChecklist && digestDismissedWeek !== digestWeek;
  const dismissDigest = () => {
    try {
      localStorage.setItem('lance:digest-dismissed', digestWeek);
    } catch {
      /* private mode */
    }
    setDigestDismissedWeek(digestWeek);
  };

  const followUpRowData = (fu: FollowUpLog) => {
    const ctx = resolveFollowUpContext(fu, proposals, invoices, clients);
    if (!ctx) return null;
    return { ...ctx, draft: buildFollowUpDraftText(ctx, profile, followUpSettings.templates) };
  };

  return (
    <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
      <LoadError
        error={dashboardError}
        onRetry={() => {
          loadInvoices();
          loadClients();
          loadProjects();
        }}
      />
      {(() => (
        <Fade className="relative overflow-hidden rounded-[24px] glass p-6 sm:p-8 mb-6" y={18}>
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
                {todayLabel}
              </p>
              <h2 className="text-[30px] leading-[1.1] font-medium tracking-tight text-balance text-[var(--text-primary)]">
                Dashboard
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {profile?.name?.trim()
                  ? `${profile.name.split(' ')[0]}'s workspace`
                  : 'Overview of your work'}
              </p>
              {hasData && (
                <div className="flex flex-wrap items-baseline gap-3 mt-4">
                  <span className="text-[32px] leading-none font-medium tnum text-[var(--text-primary)]">
                    <AnimatedNumber
                      value={outstandingTotal}
                      format={(n) => formatCurrency(n, profile?.currency)}
                    />
                  </span>
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    outstanding
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
                onClick={() => commands.dispatch('lance:add-time')}
              >
                <Clock size={13} /> Log time
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  if (clients.length === 0) {
                    navigate('/clients');
                    commands.dispatchAfterMount('lance:add-client');
                  } else {
                    navigate('/invoices');
                    commands.dispatchAfterMount('lance:add-invoice');
                  }
                }}
              >
                <Plus size={13} /> {clients.length === 0 ? 'New client' : 'New invoice'}
              </Button>
            </div>
          </div>
        </Fade>
      ))()}

      {!loading && <TodayQueue />}

      {showChecklist && (
        <Card className="mb-6 border-[var(--accent)]/20 bg-[var(--accent-bg)]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
              <Play size={20} className="text-[var(--accent-ink,var(--accent))]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Let's get you set up
                </h3>
                <span className="text-[10px] font-semibold tnum px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent-ink,var(--accent))]">
                  {steps.filter((s) => s.done).length}/{steps.length}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-2.5">
                Everything in Lance starts with a client. Each step opens the real thing.
              </p>
              <div className="h-1 rounded-full bg-[var(--bg-secondary)] overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
                  style={{
                    width: `${Math.round((steps.filter((s) => s.done).length / steps.length) * 100)}%`,
                  }}
                />
              </div>
              <div className="space-y-2 mb-1">
                {steps.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => runStep(s.to, s.event, i + 1)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-left text-xs transition-colors ${
                      s.done
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] line-through cursor-default'
                        : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)]'
                    }`}
                    disabled={s.done}
                  >
                    {s.done ? (
                      <CheckCircle2 size={14} className="text-[var(--accent-ink,var(--accent))]" />
                    ) : (
                      <Circle size={14} className="text-[var(--text-tertiary)]" />
                    )}
                    <s.icon
                      size={14}
                      className={
                        s.done
                          ? 'text-[var(--text-tertiary)]'
                          : 'text-[var(--accent-ink,var(--accent))]'
                      }
                    />
                    {s.label}
                    {!s.done && (
                      <ArrowRight size={12} className="ml-auto text-[var(--text-tertiary)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={dismissChecklist}
              aria-label="Dismiss setup checklist"
              title="Dismiss"
              className="p-1 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </Card>
      )}

      {(() => (
        <>
          {showDigest && (
            <Card className="mb-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                    Your week{' '}
                    <span className="font-normal text-[var(--text-tertiary)]">
                      ({digest.weekLabel})
                    </span>
                  </h3>
                  {digest.hasActivity ? (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {digest.paidCount > 0 && (
                        <>
                          Got paid{' '}
                          <strong className="text-[var(--accent-ink,var(--accent))]">
                            {digest.paidCount}x
                          </strong>{' '}
                        </>
                      )}
                      {digest.hoursLogged > 0 && <>{digest.hoursLogged}h logged </>}
                      {digest.openProposals > 0 && (
                        <>
                          {digest.openProposals} proposal{digest.openProposals === 1 ? '' : 's'}{' '}
                          awaiting reply{' '}
                        </>
                      )}
                      {digest.overdueCount > 0 && (
                        <span className="text-[var(--danger)]">{digest.overdueCount} overdue</span>
                      )}
                      {digest.paidCount === 0 &&
                        digest.hoursLogged === 0 &&
                        digest.openProposals === 0 &&
                        digest.overdueCount === 0 && <>Quiet so far.</>}
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
                  className="p-1 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </Card>
          )}
        </>
      ))()}

      <StaggerGroup
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
        stagger={0.08}
      >
        {DEFAULT_METRIC_CARDS.map((card) => (
          <StaggerItem key={card.id}>
            <MetricCard
              label={card.label}
              value={metricValues[card.id] ?? '...'}
              color={
                (card.color as 'amber' | 'blue' | 'gray' | 'green' | 'purple' | 'red') || 'gray'
              }
              icon={cardIcon(card.id)}
              sparkData={cardSpark(card.id)}
            />
          </StaggerItem>
        ))}
      </StaggerGroup>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Portal Activity */}
        {portalActivity.length > 0 && (
          <Card className="border-[var(--accent)]/20">
            <div className="flex items-center gap-2 mb-3">
              <Link size={14} className="text-[var(--accent-ink,var(--accent))]" />
              <h3 className="text-xs font-medium text-[var(--text-secondary)]">Portal activity</h3>
            </div>
            <div className="space-y-1.5">
              {portalActivity.slice(0, 5).map((act, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xs text-xs"
                >
                  <span className="text-[var(--text-primary)]">{act.activity}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-3">
                    {relativeDate(act.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Needs Attention · Follow-ups */}
        {activeFollowUps.length > 0 && (
          <Card className="border-[var(--accent)]/20">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-[var(--accent-ink,var(--accent))]" />
              <h3 className="text-xs font-medium text-[var(--text-secondary)]">Needs attention</h3>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]">
                {activeFollowUps.length}
              </span>
            </div>
            <div className="space-y-2">
              {activeFollowUps.slice(0, 3).map((fu) => {
                const data = followUpRowData(fu);
                if (!data) return null;
                const { isProposal, entity, clientName, daysElapsed, draft } = data;
                return (
                  <div
                    key={fu.id}
                    className="flex items-start justify-between px-3 py-2 rounded-sm bg-[var(--bg-secondary)]/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {isProposal ? 'Proposal' : 'Invoice'}:{' '}
                        {isProposal
                          ? (entity as Proposal).title
                          : (entity as Invoice).invoice_number}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        {clientName} &middot; {daysElapsed}d
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1 line-clamp-2">
                        {draft.split('\n')[0]}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <button
                        onClick={async () => {
                          await updateFollowUpStatus(fu.id, 'dismissed', 'dismissed');
                        }}
                        className="p-1 rounded-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(draft);
                          await updateFollowUpStatus(fu.id, 'dismissed', 'dismissed');
                          addToast('Copied to clipboard · dismissed from queue', 'success');
                        }}
                        className="p-1 rounded-xs text-[var(--accent-ink,var(--accent))] hover:bg-[var(--accent-bg)]"
                        title="Copy & dismiss"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardWidgets
          recentInvoices={recentInvoices}
          recentTime={recentTime}
          profile={profile}
          projects={projects}
          navigate={navigate}
        />
      </div>

      {(() => (
        <>
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
        </>
      ))()}
    </div>
  );
}

function DashboardWidgets({
  recentInvoices,
  recentTime,
  profile,
  projects,
  navigate,
}: {
  recentInvoices: Invoice[];
  recentTime: TimeEntry[];
  profile: UserProfile | null;
  projects: Project[];
  navigate: (path: string) => void;
}) {
  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Invoices</h3>
          <button
            onClick={() => navigate('/invoices')}
            className="text-xs text-[var(--accent-ink,var(--accent))] hover:underline"
          >
            View all
          </button>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="text-center py-8">
            <Receipt size={32} className="text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">No invoices yet.</p>
            <Button
              onClick={() => {
                navigate('/invoices');
                commands.dispatchAfterMount('lance:add-invoice');
              }}
              size="sm"
              variant="secondary"
              className="mt-3"
            >
              <Plus size={12} /> New Invoice
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-3 py-2 rounded-sm hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    {inv.invoice_number}
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    {relativeDate(inv.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-medium ${inv.status === 'overdue' ? 'text-[var(--danger)]' : inv.status === 'paid' ? 'text-[var(--accent-ink,var(--accent))]' : 'text-[var(--text-primary)]'}`}
                  >
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
          <button
            onClick={() => navigate('/time')}
            className="text-xs text-[var(--accent-ink,var(--accent))] hover:underline"
          >
            View all
          </button>
        </div>
        {recentTime.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={32} className="text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">No time tracked yet.</p>
            <Button
              onClick={() => navigate('/time')}
              size="sm"
              variant="secondary"
              className="mt-3"
            >
              <Play size={12} /> Track Time
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTime.map((entry) => {
              const project = projects.find((p) => p.id === entry.project_id);
              const mins = entry.duration_minutes || 0;
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-3 py-2 rounded-sm hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                      {entry.description || project?.title || 'Untitled'}
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      {relativeDate(entry.start_time)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      {Math.floor(mins / 60)}h {mins % 60}m
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      {entry.billable ? 'billable' : 'non-billable'}
                    </p>
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
