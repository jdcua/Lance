import type { AchievementKey } from './index';
import { ACHIEVEMENTS } from './index';
import { getDb } from '../db';
import type { AppStore } from '../store';

export type StoreState = Pick<
  AppStore,
  'proposals' | 'invoices' | 'timeEntries' | 'clients' | 'contracts' | 'recurringInvoices' | 'projects'
>;

async function getUnlockedKeys(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select<Array<{ key: string }>>(
    'SELECT key FROM achievements'
  );
  return new Set(rows.map((r: { key: string }) => r.key));
}

async function saveAchievement(key: AchievementKey): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT OR IGNORE INTO achievements (id, key, unlocked_at) VALUES (?, ?, ?)',
    [crypto.randomUUID(), key, new Date().toISOString()]
  );
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
      condition: false, // handled via explicit trigger from export flow
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

export async function getUnlockedThemes(): Promise<string[]> {
  const unlocked = await getUnlockedKeys();
  return ACHIEVEMENTS.filter(
    (a) => a.unlocksTheme && unlocked.has(a.key)
  ).map((a) => a.unlocksTheme!);
}
