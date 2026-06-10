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
import SplashScreen from './components/ui/SplashScreen';
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
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingForm, setOnboardingForm] = useState({
    name: '', email: '', currency: 'CAD' as string, hourly_rate: '', payment_terms: '14',
    profession: '' as Profession | '',
    writing_style: 'professional' as string,
    ai_enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [ranAutoGen, setRanAutoGen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showChangelog, setShowChangelog] = useState(false);

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
      setOnboardingStep(1);
    }
  }, [profileLoaded, profile]);

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
  }, [ranAutoGen]);

  // Auto-updater: check silently after 3s delay
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update?.available) {
          addToast(`Lance ${update.version} is available — updating in background`, 'info');
          await update.downloadAndInstall();
          addToast('Update installed — restart Lance to apply', 'success');
        }
      } catch {
        // Silent fail — updates are best-effort
      }
    };
    const timer = setTimeout(checkUpdate, 3000);
    return () => clearTimeout(timer);
  }, []);

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

  const handleOnboardingNext = () => setOnboardingStep((s) => s + 1);
  const handleOnboardingBack = () => setOnboardingStep((s) => s - 1);

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
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20";
  const labelClass = "block text-xs font-medium text-[var(--text-secondary)] mb-1";

  return (
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

      {/* 5-step Onboarding */}
      <Modal open={showOnboarding} onClose={() => {}} title="" size="sm">
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
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                    placeholder="Your full name"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={onboardingForm.email}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
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
                <Button onClick={handleOnboardingNext} size="sm">Continue &rarr;</Button>
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
                  let isUnlocked: boolean;
                  if (onboardingForm.profession && theme.id === PROFESSION_THEME[onboardingForm.profession as Profession]) {
                    isUnlocked = true;
                  } else {
                    isUnlocked = theme.id === 'default';
                  }
                  const isActive = (localStorage.getItem('lance:theme') || 'default') === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        if (!isUnlocked) return;
                        applyTheme(theme);
                        localStorage.setItem('lance:theme', theme.id);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-[8px] text-left text-xs transition-colors ${
                        isActive
                          ? 'bg-[var(--accent-bg)] border border-[var(--accent)]/30'
                          : isUnlocked
                          ? 'hover:bg-[var(--bg-secondary)] border border-transparent'
                          : 'opacity-50 cursor-not-allowed border border-transparent'
                      }`}
                      disabled={!isUnlocked}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'border-[var(--accent)]' : 'border-[#D4D4D2]'
                      }`}>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`font-medium ${isUnlocked ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                          {theme.name}
                        </span>
                        <span className="text-[var(--text-tertiary)] ml-1">{theme.description}</span>
                      </div>
                      {!isUnlocked && <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">Locked</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="secondary" onClick={handleOnboardingBack} size="sm">&larr; Back</Button>
                <Button onClick={handleOnboardingNext} size="sm">Continue &rarr;</Button>
              </div>
            </>
          )}

          {/* Step 4: AI + Writing style */}
          {onboardingStep === 4 && (
            <>
              <div className="text-center mb-3">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">AI features</h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  AI runs locally on your machine. No data is ever sent anywhere. Off by default.
                </p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    onClick={() => setOnboardingForm({ ...onboardingForm, ai_enabled: !onboardingForm.ai_enabled })}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      onboardingForm.ai_enabled ? 'bg-[var(--accent)]' : 'bg-[#D4D4D2]'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--bg-card)] shadow transition-transform ${
                      onboardingForm.ai_enabled ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                  <div>
                    <span className="text-sm text-[var(--text-primary)] font-medium">
                      {onboardingForm.ai_enabled ? 'AI assistance on' : 'AI assistance off'}
                    </span>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      Proposal generation, scope warnings, and business insights.
                    </p>
                  </div>
                </label>
                <div>
                  <label className={labelClass}>Writing style</label>
                  <select
                    value={onboardingForm.writing_style}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, writing_style: e.target.value })}
                    className={inputClass}
                  >
                    <option value="professional">Professional</option>
                    <option value="warm">Warm &amp; personal</option>
                    <option value="direct">Direct &amp; concise</option>
                    <option value="bold">Bold &amp; confident</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="secondary" onClick={handleOnboardingBack} size="sm">&larr; Back</Button>
                <Button onClick={handleOnboardingNext} size="sm">Continue &rarr;</Button>
              </div>
            </>
          )}

          {/* Step 5: Defaults */}
          {onboardingStep === 5 && (
            <>
              <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Set your defaults</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Hourly rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">$</span>
                    <input
                      type="number"
                      value={onboardingForm.hourly_rate}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, hourly_rate: e.target.value })}
                      placeholder="0.00"
                      className={`${inputClass} pl-7`}
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">You can change this anytime in Settings.</p>
                </div>
                <div>
                  <label className={labelClass}>Payment terms (days)</label>
                  <input
                    type="number"
                    value={onboardingForm.payment_terms}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, payment_terms: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="secondary" onClick={handleOnboardingBack} size="sm">&larr; Back</Button>
                <Button onClick={handleOnboardingFinish} loading={saving} disabled={!onboardingForm.name.trim()} size="sm">
                  Start using Lance &rarr;
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} />

      <ToastContainer />
    </div>
  );
}
