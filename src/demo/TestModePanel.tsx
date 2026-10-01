import { useState } from 'react';
import { useStore } from '../store';
import { seedSampleData, clearSampleData } from '../utils/seedData';
import type { LicenseTier } from '../lib/constants';

const TIERS: LicenseTier[] = ['free', 'trial', 'pro', 'expired', 'lifetime'];

/**
 * Godmode panel. Rendered ONLY in dev builds and the trial (callers gate
 * with import.meta.env.DEV || isTrial()). Everything here writes
 * local-only state; exiting restores the pre-test profile byte-for-byte.
 */
export default function TestModePanel() {
  const testMode = useStore((s) => s.testMode);
  const enableTestMode = useStore((s) => s.enableTestMode);
  const setTestTier = useStore((s) => s.setTestTier);
  const setTestTrialClock = useStore((s) => s.setTestTrialClock);
  const disableTestMode = useStore((s) => s.disableTestMode);
  const getActiveTier = useStore((s) => s.getActiveTier);
  const profile = useStore((s) => s.profile);
  const [busy, setBusy] = useState('');

  async function run(label: string, task: () => Promise<unknown>) {
    setBusy(label);
    try {
      await task();
    } catch {
      /* panel actions are best-effort; store surfaces real errors */
    }
    setBusy('');
  }

  if (!testMode.active) {
    return (
      <div>
        <p className="text-sm text-[var(--text-primary)]">Test mode is off.</p>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">
          Unlocks every tier for testing. Snapshots your real profile first; exiting restores it
          exactly. Dev and trial builds only.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              disabled={busy !== ''}
              onClick={() => run(`on-${tier}`, () => enableTestMode(tier))}
              className="text-xs font-medium px-2.5 py-1 rounded-[6px] border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
            >
              {busy === `on-${tier}` ? '…' : `Test as ${tier}`}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-primary)]">
        Testing as <strong className="capitalize">{getActiveTier()}</strong>
        <span className="text-xs text-[var(--text-tertiary)]">
          {' '}
          · trial clock:{' '}
          {profile?.trial_started_at ? profile.trial_started_at.slice(0, 10) : 'unset'}
        </span>
      </p>
      <div>
        <p className="text-xs text-[var(--text-tertiary)] mb-1.5">Tier override</p>
        <div className="flex flex-wrap gap-1.5">
          {TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTestTier(tier)}
              aria-pressed={testMode.tier === tier}
              className={`text-xs font-medium px-2.5 py-1 rounded-[6px] border capitalize ${
                testMode.tier === tier
                  ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-[var(--text-tertiary)] mb-1.5">Trial clock</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            ['now', 'Start now', 0],
            ['d30', 'Day 30', 30],
            ['expire', 'Expire now', 60],
            ['clear', 'Clear clock', null],
          ].map(([key, label, days]) => (
            <button
              key={key as string}
              type="button"
              disabled={busy !== '' || !profile}
              onClick={() => run(`clock-${key}`, () => setTestTrialClock(days as number | null))}
              className="text-xs font-medium px-2.5 py-1 rounded-[6px] border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
            >
              {busy === `clock-${key}` ? '…' : (label as string)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-[var(--text-tertiary)] mb-1.5">Sample data</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy !== ''}
            onClick={() => run('seed', () => seedSampleData().then(() => window.location.reload()))}
            className="text-xs font-medium px-2.5 py-1 rounded-[6px] border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
          >
            {busy === 'seed' ? '…' : 'Seed sample data'}
          </button>
          <button
            type="button"
            disabled={busy !== ''}
            onClick={() =>
              run('clear-seed', () => clearSampleData().then(() => window.location.reload()))
            }
            className="text-xs font-medium px-2.5 py-1 rounded-[6px] border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
          >
            {busy === 'clear-seed' ? '…' : 'Clear sample data'}
          </button>
        </div>
      </div>
      <button
        type="button"
        disabled={busy !== ''}
        onClick={() => run('exit', () => disableTestMode().then(() => window.location.reload()))}
        className="text-xs font-semibold px-3 py-1.5 rounded-[6px] bg-[var(--danger)] text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy === 'exit' ? '…' : 'Exit test mode (restore my profile)'}
      </button>
    </div>
  );
}
