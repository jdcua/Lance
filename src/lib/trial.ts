import { TRIAL } from './constants';

/**
 * Days of Pro trial remaining, derived from the profile's trial start.
 * The trial clock starts on first launch and runs 30 days; the soft
 * lock lands at day 37. No clock means a fresh trial.
 */
export function trialDaysRemaining(
  trialStartedAt?: string | null,
  now: Date = new Date(),
): number {
  if (!trialStartedAt) return TRIAL.FULL_DAYS;
  const start = new Date(trialStartedAt);
  if (isNaN(start.getTime())) return TRIAL.FULL_DAYS;
  const elapsedDays = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return Math.max(0, Math.min(TRIAL.FULL_DAYS, TRIAL.FULL_DAYS - elapsedDays));
}
