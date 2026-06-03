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
import { Check, Upload, Download, AlertTriangle, Trash2 } from 'lucide-react';

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
  const { profile, loadProfile, saveProfile } = useStore();
  const addToast = useToasts((s) => s.add);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [showResetModal, setShowResetModal] = useState(false);
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
  });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    loadProfile();
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
      });
    }
  }, [profile]);

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
      saveProfile(newProfile);
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
    [form, saveProfile]
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

  const SectionHead = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-sm font-semibold text-[#1C1C1A] dark:text-[#F0EFE9]">{title}</h3>
      {saved.has(title) && (
        <span className="flex items-center gap-1 text-[10px] text-[#1D9E75] animate-pulse">
          <Check size={12} /> Saved
        </span>
      )}
    </div>
  );

  const inputClass = "w-full px-3 py-2 text-sm border border-[#E5E5E3] dark:border-[#2C2C2A] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20 bg-white dark:bg-[#1C1C1A] dark:text-[#F0EFE9]";
  const labelClass = "block text-xs font-medium text-[#6B6B67] dark:text-[#A3A39E] mb-1";

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-[#1C1C1A] dark:text-[#F0EFE9] mb-6">Settings</h2>

      {/* Section 1: Profile */}
      <Card className="mb-6 dark:bg-[#1C1C1A] dark:border-[#2C2C2A]">
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
      <Card className="mb-6 dark:bg-[#1C1C1A] dark:border-[#2C2C2A]">
        <SectionHead title="Rates" />
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Default hourly rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#A3A39E]">$</span>
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
      <Card className="mb-6 dark:bg-[#1C1C1A] dark:border-[#2C2C2A]">
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

      {/* Section 4: Appearance */}
      <Card className="mb-6 dark:bg-[#1C1C1A] dark:border-[#2C2C2A]">
        <SectionHead title="Appearance" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => autoSave({ theme: 'light' }, 'Appearance')}
            className={`px-4 py-2 text-sm rounded-[8px] border transition-colors ${
              form.theme === 'light'
                ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                : 'bg-white dark:bg-[#2C2C2A] text-[#6B6B67] dark:text-[#A3A39E] border-[#E5E5E3] dark:border-[#2C2C2A]'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => autoSave({ theme: 'dark' }, 'Appearance')}
            className={`px-4 py-2 text-sm rounded-[8px] border transition-colors ${
              form.theme === 'dark'
                ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                : 'bg-white dark:bg-[#2C2C2A] text-[#6B6B67] dark:text-[#A3A39E] border-[#E5E5E3] dark:border-[#2C2C2A]'
            }`}
          >
            Dark
          </button>
        </div>
      </Card>

      {/* Section 5: Data */}
      <Card className="mb-6 dark:bg-[#1C1C1A] dark:border-[#2C2C2A]">
        <SectionHead title="Data" />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#1C1C1A] dark:text-[#F0EFE9]">Export all data</p>
              <p className="text-xs text-[#A3A39E]">Backup your entire database as JSON</p>
            </div>
            <Button variant="secondary" onClick={handleExportData} size="sm">
              <Download size={14} />
              Export
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#1C1C1A] dark:text-[#F0EFE9]">Import data</p>
              <p className="text-xs text-[#A3A39E]">Restore from a Lance backup file</p>
            </div>
            <Button variant="secondary" onClick={handleImportData} size="sm">
              <Upload size={14} />
              Import
            </Button>
          </div>
          <div className="border-t border-[#E5E5E3] dark:border-[#2C2C2A] pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#A32D2D]">Reset all data</p>
              <p className="text-xs text-[#A3A39E]">Delete all records permanently</p>
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
    </div>
  );
}
