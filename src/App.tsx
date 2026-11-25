/**
 * Lance · Freelancer OS
 *
 * Privacy: all business data stays on your machine.
 * License: MIT. See LICENSE.md.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import AIBar from './components/layout/AIBar';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import ToastContainer from './components/ui/Toast';
import CommandPalette from './components/ui/CommandPalette';
import QuickTimeLogModal from './components/ui/QuickTimeLogModal';
import Onboarding from './screens/Onboarding';
import Walkthrough from './components/ui/Walkthrough';
import SpotlightTour from './components/ui/SpotlightTour';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ImportModal from './components/ui/ImportModal';
import DropZoneOverlay from './components/ui/DropZoneOverlay';
import UpdaterModal from './components/ui/UpdaterModal';
import ShortcutsModal from './components/ui/ShortcutsModal';
import { commands } from './lib/commands';
import type { TimeEntry } from './types';
import { useStore, type AppStore } from './store';
import { useToasts } from './store/toastStore';
import { useAutoUpdater } from './hooks/useAutoUpdater';
import { useShellModals } from './hooks/useShellModals';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFollowUpChecks } from './hooks/useFollowUpChecks';
import { useChangelogNotice } from './hooks/useChangelogNotice';
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
import { applyTheme, getTheme, THEMES } from './themes/themes';
import { checkAchievements } from './achievements/checker';
import { ACHIEVEMENTS } from './achievements';
import { recordTelemetry } from './utils/telemetry';
import { usePortalPolling } from './lib/engines/usePortalPolling';

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
  const idle = typeof requestIdleCallback === 'function' ? requestIdleCallback(once) : null;
  return () => {
    clearTimeout(timer);
    if (idle !== null) cancelIdleCallback(idle);
  };
}

type TimerConfigResult =
  | { kind: 'ok'; projectId: string; clientId: string }
  | { kind: 'none' }
  | { kind: 'ambiguous' };

/** Remembered config, else an unambiguous active project, else why we can't start. */
function resolveTimerConfig(state: AppStore): TimerConfigResult {
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
  const remembered = state.projects.find((p) => p.id === projectId && p.status === 'active');
  if (!remembered) {
    projectId = '';
    clientId = '';
  }
  if (projectId && clientId) return { kind: 'ok', projectId, clientId };
  const active = state.projects.filter((p) => p.status === 'active');
  if (active.length === 1) {
    return { kind: 'ok', projectId: active[0].id, clientId: active[0].client_id };
  }
  return active.length === 0 ? { kind: 'none' } : { kind: 'ambiguous' };
}

async function closeOpenTimeEntries(
  state: AppStore,
  openEntries: TimeEntry[],
  activeEntry: TimeEntry,
): Promise<void> {
  const endTime = new Date().toISOString();
  for (const entry of openEntries) {
    const duration = Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 60000);
    if (entry.id === activeEntry.id && duration < 1) {
      await state.removeTimeEntry(entry.id);
    } else {
      await state.updateTimeEntry({
        ...entry,
        end_time: endTime,
        duration_minutes: Math.max(0, duration),
      });
    }
  }
}

function timerStoppedToast(duration: number): { message: string; type: 'info' | 'success' } {
  if (duration < 1) {
    return { message: 'Timer stopped · under a minute, nothing logged', type: 'info' };
  }
  const h = Math.floor(duration / 60);
  const m = duration % 60;
  return { message: `Timer stopped · ${h > 0 ? `${h}h ` : ''}${m}m`, type: 'success' };
}

function persistTimerConfig(entry: TimeEntry): void {
  try {
    localStorage.setItem(
      'lance:last-timer-config',
      JSON.stringify({ projectId: entry.project_id, clientId: entry.client_id }),
    );
  } catch {
    /* private mode */
  }
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
    setPortalPort,
    setPortalFailed,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasRanAutoGen, setHasRanAutoGen] = useState(false);

  // Guard against double-processing recurring invoices when invoices.length
  // changes mid-generation and re-triggers the idle-callback effect.
  const autoGenProcessedRef = useRef<Set<string>>(new Set());
  const toggleTimerRunning = useRef(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);

  const {
    showCommandPalette,
    setShowCommandPalette,
    showShortcuts,
    setShowShortcuts,
    showQuickLogModal,
    setShowQuickLogModal,
    showImportModal,
    importFiles,
    isDragOver,
    closeImport,
  } = useShellModals();

  // Pro open alerts: polled in usePortalPolling hook (src/lib/engines/usePortalPolling.ts).
  usePortalPolling();

  const { changelog } = useChangelog();
  const { showChangelog, dismissChangelog, appVersion } = useChangelogNotice(changelog);

  // Local-first telemetry: one launch tick per mount. Powers personal
  // stats and struggle detection. Never leaves the machine.
  useEffect(() => {
    recordTelemetry('app_launch');
  }, []);

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

  useFollowUpChecks();

  useAutoUpdater();

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
        // Close EVERYTHING open, not just the first: legacy/imported data
        // (and pre-guard races) can hold several. The first keeps its real
        // duration; extras are stamped as-is so no time silently vanishes.
        await closeOpenTimeEntries(state, openEntries, activeEntry);
        const duration = Math.floor(
          (Date.now() - new Date(activeEntry.start_time).getTime()) / 60000,
        );
        const toast = timerStoppedToast(duration);
        addToast(toast.message, toast.type);
      } else {
        // The remembered project may be deleted or archived since. With
        // several active projects the toggle must not silently pick one —
        // hours logged to the wrong project end up on the wrong invoice.
        const config = resolveTimerConfig(state);
        if (config.kind === 'none') {
          addToast('No active project available to start timer', 'error');
          return;
        }
        if (config.kind === 'ambiguous') {
          addToast('Pick a project for the timer first — log time once via Quick Log', 'error');
          return;
        }
        const entry = await state.addTimeEntry({
          project_id: config.projectId,
          client_id: config.clientId,
          start_time: new Date().toISOString(),
          billable: true,
        });
        persistTimerConfig(entry);
        const project = state.projects.find((p) => p.id === config.projectId);
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

  useKeyboardShortcuts({
    toggleTimer,
    setPalette: setShowCommandPalette,
    setQuickLog: setShowQuickLogModal,
    setShortcuts: setShowShortcuts,
  });

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
          <div
            role="contentinfo"
            aria-label="Status"
            className="h-[28px] flex items-center justify-between px-4 glass border-t-0 text-[10px] text-[var(--text-tertiary)] flex-shrink-0 print:hidden"
          >
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

        <ImportModal open={showImportModal} onClose={closeImport} initialFiles={importFiles} />

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
