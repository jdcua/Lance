import { Check } from 'lucide-react';
import type { UserProfile } from '../../types';
import type { ThemeId } from '../../themes';

/** Shared bits for the Settings split (wave3/4). Moved verbatim from Settings.tsx. */

export const SectionHead = ({ title, isSaved }: { title: string; isSaved: boolean }) => (
  <div className="flex items-center gap-2 mb-4">
    <h3 className="text-sm font-semibold text-[var(--text-primary)] ">{title}</h3>
    {isSaved && (
      <span className="flex items-center gap-1 text-[10px] text-[var(--accent-ink,var(--accent))] animate-pulse">
        <Check size={12} /> Saved
      </span>
    )}
  </div>
);

export const inputClass =
  'w-full px-3 py-2 text-sm border border-[var(--border-color)]  rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 bg-[var(--bg-card)]  ';
export const labelClass =
  'block text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-1';

export const writingStyles = ['professional', 'warm', 'direct', 'bold'];

export const ACCENT_COLORS = [
  { id: 'gold', label: 'Gold', hex: '#FFAD00' },
  { id: 'sage', label: 'Sage', hex: '#1EC98A' },
  { id: 'amber', label: 'Amber', hex: '#F59E0B' },
  { id: 'rose', label: 'Rose', hex: '#E11D48' },
  { id: 'sky', label: 'Sky', hex: '#0EA5E9' },
  { id: 'violet', label: 'Violet', hex: '#8B5CF6' },
  { id: 'teal', label: 'Teal', hex: '#14B8A6' },
  { id: 'orange', label: 'Orange', hex: '#F97316' },
  { id: 'slate', label: 'Slate', hex: '#64748B' },
];

export function labelForStyle(s: string): string {
  const map: Record<string, string> = {
    professional: 'Professional',
    warm: 'Warm & personal',
    direct: 'Direct & concise',
    bold: 'Bold & confident',
  };
  return map[s] || s;
}

/**
 * Settings-local state + shell handlers passed to section components.
 * Store data (profile, prefs, follow-up settings) is read by
 * sections directly via useStore/useToasts/usePrefs — the bag carries only
 * what useState owns in the shell. Nothing here changes behavior.
 */
export interface SettingsBag {
  form: UserProfile;
  setForm: React.Dispatch<React.SetStateAction<UserProfile>>;
  autoSave: (updates: Partial<UserProfile>, section: string) => void;
  saved: Set<string>;
  setSaved: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowResetModal: (v: boolean) => void;
  setShowClearSampleConfirm: (v: boolean) => void;
  isSeeded: boolean;
  density: string;
  handleDensityChange: (d: string) => void;
  accentColor: string;
  handleAccentChange: (c: string) => void;
  activeTheme: ThemeId;
  setActiveTheme: (t: ThemeId) => void;
  unlockedThemes: Set<string>;
  unlockedAchievements: Set<string>;
  fuEnabled: boolean;
  setFuEnabled: (v: boolean) => void;
  fuProposalDelay: number;
  setFuProposalDelay: (v: number) => void;
  fuInvoiceDelay: number;
  setFuInvoiceDelay: (v: number) => void;
  fuLateFeeEnabled: boolean;
  setFuLateFeeEnabled: (v: boolean) => void;
  fuLateFeePercent: number;
  setFuLateFeePercent: (v: number) => void;
  fuTemplates: Record<string, string>;
  setFuTemplates: (v: Record<string, string>) => void;
  fuSubjectTemplates: Record<string, string>;
  setFuSubjectTemplates: (v: Record<string, string>) => void;
  autoBackupEnabled: boolean;
  setAutoBackupEnabled: (v: boolean) => void;
  autoBackupFreq: 'daily' | 'weekly' | 'monthly';
  setAutoBackupFreq: (v: 'daily' | 'weekly' | 'monthly') => void;
  autoBackupPath: string;
  setAutoBackupPath: (v: string) => void;
  autoBackupLoaded: boolean;
  features: Record<string, boolean>;
  setFeatures: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  saveAutoBackupState: (enabled: boolean, frequency: string, path?: string) => void;
  handleExportData: () => void;
  handleImportData: () => void;
  handleImportFilePicked: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importFileRef: React.Ref<HTMLInputElement>;
}
