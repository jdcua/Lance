import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { isTauri as isTauriApp } from '../utils/tauri';
import { trialDaysRemaining } from '../lib/trial';
import { getFeatureFlags } from '../lib/constants';
import { resolveDunningTone } from '../utils/followUpTemplates';
import { getCurrencySymbol } from '../lib/currency';
import { setPref, usePrefs, type MotionPref } from '../lib/prefs';
import { PRO_PRICES } from '../lib/pricing';
import { getTrialValue } from '../utils/trialValue';
import { relativeDate } from '../utils/format';
import {
  loadTrash,
  removeTrashEntry,
  clearTrash,
  TRASH_RETENTION_DAYS,
  type TrashEntry,
} from '../utils/trash';
import { eventCounts, getTelemetryEvents, clearTelemetry } from '../utils/telemetry';
import { downloadTextFile } from '../utils/yearSummary';
import { formatCurrency, todayLocalISO } from '../utils/format';
import type { UserProfile, ExportTemplate } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PrefToggle from '../components/ui/PrefToggle';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToasts } from '../store/toastStore';
import { save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { openCheckout } from '../utils/tauri';
import {
  Check,
  Upload,
  Download,
  AlertTriangle,
  Trash2,
  Lock,
  Sparkles,
  ArrowRight,
  FileText,
  FolderOpen,
  X,
} from 'lucide-react';
import { THEMES, applyTheme, getTheme } from '../themes/themes';
import type { ThemeId } from '../themes';
import { PROFESSION_THEME, type Profession } from '../themes';
import { getArchetype, ARCHETYPE_LIST } from '../archetypes';
import { getUnlockedThemes, getUnlockedAchievementKeys } from '../achievements/checker';
import { TEMPLATE_LABELS, DEFAULT_SUBJECT_TEMPLATES } from '../utils/followUpTemplates';
import { clearSampleData } from '../utils/seedData';
import {
  createExportEnvelope,
  validateImportEnvelope,
  performImport,
  formatTableCounts,
  logVersionEvent,
  sanitizeBlobName,
} from '../utils/backup';
import type { BackupEnvelope, ImportValidationResult } from '../utils/backup';
import { isTrial as isTrialBuild } from '../demo/isDemo';
import TestModePanel from '../demo/TestModePanel';
import { getCurrentSchemaVersion } from '../db';
import { sanitizeInput, sanitizeText } from '../utils/sanitize';

const currencies = ['CAD', 'USD', 'GBP', 'EUR', 'AUD'];
const writingStyles = ['professional', 'warm', 'direct', 'bold'];

const ACCENT_COLORS = [
  { id: 'sage', label: 'Sage', hex: '#1EC98A' },
  { id: 'amber', label: 'Amber', hex: '#F59E0B' },
  { id: 'rose', label: 'Rose', hex: '#E11D48' },
  { id: 'sky', label: 'Sky', hex: '#0EA5E9' },
  { id: 'violet', label: 'Violet', hex: '#8B5CF6' },
  { id: 'teal', label: 'Teal', hex: '#14B8A6' },
  { id: 'orange', label: 'Orange', hex: '#F97316' },
  { id: 'slate', label: 'Slate', hex: '#64748B' },
];

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
  const navigate = useNavigate();
  const {
    profile,
    loadProfile,
    saveProfile,
    isLicensed,
    activateLicense,
    removeLicense,
    followUpSettings,
    loadFollowUpSettings,
    saveFollowUpSettings,
    getActiveTier,
    getAssetsDir,
    getImportsDir,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const prefs = usePrefs();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [licenseActivating, setLicenseActivating] = useState(false);
  const [licenseSuccess, setLicenseSuccess] = useState(false);
  const [showRemoveLicenseConfirm, setShowRemoveLicenseConfirm] = useState(false);
  const [showClearSampleConfirm, setShowClearSampleConfirm] = useState(false);
  const licenseInputRef = useRef<HTMLInputElement>(null);
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
  const densityInitRef = useRef(false);
  const accentInitRef = useRef(false);
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
    payment_instructions: '',
    theme: 'light',
    ai_enabled: false,
  });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const formInitialized = useRef(false);
  const [section, setSection] = useState<
    'general' | 'appearance' | 'notifications' | 'data' | 'danger-zone'
  >('general');
  const innerModalOpenRef = useRef(false);
  const NAV_ITEMS = [
    { id: 'general' as const, label: 'General' },
    { id: 'appearance' as const, label: 'Appearance' },
    { id: 'notifications' as const, label: 'Notifications' },
    { id: 'data' as const, label: 'Data & Backup' },
    { id: 'danger-zone' as const, label: 'Danger Zone', danger: true },
  ];
  const handleCloseModal = useCallback(() => {
    if (innerModalOpenRef.current) return;
    navigate(-1);
  }, [navigate]);
  // Close settings with Escape (if no inner modal is open). Also bail when ANY
  // app-level overlay (upgrade modal, splash, walkthrough, changelog, import…)
  // is open: Escape should dismiss the topmost modal, never navigate away
  // underneath it (previously Escape closed the upgrade modal AND left
  // Settings in a single keypress).
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
      showResetModal ||
      showLicenseModal ||
      showAssetWarning ||
      showSchemaWarnModal ||
      showImportSummary ||
      showRemoveLicenseConfirm;
  }, [
    showResetModal,
    showLicenseModal,
    showAssetWarning,
    showSchemaWarnModal,
    showImportSummary,
    showRemoveLicenseConfirm,
  ]);

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
        currency: profile.currency || 'CAD',
        hourly_rate: profile.hourly_rate,
        tax_rate: profile.tax_rate,
        payment_terms: profile.payment_terms ?? 14,
        writing_style: profile.writing_style || 'professional',
        writing_voice: profile.writing_voice || '',
        tagline: profile.tagline || '',
        always_include: profile.always_include || '',
        payment_instructions: profile.payment_instructions || '',
        theme: profile.theme || 'light',
        license_key: profile.license_key,
        licensed_at: profile.licensed_at,
        ai_enabled: profile.ai_enabled ?? false,
        proposal_expiry_days: profile.proposal_expiry_days,
      });
    }
  }, [profile]);

  useEffect(() => {
    const stored = (localStorage.getItem('lance:theme') || 'default') as ThemeId;
    setActiveTheme(stored);
    if (isLicensed) {
      setUnlockedThemes(
        new Set(['default', 'studio', 'terminal', 'craft', 'motion', 'lens', 'scale']),
      );
    } else {
      Promise.all([getUnlockedThemes(), getUnlockedAchievementKeys()]).then(
        ([unlocked, achievementKeys]) => {
          const set = new Set(['default', ...unlocked]);
          const prof = profile?.profession as Profession | undefined;
          if (prof && PROFESSION_THEME[prof]) {
            set.add(PROFESSION_THEME[prof]);
          }
          setUnlockedThemes(set);
          setUnlockedAchievements(new Set(achievementKeys));
        },
      );
    }
  }, [isLicensed, profile?.profession]);

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
    try {
      await ingestImportText(await file.text());
    } catch {
      addToast('Import failed · could not read file', 'error');
    }
  };

  const ingestImportText = async (content: string) => {
    try {
      const bytes = new TextEncoder().encode(content);
      if (bytes.length > 50 * 1024 * 1024) {
        addToast('Import failed · file exceeds 50MB limit', 'error');
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
      // Desktop writes into the assets folder; browser/trial restores into
      // IndexedDB. Rows always import — only bytes depend on this.
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

  const handleActivateLicense = async () => {
    const key = licenseKey.trim().toUpperCase();
    if (!key) {
      setLicenseError('Enter a license key.');
      licenseInputRef.current?.focus();
      return;
    }
    setLicenseActivating(true);
    setLicenseError('');
    try {
      const success = await activateLicense(key);
      if (success) {
        setLicenseSuccess(true);
        addToast('Lance is now licensed. All themes unlocked.', 'unlock');
        setUnlockedThemes(
          new Set(['default', 'studio', 'terminal', 'craft', 'motion', 'lens', 'scale']),
        );
      } else {
        setLicenseError('Invalid license key. Check your key and try again.');
        licenseInputRef.current?.focus();
      }
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to activate license', 'error');
      setLicenseError('An error occurred. Please try again.');
    } finally {
      setLicenseActivating(false);
    }
  };

  const handleRemoveLicense = async () => {
    setShowRemoveLicenseConfirm(false);
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

  const inputClass =
    'w-full px-3 py-2 text-sm border border-[var(--border-color)]  rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 bg-[var(--bg-card)]  ';
  const labelClass =
    'block text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-1';

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
                  className={`w-full text-left px-3 py-2 text-sm rounded-[8px] transition-colors ${
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
            {section === 'general' && (
              <>
                {/* Profile section header */}
                <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-4">
                  Profile
                </div>

                {/* License */}
                <Card className="mb-6">
                  <SectionHead title="License" isSaved={saved.has('License')} />
                  {isLicensed ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-[var(--accent-ink,var(--accent))]" />
                        <span className="text-sm font-medium text-[var(--accent-ink,var(--accent))]">
                          Licensed
                        </span>
                        <span className="text-[10px] text-[var(--accent-ink,var(--accent))] bg-[var(--accent-bg)] px-1.5 py-0.5 rounded-full">
                          Licensed
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-2">
                        All themes unlocked. Thank you for supporting Lance.
                      </p>
                      {form.licensed_at && (
                        <p className="text-xs text-[var(--text-tertiary)] mb-1">
                          Licensed since {new Date(form.licensed_at).toLocaleDateString()}.
                        </p>
                      )}
                      <p className="text-xs text-[var(--text-tertiary)] mb-4">
                        Studio, Terminal, Craft, Motion, Lens, and Scale themes are unlocked.
                      </p>
                      <button
                        onClick={() => setShowRemoveLicenseConfirm(true)}
                        className="text-xs text-[var(--text-tertiary)] hover:text-[var(--danger)] underline transition-colors"
                      >
                        Remove license
                      </button>
                    </div>
                  ) : (
                    <div>
                      {getActiveTier() === 'trial' && (
                        <p className="text-sm text-[var(--text-primary)] mb-2">
                          Pro trial:{' '}
                          <strong className="text-[var(--accent-ink,var(--accent))]">
                            {trialDaysRemaining(profile?.trial_started_at)} days left
                          </strong>
                          . Everything is unlocked. Keep it with a license before it ends.
                          {getTrialValue().total > 0 && (
                            <span className="block text-xs text-[var(--text-secondary)] mt-1">
                              It has already earned you {formatCurrency(getTrialValue().total)}.
                            </span>
                          )}
                        </p>
                      )}
                      {getActiveTier() === 'expired' && (
                        <p className="text-sm text-[var(--text-primary)] mb-2">
                          Your Pro trial ended. Your data is intact and Core stays free forever.
                          Resubscribe anytime to unlock Pro depth again.
                        </p>
                      )}
                      <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-4">
                        Lance is free to use. A license removes the launch screen and unlocks all
                        themes immediately.
                      </p>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="primary"
                          onClick={() => {
                            setLicenseKey('');
                            setLicenseError('');
                            setShowLicenseModal(true);
                          }}
                          size="sm"
                        >
                          Enter license key
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            openCheckout('yearly').then((ok) => {
                              if (!ok) addToast('Checkout is not configured in this build', 'info');
                            });
                          }}
                          size="sm"
                        >
                          Get Pro (${PRO_PRICES.yearly}/yr)
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Your profile */}
                <Card className="mb-6">
                  <SectionHead title="Your profile" isSaved={saved.has('Your profile')} />
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Full name</label>
                      <input
                        type="text"
                        maxLength={100}
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
                        maxLength={254}
                        value={form.email || ''}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        onBlur={() => {
                          const email = (form.email || '').trim();
                          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                            addToast('Please enter a valid email address', 'error');
                            return;
                          }
                          autoSave({ email }, 'Your profile');
                        }}
                        placeholder="you@example.com"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Default currency</label>
                      <select
                        value={form.currency}
                        aria-label="Default currency"
                        onChange={(e) => autoSave({ currency: e.target.value }, 'Your profile')}
                        className={inputClass}
                      >
                        {currencies.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                        You can override this per-client or per-invoice.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Rates */}
                <Card className="mb-6">
                  <SectionHead title="Rates" isSaved={saved.has('Rates')} />
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Default hourly rate</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)]">
                          {getCurrencySymbol(form.currency || profile?.currency || 'CAD')}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={10000}
                          step="0.01"
                          value={form.hourly_rate ?? ''}
                          onChange={(e) => {
                            const v = e.target.value ? parseFloat(e.target.value) : 0;
                            setForm({
                              ...form,
                              hourly_rate: Number.isFinite(v) ? Math.max(0, Math.min(10000, v)) : 0,
                            });
                          }}
                          onBlur={() => autoSave({ hourly_rate: form.hourly_rate }, 'Rates')}
                          placeholder="0.00"
                          className={`${inputClass} pl-7`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Default VAT / sales tax (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={form.tax_rate ?? ''}
                        onChange={(e) => {
                          const v = e.target.value ? parseFloat(e.target.value) : 0;
                          setForm({
                            ...form,
                            tax_rate: Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0,
                          });
                        }}
                        onBlur={() => autoSave({ tax_rate: form.tax_rate }, 'Rates')}
                        placeholder="0"
                        className={inputClass}
                      />
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                        Invoice math only — applied to new invoices as entered. Not tax advice.
                      </p>
                    </div>
                    <div>
                      <label className={labelClass}>Payment terms (days)</label>
                      <input
                        type="number"
                        min={0}
                        max={365}
                        aria-label="Payment terms (days)"
                        value={form.payment_terms ?? 14}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          setForm({
                            ...form,
                            payment_terms: Number.isFinite(v) ? Math.max(0, Math.min(365, v)) : 14,
                          });
                        }}
                        onBlur={() => autoSave({ payment_terms: form.payment_terms }, 'Rates')}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className={labelClass}>Payment instructions (printed on invoices)</label>
                    <textarea
                      value={form.payment_instructions || ''}
                      onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })}
                      onBlur={() =>
                        autoSave({ payment_instructions: form.payment_instructions }, 'Rates')
                      }
                      placeholder={
                        'e.g. Bank transfer to First National, routing 123456, account 987654321. Or pay online at example.com/pay.'
                      }
                      rows={3}
                      className={`${inputClass} resize-none leading-relaxed`}
                    />
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                      Bank details, payment links, or anything your clients need to pay you. Stays
                      on your machine, shown only on your invoices.
                    </p>
                  </div>
                </Card>

                {/* Proposal voice */}
                <Card className="mb-6">
                  <SectionHead title="Proposal voice" isSaved={saved.has('Proposal voice')} />
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Writing style</label>
                      <select
                        value={form.writing_style || 'professional'}
                        aria-label="Writing style"
                        onChange={(e) =>
                          autoSave({ writing_style: e.target.value }, 'Proposal voice')
                        }
                        className={inputClass}
                      >
                        {writingStyles.map((s) => (
                          <option key={s} value={s}>
                            {labelForStyle(s)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Writing voice description</label>
                      <textarea
                        maxLength={1000}
                        value={form.writing_voice || ''}
                        onChange={(e) => setForm({ ...form, writing_voice: e.target.value })}
                        onBlur={() =>
                          autoSave({ writing_voice: form.writing_voice }, 'Proposal voice')
                        }
                        placeholder="e.g. I'm a senior full-stack developer who explains things clearly and avoids jargon"
                        rows={2}
                        className={`${inputClass} resize-none`}
                      />
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                        Describe your voice and expertise. This helps the AI write proposals that
                        sound like you.
                      </p>
                    </div>
                    <div>
                      <label className={labelClass}>Tagline / positioning</label>
                      <input
                        type="text"
                        maxLength={200}
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
                        maxLength={2000}
                        value={form.always_include || ''}
                        onChange={(e) => setForm({ ...form, always_include: e.target.value })}
                        onBlur={() =>
                          autoSave({ always_include: form.always_include }, 'Proposal voice')
                        }
                        placeholder="Anything you always want in proposals..."
                        rows={3}
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  </div>
                </Card>

                {/* Proposal defaults */}
                <Card className="mb-6">
                  <SectionHead title="Proposal defaults" isSaved={saved.has('Proposal defaults')} />
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Proposals expire after</label>
                      <select
                        value={form.proposal_expiry_days ?? ''}
                        aria-label="Proposals expire after"
                        onChange={(e) => {
                          const v = e.target.value ? parseInt(e.target.value) : undefined;
                          setForm({ ...form, proposal_expiry_days: v });
                          autoSave({ proposal_expiry_days: v }, 'Proposal defaults');
                        }}
                        className={inputClass}
                      >
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="">Never</option>
                      </select>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                        Sent proposals will automatically expire after this period.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Profession / Archetype */}
                <Card className="mb-6">
                  <SectionHead title="Profession" isSaved={saved.has('Profession')} />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text-primary)]">Your Archetype</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {(() => {
                            const arch = getArchetype(profile?.profession || 'default');
                            return `${arch.emoji} ${arch.label}`;
                          })()}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          document.dispatchEvent(new CustomEvent('lance:open-archetype-picker'));
                        }}
                      >
                        Change <ArrowRight size={14} />
                      </Button>
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
                      Your archetype customizes your sidebar layout, dashboard metrics, insights
                      panels, and rate label. You can switch anytime · your data stays the same.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ARCHETYPE_LIST.filter((a) => a.id !== 'default' && a.id !== 'custom')
                        .slice(0, 8)
                        .map((archetype) => (
                          <button
                            key={archetype.id}
                            onClick={async () => {
                              const theme = getTheme(archetype.theme);
                              applyTheme(theme);
                              localStorage.setItem('lance:theme', archetype.theme);
                              if (profile) {
                                try {
                                  await saveProfile({ ...profile, profession: archetype.id });
                                  addToast(`Switched to ${archetype.label}`, 'success');
                                } catch {
                                  /* archetype switch is non-critical */ addToast(
                                    'Failed to switch',
                                    'error',
                                  );
                                }
                              }
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-xs text-left transition-colors hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] bg-[var(--bg-card)]"
                          >
                            <span>{archetype.emoji}</span>
                            <span className="text-[var(--text-primary)] truncate">
                              {archetype.label}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                </Card>
              </>
            )}

            {section === 'appearance' && (
              <>
                {/* Preferences section header */}
                <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-4">
                  Preferences
                </div>

                {/* Appearance (light/dark, density) */}
                <Card className="mb-6">
                  <SectionHead title="Appearance" isSaved={saved.has('Appearance')} />
                  <div className="flex items-center gap-3 mb-4">
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
                  {unlockedAchievements.has('three_proposals') && (
                    <div className="pt-3 border-t border-[var(--border-color)]">
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                        Layout density
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleDensityChange('comfortable')}
                          className={`px-4 py-2 text-sm rounded-[8px] border transition-colors ${
                            density === 'comfortable'
                              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]'
                          }`}
                        >
                          Comfortable
                        </button>
                        <button
                          onClick={() => handleDensityChange('compact')}
                          className={`px-4 py-2 text-sm rounded-[8px] border transition-colors ${
                            density === 'compact'
                              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]'
                          }`}
                        >
                          Compact
                        </button>
                      </div>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
                        Compact mode reduces row heights, padding, and spacing across the interface.
                      </p>
                    </div>
                  )}
                </Card>

                {/* Themes */}
                <Card className="mb-6">
                  <SectionHead title="Themes" isSaved={saved.has('Themes')} />
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
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isActive ? 'border-[var(--accent)]' : 'border-[var(--neutral-border)]'
                            }`}
                          >
                            {isActive && (
                              <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium ${isUnlocked ? 'text-[var(--text-primary)] ' : 'text-[var(--text-tertiary)]'}`}
                            >
                              {theme.name}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                              {theme.description}
                            </p>
                          </div>
                          {isUnlocked ? (
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              {theme.name}
                            </span>
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

                {/* Accent color */}
                {unlockedAchievements.has('five_clients') && (
                  <Card className="mb-6">
                    <SectionHead title="Accent color" isSaved={saved.has('Accent color')} />
                    <p className="text-xs text-[var(--text-tertiary)] mb-3">
                      Choose a color that personalizes buttons, badges, progress bars, and metric
                      cards.
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => handleAccentChange(color.id)}
                          className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-[8px] border transition-colors ${
                            accentColor === color.id
                              ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                              : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)]'
                          }`}
                        >
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-[10px] text-[var(--text-primary)]">
                            {color.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}

            {section === 'notifications' && (
              <>
                {/* Preferences section header */}
                <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-4">
                  Notifications
                </div>

                {/* AI features */}
                <Card className="mb-6">
                  <SectionHead title="AI features" isSaved={saved.has('AI features')} />
                  <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-4">
                    AI-assisted writing, scope warnings, and pricing analysis run locally on your
                    machine. No data is sent anywhere.
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button
                      onClick={() => autoSave({ ai_enabled: !form.ai_enabled }, 'AI features')}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        form.ai_enabled ? 'bg-[var(--accent)]' : 'bg-[var(--neutral-border)]'
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

                {/* Personalize */}
                <Card className="mb-6">
                  <SectionHead title="Personalize" isSaved={saved.has('Personalize')} />
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Motion, glow, badges and nudges. Everything here is local and applies
                      instantly.
                    </p>
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">Motion</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5 mb-2">
                        Auto follows your operating system setting.
                      </p>
                      <div
                        className="inline-flex gap-1 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1"
                        role="group"
                        aria-label="Motion preference"
                      >
                        {(['auto', 'full', 'off'] as MotionPref[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              setPref('motion', m);
                              setSaved((prev) => new Set([...prev, 'Personalize']));
                            }}
                            aria-pressed={prefs.motion === m}
                            className={`px-3 py-1.5 text-xs font-medium rounded-[7px] capitalize transition-colors ${
                              prefs.motion === m
                                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {m === 'auto' ? 'Auto' : m === 'full' ? 'Full' : 'Off'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <PrefToggle
                      checked={prefs.glow}
                      onChange={(v) => {
                        setPref('glow', v);
                        setSaved((prev) => new Set([...prev, 'Personalize']));
                      }}
                      label="Ambient glow"
                      hint="Soft accent wash behind app content"
                    />
                    <PrefToggle
                      checked={prefs.sparklines}
                      onChange={(v) => {
                        setPref('sparklines', v);
                        setSaved((prev) => new Set([...prev, 'Personalize']));
                      }}
                      label="KPI sparklines"
                      hint="Six-month trend lines under dashboard metrics"
                    />
                    <PrefToggle
                      checked={prefs.badges}
                      onChange={(v) => {
                        setPref('badges', v);
                        setSaved((prev) => new Set([...prev, 'Personalize']));
                      }}
                      label="Sidebar badges"
                      hint="Unread and count pills on navigation"
                    />
                    <PrefToggle
                      checked={prefs.digest}
                      onChange={(v) => {
                        setPref('digest', v);
                        setSaved((prev) => new Set([...prev, 'Personalize']));
                      }}
                      label="Weekly digest"
                      hint="Your-week summary card on the dashboard"
                    />
                    <PrefToggle
                      checked={prefs.coachTips}
                      onChange={(v) => {
                        setPref('coachTips', v);
                        setSaved((prev) => new Set([...prev, 'Personalize']));
                      }}
                      label="Coach tips"
                      hint="One-time nudges when you seem stuck. Never leaves your machine."
                    />
                  </div>
                </Card>

                {/* Follow-up settings */}
                <Card className="mb-6">
                  <SectionHead title="Follow-up reminders" isSaved={saved.has('Follow-ups')} />
                  <div className="space-y-4">
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Lance monitors sent proposals and invoices and drafts friendly follow-up
                      messages when they need attention. You control everything · messages are never
                      sent automatically.
                    </p>

                    {/* Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text-primary)]">Enable follow-ups</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Draft reminders for overdue proposals and invoices
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fuEnabled}
                          onChange={(e) => {
                            setFuEnabled(e.target.checked);
                            saveFollowUpSettings({ enabled: e.target.checked });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)]" />
                      </label>
                    </div>

                    {/* Delays */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border-color)]">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Proposal delay (days)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={fuProposalDelay}
                          onChange={(e) => {
                            const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                            setFuProposalDelay(v);
                            saveFollowUpSettings({ proposal_delay_days: v });
                          }}
                          className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                          First follow-up triggers after this many days of no response.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Invoice overdue delay (days)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={fuInvoiceDelay}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(30, parseInt(e.target.value) || 0));
                            setFuInvoiceDelay(v);
                            saveFollowUpSettings({ invoice_delay_days: v });
                          }}
                          className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                          First reminder triggers after due date passes by this many days.
                        </p>
                      </div>
                    </div>

                    {/* Late fees (Pro): accrue per 30 days overdue, shown in drafts */}
                    <div className="pt-3 border-t border-[var(--border-color)]">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">Late fees</p>
                        {getFeatureFlags(getActiveTier()).smartDunning !== true && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]">
                            PRO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-3">
                        Charge a monthly percent on overdue balances. Accrued fees appear in
                        reminder drafts and can be added to the invoice with one click.
                      </p>
                      {(() => {
                        const pro = getFeatureFlags(getActiveTier()).smartDunning === true;
                        const guard =
                          (fn: (e: ChangeEvent<HTMLInputElement>) => void) =>
                          (e: ChangeEvent<HTMLInputElement>) => {
                            if (!pro) {
                              document.dispatchEvent(
                                new CustomEvent('lance:open-upgrade', { detail: 'late fees' }),
                              );
                              return;
                            }
                            fn(e);
                          };
                        return (
                          <div className="flex items-center gap-4">
                            <label
                              className={`flex items-center gap-2 text-xs text-[var(--text-secondary)] ${!pro ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <input
                                type="checkbox"
                                checked={fuLateFeeEnabled}
                                disabled={!pro}
                                onChange={guard((e) => {
                                  const on = (e.target as HTMLInputElement).checked;
                                  setFuLateFeeEnabled(on);
                                  saveFollowUpSettings({ lateFeeEnabled: on });
                                })}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-ink,var(--accent))] focus:ring-[var(--accent)]"
                              />
                              Enable late fees
                            </label>
                            <label
                              className={`flex items-center gap-2 text-xs text-[var(--text-secondary)] ${!pro || !fuLateFeeEnabled ? 'opacity-60' : ''}`}
                            >
                              Percent per month
                              <input
                                type="number"
                                min={0.1}
                                max={10}
                                step={0.1}
                                value={fuLateFeePercent}
                                disabled={!pro || !fuLateFeeEnabled}
                                onChange={guard((e) => {
                                  const v = Math.max(
                                    0.1,
                                    Math.min(10, parseFloat(e.target.value) || 1.5),
                                  );
                                  setFuLateFeePercent(v);
                                  saveFollowUpSettings({ lateFeePercent: v });
                                })}
                                className="w-20 px-2 py-1.5 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                              />
                            </label>
                          </div>
                        );
                      })()}
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
                        Only charge what your contract allows and your local law permits.
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {section === 'data' && (
              <>
                {/* Data & Backup section header */}
                <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-4">
                  Data &amp; Backup
                </div>

                {/* Data (export, import, assets, project templates) */}
                <Card className="mb-6">
                  <SectionHead title="Data" isSaved={saved.has('Data')} />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text-primary)] ">Export all data</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Backup your entire database as JSON
                        </p>
                      </div>
                      <Button variant="secondary" onClick={handleExportData} size="sm">
                        <Download size={14} />
                        Export
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text-primary)] ">Import data</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Restore from a Lance backup file
                        </p>
                      </div>
                      <Button variant="secondary" onClick={handleImportData} size="sm">
                        <Upload size={14} />
                        Import
                      </Button>
                      <input
                        ref={importFileRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        aria-hidden="true"
                        tabIndex={-1}
                        onChange={handleImportFilePicked}
                      />
                    </div>
                    {isSeeded && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[var(--text-primary)]">Clear sample data</p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            Remove all records tagged as sample data
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => setShowClearSampleConfirm(true)}
                          size="sm"
                        >
                          <Trash2 size={14} />
                          Clear
                        </Button>
                      </div>
                    )}
                    <TrashBinSection />
                    <div className="border-t border-[var(--border-color)] pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text-primary)]">Assets folder</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Open attached files in your file manager
                          {isTauriApp() ? '' : ' · desktop app only'}
                        </p>
                      </div>
                      {isTauriApp() && (
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            try {
                              const assetsDir = await getAssetsDir();
                              const { open: shellOpen } = await import('@tauri-apps/plugin-shell');
                              await shellOpen(assetsDir);
                            } catch {
                              addToast('Failed to open assets folder', 'error');
                            }
                          }}
                          size="sm"
                        >
                          <FolderOpen size={14} />
                          Open
                        </Button>
                      )}
                    </div>
                    <div className="border-t border-[var(--border-color)] pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text-primary)]">Imports folder</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Where imported source files are kept
                          {isTauriApp() ? '' : ' · desktop app only'}
                        </p>
                      </div>
                      {isTauriApp() && (
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            try {
                              const importsDir = await getImportsDir();
                              const { open: shellOpen } = await import('@tauri-apps/plugin-shell');
                              await shellOpen(importsDir);
                            } catch {
                              addToast('Failed to open imports folder', 'error');
                            }
                          }}
                          size="sm"
                        >
                          <FolderOpen size={14} />
                          Open
                        </Button>
                      )}
                    </div>

                    <div className="border-t border-[var(--border-color)] pt-3">
                      <ProjectTemplatesSection />
                    </div>

                    {/* On-device activity: local-first telemetry, fully inspectable */}
                    <div className="border-t border-[var(--border-color)] pt-3">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-sm text-[var(--text-primary)]">On-device activity</p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            Anonymous usage counts that power personal stats and helpful nudges.
                            Stored only on this machine. Never uploaded, never sold. Names, emails,
                            and amounts are never recorded.
                          </p>
                        </div>
                      </div>
                      {(() => {
                        const counts = eventCounts();
                        const total = Object.values(counts).reduce((a, b) => a + b, 0);
                        if (total === 0) {
                          return (
                            <p className="text-xs text-[var(--text-tertiary)]">
                              No activity recorded yet.
                            </p>
                          );
                        }
                        return (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(counts).map(([name, n]) => (
                                <span
                                  key={name}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                                >
                                  {name}: {n}
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  downloadTextFile(
                                    `lance-activity-${todayLocalISO()}.json`,
                                    JSON.stringify(getTelemetryEvents(), null, 2),
                                    'application/json;charset=utf-8',
                                  );
                                }}
                              >
                                <Download size={14} />
                                Export
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  clearTelemetry();
                                  addToast('On-device activity cleared', 'success');
                                }}
                              >
                                <Trash2 size={14} />
                                Clear
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </Card>

                {/* Auto-backup */}
                {autoBackupLoaded && (
                  <Card className="mb-6">
                    <SectionHead title="Auto-backup" isSaved={saved.has('Auto-backup')} />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[var(--text-primary)]">Enable auto-backup</p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            Silently export your data on a schedule
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoBackupEnabled}
                            onChange={(e) => {
                              setAutoBackupEnabled(e.target.checked);
                              saveAutoBackupState(e.target.checked, autoBackupFreq);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)]" />
                        </label>
                      </div>

                      {autoBackupEnabled && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                              Frequency
                            </label>
                            <select
                              value={autoBackupFreq}
                              aria-label="Auto-backup frequency"
                              onChange={(e) => {
                                const freq = e.target.value as 'daily' | 'weekly' | 'monthly';
                                setAutoBackupFreq(freq);
                                saveAutoBackupState(true, freq);
                              }}
                              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                              Backup location
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={autoBackupPath}
                                readOnly
                                placeholder="Choose a folder..."
                                className="flex-1 px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-secondary)] text-[var(--text-secondary)] truncate"
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const { open: openDialog } =
                                      await import('@tauri-apps/plugin-dialog');
                                    const selected = await openDialog({
                                      directory: true,
                                      title: 'Choose backup folder',
                                    });
                                    if (selected && typeof selected === 'string') {
                                      setAutoBackupPath(selected);
                                      saveAutoBackupState(true, autoBackupFreq, selected);
                                    }
                                  } catch {
                                    /* dialog cancelled */
                                  }
                                }}
                              >
                                Browse
                              </Button>
                            </div>
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                              Keeps last 10 backups; older files are deleted automatically.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                )}

                {/* Export Templates */}
                {unlockedAchievements.has('first_export') && (
                  <Card className="mb-6">
                    <SectionHead title="Export Templates" isSaved={saved.has('Export Templates')} />
                    <ExportTemplatesSection />
                  </Card>
                )}

                {/* Follow-up message templates */}
                <Card className="mb-6">
                  <SectionHead title="Follow-up templates" isSaved={saved.has('Follow-ups')} />
                  <div className="space-y-4">
                    {/* Dunning voice (Pro): escalation drafts in your voice */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          Dunning voice
                        </p>
                        {getFeatureFlags(getActiveTier()).smartDunning !== true && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]">
                            PRO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-3">
                        Overdue reminders rewritten to sound like you. Auto follows your archetype
                        unless you pick one.
                      </p>
                      <div className="flex gap-2" role="radiogroup" aria-label="Dunning voice">
                        {(['auto', 'warm', 'direct', 'formal'] as const).map((tone) => {
                          const pro = getFeatureFlags(getActiveTier()).smartDunning === true;
                          const selected = (followUpSettings.tone || 'auto') === tone;
                          return (
                            <button
                              key={tone}
                              role="radio"
                              aria-checked={selected}
                              disabled={!pro}
                              title={!pro ? 'Custom dunning voices are a Pro feature' : undefined}
                              onClick={() => {
                                if (!pro) {
                                  document.dispatchEvent(
                                    new CustomEvent('lance:open-upgrade', {
                                      detail: 'smart dunning voices',
                                    }),
                                  );
                                  return;
                                }
                                saveFollowUpSettings({ tone });
                              }}
                              className={`flex-1 px-3 py-2 text-xs font-medium rounded-[8px] border transition-colors capitalize ${
                                selected
                                  ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--text-primary)]'
                                  : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
                              } ${!pro ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {tone === 'auto'
                                ? `Auto (${resolveDunningTone(profile?.profession)})`
                                : tone}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Templates */}
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] mb-3">
                        Message Templates
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mb-4">
                        Use{' '}
                        <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                          {'{client_name}'}
                        </code>
                        ,{' '}
                        <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                          {'{proposal_title}'}
                        </code>
                        ,{' '}
                        <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                          {'{invoice_number}'}
                        </code>
                        ,{' '}
                        <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                          {'{amount}'}
                        </code>
                        ,{' '}
                        <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                          {'{due_date}'}
                        </code>
                        ,{' '}
                        <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                          {'{days_elapsed}'}
                        </code>
                        ,{' '}
                        <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">
                          {'{freelancer_name}'}
                        </code>{' '}
                        · they fill in automatically.
                      </p>
                      <div className="space-y-3">
                        {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                          <div key={key}>
                            <label className="block text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                              {label}
                            </label>
                            <textarea
                              value={fuTemplates[key] || ''}
                              onChange={(e) => {
                                const updated = {
                                  ...fuTemplates,
                                  [key]: sanitizeText(e.target.value),
                                };
                                setFuTemplates(updated);
                                saveFollowUpSettings({ templates: updated });
                              }}
                              rows={5}
                              className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none leading-relaxed font-mono"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Subject Templates */}
                    <div className="pt-2 border-t border-[var(--border-color)]">
                      <p className="text-sm font-medium text-[var(--text-primary)] mb-3">
                        Email Subject Templates
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mb-4">
                        Same variables as message templates. These appear in the email subject line
                        when you click "Open in Email".
                      </p>
                      <div className="space-y-3">
                        {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                          <div key={`subj-${key}`}>
                            <label className="block text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                              {label}
                            </label>
                            <input
                              type="text"
                              value={
                                fuSubjectTemplates[key] || DEFAULT_SUBJECT_TEMPLATES[key] || ''
                              }
                              onChange={(e) => {
                                const updated = {
                                  ...fuSubjectTemplates,
                                  [key]: sanitizeText(e.target.value),
                                };
                                setFuSubjectTemplates(updated);
                                saveFollowUpSettings({ subject_templates: updated });
                              }}
                              className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {section === 'danger-zone' && (
              <>
                {/* Danger Zone section header */}
                <div className="text-xs uppercase tracking-widest text-[var(--text-danger)] font-semibold mb-4 text-[var(--danger)]">
                  Danger Zone
                </div>

                {/* Remove license */}
                {isLicensed && (
                  <Card className="mb-6 border border-[var(--danger)]/30">
                    <SectionHead title="Remove License" isSaved={false} />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--danger)]">Remove license key</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          The splash screen will return and theme locks will be re-applied.
                        </p>
                      </div>
                      <Button
                        variant="danger"
                        onClick={() => setShowRemoveLicenseConfirm(true)}
                        size="sm"
                      >
                        <Lock size={14} />
                        Remove license
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Reset all data */}
                <Card className="mb-6 border border-[var(--danger)]/30">
                  <SectionHead title="Reset All Data" isSaved={false} />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--danger)]">Delete all records permanently</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        All clients, projects, proposals, contracts, invoices, time entries, and
                        expenses will be removed.
                      </p>
                    </div>
                    <Button variant="danger" onClick={() => setShowResetModal(true)} size="sm">
                      <Trash2 size={14} />
                      Reset
                    </Button>
                  </div>
                </Card>

                {/* Test mode · dev + trial builds only. The whole block (and
                    its imports) is unreachable in production desktop builds:
                    import.meta.env.DEV is statically false there. */}
                {(import.meta.env.DEV || isTrialBuild()) && (
                  <Card className="mb-6 border border-dashed border-[var(--warning-text)]/50">
                    <SectionHead title="Test Mode" isSaved={false} />
                    <TestModePanel />
                  </Card>
                )}
              </>
            )}
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
          <div className="flex items-start gap-3 p-3 rounded-[8px] bg-[var(--danger-bg)]">
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
              className="w-full px-3 py-2 text-sm rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/20"
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

      {/* License modal */}
      <Modal
        open={showLicenseModal}
        onClose={() => {
          if (!licenseActivating) {
            setShowLicenseModal(false);
            setLicenseKey('');
            setLicenseError('');
            setLicenseSuccess(false);
          }
        }}
        title="Enter your license key"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <div className="relative">
              <input
                ref={licenseInputRef}
                type="text"
                value={licenseKey}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                  let formatted = 'LANCE';
                  if (raw.length > 5) formatted += '-' + raw.slice(5, 9);
                  if (raw.length > 9) formatted += '-' + raw.slice(9, 13);
                  if (raw.length > 13) formatted += '-' + raw.slice(13, 17);
                  if (raw.length > 17) formatted += '-' + raw.slice(17, 21);
                  setLicenseKey(formatted);
                  setLicenseError('');
                  setLicenseSuccess(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !licenseActivating) handleActivateLicense();
                }}
                placeholder="LANCE-XXXX-XXXX-XXXX-XXXX"
                maxLength={25}
                disabled={licenseActivating || licenseSuccess}
                className={`w-full px-3 py-2 text-sm rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 bg-[var(--bg-card)] font-mono tracking-wider ${
                  licenseError
                    ? 'border border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20'
                    : licenseSuccess
                      ? 'border border-green-500 focus:border-green-500 focus:ring-green-500/20'
                      : 'border border-[var(--border-color)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/20'
                }`}
                autoFocus
              />
              {licenseActivating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--accent)] border-t-transparent" />
                </div>
              )}
              {licenseSuccess && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check size={16} className="text-green-500 animate-bounce" />
                </div>
              )}
            </div>
            {licenseError && <p className="text-xs text-[var(--danger)] mt-2">{licenseError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowLicenseModal(false);
                setLicenseKey('');
                setLicenseError('');
                setLicenseSuccess(false);
              }}
              size="sm"
              disabled={licenseActivating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleActivateLicense}
              loading={licenseActivating}
              disabled={!licenseKey.trim() || licenseActivating || licenseSuccess}
              size="sm"
            >
              {licenseSuccess ? 'Activated' : 'Activate'}
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
            <div className="flex items-start gap-2 p-3 rounded-[8px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
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
          <div className="flex items-start gap-3 p-3 rounded-[8px] bg-amber-50 dark:bg-amber-900/20">
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

          <div className="p-3 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-color)]">
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
                <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500" />
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
                className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-700 rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-red-500 font-mono"
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
        open={showRemoveLicenseConfirm}
        onClose={() => setShowRemoveLicenseConfirm(false)}
        onConfirm={handleRemoveLicense}
        title="Remove License"
        message="Remove license key? The splash screen will return and theme locks will be re-applied. Your data is not affected."
        confirmLabel="Remove license"
        variant="danger"
      />
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

const SectionHead = ({ title, isSaved }: { title: string; isSaved: boolean }) => (
  <div className="flex items-center gap-2 mb-4">
    <h3 className="text-sm font-semibold text-[var(--text-primary)] ">{title}</h3>
    {isSaved && (
      <span className="flex items-center gap-1 text-[10px] text-[var(--accent-ink,var(--accent))] animate-pulse">
        <Check size={12} /> Saved
      </span>
    )}
  </div>
);

const EXPORT_TYPES = [
  { value: 'invoice_pdf', label: 'Invoice PDF' },
  { value: 'proposal_pdf', label: 'Proposal PDF' },
  { value: 'proposal_docx', label: 'Proposal DOCX' },
  { value: 'contract_docx', label: 'Contract DOCX' },
];

const SECTION_OPTIONS: Record<string, string[]> = {
  invoice_pdf: [
    'Header',
    'Footer',
    'From address',
    'Client address',
    'Line items table',
    'Total summary',
    'Notes',
    'Payment instructions',
  ],
  proposal_pdf: [
    'Header',
    'Footer',
    'Cover page',
    'Scope of work',
    'Timeline',
    'Pricing table',
    'Terms',
    'Signature block',
  ],
  proposal_docx: [
    'Header',
    'Footer',
    'Cover page',
    'Scope of work',
    'Timeline',
    'Pricing table',
    'Terms',
    'Signature block',
  ],
  contract_docx: [
    'Header',
    'Footer',
    'Parties',
    'Scope',
    'Payment terms',
    'Timeline',
    'Signatures',
  ],
};

function TrashBinSection() {
  const restoreTrashEntry = useStore((s) => s.restoreTrashEntry);
  const addToast = useToasts((s) => s.add);
  const [entries, setEntries] = useState<TrashEntry[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);

  const refresh = useCallback(() => setEntries(loadTrash()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleRestore = async (entry: TrashEntry) => {
    setRestoring(entry.trashId);
    try {
      await restoreTrashEntry(entry);
      removeTrashEntry(entry.trashId);
      refresh();
      addToast(`Restored ${entry.label}`, 'success');
    } catch {
      addToast('Could not restore this item', 'error');
    } finally {
      setRestoring(null);
    }
  };

  const handleDeleteForever = (entry: TrashEntry) => {
    removeTrashEntry(entry.trashId);
    refresh();
  };

  if (entries.length === 0) return null;

  return (
    <div className="border-t border-[var(--border-color)] pt-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-[var(--text-primary)]">Recently deleted</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Restores the record itself · linked items deleted with it are not brought back · emptied
            automatically after {TRASH_RETENTION_DAYS} days
          </p>
        </div>
        <button
          onClick={() => {
            clearTrash();
            refresh();
          }}
          className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--danger)]"
        >
          Empty trash
        </button>
      </div>
      <div className="space-y-1">
        {entries.map((e) => (
          <div
            key={e.trashId}
            className="flex items-center gap-3 px-2 py-1.5 rounded-[6px] hover:bg-[var(--bg-secondary)] text-xs"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium text-[var(--text-primary)] truncate">{e.label}</span>
              <span className="text-[var(--text-tertiary)]">
                {' '}
                · {e.table} · {relativeDate(e.deletedAt)}
              </span>
            </div>
            <button
              onClick={() => handleRestore(e)}
              disabled={restoring === e.trashId}
              className="flex-shrink-0 text-[11px] font-medium text-[var(--accent-ink,var(--accent))] hover:underline disabled:opacity-40"
            >
              {restoring === e.trashId ? 'Restoring…' : 'Restore'}
            </button>
            <button
              onClick={() => handleDeleteForever(e)}
              aria-label={`Delete ${e.label} forever`}
              className="flex-shrink-0 text-[var(--text-tertiary)] hover:text-[var(--danger)]"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportTemplatesSection() {
  const {
    exportTemplates,
    loadExportTemplates,
    addExportTemplate,
    updateExportTemplate,
    removeExportTemplate,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const [loaded, setLoaded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExportTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'invoice_pdf' as ExportTemplate['type'],
    header: '',
    footer: '',
    sections: [] as string[],
    color_scheme: '',
  });

  useEffect(() => {
    loadExportTemplates().finally(() => setLoaded(true));
  }, [loadExportTemplates]);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      type: 'invoice_pdf',
      header: '',
      footer: '',
      sections: [],
      color_scheme: '',
    });
    setShowForm(true);
  };

  const openEdit = (t: ExportTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      type: t.type,
      header: t.header || '',
      footer: t.footer || '',
      sections: t.sections || [],
      color_scheme: t.color_scheme || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const color = (form.color_scheme || '').trim();
    if (color && !/^#?[0-9a-fA-F]{6}$/.test(color)) {
      addToast('Color scheme must be a 6-digit hex value (e.g. #1e40af)', 'error');
      return;
    }
    setSaving(true);
    try {
      const normalized = {
        ...form,
        name: sanitizeInput(form.name),
        header: sanitizeInput(form.header),
        footer: sanitizeInput(form.footer),
        color_scheme: color,
      };
      if (editing) {
        await updateExportTemplate({ ...editing, ...normalized, sections: form.sections });
      } else {
        await addExportTemplate({ ...normalized, sections: form.sections });
      }
      setShowForm(false);
      addToast('Template saved', 'success');
    } catch {
      addToast('Failed to save template', 'error');
    } /* template save is best-effort */ finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    setDeleteConfirm(null);
    try {
      await removeExportTemplate(id);
      addToast('Template deleted', 'info');
    } catch {
      addToast('Failed to delete', 'error');
    } /* template delete is best-effort */
  };

  const toggleSection = (section: string) => {
    setForm((prev) => {
      const sections = prev.sections.includes(section)
        ? prev.sections.filter((s) => s !== section)
        : [...prev.sections, section];
      return { ...prev, sections };
    });
  };

  const availableSections = SECTION_OPTIONS[form.type] || [];

  const inputClass =
    'w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 bg-[var(--bg-card)]';

  return (
    <div>
      {!loaded ? (
        <div className="h-8 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
      ) : exportTemplates.length === 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-tertiary)]">
            No export templates yet. Create reusable export configurations.
          </p>
          <Button variant="secondary" size="sm" onClick={openNew}>
            <FileText size={14} />
            New Template
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {exportTemplates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[8px]"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{t.name}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {EXPORT_TYPES.find((et) => et.value === t.type)?.label || t.type}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(t)}
                  className="px-2 py-1 text-[10px] text-[var(--accent-ink,var(--accent))] hover:bg-[var(--accent-bg)] rounded-[6px]"
                >
                  Edit
                </button>
                {deleteConfirm === t.id ? (
                  <>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="px-2 py-1 text-[10px] text-white bg-[var(--danger)] rounded-[6px]"
                    >
                      Sure?
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-[6px]"
                    >
                      No
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="px-2 py-1 text-[10px] text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded-[6px]"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={openNew}>
              <FileText size={14} />
              New Template
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-[8px] space-y-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            {editing ? 'Edit Template' : 'New Template'}
          </h4>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Template name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. My Brand Export"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Document type
            </label>
            <select
              value={form.type}
              aria-label="Document type"
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as ExportTemplate['type'], sections: [] })
              }
              className={inputClass}
            >
              {EXPORT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Header
            </label>
            <input
              type="text"
              value={form.header}
              onChange={(e) => setForm({ ...form, header: e.target.value })}
              placeholder="Custom company name or logo text"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Footer
            </label>
            <input
              type="text"
              value={form.footer}
              onChange={(e) => setForm({ ...form, footer: e.target.value })}
              placeholder="Custom footer text"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Color scheme
            </label>
            <input
              type="text"
              value={form.color_scheme}
              onChange={(e) => setForm({ ...form, color_scheme: e.target.value })}
              placeholder="Hex color for PDF primary color"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              Include sections
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {availableSections.map((section) => (
                <label key={section} className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={form.sections.includes(section)}
                    onChange={() => toggleSection(section)}
                    className="w-3.5 h-3.5 rounded border-[var(--neutral-border)] text-[var(--accent-ink,var(--accent))]"
                  />
                  <span className="text-xs text-[var(--text-primary)]">{section}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name.trim()} size="sm">
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectTemplatesSection() {
  const {
    projectTemplates,
    loadProjectTemplates,
    loadTemplateMilestones,
    projectTemplateMilestones,
    updateProjectTemplate,
    removeProjectTemplate,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadProjectTemplates().finally(() => setLoaded(true));
  }, [loadProjectTemplates]);

  const handleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      await loadTemplateMilestones(id);
    }
  };

  const handleEdit = (id: string, name: string, description?: string) => {
    setEditing(id);
    setEditName(name);
    setEditDescription(description || '');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateProjectTemplate(id, {
        name: editName,
        description: editDescription || undefined,
      });
      setEditing(null);
      addToast('Template updated', 'success');
    } catch {
      addToast('Failed to update template', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeProjectTemplate(id);
      setDeleteConfirm(null);
      addToast('Template deleted', 'info');
    } catch {
      addToast('Failed to delete template', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">Project Templates</p>
      </div>
      {!loaded ? (
        <div className="h-8 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
      ) : projectTemplates.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)]">
          No project templates yet. Save one from a project.
        </p>
      ) : (
        <div className="space-y-2">
          {projectTemplates.map((tpl) => {
            const ms = projectTemplateMilestones[tpl.id] || [];
            const isEditing = editing === tpl.id;
            return (
              <div key={tpl.id} className="bg-[var(--bg-secondary)] rounded-[8px] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2">
                  {isEditing ? (
                    <div className="flex-1 space-y-2 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(tpl.id);
                          if (e.key === 'Escape') setEditing(null);
                        }}
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full px-2 py-1 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSaveEdit(tpl.id)}
                          className="text-[10px] text-[var(--accent-ink,var(--accent))] hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-[10px] text-[var(--text-tertiary)] hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)]">{tpl.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {ms.length} milestones
                        </p>
                        {tpl.default_budget && (
                          <p className="text-[10px] text-[var(--text-tertiary)]">
                            ${tpl.default_budget}
                          </p>
                        )}
                        {tpl.is_default && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]">
                            Built-in
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {!isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleExpand(tpl.id)}
                        className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-1.5 py-0.5 rounded-[4px]"
                      >
                        {expanded === tpl.id ? 'Hide' : 'View'}
                      </button>
                      <button
                        onClick={() => handleEdit(tpl.id, tpl.name, tpl.description)}
                        className="text-[10px] text-[var(--accent-ink,var(--accent))] hover:underline px-1"
                      >
                        Edit
                      </button>
                      {deleteConfirm === tpl.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[var(--danger)]">Delete?</span>
                          <button
                            onClick={() => handleDelete(tpl.id)}
                            className="text-[10px] px-1 py-0.5 bg-[var(--danger)] text-white rounded-[4px]"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-[10px] px-1 py-0.5 bg-[var(--bg-card)] text-[var(--text-secondary)] rounded-[4px]"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(tpl.id)}
                          className="text-[10px] text-[var(--danger)] hover:underline px-1"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {expanded === tpl.id && (
                  <div className="border-t border-[var(--border-color)] px-3 py-2">
                    {ms.length === 0 ? (
                      <p className="text-[10px] text-[var(--text-tertiary)]">
                        No milestones defined.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {ms.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 text-xs">
                            <span className="text-[var(--text-tertiary)] w-5 text-right">
                              {m.days_from_start}d
                            </span>
                            <span className="text-[var(--text-primary)]">{m.title}</span>
                            {m.invoice_on_completion && (
                              <span className="text-[9px] px-1 py-0.5 bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] rounded-[3px]">
                                invoice
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
