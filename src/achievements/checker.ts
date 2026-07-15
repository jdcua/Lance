import type { AchievementKey } from './index';
import { ACHIEVEMENTS } from './index';
import { getDb } from '../db';
import type { AppStore } from '../store';

function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && typeof (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ === 'object';
}

export type StoreState = Pick<
  AppStore,
  'proposals' | 'invoices' | 'timeEntries' | 'clients' | 'contracts' | 'recurringInvoices' | 'projects'
>;

const ACHIEVEMENTS_KEY = 'lance:achievements';

function lsGetUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function lsSaveUnlocked(key: AchievementKey): void {
  try {
    const current = lsGetUnlocked();
    current.add(key);
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...current]));
  } catch {
    /* localStorage may be full or unavailable */
  }
}

async function getUnlockedKeys(): Promise<Set<string>> {
  if (isTauriAvailable()) {
    try {
      const db = await getDb();
      const rows = await db.select<Array<{ key: string }>>(
        'SELECT key FROM achievements'
      );
      // Merge DB state into localStorage for browser-mode compatibility
      const merged = lsGetUnlocked();
      for (const r of rows) merged.add(r.key);
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...merged]));
      return merged;
    } catch {
      /* fall through to localStorage */
    }
  }
  return lsGetUnlocked();
}

async function saveAchievement(key: AchievementKey): Promise<void> {
  // Always persist to localStorage for browser-mode compatibility
  lsSaveUnlocked(key);

  if (isTauriAvailable()) {
    try {
      const db = await getDb();
      await db.execute(
        'INSERT OR IGNORE INTO achievements (id, key, unlocked_at) VALUES (?, ?, ?)',
        [crypto.randomUUID(), key, new Date().toISOString()]
      );
    } catch {
      /* db write failed, already saved to localStorage */
    }
  }
}

export async function checkAchievements(store: StoreState): Promise<AchievementKey[]> {
  const unlocked = await getUnlockedKeys();
  const newlyUnlocked: AchievementKey[] = [];

  const checks: Array<{ key: AchievementKey; condition: boolean }> = [
    {
      key: 'first_proposal_sent',
      condition: store.proposals.some((p) => p.status === 'sent'),
    },
    {
      key: 'first_invoice_paid',
      condition: store.invoices.some((i) => i.status === 'paid'),
    },
    {
      key: 'ten_hours_logged',
      condition:
        store.timeEntries.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) >=
        600,
    },
    {
      key: 'five_clients',
      condition: store.clients.length >= 5,
    },
    {
      key: 'three_proposals',
      condition: store.proposals.filter((p) => p.status === 'sent').length >= 3,
    },
    {
      key: 'first_contract',
      condition: store.contracts.length >= 1,
    },
    {
      key: 'first_recurring',
      condition: store.recurringInvoices.length >= 1,
    },
    {
      key: 'twenty_five_hours',
      condition:
        store.timeEntries.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) >=
        1500,
    },
    {
      key: 'ten_invoices',
      condition: store.invoices.length >= 10,
    },
    {
      key: 'first_export',
      condition: localStorage.getItem('lance:has-exported') === 'true',
    },
    {
      key: 'first_project_completed',
      condition: store.projects.some((p) => p.status === 'completed'),
    },
  ];

  for (const check of checks) {
    if (check.condition && !unlocked.has(check.key)) {
      await saveAchievement(check.key);
      newlyUnlocked.push(check.key);

      if (check.key === 'first_proposal_sent' && !unlocked.has('motion_theme')) {
        await saveAchievement('motion_theme');
        newlyUnlocked.push('motion_theme');
      }
      if (check.key === 'ten_hours_logged' && !unlocked.has('lens_theme')) {
        await saveAchievement('lens_theme');
        newlyUnlocked.push('lens_theme');
      }
      if (check.key === 'first_invoice_paid' && !unlocked.has('scale_theme')) {
        await saveAchievement('scale_theme');
        newlyUnlocked.push('scale_theme');
      }
    }
  }

  return newlyUnlocked;
}

export async function unlockAchievement(key: AchievementKey): Promise<boolean> {
  const unlocked = await getUnlockedKeys();
  if (!unlocked.has(key)) {
    await saveAchievement(key);
    return true;
  }
  return false;
}

export async function getUnlockedAchievementKeys(): Promise<string[]> {
  const unlocked = await getUnlockedKeys();
  return [...unlocked];
}

export async function getUnlockedThemes(): Promise<string[]> {
  const unlocked = await getUnlockedKeys();
  return ACHIEVEMENTS.filter(
    (a) => a.unlocksTheme && unlocked.has(a.key)
  ).map((a) => a.unlocksTheme!);
}
