import { useNavigate } from 'react-router-dom';
import { Cloud, HardDrive } from 'lucide-react';
import { useStore } from '../../store';
import { trialDaysRemaining } from '../../lib/trial';

/**
 * SyncChip — the Free (offline, local) vs Pro (online) visual language.
 * Neutral gray + drive icon = Local: data stays on this machine.
 * Accent + cloud icon = Pro/Trial/Lifetime: online features (sync, hosted
 * portal, reminders) are unlocked. The dot pulses while syncing (tactile,
 * explains state); pulse is ambient-motion so calm intensity and
 * reduced-motion disable it. Click opens license settings. Never blocks.
 */
export default function SyncChip({ syncing = false }: { syncing?: boolean }) {
  const navigate = useNavigate();
  const getActiveTier = useStore((s) => s.getActiveTier);
  const profile = useStore((s) => s.profile);
  const tier = getActiveTier();
  const online = tier === 'pro' || tier === 'lifetime' || tier === 'trial';

  const label =
    tier === 'pro'
      ? 'Pro'
      : tier === 'lifetime'
        ? 'Lifetime'
        : tier === 'trial'
          ? `Trial · ${trialDaysRemaining(profile?.trial_started_at)}d`
          : tier === 'expired'
            ? 'Expired'
            : 'Local';

  return (
    <button
      onClick={() => navigate('/settings')}
      title={
        tier === 'trial'
          ? 'Trial: full Pro features on this device. See plans.'
          : online
            ? 'Paid license active on this device. Manage license.'
            : 'Offline: your data stays on this machine. See plans.'
      }
      aria-label={`License status: ${label}`}
      className={`flex items-center gap-1.5 text-[11px] font-medium pl-2 pr-2.5 py-1 border rounded-full transition-colors ${
        online
          ? 'text-[var(--accent-ink,var(--accent))] bg-[var(--accent-bg)] border-transparent hover:brightness-95'
          : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)]/60 border-[var(--border-color)] hover:text-[var(--text-primary)]'
      }`}
    >
      {online ? <Cloud size={12} /> : <HardDrive size={12} />}
      <span className="tnum">{label}</span>
      {syncing && (
        <span
          className="ambient-motion w-1.5 h-1.5 rounded-full bg-current skeleton-pulse"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
