/**
 * Display pricing. Single source of truth for every price the user SEEs.
 * Paddle price IDs (what checkout charges) live in Vite env vars instead.
 * Change numbers here once and every surface follows.
 */
export const PRO_PRICES = {
  monthly: 14,
  yearly: 120,
  lifetime: 120,
} as const;

export const TRIAL_DAYS = 30;
