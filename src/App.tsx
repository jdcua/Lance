/**
 * Lance · Freelancer OS
 * Built by Lance
 *
 * Privacy: Lance collects no telemetry. See PRIVACY.md.
 * License: Proprietary. See LICENSE.md.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Lock } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import AIBar from './components/layout/AIBar';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import ToastContainer from './components/ui/Toast';
import CommandPalette from './components/ui/CommandPalette';
import QuickTimeLogModal from './components/ui/QuickTimeLogModal';
import OnboardingComfort from './components/ui/OnboardingComfort';
import Walkthrough from './components/ui/Walkthrough';
import SpotlightTour from './components/ui/SpotlightTour';
import SplashScreen from './components/ui/SplashScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ImportModal from './components/ui/ImportModal';
import DropZoneOverlay from './components/ui/DropZoneOverlay';
import UpdaterModal from './components/ui/UpdaterModal';
import UpgradeModal from './components/ui/UpgradeModal';
import ShortcutsModal from './components/ui/ShortcutsModal';
import OrbitField from './components/motion/OrbitField';
import { useStore } from './store';
import { useToasts } from './store/toastStore';
import { useAutoUpdater } from './hooks/useAutoUpdater';
import {
  shouldGenerate,
  getNextDueDate,
  countCyclesBehind,
  getCatchUpCount,
  shouldShowCatchUpWarning,
  effectiveDueDate,
} from './utils/recurringEngine';
import { generateInvoiceNumber } from './utils/invoiceNumber';
import { useChangelog } from './utils/changelog';
import { usePrefs } from './lib/prefs';
import { applyTheme, getTheme, THEMES } from './themes/themes';
import { getShortcutModifierLabel } from './utils/shortcuts';
import type { Profession } from './themes';
import type { UserProfile } from './types';
import { PROFESSION_THEME } from './themes';
import { getArchetype, ARCHETYPE_LIST } from './archetypes';
import { driveAxisFor, saveDrive, loadDrive, DRIVE_AXES } from './tour/voice';
import { checkAchievements } from './achievements/checker';
import { ACHIEVEMENTS } from './achievements';
import { seedSampleData } from './utils/seedData';
import { parseDateString, DAY_MS } from './utils/format';
import { defaultCurrency } from './lib/currency';
import { recordTelemetry } from './utils/telemetry';
import { detectNewOpens, snapshotOpens } from './utils/portalActivity';
import { getFeatureFlags } from './lib/constants';
import { getRuntimeVersion } from './lib/version';
import { isTrial } from './demo/isDemo';
import TrialBanner from './demo/TrialBanner';
import TestModeBanner from './demo/TestModeBanner';

// Max upsell-splash views per app version for unlicensed users.
export const SPLASH_MAX_VIEWS = 3;

/**
 * Run `fn` at the next idle opportunity, but never later than `ms`.
 *
 * Startup work deferred to requestIdleCallback alone can be starved for a long
 * time on a busy machine or a heavy page load — the browser only grants idle
 * time when it has some to spare. The trial's sample business is seeded that
 * way, so a first-time visitor could sit looking at an empty app for as long
 * as the machine stayed busy. Racing a timer keeps the deferral (it still does
 * not compete with first paint) without making correctness depend on the
 * browser ever going idle.
 */
export function idleOrTimeout(fn: () => void, ms = 400): () => void {
  let ran = false;
  const once = () => {
    if (ran) return;
    ran = true;
    fn();
  };
  const timer = setTimeout(once, ms);
  const idle = requestIdleCallback(once);
  return () => {
    clearTimeout(timer);
    cancelIdleCallback(idle);
  };
}

export default function App() {
  const {
    profile,
    profileLoaded,
    loadProfile,
    isLicensed,
    initLicenseFlow,
    recurringInvoices,
    loadRecurringInvoices,
    updateRecurringInvoice,
    invoices,
    loadInvoices,
    addInvoice,
    loadClients,
    loadFollowUpSettings,
    setPortalPort,
    setPortalFailed,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasRanAutoGen, setHasRanAutoGen] = useState(false);

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  // Upsell frequency cap: free users see the splash at most SPLASH_MAX_VIEWS
  // times per app version, then silence until the next release. Counted in
  // SplashScreen on mount; loaded here once the runtime version resolves.
  // Launch-only: captured at mount so finishing onboarding mid-session
  // doesn't trigger a splash the moment onboarding closes.
  // First-launch grace: brand-new users meet the app before the upsell.
  // The splash appears from the second launch on, still capped per version.
  // NOTE: the initializer must stay a pure read — StrictMode double-invokes
  // it in dev, so writing localStorage here flips the result on the second
  // pass. The marker write lives in the passive effect below (idempotent).
  const [splashAtMount] = useState(() => {
    try {
      // Either completion marker counts — legacy runs wrote step=complete
      // without onboarding-completed, and those users are still first-launch.
      const done =
        localStorage.getItem('lance:onboarding-completed') === 'true' ||
        localStorage.getItem('lance:onboarding-step') === 'complete';
      return done && localStorage.getItem('lance:has-launched') === 'true';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    // Only mark returning sessions: a mount with onboarding still open is
    // somebody's first session, and marking it would burn the first-launch
    // grace before they ever see the app.
    try {
      if (
        localStorage.getItem('lance:onboarding-completed') === 'true' ||
        localStorage.getItem('lance:onboarding-step') === 'complete'
      ) {
        localStorage.setItem('lance:has-launched', 'true');
      }
    } catch {
      /* private mode */
    }
  }, []);
  const [splashViews, setSplashViews] = useState<number | null>(null);
  // Anti-ambush: if the user starts interacting before the async version
  // check resolves, never pop the splash over their work. A modal that
  // appears seconds after load, mid-click, is worse than no upsell.
  const [userInteracted, setUserInteracted] = useState(false);
  useEffect(() => {
    const mark = () => setUserInteracted(true);
    window.addEventListener('pointerdown', mark, { once: true });
    window.addEventListener('keydown', mark, { once: true });
    return () => {
      window.removeEventListener('pointerdown', mark);
      window.removeEventListener('keydown', mark);
    };
  }, []);
  // Guard against double-processing recurring invoices when invoices.length
  // changes mid-generation and re-triggers the idle-callback effect.
  const autoGenProcessedRef = useRef<Set<string>>(new Set());
  const toggleTimerRunning = useRef(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<string | null>(null);

  const openUpgradeModal = (triggerFeature?: string) => {
    setUpgradeTrigger(triggerFeature || null);
    setShowUpgradeModal(true);
  };

  // Allow any screen to request the upgrade modal via a custom event.
  useEffect(() => {
    const handler = (e: Event) => {
      openUpgradeModal((e as CustomEvent<string>).detail || undefined);
    };
    document.addEventListener('lance:open-upgrade', handler);
    return () => document.removeEventListener('lance:open-upgrade', handler);
  }, []);

  // Time entries are logged through the global quick-log modal (the Time
  // screen has no new-entry trigger of its own). This wires the checklist
  // and the Cmd/Ctrl+N shortcut, which previously dispatched to nothing.
  useEffect(() => {
    const handler = () => setShowQuickLogModal(true);
    document.addEventListener('lance:add-time', handler);
    return () => document.removeEventListener('lance:add-time', handler);
  }, []);

  // Pro open alerts: when a client opens a shared proposal, Pro and trial
  // users get pinged with one-click actions (open it, draft a follow-up).
  // Free tiers still see passive open badges on the Proposals screen.
  // Polls on the same 30s cadence as the dashboard feed.
  useEffect(() => {
    let stopped = false;
    const seenRef: { current: Record<string, number> } = { current: {} };
    const check = async () => {
      try {
        const store = useStore.getState();
        await store.loadPortalActivity();
        if (stopped) return;
        const fresh = detectNewOpens(useStore.getState().portalActivity, seenRef.current);
        seenRef.current = snapshotOpens(useStore.getState().portalActivity);
        if (fresh.length === 0) return;
        if (getFeatureFlags(store.getActiveTier()).advancedInsights !== true) return;
        const proposals = useStore.getState().proposals;
        for (const item of fresh) {
          const proposal = proposals.find((p) => p.id === item.proposalId);
          if (!proposal) continue;
          addToast(`Client opened "${proposal.title}" (${item.opens}x)`, 'info', undefined, [
            {
              label: 'Open proposal',
              onClick: () => navigate('/proposals'),
            },
            {
              label: 'Draft follow-up',
              onClick: () => {
                useStore
                  .getState()
                  .createFollowUp({ entity_type: 'proposal', entity_id: item.proposalId, stage: 1 })
                  .then(() => addToast('Follow-up drafted', 'success'))
                  .catch(() => addToast('Could not draft the follow-up', 'error'));
              },
            },
          ]);
        }
      } catch {
        /* portal polling is best-effort */
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFiles, setImportFiles] = useState<File[] | undefined>(undefined);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const [appVersion, setAppVersion] = useState<string>('');
  const { changelog } = useChangelog();
  const prefs = usePrefs();

  useEffect(() => {
    getRuntimeVersion().then(setAppVersion);
  }, []);

  // Local-first telemetry: one launch tick per mount. Powers personal
  // stats and struggle detection. Never leaves the machine.
  useEffect(() => {
    recordTelemetry('app_launch');
  }, []);

  useEffect(() => {
    if (!appVersion) return;
    const seen = parseInt(localStorage.getItem(`lance:splash-views:${appVersion}`) || '0', 10) || 0;
    setSplashViews(seen);
  }, [appVersion]);

  // Changelog check on mount. Depends on appVersion: getRuntimeVersion()
  // resolves after mount, so an empty-deps effect bails on the initial ''
  // and the "What's new" modal never appears. Re-running is safe: dismiss
  // persists changelog-seen, which stops repeat shows.
  // Brand-new users (no seen version AND no previous run on record) have
  // nothing to catch up on: mark the current version seen silently instead
  // of ambushing them with release notes on first launch.
  useEffect(() => {
    if (!appVersion) return;
    const seen = localStorage.getItem('lance:changelog-seen');
    const lastRun = localStorage.getItem('lance:last-run-version');
    try {
      localStorage.setItem('lance:last-run-version', appVersion);
    } catch {
      /* private mode */
    }
    if (seen === appVersion) return;
    // If onboarding hasn't been completed yet, defer changelog to next session
    // (the version check will still find it unseen)
    const onboardingCompleted = localStorage.getItem('lance:onboarding-completed') === 'true';
    if (!onboardingCompleted) return;
    if (!seen && !lastRun) {
      try {
        localStorage.setItem('lance:changelog-seen', appVersion);
      } catch {
        /* private mode */
      }
      return;
    }
    setShowChangelog(true);
  }, [appVersion]);

  const dismissChangelog = () => {
    const latestVersion = changelog[0]?.version || appVersion;
    // Never persist a "seen" version older than the installed app, otherwise
    // the changelog modal re-shows with stale notes on every launch.
    const seenVersion =
      latestVersion.localeCompare(appVersion, undefined, { numeric: true }) >= 0
        ? latestVersion
        : appVersion;
    localStorage.setItem('lance:changelog-seen', seenVersion);
    setShowChangelog(false);
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const setupListeners = async () => {
      try {
        const { tauriListen } = await import('./utils/tauri');
        const unlistenReady = await tauriListen<{ port: number }>(
          'portal-server-ready',
          (event) => {
            setPortalPort(event.port);
          },
        );
        const unlistenFailed = await tauriListen<{ reason: string }>('portal-server-failed', () => {
          setPortalFailed();
          addToast(
            'Client portal unavailable \u2014 port conflict. Restart Lance to retry.',
            'error',
            8000,
          );
        });
        cleanup = () => {
          unlistenReady();
          unlistenFailed();
        };
      } catch (err) {
        console.debug('[tauri] Portal listeners not available in browser mode:', err);
      }
    };
    setupListeners();
    return () => cleanup?.();
  }, [addToast, setPortalFailed, setPortalPort]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Start the trial clock / license flow once the profile lands. Without
  // this, trial_started_at is never set and the trial never counts down.
  const licenseFlowRan = useRef(false);
  useEffect(() => {
    if (profileLoaded && profile && !licenseFlowRan.current) {
      licenseFlowRan.current = true;
      initLicenseFlow().catch((e) => console.error('[license] flow failed', e));
    }
  }, [profileLoaded, profile, initLicenseFlow]);

  useEffect(() => {
    const explicitTheme = profile?.theme;
    const persistMode = (mode: 'dark' | 'light') => {
      try {
        localStorage.setItem('lance:theme-mode', mode);
      } catch {
        /* private mode */
      }
    };
    if (explicitTheme) {
      const dark = explicitTheme === 'dark';
      document.documentElement.classList.toggle('dark', dark);
      persistMode(dark ? 'dark' : 'light');
      const storedThemeId = localStorage.getItem('lance:theme') || 'default';
      applyTheme(getTheme(storedThemeId));
    } else if (profileLoaded && !profile) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
      persistMode(prefersDark ? 'dark' : 'light');
      applyTheme(getTheme('default'));
    } else {
      document.documentElement.classList.remove('dark');
      persistMode('light');
    }
  }, [profile?.theme, profileLoaded, profile]);

  // Apply saved density and accent color from localStorage
  useEffect(() => {
    const savedDensity = localStorage.getItem('lance:density');
    if (savedDensity === 'compact') {
      document.body.classList.add('density-compact');
    }
    const savedAccent = localStorage.getItem('lance:accent-color');
    if (savedAccent) {
      document.body.classList.forEach((cls) => {
        if (cls.startsWith('accent-')) document.body.classList.remove(cls);
      });
      document.body.classList.add(`accent-${savedAccent}`);
    }
  }, []);

  // Persist & restore window size/position (Tauri only)
  useEffect(() => {
    let unlistenResize: (() => void) | undefined;
    let unlistenMove: (() => void) | undefined;
    let debounceTimer: ReturnType<typeof setTimeout>;

    const clampToDisplayBounds = async (x: number, y: number, width: number, height: number) => {
      try {
        const { currentMonitor } = await import('@tauri-apps/api/window');
        const monitor = await currentMonitor();
        if (monitor) {
          const { x: mx, y: my } = monitor.position;
          const { width: mw, height: mh } = monitor.size;
          const clampedX = Math.max(mx, Math.min(x, mx + mw - Math.min(width, mw)));
          const clampedY = Math.max(my, Math.min(y, my + mh - Math.min(height, mh)));
          return { x: clampedX, y: clampedY, width, height };
        }
      } catch {
        /* non-critical */
      }
      return { x: Math.max(x, 0), y: Math.max(y, 0), width, height };
    };

    const setup = async () => {
      try {
        const { getCurrentWindow, PhysicalSize, PhysicalPosition } =
          await import('@tauri-apps/api/window');
        const win = getCurrentWindow();

        // Restore saved window state
        const saved = localStorage.getItem('lance:window-state');
        if (saved) {
          try {
            const { width, height, x, y } = JSON.parse(saved);
            const clamped = await clampToDisplayBounds(
              x ?? 0,
              y ?? 0,
              Math.max(width ?? 1100, 900),
              Math.max(height ?? 680, 600),
            );
            await win.setSize(new PhysicalSize(clamped.width, clamped.height));
            await win.setPosition(new PhysicalPosition(clamped.x, clamped.y));
          } catch {
            /* ignore corrupt state */
          }
        }

        const saveState = async () => {
          try {
            const [size, pos] = await Promise.all([win.outerSize(), win.outerPosition()]);
            const clamped = await clampToDisplayBounds(
              Math.max(pos.x, 0),
              Math.max(pos.y, 0),
              Math.max(size.width, 900),
              Math.max(size.height, 600),
            );
            localStorage.setItem('lance:window-state', JSON.stringify(clamped));
          } catch {
            /* non-critical */
          }
        };

        // Save on resize
        unlistenResize = await win.onResized(() => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(saveState, 300);
        });

        // Save on move
        unlistenMove = await win.onMoved(() => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(saveState, 300);
        });
      } catch {
        /* not running in Tauri */
      }
    };

    setup();

    return () => {
      clearTimeout(debounceTimer);
      unlistenResize?.();
      unlistenMove?.();
    };
  }, []);

  // Apply color theme on mount
  useEffect(() => {
    const stored = localStorage.getItem('lance:theme') || 'default';
    const theme = getTheme(stored);
    applyTheme(theme);
  }, []);

  // Licensed users: preload all theme fonts on mount
  useEffect(() => {
    if (isLicensed) {
      THEMES.forEach((t) => {
        // applyTheme triggers font loading internally
        const current = getTheme(localStorage.getItem('lance:theme') || 'default');
        applyTheme(t);
        applyTheme(current);
      });
    }
  }, [isLicensed]);

  useEffect(() => {
    const completed = localStorage.getItem('lance:onboarding-completed');
    const step = localStorage.getItem('lance:onboarding-step');
    if (completed === 'true' || step === 'complete') {
      setShowOnboarding(false);
      return;
    }
    if (!profileLoaded) return;
    // Only show onboarding if no explicit completion flag and user hasn't finished
    // Do NOT auto-complete just because profile.name exists · the user must go through all steps
    setShowOnboarding(true);
  }, [profileLoaded]);

  // First-run owns the session: once onboarding activates, the upsell splash
  // stays dismissed until next launch. Otherwise the splash ambushes the user
  // right after setup/tour (e.g. covering the New Client modal the tour CTA
  // just opened). Returning users still see the splash on each launch.
  useEffect(() => {
    if (showOnboarding) {
      setShowSplash(false);
    }
  }, [showOnboarding]);

  // Show walkthrough after onboarding completes
  useEffect(() => {
    if (
      !showOnboarding &&
      localStorage.getItem('lance:tour-pending') === 'true' &&
      !showWalkthrough
    ) {
      setShowWalkthrough(true);
    }
  }, [showOnboarding, showWalkthrough]);

  // Auto-generate recurring invoices on startup (deferred after first render)
  useEffect(() => {
    if (!profileLoaded || hasRanAutoGen) return;
    const cancel = idleOrTimeout(() => {
      setHasRanAutoGen(true);
      // Trial always opens with a full sample business so every screen
      // has something real to click. Unlimited tries: Reset restores this.
      // Seeding is async and screens mount (and load) before it finishes,
      // so refresh the store once it lands — otherwise the first screen a
      // visitor opens can stay empty until they navigate away and back.
      if (isTrial()) {
        seedSampleData()
          .then(() => {
            const s = useStore.getState();
            return Promise.allSettled([
              s.loadClients(),
              s.loadProjects(),
              s.loadMilestones(),
              s.loadProposals(),
              s.loadContracts(),
              s.loadTimeEntries(),
              s.loadInvoices(),
              s.loadExpenses(),
              s.loadRecurringInvoices(),
            ]);
          })
          .then(() => import('./demo/importToolDraft').then((m) => m.importToolDraft()))
          .then((imported) => {
            if (imported) {
              addToast(
                'Imported your invoice-generator draft as a client + draft invoice',
                'success',
              );
              const s = useStore.getState();
              return Promise.allSettled([s.loadClients(), s.loadInvoices()]);
            }
          })
          .catch(() => {});
      }
      loadRecurringInvoices();
      loadInvoices();
      loadClients();
      // Check achievements after initial data load
      try {
        const state = useStore.getState();
        checkAchievements(state).then((newAchievements) => {
          for (const key of newAchievements) {
            const ach = ACHIEVEMENTS.find((a) => a.key === key);
            if (ach) {
              addToast(`${ach.title} · ${ach.reward}`, 'unlock');
            }
          }
        });
      } catch {
        /* achievement check is non-critical */
      }
    });
    return cancel;
  }, [profileLoaded, hasRanAutoGen, loadRecurringInvoices, loadInvoices, loadClients, addToast]);

  // Deferred recurring invoice check · runs after first render via idle callback
  useEffect(() => {
    if (!hasRanAutoGen || recurringInvoices.length === 0) return;
    if (invoices.length === 0 && hasRanAutoGen) {
      loadInvoices();
      return;
    }
    const handle = requestIdleCallback(async () => {
      const paymentTerms = profile?.payment_terms ?? 14;
      const due = recurringInvoices
        .filter(shouldGenerate)
        .filter((ri) => !autoGenProcessedRef.current.has(ri.id));
      for (const ri of due) {
        autoGenProcessedRef.current.add(ri.id);
        // Never orphan invoices: legacy rows can outlive their client
        // (they predate the delete guards that now block that).
        const client = useStore.getState().clients.find((c) => c.id === ri.client_id);
        if (!client) continue;
        // Running cursor (not the stale closure row): each generated cycle
        // must advance from the previous one, or catch-up only ever moves
        // a single cycle per launch and warns forever.
        let cursor = effectiveDueDate(ri);
        const cyclesBehind = countCyclesBehind({ ...ri, next_due: cursor.toISOString() });
        const { generate, capped } = getCatchUpCount(cyclesBehind);

        for (let i = 0; i < generate; i++) {
          const currentInvoices = useStore.getState().invoices;
          const invNumber = generateInvoiceNumber(currentInvoices);
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + paymentTerms);
          const now = new Date();
          cursor = getNextDueDate(ri.frequency, cursor);
          try {
            // Claim the cycle BEFORE creating: a failed insert then skips
            // (with a toast) instead of duplicating next launch.
            await updateRecurringInvoice({
              ...ri,
              next_due: cursor.toISOString(),
              last_generated: now.toISOString(),
            });
            await addInvoice({
              client_id: ri.client_id,
              project_id: ri.project_id,
              invoice_number: invNumber,
              status: 'draft',
              line_items: ri.line_items,
              subtotal: ri.subtotal,
              tax_rate: ri.tax_rate,
              total: ri.total,
              due_date: dueDate.toISOString().split('T')[0],
              notes: ri.notes,
            });
            addToast(`Invoice generated for ${client.name || ri.client_id}`, 'success');
          } catch {
            addToast(`Could not generate invoice for ${client.name || ri.client_id}`, 'error');
          }
        }

        if (capped && shouldShowCatchUpWarning(ri)) {
          addToast(
            `\u26A0\uFE0F ${ri.title} recurring invoice is ${cyclesBehind} cycles overdue. ${generate} drafts created \u2014 review in Invoices.`,
            'info',
            6000,
          );

          try {
            const { getDb } = await import('./db');
            const db = await getDb();
            await db.execute(
              'UPDATE recurring_invoices SET last_catch_up_warning = ? WHERE id = ?',
              [new Date().toISOString(), ri.id],
            );
          } catch {
            /* non-critical */
          }
        }
      }
    });
    return () => cancelIdleCallback(handle);
  }, [
    hasRanAutoGen,
    recurringInvoices,
    invoices.length,
    profile?.payment_terms,
    addInvoice,
    addToast,
    loadInvoices,
    updateRecurringInvoice,
  ]);

  // Auto-backup check · runs after engines, deferred (browser mode: skip)
  useEffect(() => {
    if (!hasRanAutoGen) return;
    if (
      typeof window === 'undefined' ||
      !(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
    )
      return;
    const handle = requestIdleCallback(async () => {
      try {
        const { runAutoBackup } = await import('./utils/backup');
        const result = await runAutoBackup();
        if (!result.success && result.error) {
          addToast(`Auto-backup failed: ${result.error}`, 'error', 8000);
        }
      } catch {
        /* non-critical */
      }
    });
    return () => cancelIdleCallback(handle);
  }, [hasRanAutoGen, addToast]);

  // Follow-up checker · deferred after first render, runs every 30 minutes
  useEffect(() => {
    if (!profileLoaded) return;
    loadFollowUpSettings();

    const checkFollowUps = async () => {
      try {
        const { getTemplateKey, getStage } = await import('./utils/followUpTemplates');
        const state = useStore.getState();
        const settings = state.followUpSettings;
        if (!settings.enabled) return;

        await state.loadProposals();
        await state.loadInvoices();
        await state.loadClients();
        await state.loadPendingFollowUps();
        await state.loadAllFollowUpLogs();
        const currentPending = useStore.getState().pendingFollowUps;
        // Full history (keyed entity_type:entity_id) so we never re-draft a stage
        // that was already actioned (sent/dismissed) · the pending-only guard
        // would re-create an identical draft every run after actioning.
        const followUpHistory = useStore.getState().followUpLogs;

        const now = new Date();

        // Check proposals
        for (const p of useStore.getState().proposals) {
          if (p.status !== 'sent') continue;

          const client = useStore.getState().clients.find((c) => c.id === p.client_id);
          if (!client?.email) {
            console.warn(`Skipping proposal follow-up for "${p.title}" · client has no email`);
            continue;
          }

          const sentDate = p.sent_at ? new Date(p.sent_at) : new Date(p.created_at);
          const daysElapsed = Math.floor((now.getTime() - sentDate.getTime()) / DAY_MS);
          if (daysElapsed < settings.proposal_delay_days) continue;

          const stage = getStage('proposal', daysElapsed - settings.proposal_delay_days);
          const alreadyPending = currentPending.some(
            (l) => l.entity_type === 'proposal' && l.entity_id === p.id && l.stage === stage,
          );
          const alreadyLogged = (followUpHistory[`proposal:${p.id}`] || []).some(
            (l) => l.stage === stage,
          );
          if (alreadyPending || alreadyLogged) continue;

          const templateKey = getTemplateKey('proposal', daysElapsed, settings.proposal_delay_days);
          if (!templateKey) continue;

          await state.logFollowUp({ entity_type: 'proposal', entity_id: p.id, stage });
        }

        // Check invoices
        for (const inv of useStore.getState().invoices) {
          if (inv.status !== 'sent' && inv.status !== 'overdue') continue;
          if (!inv.due_date) continue;

          const client = useStore.getState().clients.find((c) => c.id === inv.client_id);
          if (!client?.email) {
            console.warn(
              `Skipping invoice follow-up for "${inv.invoice_number}" · client has no email`,
            );
            continue;
          }

          const dueDate = parseDateString(inv.due_date);
          const daysElapsed = Math.floor((now.getTime() - dueDate.getTime()) / DAY_MS);
          // Auto-mark overdue: a sent invoice past its due date becomes
          // overdue (one-time transition; everything downstream already
          // treats both as unpaid).
          if (inv.status === 'sent' && daysElapsed >= 1) {
            try {
              await state.updateInvoice({ ...inv, status: 'overdue' });
            } catch {
              /* non-critical; follow-up still queues below */
            }
          }
          if (daysElapsed < settings.invoice_delay_days) continue;

          const stage = getStage('invoice', daysElapsed);
          const alreadyPending = currentPending.some(
            (l) => l.entity_type === 'invoice' && l.entity_id === inv.id && l.stage === stage,
          );
          const alreadyLogged = (followUpHistory[`invoice:${inv.id}`] || []).some(
            (l) => l.stage === stage,
          );
          if (alreadyPending || alreadyLogged) continue;

          const templateKey = getTemplateKey('invoice', daysElapsed, settings.invoice_delay_days);
          if (!templateKey) continue;

          await state.logFollowUp({ entity_type: 'invoice', entity_id: inv.id, stage });
        }
      } catch {
        /* follow-up check is non-critical */
      }
    };

    const initialHandle = requestIdleCallback(() => checkFollowUps());
    const interval = setInterval(checkFollowUps, 30 * 60 * 1000);
    return () => {
      cancelIdleCallback(initialHandle);
      clearInterval(interval);
    };
  }, [profileLoaded, loadFollowUpSettings]);

  // Proposal expiry engine · deferred after first render, runs every hour
  useEffect(() => {
    if (!profileLoaded) return;

    const checkExpiry = async () => {
      try {
        // Shared invoke (NOT @tauri-apps/api/core directly): the browser
        // shim implements this command, and a direct import throws outside
        // Tauri — which used to silently disable expiry for browser users.
        const { tauriInvoke } = await import('./utils/tauri');
        const expired = await tauriInvoke<Array<{ id: string; client_id: string; title: string }>>(
          'expire_sent_proposals',
          {},
        );
        if (expired.length === 0) return;

        const state = useStore.getState();
        await state.loadClients();
        await state.loadProposals();
        const settings = state.followUpSettings;

        for (const ep of expired) {
          const client = state.clients.find((c) => c.id === ep.client_id);
          const clientName = client?.name || 'Unknown';

          // Retire pre-expiry nudges first: a "chase this proposal" draft
          // for a now-expired proposal is stale (the expiry engine bypasses
          // store.updateProposal, so its auto-resolve doesn't run here).
          try {
            await state.loadPendingFollowUps();
            for (const l of useStore
              .getState()
              .pendingFollowUps.filter(
                (f) => f.entity_type === 'proposal' && f.entity_id === ep.id,
              )) {
              await state.updateFollowUpStatus(l.id, 'dismissed', 'auto-resolved');
            }
          } catch {
            /* expiry stands regardless */
          }

          await state.addCommunication({
            id: crypto.randomUUID(),
            client_id: ep.client_id,
            type: 'note',
            summary: `Proposal '${ep.title}' expired automatically`,
            date: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });

          if (settings.enabled && client?.email) {
            await state.logFollowUp({ entity_type: 'proposal', entity_id: ep.id, stage: 3 });
          }

          if (settings.enabled) {
            addToast(`Proposal '${ep.title}' for ${clientName} has expired`, 'info');
          }
        }
      } catch {
        /* expiry check is non-critical */
      }
    };

    const initialHandle = requestIdleCallback(() => checkExpiry());
    const interval = setInterval(checkExpiry, 60 * 60 * 1000);
    return () => {
      cancelIdleCallback(initialHandle);
      clearInterval(interval);
    };
  }, [profileLoaded, addToast]);

  useAutoUpdater();

  // Global drag-and-drop for import
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (dragCounter.current === 1) {
        setIsDragOver(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragOver(false);
      }
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        setImportFiles(files);
        setShowImportModal(true);
      }
    };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Listen for lance:open-import custom event (sidebar button)
  useEffect(() => {
    const handler = () => {
      setImportFiles(undefined);
      setShowImportModal(true);
    };
    document.addEventListener('lance:open-import', handler);
    return () => document.removeEventListener('lance:open-import', handler);
  }, []);

  const toggleTimer = useCallback(async () => {
    // In-flight guard: two rapid toggles would both read "none running" and
    // open duplicate timers. One toggle at a time; extras are dropped.
    if (toggleTimerRunning.current) return;
    toggleTimerRunning.current = true;
    try {
      const state = useStore.getState();
      await state.loadTimeEntries();
      await state.loadProjects();

      const openEntries = state.timeEntries.filter((t) => !t.end_time);
      const activeEntry = openEntries[0];

      if (activeEntry) {
        const endTime = new Date().toISOString();
        // Close EVERYTHING open, not just the first: legacy/imported data
        // (and pre-guard races) can hold several. The first keeps its real
        // duration; extras are stamped as-is so no time silently vanishes.
        for (const entry of openEntries) {
          const duration = Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 60000);
          if (entry.id === activeEntry.id && duration < 1) {
            // Sub-minute timer toggle produces a phantom 0-minute entry. Discard it.
            await state.removeTimeEntry(entry.id);
          } else {
            await state.updateTimeEntry({
              ...entry,
              end_time: endTime,
              duration_minutes: Math.max(0, duration),
            });
          }
        }
        const duration = Math.floor(
          (Date.now() - new Date(activeEntry.start_time).getTime()) / 60000,
        );
        if (duration < 1) {
          addToast('Timer stopped · under a minute, nothing logged', 'info');
        } else {
          const h = Math.floor(duration / 60);
          const m = duration % 60;
          addToast(`Timer stopped · ${h > 0 ? `${h}h ` : ''}${m}m`, 'success');
        }
      } else {
        let projectId = '';
        let clientId = '';
        const lastConfig = localStorage.getItem('lance:last-timer-config');
        if (lastConfig) {
          try {
            const cfg = JSON.parse(lastConfig);
            projectId = cfg.projectId || '';
            clientId = cfg.clientId || '';
          } catch {
            /* ignore */
          }
        }
        // The remembered project may be deleted or archived since. Fall
        // back to the first active project instead of orphaning the entry.
        const remembered = state.projects.find((p) => p.id === projectId && p.status === 'active');
        if (!remembered) {
          projectId = '';
          clientId = '';
        }
        if (!projectId || !clientId) {
          // No valid memory: a single active project is unambiguous, but with
          // several the toggle must not silently pick one — hours logged to
          // the wrong project end up on the wrong invoice. Ask instead of
          // guessing; Quick Log or any timer run remembers the choice.
          const active = state.projects.filter((p) => p.status === 'active');
          if (active.length === 1) {
            projectId = active[0].id;
            clientId = active[0].client_id;
          } else if (active.length === 0) {
            addToast('No active project available to start timer', 'error');
            return;
          } else {
            addToast('Pick a project for the timer first — log time once via Quick Log', 'error');
            return;
          }
        }
        const entry = await state.addTimeEntry({
          project_id: projectId,
          client_id: clientId,
          start_time: new Date().toISOString(),
          billable: true,
        });
        try {
          localStorage.setItem(
            'lance:last-timer-config',
            JSON.stringify({ projectId: entry.project_id, clientId: entry.client_id }),
          );
        } catch {
          /* private mode */
        }
        const project = state.projects.find((p) => p.id === projectId);
        addToast(`Timer started · ${project?.title || 'Unknown'}`, 'success');
      }
    } catch (err) {
      addToast(err?.toString?.() || 'Timer failed', 'error');
    } finally {
      toggleTimerRunning.current = false;
    }
  }, [addToast]);

  // Listen for lance:toggle-timer from Time page MetricCard click
  useEffect(() => {
    const handler = () => toggleTimer();
    document.addEventListener('lance:toggle-timer', handler);
    return () => document.removeEventListener('lance:toggle-timer', handler);
  }, [toggleTimer]);

  // Open command palette from Topbar search
  useEffect(() => {
    const handler = () => setShowCommandPalette(true);
    document.addEventListener('lance:open-command', handler);
    return () => document.removeEventListener('lance:open-command', handler);
  }, []);

  // Keyboard shortcuts
  const isEditing = useCallback((): boolean => {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return true;
    if (
      document.activeElement?.closest('[contenteditable="true"]') ||
      document.activeElement?.closest('.tiptap')
    )
      return true;
    return false;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!isEditing()) navigate('/settings', { replace: true });
        return;
      }
      const modShift = (e.metaKey || e.ctrlKey) && e.shiftKey;
      if (modShift && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        toggleTimer();
        return;
      }
      if (modShift && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        setShowQuickLogModal(true);
        return;
      }
      if (isEditing()) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }
      if (mod && e.key === 'n') {
        const path = location.pathname;
        // Only swallow the keystroke when it does something: otherwise
        // Cmd+N keeps its native meaning (new window) instead of dying.
        if (path.startsWith('/proposals')) {
          e.preventDefault();
          navigate('/proposals/new');
        } else if (path.startsWith('/clients')) {
          e.preventDefault();
          // Trigger client add modal via doc event
          document.dispatchEvent(new CustomEvent('lance:add-client'));
        } else if (path.startsWith('/invoices')) {
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('lance:add-invoice'));
        } else if (path.startsWith('/projects')) {
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('lance:add-project'));
        } else if (path.startsWith('/time')) {
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('lance:add-time'));
        } else if (path.startsWith('/contracts')) {
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('lance:add-contract'));
        } else if (path.startsWith('/finance')) {
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('lance:add-expense'));
        }
      }
      if (mod && !e.shiftKey && e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        const profile = useStore.getState().profile;
        const config = getArchetype(profile?.profession || 'default');
        const sidebarPaths = config.sidebar.map((s) => s.path);
        if (sidebarPaths[idx]) {
          navigate(sidebarPaths[idx]);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, location, isEditing, toggleTimer]);

  // Listen for lance:open-archetype-picker from Settings
  useEffect(() => {
    const handler = () => navigate('/archetype');
    document.addEventListener('lance:open-archetype-picker', handler);
    return () => document.removeEventListener('lance:open-archetype-picker', handler);
  }, [navigate]);

  // Listen for lance:edit-client from FollowUps (client missing email)
  useEffect(() => {
    const handler = () => {
      navigate('/clients');
      addToast('Open the client to add an email address', 'info');
    };
    document.addEventListener('lance:edit-client', handler);
    return () => document.removeEventListener('lance:edit-client', handler);
  }, [navigate, addToast]);

  return (
    <ErrorBoundary>
      <div className="h-full flex bg-[var(--bg-primary)]">
        <a
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('main-content')?.focus();
          }}
          className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:m-3 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:rounded-[8px] focus:bg-[var(--bg-card)] focus:text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)]"
        >
          Skip to main content
        </a>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {__TEST_MODE__ ? <TestModeBanner /> : null}
          <Topbar />
          {isTrial() ? <TrialBanner /> : null}
          <AIBar />
          <main
            tabIndex={0}
            id="main-content"
            aria-label="Main content"
            className={`flex-1 overflow-y-auto ${prefs.glow ? 'bg-[radial-gradient(70%_380px_at_50%_-120px,var(--accent-bg),transparent)]' : ''}`}
          >
            <Outlet key={location.pathname} />
          </main>
        </div>

        {/* Splash screen · shown on launch when unlicensed. Suppressed while
          onboarding or the tour is active so modals never stack (tour is
          z-60, splash is z-100 and would bury it). Capped at SPLASH_MAX_VIEWS
          views per version so free users aren't nagged every launch.
          Never in trial mode: the trial banner already owns the download
          CTA, and nagging pre-download visitors is backwards. */}
        {showSplash &&
          splashAtMount &&
          !userInteracted &&
          !isLicensed &&
          !isTrial() &&
          !showOnboarding &&
          !showWalkthrough &&
          splashViews !== null &&
          splashViews < SPLASH_MAX_VIEWS && <SplashScreen onDismiss={() => setShowSplash(false)} />}

        {/* Changelog modal · hidden while onboarding is active to avoid z-index overlap.
          Also sequenced after the splash: splash (z-100) would otherwise bury
          this modal (z-50) and trap the buttons underneath it. */}
        <Modal
          open={showChangelog && !showOnboarding && (!showSplash || isLicensed)}
          onClose={dismissChangelog}
          title={"What's new in Lance " + (changelog[0]?.version || appVersion)}
          size="md"
        >
          <div className="space-y-4">
            {changelog.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">Loading changelog...</p>
            ) : (
              changelog.map(
                (entry: { version: string; date: string; items: string[] }, i: number) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-[var(--accent-ink,var(--accent))]">
                        v{entry.version}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">{entry.date}</span>
                    </div>
                    <ul className="space-y-1.5 ml-6">
                      {entry.items.map((item: string, j: number) => (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-sm text-[var(--text-primary)]"
                        >
                          <span className="text-[var(--accent-ink,var(--accent))] mt-0.5 flex-shrink-0">
                            &bull;
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )
            )}
            <div className="pt-2">
              <Button onClick={dismissChangelog} className="w-full" size="sm">
                Got it
              </Button>
            </div>
          </div>
        </Modal>

        <OnboardingFlow showOnboarding={showOnboarding} setShowOnboarding={setShowOnboarding} />

        <Walkthrough
          open={showWalkthrough}
          onClose={() => {
            setShowWalkthrough(false);
            localStorage.removeItem('lance:tour-pending');
          }}
          onStartTour={() => {
            setShowWalkthrough(false);
            // Hand ownership to the spotlight: without clearing the pending
            // flag, the walkthrough effect re-opens this intro the moment it
            // closes, stacking it under the running tour (and leaving it open
            // after the tour finishes, blocking the dashboard).
            localStorage.removeItem('lance:tour-pending');
            setShowSpotlight(true);
          }}
        />

        <SpotlightTour
          open={showSpotlight}
          onClose={() => {
            setShowSpotlight(false);
            localStorage.removeItem('lance:tour-pending');
          }}
        />

        <ImportModal
          open={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setImportFiles(undefined);
          }}
          initialFiles={importFiles}
        />

        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          triggerFeature={upgradeTrigger || undefined}
        />

        <DropZoneOverlay visible={isDragOver} />

        <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
        <QuickTimeLogModal open={showQuickLogModal} onClose={() => setShowQuickLogModal(false)} />
        <UpdaterModal />

        {/* Keyboard shortcuts cheat sheet */}
        <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
}

function OnboardingFlow({
  showOnboarding,
  setShowOnboarding,
}: {
  showOnboarding: boolean;
  setShowOnboarding: (s: boolean) => void;
}) {
  const { saveProfile, profile, profileLoaded } = useStore();
  const [onboardingStep, setOnboardingStep] = useState(1);
  // Free-tool bridge: ?rate=85&currency=USD from the rate calculator
  // pre-fills onboarding (validated; only for fresh starts, never over
  // resumed input).
  const toolPrefill: { hourly_rate: string; currency: string | null } = {
    hourly_rate: '',
    currency: null,
  };
  try {
    const stored = localStorage.getItem('lance:onboarding-step');
    const done = localStorage.getItem('lance:onboarding-completed') === 'true';
    if ((!stored || stored === 'complete') && !done) {
      const q = new URLSearchParams(window.location.search);
      const rate = q.get('rate');
      const cur = (q.get('currency') || '').toUpperCase();
      if (rate !== null && isFinite(Number(rate)) && Number(rate) > 0) {
        toolPrefill.hourly_rate = String(Math.round(Number(rate)));
      }
      if (['CAD', 'USD', 'EUR', 'GBP', 'AUD'].includes(cur)) toolPrefill.currency = cur;
    }
  } catch {
    /* private mode or odd URLs: plain defaults */
  }
  const [onboardingForm, setOnboardingForm] = useState({
    name: '',
    email: '',
    currency: (toolPrefill.currency || defaultCurrency()) as string,
    hourly_rate: toolPrefill.hourly_rate,
    payment_terms: '14',
    profession: '' as Profession | '',
    writing_style: 'professional' as string,
    ai_enabled: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const seedDataRef = useRef(false);
  const [activeThemeId, setActiveThemeId] = useState<string>(
    localStorage.getItem('lance:theme') || 'default',
  );
  const [validationErrors, setValidationErrors] = useState<{ email?: string }>({});
  // Counts invalid email blurs this session. After a couple of stumbles the
  // form adds a reassuring line (and each stumble feeds local telemetry).
  const [emailStumbles, setEmailStumbles] = useState(0);
  // "What drives you" answer for ambiguous archetypes. Tunes the tour coach
  // voice; persisted immediately on select. Null = unanswered (engine blends).
  const [driveValue, setDriveValue] = useState<-1 | 0 | 1 | null>(null);

  const driveAxisId = driveAxisFor(onboardingForm.profession);
  const driveAxis = driveAxisId ? DRIVE_AXES[driveAxisId] : null;

  useEffect(() => {
    const stored = loadDrive();
    if (stored && stored.archetype === onboardingForm.profession) {
      setDriveValue(stored.value);
    } else {
      setDriveValue(null);
    }
  }, [onboardingForm.profession]);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Restore-on-open runs ONCE per open, not on every profile change.
  // The old effect depended on `profile`, and every Next fires a
  // fire-and-forget persistStep → saveProfile, which mints a new profile
  // object. If that save resolved after the user typed on step 3, the effect
  // re-ran and overwrote the form with the just-saved (still-empty) profile,
  // silently wiping their name. Gating on profileLoaded keeps the resume
  // prefill for returning users without ever clobbering live input.
  const restoredForOpen = useRef(false);
  useEffect(() => {
    if (!showOnboarding) {
      restoredForOpen.current = false;
      return;
    }
    if (restoredForOpen.current || !profileLoaded) return;
    restoredForOpen.current = true;
    {
      const storedStep = localStorage.getItem('lance:onboarding-step');
      const parsedStep = storedStep && storedStep !== 'complete' ? parseInt(storedStep) : NaN;
      if (parsedStep >= 1 && parsedStep <= 5) {
        setOnboardingStep(parsedStep);
        setIsResuming(true);
        if (profile) {
          setOnboardingForm({
            name: profile.name || '',
            email: profile.email || '',
            currency: profile.currency || 'CAD',
            hourly_rate: profile.hourly_rate?.toString() || '',
            payment_terms: (profile.payment_terms ?? 14).toString(),
            profession: (profile.profession as Profession) || '',
            writing_style: profile.writing_style || 'professional',
            ai_enabled: profile.ai_enabled ?? false,
          });
        }
      } else {
        setOnboardingStep(1);
        setIsResuming(false);
      }
    }
  }, [showOnboarding, profile, profileLoaded]);

  const persistStep = async (step: number) => {
    localStorage.setItem('lance:onboarding-step', step.toString());
    try {
      await saveProfile({
        name: onboardingForm.name || undefined,
        email: onboardingForm.email || undefined,
        currency: onboardingForm.currency,
        hourly_rate: onboardingForm.hourly_rate
          ? parseFloat(onboardingForm.hourly_rate)
          : undefined,
        payment_terms: parseInt(onboardingForm.payment_terms) || 14,
        profession: onboardingForm.profession || undefined,
        writing_style: onboardingForm.writing_style,
        ai_enabled: onboardingForm.ai_enabled,
      });
    } catch {
      /* save is best-effort during onboarding */
    }
  };

  const handleOnboardingNext = () => {
    const next = onboardingStep + 1;
    persistStep(next);
    setOnboardingStep(next);
    recordTelemetry('onboarding_step', { step: next });
  };
  const handleOnboardingBack = () => setOnboardingStep((s) => s - 1);
  // X / backdrop = "finish later": the current step was already persisted by
  // persistStep on every Next, so the user resumes via the welcome-back
  // banner. Never mark onboarding complete here (that strand users who
  // misclick out of their first run).
  const handleOnboardingClose = useCallback(() => {
    setShowOnboarding(false);
  }, [setShowOnboarding]);

  // Explicit opt-out, offered as a "Skip setup" link in the header.
  // Skipping means "leave me alone": no tour is queued, so the user lands
  // straight in a usable app instead of behind a second modal.
  // A skipped run still writes a minimal profile (currency default): with no
  // profile row at all, backups export a currency-less user_profile that
  // import validation rejects — silently breaking trial→desktop continuity
  // for the most common trial path.
  const handleOnboardingSkip = useCallback(async () => {
    try {
      await saveProfile({ currency: defaultCurrency() } as UserProfile);
    } catch {
      /* skip must never trap the user; flags below still apply */
    }
    localStorage.setItem('lance:onboarding-step', 'complete');
    localStorage.setItem('lance:onboarding-completed', 'true');
    localStorage.removeItem('lance:tour-pending');
    setShowOnboarding(false);
  }, [setShowOnboarding, saveProfile]);

  const handleOnboardingFinish = async () => {
    if (!onboardingForm.name.trim()) return;
    setIsSaving(true);
    try {
      await saveProfile({
        name: onboardingForm.name,
        email: onboardingForm.email || undefined,
        currency: onboardingForm.currency,
        hourly_rate: onboardingForm.hourly_rate
          ? parseFloat(onboardingForm.hourly_rate)
          : undefined,
        payment_terms: parseInt(onboardingForm.payment_terms) || 14,
        profession: onboardingForm.profession || undefined,
        writing_style: onboardingForm.writing_style,
        ai_enabled: onboardingForm.ai_enabled,
      });
      // Apply profession theme ONLY if user didn't explicitly pick one in Step 3
      const storedTheme = localStorage.getItem('lance:theme');
      if (onboardingForm.profession && (!storedTheme || storedTheme === 'default')) {
        const themeId = PROFESSION_THEME[onboardingForm.profession as Profession] || 'default';
        if (themeId && themeId !== 'default') {
          applyTheme(getTheme(themeId));
          localStorage.setItem('lance:theme', themeId);
        }
      }
      if (seedDataRef.current) {
        await seedSampleData();
        // Check for newly unlocked achievements from seed data
        try {
          const { useStore } = await import('./store');
          const newAch = await checkAchievements(useStore.getState());
          for (const key of newAch) {
            const ach = ACHIEVEMENTS.find((a) => a.key === key);
            if (ach) console.info(`[achievement] Unlocked: ${ach.title}`);
          }
        } catch {
          /* non-critical */
        }
      }
    } finally {
      setIsSaving(false);
    }
    localStorage.setItem('lance:onboarding-step', 'complete');
    localStorage.setItem('lance:onboarding-completed', 'true');
    localStorage.setItem('lance:tour-pending', 'true');
    recordTelemetry('onboarding_done');
    setShowOnboarding(false);
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 bg-[var(--bg-card)] text-[var(--text-primary)]';
  const labelClass = 'block text-xs font-medium text-[var(--text-secondary)] mb-1';

  const STEP_LABELS = ['Comfort', 'Your craft', 'Your profile', 'Your theme', 'Rates & data'];
  // Clamp once and reuse: the counter, the aria-label and the dots all read the
  // same value, so they cannot disagree about how many steps there are.
  const clampedStep = Math.min(Math.max(onboardingStep, 1), STEP_LABELS.length);

  return (
    <Modal open={showOnboarding} onClose={handleOnboardingClose} title="Set up Lance" size="md">
      <div className="space-y-5">
        {isResuming && (
          <div className="text-center text-xs text-[var(--text-secondary)] bg-[var(--accent-bg)] py-1.5 px-3 rounded-[6px]">
            Welcome back. Pick up where you left off.
          </div>
        )}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--text-tertiary)]" aria-live="polite">
            Step {clampedStep} of {STEP_LABELS.length} &middot; {STEP_LABELS[clampedStep - 1]}
          </span>
          <button
            onClick={handleOnboardingSkip}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors"
          >
            Skip setup
          </button>
        </div>
        <div
          className="flex justify-center gap-2 mb-1"
          role="img"
          aria-label={`Setup step ${clampedStep} of ${STEP_LABELS.length}: ${STEP_LABELS[clampedStep - 1]}`}
        >
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              aria-hidden="true"
              className={`w-2 h-2 rounded-full transition-all ${
                i + 1 <= clampedStep ? 'bg-[var(--accent)]' : 'bg-[var(--border-color)]'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Comfort — access needs first so everything after adapts.
            Needs its own Continue: the panel is all segmented controls, so
            without a footer row the first-run user had no way off step 1
            except "Skip setup", which throws away the whole setup. */}
        {onboardingStep === 1 && (
          <>
            <OnboardingComfort />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[var(--text-tertiary)]">
                All of these also live in Settings.
              </span>
              <Button onClick={handleOnboardingNext} size="sm">
                Continue &rarr;
              </Button>
            </div>
          </>
        )}
        {/* Step 2: craft picker. This was gated on step === 1 alongside the
            Comfort panel above, which left step 2 — labelled "Your craft" in
            STEP_LABELS — rendering an empty modal with only X and Skip. */}
        {onboardingStep === 2 && (
          <>
            <div className="text-center space-y-2">
              <OrbitField />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Welcome to Lance</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Your freelance business, all in one place. About a minute of setup, free forever.
                What do you do?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
              {ARCHETYPE_LIST.filter((a) => a.id !== 'custom' && a.id !== 'default').map(
                (archetype) => (
                  <button
                    key={archetype.id}
                    onClick={() => {
                      setOnboardingForm({
                        ...onboardingForm,
                        profession: archetype.id as Profession,
                      });
                    }}
                    aria-pressed={onboardingForm.profession === archetype.id}
                    className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium rounded-[8px] border transition-colors text-left ${
                      onboardingForm.profession === archetype.id
                        ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <span className="text-base flex-shrink-0" aria-hidden="true">
                      {archetype.emoji}
                    </span>
                    <span className="leading-snug line-clamp-2">{archetype.label}</span>
                  </button>
                ),
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[var(--text-tertiary)]">
                Tunes proposals, contracts &amp; insights to your craft. Changeable anytime in
                Settings &rarr; Archetype.
              </span>
              <Button onClick={handleOnboardingNext} size="sm">
                Continue &rarr;
              </Button>
            </div>
            {driveAxis && driveAxisId && (
              <div className="p-3 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {driveAxis.question}
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  Tunes your tour guide to how you think. Ten seconds, skippable.
                </p>
                <div className="flex gap-2 mt-2" role="radiogroup" aria-label={driveAxis.question}>
                  {(
                    [
                      [-1, driveAxis.low],
                      [0, driveAxis.mid],
                      [1, driveAxis.high],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      role="radio"
                      aria-checked={driveValue === v}
                      onClick={() => {
                        setDriveValue(v);
                        saveDrive({
                          archetype: onboardingForm.profession,
                          axis: driveAxisId,
                          value: v,
                        });
                      }}
                      className={`flex-1 px-2 py-2 text-[11px] font-medium rounded-[8px] border transition-colors ${
                        driveValue === v
                          ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 2: Profile */}
        {onboardingStep === 3 && (
          <>
            <div className="text-center mb-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Tell us about yourself
              </h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Only your name is required. Everything else can wait.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Full name</label>
                <input
                  type="text"
                  value={onboardingForm.name}
                  onChange={(e) => {
                    setOnboardingForm({ ...onboardingForm, name: e.target.value });
                    setValidationErrors({});
                  }}
                  placeholder="Your full name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Email <span className="font-normal text-[var(--text-tertiary)]">(optional)</span>
                </label>
                <input
                  type="email"
                  aria-invalid={validationErrors.email ? true : undefined}
                  aria-describedby={validationErrors.email ? 'onboarding-email-error' : undefined}
                  value={onboardingForm.email}
                  onChange={(e) => {
                    setOnboardingForm({ ...onboardingForm, email: e.target.value });
                    const val = e.target.value;
                    if (val && !EMAIL_REGEX.test(val)) {
                      setValidationErrors({ email: 'Please enter a valid email address' });
                    } else {
                      setValidationErrors({});
                    }
                  }}
                  placeholder="you@example.com"
                  className={inputClass}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val && !EMAIL_REGEX.test(val)) {
                      recordTelemetry('validation_error', { field: 'email' });
                      setEmailStumbles((n) => n + 1);
                    }
                  }}
                />
                {validationErrors.email && (
                  <p id="onboarding-email-error" role="alert" className="text-red-500 text-xs mt-1">
                    {validationErrors.email}
                  </p>
                )}
                {validationErrors.email && emailStumbles >= 2 && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Personal addresses work fine. Anything with an @ will do.
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <select aria-label="Currency"
                  value={onboardingForm.currency}
                  onChange={(e) =>
                    setOnboardingForm({ ...onboardingForm, currency: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="CAD">CAD ($)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={handleOnboardingBack} size="sm">
                &larr; Back
              </Button>
              <Button
                onClick={handleOnboardingNext}
                size="sm"
                disabled={
                  !onboardingForm.name.trim() ||
                  !!validationErrors.email ||
                  (onboardingForm.email !== '' && !EMAIL_REGEX.test(onboardingForm.email))
                }
              >
                Continue &rarr;
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Themes */}
        {onboardingStep === 4 && (
          <>
            <div className="text-center mb-3">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Pick your workspace
              </h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                No need to decide now. Default looks great everywhere, and you can switch anytime in
                Settings.
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {onboardingForm.profession
                  ? `Your ${onboardingForm.profession} theme is unlocked. More themes unlock as you hit achievements · or instantly with Pro.`
                  : 'All themes unlock through achievements · or instantly with Pro.'}
              </p>
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {THEMES.map((theme) => {
                const isUnlocked =
                  theme.id === 'default' ||
                  (onboardingForm.profession &&
                    theme.id === PROFESSION_THEME[onboardingForm.profession as Profession]);
                const isActive = activeThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      if (!isUnlocked) return;
                      applyTheme(theme);
                      localStorage.setItem('lance:theme', theme.id);
                      setActiveThemeId(theme.id);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-[8px] text-left text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--text-primary)] border'
                        : isUnlocked
                          ? 'bg-[var(--bg-secondary)] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] border'
                          : 'bg-[var(--bg-secondary)] border-transparent text-[var(--text-tertiary)] opacity-60 cursor-not-allowed border'
                    }`}
                    disabled={!isUnlocked}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'border-[var(--accent)]' : 'border-[var(--border-color)]'
                      }`}
                    >
                      {isActive && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium ${isUnlocked ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
                      >
                        {theme.name}
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                        {theme.description}
                      </div>
                    </div>
                    {isUnlocked ? (
                      <span className="text-[10px] text-[var(--text-tertiary)]">{theme.name}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                        <Lock size={10} />
                        {theme.unlockedBy.replace(/^Always available$/, '') || 'Locked'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between pt-3">
              <Button variant="secondary" onClick={handleOnboardingBack} size="sm">
                &larr; Back
              </Button>
              <Button onClick={handleOnboardingNext} size="sm">
                Continue &rarr;
              </Button>
            </div>
          </>
        )}

        {/* Step 4: AI Setup (COMMENTED OUT FOR v1.0.0)
        {onboardingStep === 5 && (
          <>
            <div className="text-center mb-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">AI Assistant</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-1">
                Lance includes local AI to help write proposals and analyze finances. It runs on your machine · no cloud, no subscriptions.
              </p>
            </div>
            <div className="space-y-3 py-2">
              <label className="flex items-start gap-3 p-3 border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-secondary)] cursor-pointer hover:border-[var(--accent)]/50 transition-colors">
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={onboardingForm.ai_enabled}
                    onChange={() => {}}
                    onClick={() => setOnboardingForm({ ...onboardingForm, ai_enabled: !onboardingForm.ai_enabled })}
                    className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-ink,var(--accent))] focus:ring-[var(--accent)]"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Enable local AI features</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    Requires downloading a ~4GB model on first use.
                  </div>
                </div>
              </label>

              {onboardingForm.ai_enabled && (
                <div className="animate-fade-in pl-1">
                  <label className={labelClass}>Default writing style</label>
                  <select aria-label="Default writing style"
                    value={onboardingForm.writing_style}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, writing_style: e.target.value })}
                    className={inputClass}
                  >
                    <option value="professional">Professional & Direct</option>
                    <option value="friendly">Friendly & Conversational</option>
                    <option value="creative">Creative & Persuasive</option>
                    <option value="technical">Technical & Analytical</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={handleOnboardingBack} size="sm">&larr; Back</Button>
              <Button onClick={handleOnboardingNext} size="sm">Continue &rarr;</Button>
            </div>
          </>
        )}
        */}

        {/* Step 4 (Formerly 5): Rates & Final */}
        {onboardingStep === 5 && (
          <>
            <div className="text-center mb-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Rates &amp; sample data
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-1">
                Defaults you can override per client or invoice. Last step, then we&rsquo;ll show
                you around.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>
                  Default Hourly Rate ({onboardingForm.currency}){' '}
                  <span className="font-normal text-[var(--text-tertiary)]">(optional)</span>
                </label>
                <input
                  type="number"
                  value={onboardingForm.hourly_rate}
                  onChange={(e) =>
                    setOnboardingForm({ ...onboardingForm, hourly_rate: e.target.value })
                  }
                  placeholder="e.g. 75"
                  className={inputClass}
                />
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  Leave blank if you primarily do flat-rate projects.
                </p>
              </div>
              <div>
                <label className={labelClass}>Default Payment Terms</label>
                <select aria-label="Default Payment Terms"
                  value={onboardingForm.payment_terms}
                  onChange={(e) =>
                    setOnboardingForm({ ...onboardingForm, payment_terms: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="0">Due on receipt</option>
                  <option value="7">Net 7</option>
                  <option value="14">Net 14</option>
                  <option value="30">Net 30</option>
                </select>
              </div>
            </div>
            <div className="p-3 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="text-lg flex-shrink-0">🗂</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Start with sample data?
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed mt-0.5">
                    See Lance fully populated so you know what to expect. Easy to clear anytime in
                    Settings → Data.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleOnboardingFinish}
                  disabled={isSaving || !onboardingForm.name.trim()}
                  className="flex-1"
                >
                  Skip · start fresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    seedDataRef.current = true;
                    handleOnboardingFinish();
                  }}
                  disabled={isSaving || !onboardingForm.name.trim()}
                  className="flex-1"
                >
                  Yes, show me around
                </Button>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button
                variant="secondary"
                onClick={handleOnboardingBack}
                size="sm"
                disabled={isSaving}
              >
                &larr; Back
              </Button>
              <span className="text-[11px] text-[var(--text-tertiary)] self-center">
                You can revisit setup anytime in Settings
              </span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
