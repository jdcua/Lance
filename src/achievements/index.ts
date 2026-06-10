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
  | 'first_export';

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
    reward: 'Accent color variants unlocked',
  },
  {
    key: 'three_proposals',
    title: 'On a roll',
    description: 'You sent 3 proposals.',
    reward: 'Compact layout density unlocked',
  },
  {
    key: 'first_contract',
    title: 'Making it official',
    description: 'You created your first contract.',
    reward: 'Contract templates expanded',
  },
  {
    key: 'first_recurring',
    title: 'Retainer life',
    description: 'You set up a recurring invoice.',
    reward: 'Finance forecasting view unlocked',
  },
  {
    key: 'twenty_five_hours',
    title: 'Deep work',
    description: 'You logged 25 hours.',
    reward: 'Time heatmap view unlocked',
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
    reward: 'Export templates unlocked',
  },
];

export function getAchievementByKey(key: AchievementKey): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}
