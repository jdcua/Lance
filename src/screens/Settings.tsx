import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import { DEFAULT_CURRENCY } from '../lib/constants';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { isTauri as isTauriApp } from '../utils/tauri';
import { todayLocalISO } from '../utils/format';
import type { UserProfile } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToasts } from '../store/toastStore';
import { save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { AlertTriangle } from 'lucide-react';
import { applyTheme, getTheme } from '../themes/themes';
import type { ThemeId } from '../themes';
import { getUnlockedThemes, getUnlockedAchievementKeys } from '../achievements/checker';
import { clearSampleData } from '../utils/seedData';
import {
  createExportEnvelope,
  validateImportEnvelope,
  performImport,
  MAX_IMPORT_MB,
  MAX_IMPORT_BYTES,
  logVersionEvent,
  sanitizeBlobName,
} from '../utils/backup';
import type { BackupEnvelope, ImportValidationResult } from '../utils/backup';
import { getCurrentSchemaVersion } from '../db';
import { formatTableCounts } from '../utils/backup';
import { ACCENT_COLORS } from './settings/shared';
import GeneralSection from './settings/GeneralSection';
import AppearanceSection from './settings/AppearanceSection';
import FeatureSettings from './settings/FeatureSettings';
import NotificationsSection from './settings/NotificationsSection';
import DataSection from './settings/DataSection';
import DangerSection from './settings/DangerSection';
import type { SettingsBag } from './settings/shared';

export default function Settings() {
  const navigate = useNavigate();
  const {
    profile,
    loadProfile,
    saveProfile,
    followUpSettings,
    loadFollowUpSettings,
    getAssetsDir,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showClearSampleConfirm, setShowClearSampleConfirm] = useState(false);
  const [isSeeded, setIsSeeded] = useState(localStorage.getItem('lance:seeded') === 'true');
  const [showAssetWarning, setShowAssetWarning] = useState(false);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [importSummaryData, setImportSummaryData] = useState<ImportValidationResult | null>(null);
  const [importReplaceMode, setImportReplaceMode] = useState(false);
  const [importReplaceConfirm, setImportReplaceConfirm] = useState('');
  const [importPending, setImportPending] = useState(false);
  const [pendingImportEnvelope, setPendingImportEnvelope] = useState<BackupEnvelope | null>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFreq, setAutoBackupFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [autoBackupPath, setAutoBackupPath] = useState('');
  const [autoBackupLoaded, setAutoBackupLoaded] = useState(false);
  const [showSchemaWarnModal, setShowSchemaWarnModal] = useState(false);
  const [schemaWarnData, setSchemaWarnData] = useState<{ from: number; to: number } | null>(null);
  const [activeTheme, setActiveTheme] = useState<ThemeId>('default');
  const [unlockedThemes, setUnlockedThemes] = useState<Set<string>>(new Set(['default']));
  const [fuEnabled, setFuEnabled] = useState(true);
  const [fuProposalDelay, setFuProposalDelay] = useState(3);
  const [fuInvoiceDelay, setFuInvoiceDelay] = useState(0);
  const [fuLateFeeEnabled, setFuLateFeeEnabled] = useState(false);
  const [fuLateFeePercent, setFuLateFeePercent] = useState(1.5);
  const [fuTemplates, setFuTemplates] = useState<Record<string, string>>({});
  const [fuSubjectTemplates, setFuSubjectTemplates] = useState<Record<string, string>>({});
  const fuInitRef = useRef(false);
  const [density, setDensity] = useState<string>('comfortable');
  const [accentColor, setAccentColor] = useState<string>('sage');
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [features, setFeaturesState] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('lance:features');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const setFeatures = useCallback((action: React.SetStateAction<Record<string, boolean>>) => {
    setFeaturesState((prev) => {
      const next = typeof action === 'function' ? (action as (p: Record<string, boolean>) => Record<string, boolean>)(prev) : action;
      try { localStorage.setItem('lance:features', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  }, []);
  const densityInitRef = useRef(false);
  const accentInitRef = useRef(false);
  const [form, setForm] = useState<UserProfile>({
    name: '',
    email: '',
    currency: DEFAULT_CURRENCY,
    hourly_rate: undefined,
    tax_rate: undefined,
    payment_terms: 14,
    writing_style: 'professional',
    writing_voice: '',
    tagline: '',
    always_include: '',
    payment_instructions: '',
    theme: 'light',
    ai_enabled: false,
  });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const formInitialized = useRef(false);
  const [section, setSection] = useState<
    'general' | 'appearance' | 'features' | 'notifications' | 'data' | 'danger-zone'
  >('general');
  const innerModalOpenRef = useRef(false);
  const NAV_ITEMS = [
    { id: 'general' as const, label: 'General' },
    { id: 'appearance' as const, label: 'Appearance' },
    { id: 'features' as const, label: 'Features' },
    { id: 'notifications' as const, label: 'Notifications' },
    { id: 'data' as const, label: 'Data & Backup' },
    { id: 'danger-zone' as const, label: 'Danger Zone', danger: true },
  ];
  const handleCloseModal = useCallback(() => {
    if (innerModalOpenRef.current) return;
    navigate(-1);
  }, [navigate]);
  // Close settings with Escape (if no inner modal is open). Also bail when ANY
  // app-level overlay is open: Escape should dismiss the topmost modal, never
  // navigate away underneath it.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || innerModalOpenRef.current) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      navigate(-1);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  useEffect(() => {
    innerModalOpenRef.current =
      showResetModal || showAssetWarning || showSchemaWarnModal || showImportSummary;
  }, [showResetModal, showAssetWarning, showSchemaWarnModal, showImportSummary]);

  useEffect(() => {
    loadProfile()
      .catch((err) => addToast(err?.toString?.() || 'Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, [loadProfile, addToast]);

  useEffect(() => {
    if (profile && !formInitialized.current) {
      formInitialized.current = true;
      setForm({
        name: profile.name || '',
        email: profile.email || '',
        currency: profile.currency || DEFAULT_CURRENCY,
        hourly_rate: profile.hourly_rate,
        tax_rate: profile.tax_rate,
        payment_terms: profile.payment_terms ?? 14,
        writing_style: profile.writing_style || 'professional',
        writing_voice: profile.writing_voice || '',
        tagline: profile.tagline || '',
        always_include: profile.always_include || '',
        payment_instructions: profile.payment_instructions || '',
        theme: profile.theme || 'light',
        ai_enabled: profile.ai_enabled ?? false,
        proposal_expiry_days: profile.proposal_expiry_days,
      });
    }
  }, [profile]);

  useEffect(() => {
    const stored = (localStorage.getItem('lance:theme') || 'default') as ThemeId;
    setActiveTheme(stored);
    Promise.all([getUnlockedThemes(), getUnlockedAchievementKeys()]).then(
      ([unlocked, achievementKeys]) => {
        const set = new Set(['default', ...unlocked]);
        setUnlockedThemes(set);
        setUnlockedAchievements(new Set(achievementKeys));
      },
    );
  }, [profile?.profession]);

  // Load density and accent from localStorage
  useEffect(() => {
    if (!densityInitRef.current) {
      densityInitRef.current = true;
      const saved = localStorage.getItem('lance:density') || 'comfortable';
      setDensity(saved);
      if (saved === 'compact') {
        document.body.classList.add('density-compact');
      }
    }
  }, []);

  useEffect(() => {
    if (!accentInitRef.current) {
      accentInitRef.current = true;
      const saved = localStorage.getItem('lance:accent-color');
      if (saved) {
        setAccentColor(saved);
        applyAccentColor(saved);
      }
    }
  }, []);

  // Load follow-up settings
  useEffect(() => {
    loadFollowUpSettings();
  }, [loadFollowUpSettings]);

  useEffect(() => {
    if (
      !fuInitRef.current &&
      followUpSettings.templates &&
      Object.keys(followUpSettings.templates).length > 0
    ) {
      fuInitRef.current = true;
      setFuEnabled(followUpSettings.enabled);
      setFuProposalDelay(followUpSettings.proposal_delay_days);
      setFuInvoiceDelay(followUpSettings.invoice_delay_days);
      setFuLateFeeEnabled(followUpSettings.lateFeeEnabled || false);
      setFuLateFeePercent(followUpSettings.lateFeePercent ?? 1.5);
      setFuTemplates({ ...followUpSettings.templates });
      setFuSubjectTemplates({ ...(followUpSettings.subject_templates || {}) });
    }
  }, [followUpSettings]);

  useEffect(() => {
    loadAutoBackupState();
  }, []);

  const loadAutoBackupState = async () => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      const rows = await db.select<{ enabled: number; frequency: string; backup_path: string }[]>(
        'SELECT enabled, frequency, backup_path FROM auto_backup_state LIMIT 1',
      );
      if (rows && rows.length > 0) {
        setAutoBackupEnabled(!!rows[0].enabled);
        setAutoBackupFreq((rows[0].frequency as 'daily' | 'weekly' | 'monthly') || 'weekly');
        setAutoBackupPath(rows[0].backup_path || '');
      }
    } catch {
      /* auto-backup state load is non-critical */
    } finally {
      setAutoBackupLoaded(true);
    }
  };

  const saveAutoBackupState = async (enabled: boolean, frequency: string, path?: string) => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute(
        `INSERT INTO auto_backup_state (id, enabled, frequency, backup_path) VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled, frequency = excluded.frequency, backup_path = excluded.backup_path`,
        [enabled ? 1 : 0, frequency, path || autoBackupPath],
      );
    } catch {
      /* non-critical */
    }
  };

  useEffect(() => {
    const isDark = form.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    const storedThemeId = (localStorage.getItem('lance:theme') || 'default') as ThemeId;
    applyTheme(getTheme(storedThemeId));
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
    [form, saveProfile, addToast],
  );

  const applyAccentColor = (colorId: string) => {
    const acc = ACCENT_COLORS.find((c) => c.id === colorId);
    if (!acc) return;
    document.body.classList.forEach((cls) => {
      if (cls.startsWith('accent-')) document.body.classList.remove(cls);
    });
    document.body.classList.add(`accent-${colorId}`);
    const root = document.documentElement;
    root.style.setProperty('--accent', acc.hex);
  };

  const handleDensityChange = (newDensity: string) => {
    setDensity(newDensity);
    if (newDensity === 'compact') {
      document.body.classList.add('density-compact');
    } else {
      document.body.classList.remove('density-compact');
    }
    localStorage.setItem('lance:density', newDensity);
  };

  const handleAccentChange = (colorId: string) => {
    setAccentColor(colorId);
    applyAccentColor(colorId);
    localStorage.setItem('lance:accent-color', colorId);
  };

  const handleExportData = async () => {
    try {
      const assetWarningSeen = localStorage.getItem('lance:export-asset-warning-seen') === 'true';
      if (!assetWarningSeen) {
        const { getDb } = await import('../db');
        let hasAssets = false;
        try {
          const db = await getDb();
          const rows = await db.select<{ cnt: number }[]>(
            'SELECT COUNT(*) as cnt FROM attachments',
          );
          hasAssets = rows && rows.length > 0 && rows[0].cnt > 0;
        } catch {
          /* non-critical */
        }
        if (hasAssets) {
          setShowAssetWarning(true);
          return;
        }
      }

      await doExportData();
    } catch {
      addToast('Export failed', 'error');
    }
  };

  const handleDismissAssetWarning = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('lance:export-asset-warning-seen', 'true');
    }
    setShowAssetWarning(false);
  };

  const handleAssetWarningContinue = () => {
    setShowAssetWarning(false);
    doExportData();
  };

  const doExportData = async () => {
    try {
      const { fetchBackupTables, fetchAttachmentBlobs, ATTACHMENT_BLOB_TABLE } =
        await import('../utils/backup');
      const data = await fetchBackupTables();
      // Portable file bytes ride along (capped); oversized files travel as
      // metadata with a note instead of silently bloating the backup.
      const { blobs, skipped } = await fetchAttachmentBlobs();
      if (blobs.length > 0) data[ATTACHMENT_BLOB_TABLE] = blobs;

      const { getRuntimeVersion } = await import('../lib/version');
      const APP_VERSION = await getRuntimeVersion();
      const schemaVersion = getCurrentSchemaVersion();
      const envelope = createExportEnvelope(data, APP_VERSION, schemaVersion);

      const json = JSON.stringify(envelope, null, 2);
      const filename = `Lance_Backup_${todayLocalISO()}.json`;
      if (isTauriApp()) {
        const filePath = await save({ defaultPath: filename });
        if (!filePath) return;
        await writeFile(filePath, new TextEncoder().encode(json));
      } else {
        const { downloadTextFile } = await import('../utils/yearSummary');
        downloadTextFile(filename, json, 'application/json;charset=utf-8');
      }
      addToast(
        skipped > 0
          ? `Data exported successfully · ${skipped} large file${skipped === 1 ? '' : 's'} travel as metadata only`
          : 'Data exported successfully',
        'success',
      );
    } catch {
      addToast('Export failed', 'error');
    }
  };

  const importFileRef = useRef<HTMLInputElement | null>(null);

  const handleImportData = async () => {
    // Browser mode has no native file dialog: fall back to a file input.
    if (!isTauriApp()) {
      importFileRef.current?.click();
      return;
    }
    try {
      const filePath = await open({
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!filePath) return;
      const content = await readTextFile(filePath);
      await ingestImportText(content);
    } catch {
      addToast('Import failed · could not read file', 'error');
    }
  };

  const handleImportFilePicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Reject on the reported size BEFORE reading. The 50MB check downstream runs
    // on an already-materialised string, so a 900MB file would exhaust the
    // renderer heap during file.text() before anything validated it.
    if (file.size > MAX_IMPORT_BYTES) {
      addToast(`Import failed · file exceeds ${MAX_IMPORT_MB}MB limit`, 'error');
      return;
    }
    try {
      await ingestImportText(await file.text());
    } catch {
      addToast('Import failed · could not read file', 'error');
    }
  };

  const ingestImportText = async (content: string) => {
    try {
      const bytes = new TextEncoder().encode(content);
      if (bytes.length > MAX_IMPORT_BYTES) {
        addToast(`Import failed · file exceeds ${MAX_IMPORT_MB}MB limit`, 'error');
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        addToast('Import failed · file is not valid JSON', 'error');
        return;
      }

      const validation = validateImportEnvelope(parsed);
      if (!validation.valid) {
        addToast(`Import failed · ${validation.error}`, 'error');
        return;
      }

      if (!validation.envelope) {
        addToast('Import failed · invalid backup format', 'error');
        return;
      }

      const envelope = validation.envelope;
      const currentSchema = getCurrentSchemaVersion();

      if (envelope.schema_version > currentSchema) {
        setSchemaWarnData({ from: envelope.schema_version, to: currentSchema });
        setPendingImportEnvelope(envelope);
        setShowSchemaWarnModal(true);
        return;
      }

      if (envelope.schema_version < currentSchema) {
        await logVersionEvent('import_schema_mismatch', {
          backup_version: envelope.schema_version,
          app_version: currentSchema,
          backup_app_version: envelope.version,
        });
      }

      proceedToImportSummary(envelope);
    } catch {
      addToast('Import failed · check file format', 'error');
    }
  };

  const proceedWithSchemaWarning = () => {
    setShowSchemaWarnModal(false);
    if (pendingImportEnvelope) {
      proceedToImportSummary(pendingImportEnvelope);
      setPendingImportEnvelope(null);
    }
  };

  const proceedToImportSummary = (envelope: BackupEnvelope) => {
    const validation = validateImportEnvelope(envelope);
    setImportSummaryData(validation);
    setImportReplaceMode(false);
    setImportReplaceConfirm('');
    setShowImportSummary(true);
  };

  const handleConfirmImport = async () => {
    if (importReplaceMode && importReplaceConfirm !== 'REPLACE') {
      return;
    }

    setImportPending(true);
    setShowImportSummary(false);

    try {
      if (!importSummaryData?.envelope) {
        addToast('Import failed · no data to import', 'error');
        setImportPending(false);
        return;
      }

      const envelope = importSummaryData.envelope;

      const mode = importReplaceMode ? 'replace' : 'additive';
      // Blob materializer: exported file bytes land back in real storage.
      // Desktop writes into the assets folder; browser restores into
      // IndexedDB. Rows always import, only bytes depend on this.
      const materialize = async (id: string, bytes: Uint8Array, mime: string, filename: string) => {
        if (isTauriApp()) {
          const { writeFile } = await import('@tauri-apps/plugin-fs');
          const { join } = await import('@tauri-apps/api/path');
          const dir = await getAssetsDir();
          const target = await join(dir, `${id}-${sanitizeBlobName(filename)}`);
          await writeFile(target, bytes);
          return target;
        }
        const { putAssetFile } = await import('../demo/assetStore');
        return putAssetFile(id, new Blob([bytes as unknown as BlobPart], { type: mime }));
      };
      const result = await performImport(envelope, mode, materialize);

      if (result.imported === 0 && result.skipped === 0 && result.failed > 0) {
        addToast('Import failed · no data was changed', 'error');
      } else {
        const parts: string[] = [];
        if (result.imported > 0)
          parts.push(`Imported: ${result.imported} records across ${result.tablesWritten} tables`);
        if (result.skipped > 0) parts.push(`Skipped: ${result.skipped} duplicates`);
        if (result.blobsRestored > 0) parts.push(`Files restored: ${result.blobsRestored}`);
        if (result.blobsSkipped > 0)
          parts.push(
            `${result.blobsSkipped} large file${result.blobsSkipped === 1 ? '' : 's'} kept as metadata only`,
          );
        if (result.failed > 0) {
          parts.push(`Failed: ${result.failed} records`);
          if (result.errors.length > 0) {
            parts.push(`(${result.errors.slice(0, 3).join('; ')})`);
          }
        }
        addToast(parts.join('\n'), result.failed > 0 ? 'error' : 'success', 6000);
      }

      await loadProfile();
    } catch (err) {
      addToast(`Import failed · ${(err as Error)?.message || 'no data was changed'}`, 'error');
    } finally {
      setImportPending(false);
    }
  };

  const handleClearSampleData = async () => {
    try {
      await clearSampleData();
      setIsSeeded(false);
      addToast('Sample data cleared.', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch {
      addToast('Failed to clear sample data', 'error');
    }
  };

  const handleResetData = async () => {
    try {
      // One wipe path for both modes: the db layer is real SQLite in the
      // app and a localStorage mock in the browser. Children first
      // (reverse import order); config tables are preserved.
      const { getDb } = await import('../db');
      const { BACKUP_TABLES } = await import('../utils/backup');
      const db = await getDb();
      await db.execute('BEGIN TRANSACTION');
      try {
        for (const table of [...BACKUP_TABLES].reverse()) {
          try {
            await db.execute(`DELETE FROM ${table}`);
          } catch {
            /* table may not exist yet */
          }
        }
        try {
          await db.execute('DELETE FROM share_tokens');
        } catch {
          /* browser-only table */
        }
        await db.execute('COMMIT');
      } catch {
        try {
          await db.execute('ROLLBACK');
        } catch {
          /* ignore */
        }
        throw new Error('Reset failed');
      }
      // Browser-derived caches the tables do not cover. Achievements and
      // trash reference deleted rows (stale badges, restorable ghosts), and
      // a pending tour or timer config would point at nothing. Identity and
      // onboarding flags (theme, prefs, has-launched, onboarding-completed)
      // are deliberately preserved.
      try {
        localStorage.removeItem('lance:store:pending_follow_ups');
        localStorage.removeItem('lance:store:follow_up_logs');
        localStorage.removeItem('lance:achievements');
        localStorage.removeItem('lance:trash');
        localStorage.removeItem('lance:tour-pending');
        localStorage.removeItem('lance:last-timer-config');
        // Attached file BYTES live in IndexedDB, not in any table, so the
        // DELETEs above never touched them: a user resetting on a shared
        // machine was left with the client's PDFs on disk. sessionStorage held
        // the import-classification banner.
        const { clearAssetFiles } = await import('../demo/assetStore');
        await clearAssetFiles();
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith('lance')) sessionStorage.removeItem(key);
        }
      } catch {
        /* private mode */
      }
      setShowResetModal(false);
      addToast('All data has been reset', 'info');
      setTimeout(() => window.location.reload(), 500);
    } catch {
      addToast('Reset failed', 'error');
    }
  };

  // Section prop bag: Settings-local state + shell handlers only. Store data
  // is read by sections directly. Same values the inline JSX saw before.
  const bag: SettingsBag = {
    form,
    setForm,
    autoSave,
    saved,
    setSaved,
    setShowResetModal,
    setShowClearSampleConfirm,
    isSeeded,
    density,
    handleDensityChange,
    accentColor,
    handleAccentChange,
    activeTheme,
    setActiveTheme,
    unlockedThemes,
    unlockedAchievements,
    fuEnabled,
    setFuEnabled,
    fuProposalDelay,
    setFuProposalDelay,
    fuInvoiceDelay,
    setFuInvoiceDelay,
    fuLateFeeEnabled,
    setFuLateFeeEnabled,
    fuLateFeePercent,
    setFuLateFeePercent,
    fuTemplates,
    setFuTemplates,
    fuSubjectTemplates,
    setFuSubjectTemplates,
    autoBackupEnabled,
    setAutoBackupEnabled,
    autoBackupFreq,
    setAutoBackupFreq,
    autoBackupPath,
    setAutoBackupPath,
    features,
    setFeatures,
    autoBackupLoaded,
    saveAutoBackupState,
    handleExportData,
    handleImportData,
    handleImportFilePicked,
    importFileRef,
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );

  return (
    <>
      <Modal open={true} onClose={handleCloseModal} title="Settings" size="full">
        <div className="flex h-full">
          {/* Sidebar */}
          <aside
            aria-label="Settings sections"
            className="w-[200px] shrink-0 border-r border-[var(--border-color)] p-4"
          >
            <nav aria-label="Settings section links" className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-sm transition-colors ${
                    section === item.id
                      ? item.danger
                        ? 'bg-[var(--danger-bg)] text-[var(--danger)] font-medium'
                        : 'bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] font-medium'
                      : item.danger
                        ? 'text-[var(--danger)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {section === 'general' && <GeneralSection bag={bag} />}

            {section === 'appearance' && <AppearanceSection bag={bag} />}

            {section === 'features' && <FeatureSettings bag={bag} />}

            {section === 'notifications' && <NotificationsSection bag={bag} />}

            {section === 'data' && <DataSection bag={bag} />}

            {section === 'danger-zone' && <DangerSection bag={bag} />}
          </div>
        </div>
      </Modal>

      {/* Reset all data modal */}
      <Modal
        open={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setResetConfirmText('');
        }}
        title="Reset all data"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-sm bg-[var(--danger-bg)]">
            <AlertTriangle size={18} className="text-[var(--danger)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--danger)]">This cannot be undone.</p>
              <p className="text-xs text-[var(--danger)]/80 mt-1">
                All clients, projects, proposals, contracts, invoices, time entries, and expenses
                will be permanently deleted.
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              Type{' '}
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                Lance, The Tool for Freelancers
              </span>{' '}
              to confirm:
            </p>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="Lance, The Tool for Freelancers"
              className="w-full px-3 py-2 text-sm rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/20"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowResetModal(false);
                setResetConfirmText('');
              }}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                handleResetData();
                setResetConfirmText('');
              }}
              size="sm"
              disabled={
                resetConfirmText.trim().replace(/\s+/g, ' ') !== 'Lance, The Tool for Freelancers'
              }
            >
              Delete everything
            </Button>
          </div>
        </div>
      </Modal>

      {/* Asset warning modal */}
      <Modal
        open={showAssetWarning}
        onClose={() => setShowAssetWarning(false)}
        title="Backup your files"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-sm text-[var(--text-primary)] leading-relaxed">
            <p className="mb-3">
              Your Lance backup includes all your data · clients, projects, invoices, and everything
              else.
            </p>
            <div className="flex items-start gap-2 p-3 rounded-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle
                size={16}
                className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  Not included: your attached files in Assets.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  To back up your files, also copy: <br />
                  <code className="text-[11px] bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">
                    ~/Documents/Lance/Assets/
                  </code>
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  This folder contains all files you've attached to clients and projects.
                </p>
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              onChange={(e) => {
                if (e.target.checked) {
                  handleDismissAssetWarning(true);
                  setShowAssetWarning(false);
                }
              }}
              className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-ink,var(--accent))] focus:ring-[var(--accent)]"
            />
            <span className="text-xs text-[var(--text-secondary)]">Got it, don't show again</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAssetWarning(false)} size="sm">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAssetWarningContinue} size="sm">
              Continue export
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schema version warning modal */}
      <Modal
        open={showSchemaWarnModal}
        onClose={() => {
          setShowSchemaWarnModal(false);
          setPendingImportEnvelope(null);
        }}
        title="Newer backup version"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-sm bg-amber-50 dark:bg-amber-900/20">
            <AlertTriangle
              size={18}
              className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                This backup was made with a newer version of Lance.
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Backup schema v{schemaWarnData?.from} &gt; app schema v{schemaWarnData?.to}. Some
                data may not import correctly.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSchemaWarnModal(false);
                setPendingImportEnvelope(null);
              }}
              size="sm"
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={proceedWithSchemaWarning} size="sm">
              Import anyway
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import summary modal */}
      <Modal
        open={showImportSummary}
        onClose={() => setShowImportSummary(false)}
        title="Import summary"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-sm text-[var(--text-primary)]">
            <p className="mb-2">
              Found:{' '}
              <span className="font-medium">
                {importSummaryData?.tableCounts
                  ? formatTableCounts(importSummaryData.tableCounts)
                  : '...'}
              </span>
            </p>
          </div>

          <div className="p-3 rounded-sm bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-secondary)]">
              {importReplaceMode
                ? 'REPLACE all existing data with the imported data. This cannot be undone.'
                : 'This will ADD to your existing data. Duplicate records (same ID) will be skipped.'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={importReplaceMode}
                  onChange={(e) => {
                    setImportReplaceMode(e.target.checked);
                    setImportReplaceConfirm('');
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-colors peer-checked:bg-red-500" />
              </label>
              <div>
                <p
                  className={`text-sm font-medium ${importReplaceMode ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}
                >
                  {importReplaceMode ? 'Replace all data' : 'Add to existing data'}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {importReplaceMode
                    ? 'Destructive · removes all current data first'
                    : 'Default · safe'}
                </p>
              </div>
            </div>
          </div>

          {importReplaceMode && (
            <div>
              <label className="block text-xs font-medium text-[var(--danger)] mb-1">
                Type REPLACE to confirm
              </label>
              <input
                type="text"
                value={importReplaceConfirm}
                onChange={(e) => setImportReplaceConfirm(e.target.value)}
                placeholder="REPLACE"
                className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-700 rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowImportSummary(false)} size="sm">
              Cancel
            </Button>
            <Button
              variant={importReplaceMode ? 'danger' : 'primary'}
              onClick={handleConfirmImport}
              loading={importPending}
              disabled={importReplaceMode && importReplaceConfirm !== 'REPLACE'}
              size="sm"
            >
              {importReplaceMode ? 'Replace & import' : 'Import'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showClearSampleConfirm}
        onClose={() => setShowClearSampleConfirm(false)}
        onConfirm={async () => {
          setShowClearSampleConfirm(false);
          await handleClearSampleData();
        }}
        title="Clear Sample Data"
        message="Remove all records tagged as sample data and reload? This cannot be undone."
        confirmLabel="Clear sample data"
        variant="danger"
      />
    </>
  );
}






