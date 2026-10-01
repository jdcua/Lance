/**
 * Test mode ("godmode"): unlock everything for genuine testing.
 *
 * Availability is DEV builds + the trial ONLY — production desktop builds
 * never render the entry UI, and import.meta.env.DEV is statically replaced
 * at build time so bundlers drop the unreachable branches. When the user
 * says obliterate, delete this file plus its two call sites (Settings
 * danger-zone section, App banner) and nothing else references it.
 */

import type { LicenseTier } from '../lib/constants';

export interface TestModeState {
  active: boolean;
  tier: LicenseTier | null;
}

const FLAG_KEY = 'lance:test-mode';
const SNAPSHOT_KEY = 'lance:test-profile-snapshot';

const DEFAULT_STATE: TestModeState = { active: false, tier: null };

export function loadTestMode(): TestModeState {
  try {
    const raw = localStorage.getItem(FLAG_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<TestModeState>;
    if (parsed.active === true && typeof parsed.tier === 'string') {
      return { active: true, tier: parsed.tier as LicenseTier };
    }
  } catch {
    return DEFAULT_STATE;
  }
  return DEFAULT_STATE;
}

function saveTestMode(state: TestModeState): void {
  try {
    localStorage.setItem(FLAG_KEY, JSON.stringify(state));
  } catch {
    /* private mode: test mode simply won't persist */
  }
}

/** Remember the real profile bytes so exiting restores them exactly. */
export function snapshotProfile(): void {
  try {
    const raw = localStorage.getItem('lance:profile');
    localStorage.setItem(SNAPSHOT_KEY, raw === null ? 'null' : raw);
  } catch {
    /* best-effort */
  }
}

export function restoreProfileSnapshot(): string | null {
  try {
    const snap = localStorage.getItem(SNAPSHOT_KEY);
    if (snap === null) return null;
    if (snap === 'null') localStorage.removeItem('lance:profile');
    else localStorage.setItem('lance:profile', snap);
    localStorage.removeItem(SNAPSHOT_KEY);
    return snap;
  } catch {
    return null;
  }
}

export function activateTestMode(tier: LicenseTier): TestModeState {
  const state: TestModeState = { active: true, tier };
  saveTestMode(state);
  return state;
}

export function deactivateTestMode(): TestModeState {
  saveTestMode(DEFAULT_STATE);
  return DEFAULT_STATE;
}
