import { useState, useEffect } from 'react';

/**
 * Personalize prefs — local-only UI preferences, no migration needed.
 * Stored as one JSON blob; changes broadcast so every consumer updates live.
 */
export type MotionPref = 'auto' | 'full' | 'off';

export interface Prefs {
  /** auto = follow OS, full = always animate, off = never animate */
  motion: MotionPref;
  /** soft accent glow behind app content */
  glow: boolean;
  /** trend sparklines under KPI cards */
  sparklines: boolean;
  /** count badges on sidebar nav */
  badges: boolean;
  /** Monday-style weekly digest card */
  digest: boolean;
  /** one-time local coach nudges */
  coachTips: boolean;
}

const KEY = 'lance:prefs';

export const DEFAULT_PREFS: Prefs = {
  motion: 'auto',
  glow: true,
  sparklines: true,
  badges: true,
  digest: true,
  coachTips: true,
};

export function getPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...getPrefs(), [key]: value }));
  } catch {
    /* private mode: prefs just won't persist */
  }
  window.dispatchEvent(new CustomEvent('lance:prefs-changed'));
}

export function usePrefs(): Prefs {
  const [prefs, setPrefs] = useState<Prefs>(getPrefs);
  useEffect(() => {
    const handler = () => setPrefs(getPrefs());
    window.addEventListener('lance:prefs-changed', handler);
    return () => window.removeEventListener('lance:prefs-changed', handler);
  }, []);
  return prefs;
}
