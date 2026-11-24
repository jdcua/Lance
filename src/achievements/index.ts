export type AchievementKey =
  | 'first_proposal_sent'
  | 'first_invoice_paid'
  | 'ten_hours_logged'
  | 'five_clients'
  | 'three_proposals'
  | 'first_contract'
  | 'first_recurring'
  | 'twenty_five_hours'
  | 'ten_invoices'
  | 'first_export'
  | 'motion_theme'
  | 'lens_theme'
  | 'scale_theme'
  | 'first_project_completed';

export type Achievement = {
  key: AchievementKey;
  title: string;
  description: string;
  reward: string;
  unlocksTheme?: import('../themes').ThemeId;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    key: 'first_proposal_sent',
    title: 'First impression',
    description: 'You sent your first proposal.',
    reward: 'Studio theme unlocked',
    unlocksTheme: 'studio',
  },
  {
    key: 'ten_hours_logged',
    title: 'In the zone',
    description: 'You logged 10 hours of work.',
    reward: 'Terminal theme unlocked',
    unlocksTheme: 'terminal',
  },
  {
    key: 'first_invoice_paid',
    title: 'First payday',
    description: 'Your first invoice was paid.',
    reward: 'Craft theme unlocked',
    unlocksTheme: 'craft',
  },
  {
    key: 'five_clients',
    title: 'Building something',
    description: 'You added 5 clients.',
    reward: 'Accent color variants unlocked · personalize in Settings → Appearance',
  },
  {
    key: 'three_proposals',
    title: 'On a roll',
    description: 'You sent 3 proposals.',
    reward: 'Compact layout unlocked · find it in Settings → Appearance',
  },
  {
    key: 'first_contract',
    title: 'Making it official',
    description: 'You created your first contract.',
    reward: 'Contract templates unlocked · find 6 professional templates in Contracts',
  },
  {
    key: 'first_recurring',
    title: 'Retainer life',
    description: 'You set up a recurring invoice.',
    reward: 'Finance forecasting unlocked · check the Forecast tab in Finance',
  },
  {
    key: 'twenty_five_hours',
    title: 'Deep work',
    description: 'You logged 25 hours.',
    reward: 'Time heatmap unlocked · see your year in Time',
  },
  {
    key: 'ten_invoices',
    title: 'Cash flowing',
    description: 'You created 10 invoices.',
    reward: 'Revenue chart expanded to 12 months',
  },
  {
    key: 'first_export',
    title: 'Shipped',
    description: 'You exported your first document.',
    reward: 'Export templates unlocked · customize your exports in Settings → Data',
  },
  {
    key: 'motion_theme',
    title: 'Motion theme',
    description: 'You sent your first proposal · a dash of Motion is unlocked.',
    reward: 'Motion theme is now available in Settings → Appearance',
    unlocksTheme: 'motion',
  },
  {
    key: 'lens_theme',
    title: 'Lens theme',
    description: 'You logged 10 hours of work · a fresh perspective is unlocked.',
    reward: 'Lens theme is now available in Settings → Appearance',
    unlocksTheme: 'lens',
  },
  {
    key: 'scale_theme',
    title: 'Scale theme',
    description: 'You got your first invoice paid · growing momentum is unlocked.',
    reward: 'Scale theme is now available in Settings → Appearance',
    unlocksTheme: 'scale',
  },
  {
    key: 'first_project_completed',
    title: 'Delivered',
    description: 'You completed your first project.',
    reward: 'Completed projects are tracked in Insights',
  },
];

// Unused · kept as internal helper for future use
export function getAchievementByKey(key: AchievementKey): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}
