/**
 * Lance — Freelancer OS
 * Built by Decentra (decentra.co)
 *
 * Privacy: Lance collects no telemetry. See PRIVACY.md.
 * License: Proprietary. See LICENSE.md.
 */

import { useEffect, useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import AIBar from './components/layout/AIBar';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import ToastContainer from './components/ui/Toast';
import CommandPalette from './components/ui/CommandPalette';
import Walkthrough from './components/ui/Walkthrough';
import SplashScreen from './components/ui/SplashScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useStore } from './store';
import { useToasts } from './store/toastStore';
import { shouldGenerate, getNextDueDate } from './utils/recurringEngine';
import { generateInvoiceNumber } from './utils/invoiceNumber';
import { applyTheme, getTheme, THEMES } from './themes/themes';
import type { Profession } from './themes';
import { PROFESSION_THEME } from './themes';
import { checkAchievements } from './achievements/checker';
import { ACHIEVEMENTS } from './achievements';

export default function App() {
  const {
    profile, profileLoaded, loadProfile, saveProfile, isLicensed,
    recurringInvoices, loadRecurringInvoices, updateRecurringInvoice,
    invoices, loadInvoices, addInvoice,
    clients, loadClients,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [ranAutoGen, setRanAutoGen] = useState(false);

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const APP_VERSION = '1.1.0';
  const CHANGELOG = [
    '7 themes: Default, Studio, Terminal, Craft, Motion, Lens, Scale',
    'Onboarding asks what you do & picks your first theme',
    'AI features — optional, off by default, runs locally',
    'OS dark mode detection on first launch',
    'Themes now apply in real-time across the entire app',
    'Expanded project types: Photography, Video, Animation, SEO, Social',
  ];

  // Changelog check on mount
  useEffect(() => {
    const seen = localStorage.getItem('lance:changelog-seen');
    if (seen !== APP_VERSION) {
      setShowChangelog(true);
    }
  }, []);

  const dismissChangelog = () => {
    localStorage.setItem('lance:changelog-seen', APP_VERSION);
    setShowChangelog(false);
  };

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const explicitTheme = profile?.theme;
    if (explicitTheme) {
      // User has set a preference — respect it
      document.documentElement.classList.toggle('dark', explicitTheme === 'dark');
    } else if (profileLoaded && !profile) {
      // First launch — auto-detect OS preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile?.theme, profileLoaded, profile]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLicensed]);

  useEffect(() => {
    if (profileLoaded && !profile) {
      setShowOnboarding(true);
    }
  }, [profileLoaded, profile]);

  // Show walkthrough after onboarding completes
  useEffect(() => {
    if (!showOnboarding && localStorage.getItem('lance:tour-pending') === 'true') {
      setShowWalkthrough(true);
    }
  }, [showOnboarding]);

  // Auto-generate recurring invoices on startup
  useEffect(() => {
    if (!profileLoaded || ranAutoGen) return;
    const run = async () => {
      setRanAutoGen(true);
      await loadRecurringInvoices();
      await loadInvoices();
      await loadClients();
      // Check achievements after initial data load
      try {
        const state = useStore.getState();
        const newAchievements = await checkAchievements(state);
        for (const key of newAchievements) {
          const ach = ACHIEVEMENTS.find((a) => a.key === key);
          if (ach) {
            addToast(`${ach.title} — ${ach.reward}`, 'unlock');
          }
        }
      } catch { /* achievement check is non-critical */ }
    };
    run();
  }, [profileLoaded, ranAutoGen, loadRecurringInvoices, loadInvoices, loadClients]);

  useEffect(() => {
    if (!ranAutoGen || recurringInvoices.length === 0) return;
    if (invoices.length === 0 && ranAutoGen) {
      loadInvoices();
      return;
    }
    const generate = async () => {
      const paymentTerms = profile?.payment_terms ?? 14;
      const due = recurringInvoices.filter(shouldGenerate);
      for (const ri of due) {
        const currentInvoices = useStore.getState().invoices;
        const invNumber = generateInvoiceNumber(currentInvoices);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + paymentTerms);
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
      }
    };
    generate();
  }, [ranAutoGen, recurringInvoices.length, invoices.length]);

  // TODO: Re-enable auto-updater when endpoint is live
  // useEffect(() => {
  //   const checkUpdate = async () => {
  //     try {
  //       const { check } = await import('@tauri-apps/plugin-updater');
  //       const update = await check();
  //       if (update?.available) {
  //         addToast(`Lance ${update.version} is available — updating in background`, 'info');
  //         await update.downloadAndInstall();
  //         addToast('Update installed — restart Lance to apply', 'success');
  //       }
  //     } catch {
  //       // Silent fail — updates are best-effort
  //     }
  //   };
  //   const timer = setTimeout(checkUpdate, 3000);
  //   return () => clearTimeout(timer);
  // }, []);

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
        if (!isEditing()) navigate('/settings');
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
        const routes = ['/proposals', '/contracts', '/projects', '/time', '/invoices', '/clients', '/finance', '/insights'];
        navigate(routes[parseInt(e.key) - 1]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, location, isEditing]);


  return (
    <ErrorBoundary>
    <div className="h-full flex bg-[var(--bg-primary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <AIBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Splash screen — shown on launch when unlicensed */}
      {showSplash && !isLicensed && (
        <SplashScreen onDismiss={() => setShowSplash(false)} />
      )}

      {/* Changelog modal */}
      <Modal open={showChangelog} onClose={dismissChangelog} title="What's new in Lance" size="sm">
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-tertiary)]">Version {APP_VERSION}</p>
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

      <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} />

      {/* Keyboard shortcuts cheat sheet */}
      <Modal open={showShortcuts} onClose={() => setShowShortcuts(false)} title="Keyboard Shortcuts" size="sm">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['⌘/Ctrl + K', 'Command palette'],
              ['⌘/Ctrl + N', 'New item (contextual)'],
              ['⌘/Ctrl + ,', 'Settings'],
              ['⌘/Ctrl + /', 'Shortcuts'],
              ['⌘/Ctrl + 1–8', 'Jump to section'],
              ['Escape', 'Close modal / palette'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between col-span-2 px-3 py-1.5 rounded-[6px] hover:bg-[var(--bg-secondary)]">
                <kbd className="text-[11px] font-mono text-[var(--accent)] bg-[var(--accent-bg)] px-1.5 py-0.5 rounded-[4px]">{key}</kbd>
                <span className="text-[var(--text-secondary)]">{desc}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-[var(--border-color)]">
            <p className="text-[10px] text-[var(--text-tertiary)] text-center">
              Proposals = ⌘1 &middot; Contracts = ⌘2 &middot; Projects = ⌘3 &middot; Time = ⌘4<br />
              Invoices = ⌘5 &middot; Clients = ⌘6 &middot; Finance = ⌘7 &middot; Insights = ⌘8
            </p>
          </div>
        </div>
      </Modal>

      <ToastContainer />
    </div>
    </ErrorBoundary>
  );
}

function OnboardingFlow({ showOnboarding, setShowOnboarding }: { showOnboarding: boolean, setShowOnboarding: (s: boolean) => void }) {
  const { saveProfile } = useStore();
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingForm, setOnboardingForm] = useState({
    name: '', email: '', currency: 'CAD' as string, hourly_rate: '', payment_terms: '14',
    profession: '' as Profession | '',
    writing_style: 'professional' as string,
    ai_enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string>(localStorage.getItem('lance:theme') || 'default');
  const [validationErrors, setValidationErrors] = useState<{ email?: string }>({});

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Reset step to 1 when modal opens
  useEffect(() => {
    if (showOnboarding) {
      setOnboardingStep(1);
    }
  }, [showOnboarding]);

  const handleOnboardingNext = () => setOnboardingStep((s) => s + 1);
  const handleOnboardingBack = () => setOnboardingStep((s) => s - 1);
  const handleOnboardingClose = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const handleOnboardingFinish = async () => {
    if (!onboardingForm.name.trim()) return;
    setSaving(true);
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
        const themeId = PROFESSION_THEME[onboardingForm.profession as Profession];
        if (themeId && themeId !== 'default') {
          applyTheme(getTheme(themeId));
          localStorage.setItem('lance:theme', themeId);
        }
      }
      setShowOnboarding(false);
      localStorage.setItem('lance:tour-pending', 'true');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 bg-[var(--bg-card)] text-[var(--text-primary)]";
  const labelClass = "block text-xs font-medium text-[var(--text-secondary)] mb-1";

  return (
    <Modal open={showOnboarding} onClose={handleOnboardingClose} title="" size="sm">
      <div className="space-y-5">
        <div className="flex justify-center gap-2 mb-1">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-all ${
                step <= onboardingStep ? 'bg-[var(--accent)]' : 'bg-[#E3E2DB]'
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
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'writer', label: 'Writer / Editor' },
                { value: 'developer', label: 'Developer / Engineer' },
                { value: 'designer', label: 'Designer' },
                { value: 'animator', label: 'Animator / Video' },
                { value: 'photographer', label: 'Photographer' },
                { value: 'consultant', label: 'Consultant / Coach' },
              ] as const).map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setOnboardingForm({ ...onboardingForm, profession: p.value });
                  }}
                  className={`px-3 py-2.5 text-xs font-medium rounded-[8px] border transition-colors text-left ${
                    onboardingForm.profession === p.value
                      ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--text-primary)]'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-1">
              <Button variant="ghost" onClick={handleOnboardingFinish} size="sm">Skip</Button>
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
                disabled={!onboardingForm.name.trim() || !!validationErrors.email || !EMAIL_REGEX.test(onboardingForm.email)}
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
              {THEMES.filter(theme => {
                if (onboardingForm.profession && theme.id === PROFESSION_THEME[onboardingForm.profession as Profession]) return true;
                return theme.id === 'default';
              }).map((theme) => {
                const isUnlocked = true; // We only render unlocked themes now
                const isActive = activeThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      applyTheme(theme);
                      localStorage.setItem('lance:theme', theme.id);
                      setActiveThemeId(theme.id);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-[8px] text-left text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--text-primary)] border'
                        : 'bg-[var(--bg-secondary)] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] border'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'border-[var(--accent)]' : 'border-[var(--border-color)]'
                      }`}
                    >
                      {isActive && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{theme.name}</div>
                      <div className="text-[10px] opacity-70 truncate">{theme.description}</div>
                    </div>
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

        {/* Step 4: AI Setup */}
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

        {/* Step 5: Rates & Final */}
        {onboardingStep === 5 && (
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
            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handleOnboardingBack} size="sm" disabled={saving}>&larr; Back</Button>
              <Button onClick={handleOnboardingFinish} size="sm" disabled={saving || !onboardingForm.name.trim()}>
                {saving ? 'Saving...' : 'Get Started'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
