import { useEffect, useState, useCallback, useRef } from 'react';
import { useStore } from '../store';
import type { UserProfile } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useToasts } from '../store/toastStore';
import { formatCurrency } from '../utils/format';
import { save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { Check, Upload, Download, AlertTriangle, Trash2, Lock, Sparkles, ExternalLink } from 'lucide-react';
import { THEMES, applyTheme, getTheme } from '../themes/themes';
import { PROFESSION_THEME, type Profession } from '../themes';
import { getUnlockedThemes } from '../achievements/checker';
import type { ThemeId } from '../themes';
import { validateLicenseKey } from '../license';

const currencies = ['CAD', 'USD', 'GBP', 'EUR', 'AUD'];
const writingStyles = ['professional', 'warm', 'direct', 'bold'];

function labelForStyle(s: string): string {
  const map: Record<string, string> = {
    professional: 'Professional',
    warm: 'Warm & personal',
    direct: 'Direct & concise',
    bold: 'Bold & confident',
  };
  return map[s] || s;
}

export default function Settings() {
  const { profile, loadProfile, saveProfile, isLicensed, activateLicense, removeLicense } = useStore();
  const addToast = useToasts((s) => s.add);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [showResetModal, setShowResetModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [licenseActivating, setLicenseActivating] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeId>('default');
  const [unlockedThemes, setUnlockedThemes] = useState<Set<string>>(new Set(['default']));
  const [form, setForm] = useState<UserProfile>({
    name: '',
    email: '',
    currency: 'CAD',
    hourly_rate: undefined,
    tax_rate: undefined,
    payment_terms: 14,
    writing_style: 'professional',
    writing_voice: '',
    tagline: '',
    always_include: '',
    theme: 'light',
    ai_enabled: false,
  });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    loadProfile()
      .catch(err => addToast(err?.toString?.() || 'Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, [loadProfile]);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        email: profile.email || '',
        currency: profile.currency || 'CAD',
        hourly_rate: profile.hourly_rate,
        tax_rate: profile.tax_rate,
        payment_terms: profile.payment_terms ?? 14,
        writing_style: profile.writing_style || 'professional',
        writing_voice: profile.writing_voice || '',
        tagline: profile.tagline || '',
        always_include: profile.always_include || '',
        theme: profile.theme || 'light',
        license_key: profile.license_key,
        licensed_at: profile.licensed_at,
        ai_enabled: profile.ai_enabled ?? false,
      });
    }
  }, [profile]);

  useEffect(() => {
    const stored = (localStorage.getItem('lance:theme') || 'default') as ThemeId;
    setActiveTheme(stored);
    if (isLicensed) {
      setUnlockedThemes(new Set(['default', 'studio', 'terminal', 'craft', 'motion', 'lens', 'scale']));
    } else {
      getUnlockedThemes().then((unlocked) => {
        const set = new Set(['default', ...unlocked]);
        // Also unlock profession theme
        const prof = profile?.profession as Profession | undefined;
        if (prof && PROFESSION_THEME[prof]) {
          set.add(PROFESSION_THEME[prof]);
        }
        setUnlockedThemes(set);
      });
    }
  }, [isLicensed, profile?.profession]);

  useEffect(() => {
    if (form.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [form.theme]);

  const autoSave = useCallback(
    (updates: Partial<UserProfile>, section: string) => {
      const newProfile = { ...form, ...updates };
      setForm(newProfile);
      try {
        saveProfile(newProfile);
      } catch (err) {
        addToast(err?.toString?.() || 'Failed to save', 'error');
      }
      setSaved((prev) => new Set([...prev, section]));
      if (timers.current[section]) clearTimeout(timers.current[section]);
      timers.current[section] = setTimeout(() => {
        setSaved((prev) => {
          const next = new Set(prev);
          next.delete(section);
          return next;
        });
      }, 1500);
    },
    [form, saveProfile, addToast]
  );

  const handleExportData = async () => {
    try {
      const data: Record<string, unknown[]> = {};
      const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
      data.clients = await tauriInvoke('get_clients');
      data.projects = await tauriInvoke('get_projects');
      data.proposals = await tauriInvoke('get_proposals');
      data.contracts = await tauriInvoke('get_contracts');
      data.time_entries = await tauriInvoke('get_time_entries');
      data.invoices = await tauriInvoke('get_invoices');
      data.expenses = await tauriInvoke('get_expenses');
      data.user_profile = profile ? [profile] : [];

      const json = JSON.stringify(data, null, 2);
      const filePath = await save({ defaultPath: `Lance_Backup_${new Date().toISOString().split('T')[0]}.json` });
      if (!filePath) return;
      await writeFile(filePath, new TextEncoder().encode(json));
      addToast('Data exported successfully', 'success');
    } catch {
      addToast('Export failed', 'error');
    }
  };

  const handleImportData = async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!filePath) return;
      const content = await readTextFile(filePath);
      const data = JSON.parse(content);

      const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');

      if (data.user_profile?.[0]) {
        await saveProfile(data.user_profile[0]);
      }
      if (Array.isArray(data.clients)) {
        for (const c of data.clients) {
          try { await tauriInvoke('create_client', { payload: c }); } catch {}
        }
      }
      if (Array.isArray(data.projects)) {
        for (const p of data.projects) {
          try { await tauriInvoke('create_project', { payload: p }); } catch {}
        }
      }
      if (Array.isArray(data.proposals)) {
        for (const p of data.proposals) {
          try { await tauriInvoke('create_proposal', { payload: p }); } catch {}
        }
      }
      if (Array.isArray(data.contracts)) {
        for (const p of data.contracts) {
          try { await tauriInvoke('create_contract', { payload: p }); } catch {}
        }
      }
      if (Array.isArray(data.time_entries)) {
        for (const t of data.time_entries) {
          try { await tauriInvoke('create_time_entry', { payload: t }); } catch {}
        }
      }
      if (Array.isArray(data.invoices)) {
        for (const inv of data.invoices) {
          try {
            await tauriInvoke('create_invoice', {
              payload: { ...inv, line_items: typeof inv.line_items === 'string' ? inv.line_items : JSON.stringify(inv.line_items) },
            });
          } catch {}
        }
      }
      if (Array.isArray(data.expenses)) {
        for (const e of data.expenses) {
          try { await tauriInvoke('create_expense', { payload: e }); } catch {}
        }
      }

      addToast('Data imported successfully', 'success');
      await loadProfile();
    } catch {
      addToast('Import failed — check file format', 'error');
    }
  };

  const handleResetData = async () => {
    try {
      const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
      const tables = [
        { list: 'get_clients', name: 'clients', del: 'delete_client' },
        { list: 'get_projects', name: 'projects', del: 'delete_project' },
        { list: 'get_proposals', name: 'proposals', del: 'delete_proposal' },
        { list: 'get_contracts', name: 'contracts', del: 'delete_contract' },
        { list: 'get_time_entries', name: 'time_entries', del: 'delete_time_entry' },
        { list: 'get_invoices', name: 'invoices', del: 'delete_invoice' },
        { list: 'get_expenses', name: 'expenses', del: 'delete_expense' },
      ];
      for (const t of tables) {
        const records: { id: string }[] = await tauriInvoke(t.list);
        for (const r of records) {
          await tauriInvoke(t.del, { id: r.id });
        }
      }
      setShowResetModal(false);
      addToast('All data has been reset', 'info');
      await loadProfile();
    } catch {
      addToast('Reset failed', 'error');
    }
  };

  const handleActivateLicense = async () => {
    const key = licenseKey.trim().toUpperCase();
    if (!key) {
      setLicenseError('Enter a license key.');
      return;
    }
    setLicenseActivating(true);
    setLicenseError('');
    try {
      const success = await activateLicense(key);
      if (success) {
        setShowLicenseModal(false);
        setLicenseKey('');
        addToast('Lance is now licensed. Thank you.', 'success');
        setUnlockedThemes(new Set(['default', 'studio', 'terminal', 'craft']));
      } else {
        setLicenseError('Invalid license key — check for typos and try again.');
      }
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to activate license', 'error');
      setLicenseError('An error occurred. Please try again.');
    } finally {
      setLicenseActivating(false);
    }
  };

  const handleRemoveLicense = async () => {
    if (!window.confirm('Remove your license? The splash screen will return.')) return;
    try {
      await removeLicense();
      addToast('License removed.', 'info');
      getUnlockedThemes().then((unlocked) => {
        setUnlockedThemes(new Set(['default', ...unlocked]));
      });
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to remove license', 'error');
    }
  };

  const SectionHead = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] ">{title}</h3>
      {saved.has(title) && (
        <span className="flex items-center gap-1 text-[10px] text-[var(--accent)] animate-pulse">
          <Check size={12} /> Saved
        </span>
      )}
    </div>
  );

  const inputClass = "w-full px-3 py-2 text-sm border border-[var(--border-color)]  rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 bg-[var(--bg-card)]  ";
  const labelClass = "block text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-1";

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" /></div>

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]  mb-6">Settings</h2>

      {/* Section 0: License */}
      <Card className="mb-6  ">
        <SectionHead title="License" />
        {isLicensed ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-[var(--accent)]" />
              <span className="text-sm font-medium text-[var(--accent)]">Licensed</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-2">
              Thank you for supporting Lance.
            </p>
            {form.licensed_at && (
              <p className="text-xs text-[var(--text-tertiary)] mb-4">
                Licensed on {new Date(form.licensed_at).toLocaleDateString()}.
              </p>
            )}
            <button
              onClick={handleRemoveLicense}
              className="text-xs text-[var(--text-tertiary)] hover:text-[#A32D2D] underline transition-colors"
            >
              Remove license
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-4">
              Lance is free to use. A license removes the launch screen and unlocks all themes immediately.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={() => { setLicenseKey(''); setLicenseError(''); setShowLicenseModal(true); }} size="sm">
                Enter license key
              </Button>
              <a
                href="https://lance.decentra.co/license"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
              >
                Get a license &mdash; $59
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </Card>

      {/* Section 1: Profile */}
      <Card className="mb-6  ">
        <SectionHead title="Your profile" />
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input
              type="text"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onBlur={() => autoSave({ name: form.name }, 'Your profile')}
              placeholder="Your full name"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={() => autoSave({ email: form.email }, 'Your profile')}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <select
              value={form.currency}
              onChange={(e) => autoSave({ currency: e.target.value }, 'Your profile')}
              className={inputClass}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Section 2: Rates */}
      <Card className="mb-6  ">
        <SectionHead title="Rates" />
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Default hourly rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">$</span>
              <input
                type="number"
                value={form.hourly_rate ?? ''}
                onChange={(e) => setForm({ ...form, hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined })}
                onBlur={() => autoSave({ hourly_rate: form.hourly_rate }, 'Rates')}
                placeholder="0.00"
                className={`${inputClass} pl-7`}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Default tax rate (%)</label>
            <input
              type="number"
              value={form.tax_rate ?? ''}
              onChange={(e) => setForm({ ...form, tax_rate: e.target.value ? parseFloat(e.target.value) : undefined })}
              onBlur={() => autoSave({ tax_rate: form.tax_rate }, 'Rates')}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Payment terms (days)</label>
            <input
              type="number"
              value={form.payment_terms ?? 14}
              onChange={(e) => setForm({ ...form, payment_terms: parseInt(e.target.value) || 14 })}
              onBlur={() => autoSave({ payment_terms: form.payment_terms }, 'Rates')}
              className={inputClass}
            />
          </div>
        </div>
      </Card>

      {/* Section 3: Proposal voice */}
      <Card className="mb-6  ">
        <SectionHead title="Proposal voice" />
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Writing style</label>
            <select
              value={form.writing_style || 'professional'}
              onChange={(e) => autoSave({ writing_style: e.target.value }, 'Proposal voice')}
              className={inputClass}
            >
              {writingStyles.map((s) => (
                <option key={s} value={s}>{labelForStyle(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tagline / positioning</label>
            <input
              type="text"
              value={form.tagline || ''}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              onBlur={() => autoSave({ tagline: form.tagline }, 'Proposal voice')}
              placeholder="e.g. I help startups ship beautiful products fast."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>What I always include</label>
            <textarea
              value={form.always_include || ''}
              onChange={(e) => setForm({ ...form, always_include: e.target.value })}
              onBlur={() => autoSave({ always_include: form.always_include }, 'Proposal voice')}
              placeholder="Anything you always want in proposals..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </Card>

      {/* Section 3.5: AI Features */}
      <Card className="mb-6  ">
        <SectionHead title="AI features" />
        <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-4">
          AI-assisted writing, scope warnings, and pricing analysis run locally on your machine. No data is sent anywhere.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            onClick={() => autoSave({ ai_enabled: !form.ai_enabled }, 'AI features')}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              form.ai_enabled ? 'bg-[var(--accent)]' : 'bg-[#D4D4D2]'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--bg-card)] shadow transition-transform ${
                form.ai_enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-sm text-[var(--text-primary)]  font-medium">
            {form.ai_enabled ? 'AI features on' : 'AI features off'}
          </span>
        </label>
      </Card>

      {/* Section 4: Appearance */}
      <Card className="mb-6  ">
        <SectionHead title="Appearance" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => autoSave({ theme: 'light' }, 'Appearance')}
            className={`px-4 py-2 text-sm rounded-[8px] border transition-colors ${
              form.theme === 'light'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg-card)]  text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] border-[var(--border-color)] '
            }`}
          >
            Light
          </button>
          <button
            onClick={() => autoSave({ theme: 'dark' }, 'Appearance')}
            className={`px-4 py-2 text-sm rounded-[8px] border transition-colors ${
              form.theme === 'dark'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg-card)]  text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] border-[var(--border-color)] '
            }`}
          >
            Dark
          </button>
        </div>
      </Card>

      {/* Section 4.5: Themes */}
      <Card className="mb-6  ">
        <SectionHead title="Themes" />
        <div className="space-y-2">
          {THEMES.map((theme) => {
            const isUnlocked = unlockedThemes.has(theme.id);
            const isActive = activeTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  if (!isUnlocked) return;
                  setActiveTheme(theme.id);
                  localStorage.setItem('lance:theme', theme.id);
                  applyTheme(theme);
                  addToast(`Switched to ${theme.name}`, 'info');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[8px] text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-bg)] border border-[var(--accent)]/30'
                    : isUnlocked
                    ? 'hover:bg-[var(--bg-secondary)]  border border-transparent'
                    : 'opacity-60 cursor-not-allowed border border-transparent'
                }`}
                disabled={!isUnlocked}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'border-[var(--accent)]' : 'border-[#D4D4D2]'
                }`}>
                  {isActive && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${isUnlocked ? 'text-[var(--text-primary)] ' : 'text-[var(--text-tertiary)]'}`}>
                    {theme.name}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {theme.description}
                  </p>
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
      </Card>

      {/* Section 5: Data */}
      <Card className="mb-6  ">
        <SectionHead title="Data" />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)] ">Export all data</p>
              <p className="text-xs text-[var(--text-tertiary)]">Backup your entire database as JSON</p>
            </div>
            <Button variant="secondary" onClick={handleExportData} size="sm">
              <Download size={14} />
              Export
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)] ">Import data</p>
              <p className="text-xs text-[var(--text-tertiary)]">Restore from a Lance backup file</p>
            </div>
            <Button variant="secondary" onClick={handleImportData} size="sm">
              <Upload size={14} />
              Import
            </Button>
          </div>
          <div className="border-t border-[var(--border-color)]  pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#A32D2D]">Reset all data</p>
              <p className="text-xs text-[var(--text-tertiary)]">Delete all records permanently</p>
            </div>
            <Button variant="danger" onClick={() => setShowResetModal(true)} size="sm">
              <Trash2 size={14} />
              Reset
            </Button>
          </div>
        </div>
      </Card>

      <Modal open={showResetModal} onClose={() => setShowResetModal(false)} title="Reset all data" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-[8px] bg-[#FCEBEB]">
            <AlertTriangle size={18} className="text-[#A32D2D] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#A32D2D]">This cannot be undone.</p>
              <p className="text-xs text-[#A32D2D]/80 mt-1">
                All clients, projects, proposals, contracts, invoices, time entries, and expenses will be permanently deleted.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowResetModal(false)} size="sm">Cancel</Button>
            <Button variant="danger" onClick={handleResetData} size="sm">Delete everything</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showLicenseModal} onClose={() => setShowLicenseModal(false)} title="Enter your license key" size="sm">
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => { setLicenseKey(e.target.value.toUpperCase()); setLicenseError(''); }}
              placeholder="LANCE-XXXX-XXXX-XXXX-XXXX"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 bg-[var(--bg-card)]    uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              autoFocus
            />
            {licenseError && (
              <p className="text-xs text-[#A32D2D] mt-2">{licenseError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowLicenseModal(false)} size="sm">Cancel</Button>
            <Button variant="primary" onClick={handleActivateLicense} loading={licenseActivating} disabled={!licenseKey.trim()} size="sm">
              Activate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
