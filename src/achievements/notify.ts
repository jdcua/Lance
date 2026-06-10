import { checkAchievements, unlockAchievement, type StoreState } from './checker';
import { ACHIEVEMENTS } from './index';
import type { AchievementKey } from './index';

export async function checkAndNotify(
  store: StoreState,
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'unlock', duration?: number) => void
): Promise<void> {
  try {
    const newAchievements = await checkAchievements(store);
    for (const key of newAchievements) {
      const ach = ACHIEVEMENTS.find((a) => a.key === key);
      if (ach) {
        addToast(`${ach.title} — ${ach.reward}`, 'unlock');
      }
    }
  } catch {
    // Achievement check is non-critical
  }
}

export async function tryUnlock(
  key: AchievementKey,
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'unlock', duration?: number) => void
): Promise<void> {
  try {
    const ach = ACHIEVEMENTS.find((a) => a.key === key);
    if (!ach) return;
    const wasNew = await unlockAchievement(key);
    if (wasNew) {
      addToast(`${ach.title} — ${ach.reward}`, 'unlock');
    }
  } catch {
    // Achievement check is non-critical
  }
}
