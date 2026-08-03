/**
 * Lance — Freelancer OS
 * Built by Placeholder Labs Incorporated Limited (placeholderlabsincorporatedlimited.yabbadabbadoo)
 *
 * Privacy: Lance collects no telemetry. See PRIVACY.md.
 * License: Proprietary. See LICENSE.md.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import Walkthrough from './components/ui/Walkthrough';
import SplashScreen from './components/ui/SplashScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ImportModal from './components/ui/ImportModal';
import DropZoneOverlay from './components/ui/DropZoneOverlay';
import UpdaterModal from './components/ui/UpdaterModal';
import { useStore } from './store';
import { useToasts } from './store/toastStore';
import { useAutoUpdater } from './hooks/useAutoUpdater';
import { shouldGenerate, getNextDueDate, countCyclesBehind, getCatchUpCount, shouldShowCatchUpWarning } from './utils/recurringEngine';
import { generateInvoiceNumber } from './utils/invoiceNumber';
import { applyTheme, getTheme, THEMES } from './themes/themes';
import { getShortcutModifierLabel } from './utils/shortcuts';
import type { Profession } from './themes';
import { PROFESSION_THEME } from './themes';
import { getArchetype, ARCHETYPE_LIST } from './archetypes';
import { checkAchievements } from './achievements/checker';
import { ACHIEVEMENTS } from './achievements';
import { seedSampleData } from './utils/seedData';
import { parseDateString } from './utils/format';

export default function App() {
  const {
    profile, profileLoaded, loadProfile, saveProfile, isLicensed,
    recurringInvoices, loadRecurringInvoices, updateRecurringInvoice,
    invoices, loadInvoices, addInvoice,
    clients, loadClients,
    proposals, loadProposals,
    loadFollowUpSettings, loadPendingFollowUps,
    logFollowUp, followUpSettings, pendingFollowUps,
    setPortalPort, setPortalFailed,
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
  // Guard against double-processing recurring invoices when invoices.length
  // changes mid-generation and re-triggers the idle-callback effect.
  const autoGenProcessedRef = useRef<Set<string>>(new Set());
  const [showChangelog, setShowChangelog] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFiles, setImportFiles] = useState<File[] | undefined>(undefined);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const APP_VERSION = '1.2.5';
  const CHANGELOG = [
    'Bug fixes and stability improvements',
  ];

  // Changelog check on mount
  useEffect(() => {
    const seen = localStorage.getItem('lance:changelog-seen');
    if (seen !== APP_VERSION) {
      // If onboarding hasn't been completed yet, defer changelog to next session
      const onboardingCompleted = localStorage.getItem('lance:onboarding-completed') === 'true';
      if (onboardingCompleted) {
        setShowChangelog(true);
      }
      // Otherwise, the changelog will show on the next app load
      // (the version check will still find it unseen)
    }
  }, []);

  const dismissChangelog = () => {
    localStorage.setItem('lance:changelog-seen', APP_VERSION);
    setShowChangelog(false);
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const setupListeners = async () => {
      try {
        const { tauriListen } = await import('./utils/tauri');
        const unlistenReady = await tauriListen<{ port: number }>('portal-server-ready', (event) => {
          setPortalPort(event.port);
        });
        const unlistenFailed = await tauriListen<{ reason: string }>('portal-server-failed', () => {
          setPortalFailed();
          addToast('Client portal unavailable \u2014 port conflict. Restart Lance to retry.', 'error', 8000);
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
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const explicitTheme = profile?.theme;
    if (explicitTheme) {
      document.documentElement.classList.toggle('dark', explicitTheme === 'dark');
      const storedThemeId = localStorage.getItem('lance:theme') || 'default';
      applyTheme(getTheme(storedThemeId));
    } else if (profileLoaded && !profile) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
      applyTheme(getTheme('default'));
    } else {
      document.documentElement.classList.remove('dark');
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
      } catch { /* non-critical */ }
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
              x ?? 0, y ?? 0,
              Math.max(width ?? 1100, 900),
              Math.max(height ?? 680, 600),
            );
            await win.setSize(
              new PhysicalSize(clamped.width, clamped.height),
            );
            await win.setPosition(
              new PhysicalPosition(clamped.x, clamped.y),
            );
          } catch { /* ignore corrupt state */ }
        }

        const saveState = async () => {
          try {
            const [size, pos] = await Promise.all([
              win.outerSize(),
              win.outerPosition(),
            ]);
            const clamped = await clampToDisplayBounds(
              Math.max(pos.x, 0), Math.max(pos.y, 0),
              Math.max(size.width, 900), Math.max(size.height, 600),
            );
            localStorage.setItem(
              'lance:window-state',
              JSON.stringify(clamped),
            );
          } catch { /* non-critical */ }
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
      } catch { /* not running in Tauri */ }
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
    // Do NOT auto-complete just because profile.name exists — the user must go through all steps
    setShowOnboarding(true);
  }, [profileLoaded]);

  // Show walkthrough after onboarding completes
  useEffect(() => {
    if (!showOnboarding && localStorage.getItem('lance:tour-pending') === 'true' && !showWalkthrough) {
      setShowWalkthrough(true);
    }
  }, [showOnboarding, showWalkthrough]);

  // Auto-generate recurring invoices on startup (deferred after first render)
  useEffect(() => {
    if (!profileLoaded || hasRanAutoGen) return;
    const handle = requestIdleCallback(() => {
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
              addToast(`${ach.title} — ${ach.reward}`, 'unlock');
            }
          }
        });
      } catch { /* achievement check is non-critical */ }
    });
    return () => cancelIdleCallback(handle);
  }, [profileLoaded, hasRanAutoGen, loadRecurringInvoices, loadInvoices, loadClients]);

  // Deferred recurring invoice check — runs after first render via idle callback
  useEffect(() => {
    if (!hasRanAutoGen || recurringInvoices.length === 0) return;
    if (invoices.length === 0 && hasRanAutoGen) {
      loadInvoices();
      return;
    }
    const handle = requestIdleCallback(async () => {
      const paymentTerms = profile?.payment_terms ?? 14;
      const due = recurringInvoices.filter(shouldGenerate).filter((ri) => !autoGenProcessedRef.current.has(ri.id));
      for (const ri of due) {
        autoGenProcessedRef.current.add(ri.id);
        const cyclesBehind = countCyclesBehind(ri);
        const { generate, capped } = getCatchUpCount(cyclesBehind);

        for (let i = 0; i < generate; i++) {
          const currentInvoices = useStore.getState().invoices;
          const invNumber = generateInvoiceNumber(currentInvoices);
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + paymentTerms);
          try {
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
            const now = new Date();
            await updateRecurringInvoice({
              ...ri,
              next_due: getNextDueDate(ri.frequency, new Date(ri.next_due)).toISOString(),
              last_generated: now.toISOString(),
            });
            const client = useStore.getState().clients.find((c) => c.id === ri.client_id);
            addToast(`Invoice generated for ${client?.name || ri.client_id}`, 'success');
          } catch {
            /* non-critical */
          }
        }

        if (capped && shouldShowCatchUpWarning(ri)) {
          addToast(
            `\u26A0\uFE0F ${ri.title} recurring invoice is ${cyclesBehind} cycles overdue. ${generate} drafts created \u2014 review in Invoices.`,
            'info',
            6000
          );

          try {
            const { getDb } = await import('./db');
            const db = await getDb();
            await db.execute(
              'UPDATE recurring_invoices SET last_catch_up_warning = ? WHERE id = ?',
              [new Date().toISOString(), ri.id]
            );
          } catch {
            /* non-critical */
          }
        }
      }
    });
    return () => cancelIdleCallback(handle);
  }, [hasRanAutoGen, recurringInvoices.length, invoices.length]);

  // Auto-backup check — runs after engines, deferred (browser mode: skip)
  useEffect(() => {
    if (!hasRanAutoGen) return;
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return;
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
  }, [hasRanAutoGen]);

  // Follow-up checker — deferred after first render, runs every 30 minutes
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
        // that was already actioned (sent/dismissed) — the pending-only guard
        // would re-create an identical draft every run after actioning.
        const followUpHistory = useStore.getState().followUpLogs;

        const now = new Date();

        // Check proposals
        for (const p of useStore.getState().proposals) {
          if (p.status !== 'sent') continue;

          const client = useStore.getState().clients.find((c) => c.id === p.client_id);
          if (!client?.email) {
            console.warn(`Skipping proposal follow-up for "${p.title}" — client has no email`);
            continue;
          }

          const sentDate = p.sent_at ? new Date(p.sent_at) : new Date(p.created_at);
          const daysElapsed = Math.floor((now.getTime() - sentDate.getTime()) / 86400000);
          if (daysElapsed < settings.proposal_delay_days) continue;

          const stage = getStage('proposal', daysElapsed - settings.proposal_delay_days);
          const alreadyPending = currentPending.some(
            (l) => l.entity_type === 'proposal' && l.entity_id === p.id && l.stage === stage
          );
          const alreadyLogged = (followUpHistory[`proposal:${p.id}`] || []).some(
            (l) => l.stage === stage
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
            console.warn(`Skipping invoice follow-up for "${inv.invoice_number}" — client has no email`);
            continue;
          }

          const dueDate = parseDateString(inv.due_date);
          const daysElapsed = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
          if (daysElapsed < settings.invoice_delay_days) continue;

          const stage = getStage('invoice', daysElapsed);
          const alreadyPending = currentPending.some(
            (l) => l.entity_type === 'invoice' && l.entity_id === inv.id && l.stage === stage
          );
          const alreadyLogged = (followUpHistory[`invoice:${inv.id}`] || []).some(
            (l) => l.stage === stage
          );
          if (alreadyPending || alreadyLogged) continue;

          const templateKey = getTemplateKey('invoice', daysElapsed, settings.invoice_delay_days);
          if (!templateKey) continue;

          await state.logFollowUp({ entity_type: 'invoice', entity_id: inv.id, stage });
        }
      } catch { /* follow-up check is non-critical */ }
    };

    const initialHandle = requestIdleCallback(() => checkFollowUps());
    const interval = setInterval(checkFollowUps, 30 * 60 * 1000);
    return () => {
      cancelIdleCallback(initialHandle);
      clearInterval(interval);
    };
  }, [profileLoaded]);

  // Proposal expiry engine — deferred after first render, runs every hour
  useEffect(() => {
    if (!profileLoaded) return;

    const checkExpiry = async () => {
      try {
        const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
        const expired = await tauriInvoke<Array<{ id: string; client_id: string; title: string }>>('expire_sent_proposals', {});
        if (expired.length === 0) return;

        const state = useStore.getState();
        await state.loadClients();
        await state.loadProposals();
        const settings = state.followUpSettings;

        for (const ep of expired) {
          const client = state.clients.find((c) => c.id === ep.client_id);
          const clientName = client?.name || 'Unknown';

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
      } catch { /* expiry check is non-critical */ }
    };

    const initialHandle = requestIdleCallback(() => checkExpiry());
    const interval = setInterval(checkExpiry, 60 * 60 * 1000);
    return () => {
      cancelIdleCallback(initialHandle);
      clearInterval(interval);
    };
  }, [profileLoaded]);

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
    const state = useStore.getState();
    await state.loadTimeEntries();
    await state.loadProjects();

    const activeEntry = state.timeEntries.find((t) => !t.end_time);

    if (activeEntry) {
      const endTime = new Date().toISOString();
      const duration = Math.floor((Date.now() - new Date(activeEntry.start_time).getTime()) / 60000);
      if (duration < 1) {
        // Sub-minute timer toggle produces a phantom 0-minute entry. Discard it.
        await state.removeTimeEntry(activeEntry.id);
        addToast('Timer stopped', 'success');
      } else {
        await state.updateTimeEntry({ ...activeEntry, end_time: endTime, duration_minutes: duration });
        const h = Math.floor(duration / 60);
        const m = duration % 60;
        addToast(`Timer stopped — ${h > 0 ? `${h}h ` : ''}${m}m`, 'success');
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
        } catch { /* ignore */ }
      }
      if (!projectId || !clientId) {
        const firstProject = state.projects.find((p) => p.status === 'active');
        if (firstProject) {
          projectId = firstProject.id;
          clientId = firstProject.client_id;
        } else {
          addToast('No active project available to start timer', 'error');
          return;
        }
      }
      const entry = await state.addTimeEntry({
        project_id: projectId,
        client_id: clientId,
        start_time: new Date().toISOString(),
        billable: true,
      });
      localStorage.setItem('lance:last-timer-config', JSON.stringify({ projectId: entry.project_id, clientId: entry.client_id }));
      const project = state.projects.find((p) => p.id === projectId);
      addToast(`Timer started — ${project?.title || 'Unknown'}`, 'success');
    }
  }, [addToast]);

  // Listen for lance:toggle-timer from Time page MetricCard click
  useEffect(() => {
    const handler = () => toggleTimer();
    document.addEventListener('lance:toggle-timer', handler);
    return () => document.removeEventListener('lance:toggle-timer', handler);
  }, [toggleTimer]);

  // Keyboard shortcuts
  const isEditing = useCallback((): boolean => {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return true;
    if (document.activeElement?.closest('[contenteditable="true"]') ||
        document.activeElement?.closest('.tiptap')) return true;
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
        e.preventDefault();
        const path = location.pathname;
        if (path.startsWith('/proposals')) navigate('/proposals/new');
        else if (path.startsWith('/clients')) {
          // Trigger client add modal via doc event
          document.dispatchEvent(new CustomEvent('lance:add-client'));
        } else if (path.startsWith('/invoices')) {
          document.dispatchEvent(new CustomEvent('lance:add-invoice'));
        } else if (path.startsWith('/projects')) {
          document.dispatchEvent(new CustomEvent('lance:add-project'));
        } else if (path.startsWith('/time')) {
          document.dispatchEvent(new CustomEvent('lance:add-time'));
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
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <AIBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet key={location.pathname} />
        </main>
      </div>

      {/* Splash screen — shown on launch when unlicensed */}
      {showSplash && !isLicensed && (
        <SplashScreen onDismiss={() => setShowSplash(false)} />
      )}

      {/* Changelog modal — hidden while onboarding is active to avoid z-index overlap */}
      <Modal open={showChangelog && !showOnboarding} onClose={dismissChangelog} title={"What's new in Lance " + APP_VERSION} size="md">
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-tertiary)] font-medium">Version {APP_VERSION}</p>
          <ul className="space-y-2">
            {CHANGELOG.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                <span className="text-[var(--accent)] mt-0.5 flex-shrink-0">&bull;</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <Button onClick={dismissChangelog} className="w-full" size="sm">
              Got it
            </Button>
          </div>
        </div>
      </Modal>

      <OnboardingFlow showOnboarding={showOnboarding} setShowOnboarding={setShowOnboarding} />

      <Walkthrough open={showWalkthrough} onClose={() => { setShowWalkthrough(false); localStorage.removeItem('lance:tour-pending'); }} />

      <ImportModal
        open={showImportModal}
        onClose={() => { setShowImportModal(false); setImportFiles(undefined); }}
        initialFiles={importFiles}
      />

      <DropZoneOverlay visible={isDragOver} />

      <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      <QuickTimeLogModal open={showQuickLogModal} onClose={() => setShowQuickLogModal(false)} />
      <UpdaterModal />

      {/* Keyboard shortcuts cheat sheet */}
      <Modal open={showShortcuts} onClose={() => setShowShortcuts(false)} title="Keyboard Shortcuts" size="sm">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              [`${getShortcutModifierLabel()} + K`, 'Command palette'],
              [`${getShortcutModifierLabel()} + N`, 'New item (contextual)'],
              [`${getShortcutModifierLabel()} + ,`, 'Settings'],
              [`${getShortcutModifierLabel()} + /`, 'Shortcuts'],
              [`${getShortcutModifierLabel()} + 1–8`, 'Jump to section'],
              [`${getShortcutModifierLabel()} + Shift + T`, 'Start/Stop timer'],
              [`${getShortcutModifierLabel()} + Shift + L`, 'Quick log time'],
              ['Escape', 'Close modal / palette'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between col-span-2 px-3 py-1.5 rounded-[6px] hover:bg-[var(--bg-secondary)]">
                <kbd className="text-[11px] font-mono text-[var(--accent)] bg-[var(--accent-bg)] px-1.5 py-0.5 rounded-[4px]">{key}</kbd>
                <span className="text-[var(--text-secondary)]">{desc}</span>
              </div>
            ))}
          </div>
          <DynamicShortcutLegend />
        </div>
      </Modal>

      <ToastContainer />
    </div>
    </ErrorBoundary>
  );
}

function DynamicShortcutLegend() {
  const profile = useStore((s) => s.profile);
  const config = getArchetype(profile?.profession || 'default');
  const sidebarPaths = config.sidebar.map((s) => s.path);
  const sidebarLabels = config.sidebar.map((s) => s.label);

  const items = sidebarPaths.slice(0, 8).map((path, i) => {
    const label = sidebarLabels[i] || path.replace('/', '');
    return { label: label.charAt(0).toUpperCase() + label.slice(1), num: i + 1 };
  });

  if (items.length === 0) return null;

  return (
    <div className="pt-2 border-t border-[var(--border-color)]">
      <p className="text-[10px] text-[var(--text-tertiary)] text-center">
        {items.map((item, i) => (
          <span key={item.num}>
            {item.label} = {getShortcutModifierLabel()}{item.num}{i < items.length - 1 ? ' · ' : ''}
          </span>
        ))}
      </p>
    </div>
  );
}

function OnboardingFlow({ showOnboarding, setShowOnboarding }: { showOnboarding: boolean, setShowOnboarding: (s: boolean) => void }) {
  const { saveProfile, profile } = useStore();
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingForm, setOnboardingForm] = useState({
    name: '', email: '', currency: 'CAD' as string, hourly_rate: '', payment_terms: '14',
    profession: '' as Profession | '',
    writing_style: 'professional' as string,
    ai_enabled: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const seedDataRef = useRef(false);
  const [activeThemeId, setActiveThemeId] = useState<string>(localStorage.getItem('lance:theme') || 'default');
  const [validationErrors, setValidationErrors] = useState<{ email?: string }>({});

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    if (showOnboarding) {
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
  }, [showOnboarding]);

  const persistStep = async (step: number) => {
    localStorage.setItem('lance:onboarding-step', step.toString());
    try {
      await saveProfile({
        name: onboardingForm.name || undefined,
        email: onboardingForm.email || undefined,
        currency: onboardingForm.currency,
        hourly_rate: onboardingForm.hourly_rate ? parseFloat(onboardingForm.hourly_rate) : undefined,
        payment_terms: parseInt(onboardingForm.payment_terms) || 14,
        profession: onboardingForm.profession || undefined,
        writing_style: onboardingForm.writing_style,
        ai_enabled: onboardingForm.ai_enabled,
      });
    } catch { /* save is best-effort during onboarding */ }
  };

  const handleOnboardingNext = () => {
    const next = onboardingStep + 1;
    persistStep(next);
    setOnboardingStep(next);
  };
  const handleOnboardingBack = () => setOnboardingStep((s) => s - 1);
  const handleOnboardingClose = useCallback(() => {
    localStorage.setItem('lance:onboarding-step', 'complete');
    localStorage.setItem('lance:onboarding-completed', 'true');
    localStorage.setItem('lance:tour-pending', 'true');
    setShowOnboarding(false);
  }, []);

  const handleOnboardingFinish = async () => {
    if (!onboardingForm.name.trim()) return;
    setIsSaving(true);
    try {
      await saveProfile({
        name: onboardingForm.name,
        email: onboardingForm.email || undefined,
        currency: onboardingForm.currency,
        hourly_rate: onboardingForm.hourly_rate ? parseFloat(onboardingForm.hourly_rate) : undefined,
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
        } catch { /* non-critical */ }
      }
    } finally {
      setIsSaving(false);
    }
    localStorage.setItem('lance:onboarding-step', 'complete');
    localStorage.setItem('lance:onboarding-completed', 'true');
    localStorage.setItem('lance:tour-pending', 'true');
    setShowOnboarding(false);
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 bg-[var(--bg-card)] text-[var(--text-primary)]";
  const labelClass = "block text-xs font-medium text-[var(--text-secondary)] mb-1";

  return (
    <Modal open={showOnboarding} onClose={handleOnboardingClose} title="" size="sm">
      <div className="space-y-5">
        {isResuming && (
          <div className="text-center text-xs text-[var(--text-secondary)] bg-[var(--accent-bg)] py-1.5 px-3 rounded-[6px]">
            Welcome back &mdash; pick up where you left off.
          </div>
        )}
        <div className="flex justify-center gap-2 mb-1">
          {/* [1, 2, 3, 4, 5] -> AI disabled for v1.0.0 */}
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-all ${
                step <= onboardingStep ? 'bg-[var(--accent)]' : 'bg-[var(--border-color)]'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome + Profession */}
        {onboardingStep === 1 && (
          <>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Welcome to Lance</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Your freelance business, all in one place. What do you do?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
              {ARCHETYPE_LIST.filter((a) => a.id !== 'custom' && a.id !== 'default').map((archetype) => (
                <button
                  key={archetype.id}
                  onClick={() => {
                    setOnboardingForm({ ...onboardingForm, profession: archetype.id as Profession });
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium rounded-[8px] border transition-colors text-left ${
                    onboardingForm.profession === archetype.id
                      ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--text-primary)]'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <span className="text-base flex-shrink-0">{archetype.emoji}</span>
                  <span className="truncate">{archetype.label}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-1">
              <Button variant="ghost" onClick={handleOnboardingNext} size="sm">Skip</Button>
              <Button onClick={handleOnboardingNext} size="sm">Continue &rarr;</Button>
            </div>
          </>
        )}

        {/* Step 2: Profile */}
        {onboardingStep === 2 && (
          <>
            <div className="text-center mb-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Tell us about yourself</h3>
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
                <label className={labelClass}>Email</label>
                <input
                  type="email"
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
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <select
                  value={onboardingForm.currency}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, currency: e.target.value })}
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
              <Button variant="secondary" onClick={handleOnboardingBack} size="sm">&larr; Back</Button>
              <Button
                onClick={handleOnboardingNext}
                size="sm"
                disabled={!onboardingForm.name.trim() || !!validationErrors.email || (onboardingForm.email !== '' && !EMAIL_REGEX.test(onboardingForm.email))}
              >
                Continue &rarr;
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Themes */}
        {onboardingStep === 3 && (
          <>
            <div className="text-center mb-3">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Pick your workspace</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {onboardingForm.profession
                  ? `Your ${onboardingForm.profession} theme is unlocked. Earn more as you use Lance.`
                  : 'All themes unlock through achievements — or instantly with a license.'}
              </p>
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {THEMES.map((theme) => {
                const isUnlocked = theme.id === 'default' || (onboardingForm.profession && theme.id === PROFESSION_THEME[onboardingForm.profession as Profession]);
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
                      <div className={`font-medium ${isUnlocked ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>{theme.name}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">{theme.description}</div>
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
              <Button variant="secondary" onClick={handleOnboardingBack} size="sm">&larr; Back</Button>
              <Button onClick={handleOnboardingNext} size="sm">Continue &rarr;</Button>
            </div>
          </>
        )}

        {/* Step 4: AI Setup (COMMENTED OUT FOR v1.0.0)
        {onboardingStep === 4 && (
          <>
            <div className="text-center mb-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">AI Assistant</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-1">
                Lance includes local AI to help write proposals and analyze finances. It runs on your machine — no cloud, no subscriptions.
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
                    className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
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
                  <select
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
        {onboardingStep === 4 && (
          <>
            <div className="text-center mb-2">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Final Details</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Default Hourly Rate ({onboardingForm.currency})</label>
                <input
                  type="number"
                  value={onboardingForm.hourly_rate}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, hourly_rate: e.target.value })}
                  placeholder="e.g. 75"
                  className={inputClass}
                />
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Leave blank if you primarily do flat-rate projects.</p>
              </div>
              <div>
                <label className={labelClass}>Default Payment Terms</label>
                <select
                  value={onboardingForm.payment_terms}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, payment_terms: e.target.value })}
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
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Start with sample data?</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed mt-0.5">
                    See Lance fully populated so you know what to expect. Easy to clear anytime in Settings → Data.
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
                  Skip — start fresh
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
              <Button variant="secondary" onClick={handleOnboardingBack} size="sm" disabled={isSaving}>&larr; Back</Button>
              <span className="text-[10px] text-[var(--text-tertiary)] self-center">Step 4 of 4</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
