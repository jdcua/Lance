/**
 * Lance · Freelancer OS
 *
 * Privacy: all business data stays on your machine.
 * License: MIT. See LICENSE.md.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Lock,
  CheckCircle,
  Users,
  FolderKanban,
  Clock,
  FileText,
  Receipt,
  Bell,
  Search,
  Trophy,
  BarChart3,
  Columns3,
  Banknote,
  FileEdit,
} from 'lucide-react';
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
import Onboarding from './screens/Onboarding';
import Walkthrough from './components/ui/Walkthrough';
import SpotlightTour from './components/ui/SpotlightTour';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ImportModal from './components/ui/ImportModal';
import DropZoneOverlay from './components/ui/DropZoneOverlay';
import UpdaterModal from './components/ui/UpdaterModal';
import ShortcutsModal from './components/ui/ShortcutsModal';
import OrbitField from './components/motion/OrbitField';
import { commands } from './lib/commands';
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
import type { UserProfile } from './types';
import { checkAchievements } from './achievements/checker';
import { ACHIEVEMENTS } from './achievements';
import { parseDateString, DAY_MS } from './utils/format';
import { defaultCurrency } from './lib/currency';
import { recordTelemetry } from './utils/telemetry';
import { usePortalPolling } from './lib/engines/usePortalPolling';
import { getRuntimeVersion } from './lib/version';

/**
 * Run `fn` at the next idle opportunity, but never later than `ms`.
 *
 * Startup work deferred to requestIdleCallback alone can be starved for a long
 * time on a busy machine or a heavy page load — the browser only grants idle
 * time when it has some to spare. Startup loads deferred that way can stall
 * for as long as the machine stays busy. Racing a timer keeps the deferral
 * (it still does not compete with first paint) without making correctness
 * depend on the browser ever going idle.
 */
export function idleOrTimeout(fn: () => void, ms = 400): () => void {
  let ran = false;
  const once = () => {
    if (ran) return;
    ran = true;
    fn();
  };
  const timer = setTimeout(once, ms);
  // main.tsx polyfills this on first browser paint, but a jsdom render (or a
  // browser without the API) never defines it, so fall back to the timer.
  const idle =
    typeof requestIdleCallback === 'function'
      ? requestIdleCallback(once)
      : null;
  return () => {
    clearTimeout(timer);
    if (idle !== null) cancelIdleCallback(idle);
  };
}

export default function App() {
  const {
    profile,
    profileLoaded,
    loadProfile,
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
  // Guard against double-processing recurring invoices when invoices.length
  // changes mid-generation and re-triggers the idle-callback effect.
  const autoGenProcessedRef = useRef<Set<string>>(new Set());
  const toggleTimerRunning = useRef(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  // Time entries are logged through the global quick-log modal (the Time
  // screen has no new-entry trigger of its own). This wires the checklist
  // and the Cmd/Ctrl+N shortcut, which previously dispatched to nothing.
  useEffect(() => {
    const onAddTime = () => setShowQuickLogModal(true);
    commands.on('lance:add-time', onAddTime);
    return () => commands.off('lance:add-time', onAddTime);
  }, []);

  // Pro open alerts: polled in usePortalPolling hook (src/lib/engines/usePortalPolling.ts).
  usePortalPolling();

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

  // Preload all theme fonts on mount so switching themes is instant.
  useEffect(() => {
    THEMES.forEach((t) => {
      // applyTheme triggers font loading internally
      const current = getTheme(localStorage.getItem('lance:theme') || 'default');
      applyTheme(t);
      applyTheme(current);
    });
  }, []);

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

  // Listen for lance:open-import (sidebar button)
  useEffect(() => {
    const onOpenImport = () => {
      setImportFiles(undefined);
      setShowImportModal(true);
    };
    commands.on('lance:open-import', onOpenImport);
    return () => commands.off('lance:open-import', onOpenImport);
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
    const onToggleTimer = () => toggleTimer();
    commands.on('lance:toggle-timer', onToggleTimer);
    return () => commands.off('lance:toggle-timer', onToggleTimer);
  }, [toggleTimer]);

  // Open command palette from Topbar search
  useEffect(() => {
    const onOpenCommand = () => setShowCommandPalette(true);
    commands.on('lance:open-command', onOpenCommand);
    return () => commands.off('lance:open-command', onOpenCommand);
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
          commands.dispatch('lance:add-client');
        } else if (path.startsWith('/invoices')) {
          e.preventDefault();
          commands.dispatch('lance:add-invoice');
        } else if (path.startsWith('/projects')) {
          e.preventDefault();
          commands.dispatch('lance:add-project');
        } else if (path.startsWith('/time')) {
          e.preventDefault();
          commands.dispatch('lance:add-time');
        } else if (path.startsWith('/contracts')) {
          e.preventDefault();
          commands.dispatch('lance:add-contract');
        } else if (path.startsWith('/finance')) {
          e.preventDefault();
          commands.dispatch('lance:add-expense');
        }
      }
      if (mod && !e.shiftKey && e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        const paths = ['/', '/clients', '/projects', '/invoices', '/contracts', '/finance', '/insights', '/settings'];
        if (paths[idx]) {
          navigate(paths[idx]);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, location, isEditing, toggleTimer]);



  // Listen for lance:edit-client from FollowUps (client missing email)
  useEffect(() => {
    const onEditClient = () => {
      navigate('/clients');
      addToast('Open the client to add an email address', 'info');
    };
    commands.on('lance:edit-client', onEditClient);
    return () => commands.off('lance:edit-client', onEditClient);
  }, [navigate, addToast]);

  return (
    <ErrorBoundary>
      <div className="h-full flex bg-transparent">
        <a
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('main-content')?.focus();
          }}
          className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:m-3 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:rounded-sm focus:bg-[var(--bg-card)] focus:text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)]"
        >
          Skip to main content
        </a>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <AIBar />
          <main
            tabIndex={0}
            id="main-content"
            aria-label="Main content"
            className="flex-1 overflow-y-auto"
          >
            <Outlet key={location.pathname} />
          </main>
          <div role="contentinfo" aria-label="Status" className="h-[28px] flex items-center justify-between px-4 glass border-t-0 text-[10px] text-[var(--text-tertiary)] flex-shrink-0 print:hidden">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              Lance · your business, on your machine
            </span>
            <span className="hidden md:inline">⌘K search · ⌘N new · ⌘1–8 navigate</span>
          </div>
        </div>

        {/* Changelog modal · hidden while onboarding is active to avoid z-index overlap. */}
        <Modal
          open={showChangelog && !showOnboarding}
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

        <Onboarding visible={showOnboarding} onClose={() => setShowOnboarding(false)} />

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

