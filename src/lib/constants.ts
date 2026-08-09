// ── Invoice Statuses ──
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

// ── Proposal Statuses ──
export const PROPOSAL_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
} as const;

export type ProposalStatus = (typeof PROPOSAL_STATUS)[keyof typeof PROPOSAL_STATUS];

// ── Contract Statuses ──
export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type ContractStatus = (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS];

// ── Project Statuses ──
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

// ── Follow-Up Statuses ──
export const FOLLOW_UP_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DISMISSED: 'dismissed',
  SNOOZED: 'snoozed',
  RESPONDED: 'responded',
  PAID: 'paid',
  SUPERSEDED: 'superseded',
} as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUS)[keyof typeof FOLLOW_UP_STATUS];

// ── Follow-Up Intervals (days) ──
export const FOLLOW_UP_INTERVALS = {
  PROPOSAL_DELAY_DAYS: 3,
  INVOICE_DELAY_DAYS: 0,
  STAGE_2_THRESHOLD: 4,
  STAGE_3_THRESHOLD: 10,
} as const;

// ── Follow-Up Stage Thresholds ──
export const FOLLOW_UP_STAGES = {
  PROPOSAL: [
    { maxDays: 4, stage: 1, templateKey: 'proposal_day3' as const },
    { maxDays: 10, stage: 2, templateKey: 'proposal_day7' as const },
    { maxDays: Infinity, stage: 3, templateKey: 'proposal_day14' as const },
  ],
  INVOICE: [
    { maxDays: 4, stage: 1, templateKey: 'invoice_day1' as const },
    { maxDays: 10, stage: 2, templateKey: 'invoice_day7' as const },
    { maxDays: Infinity, stage: 3, templateKey: 'invoice_day14' as const },
  ],
} as const;

// ── Communication Types ──
export const COMMUNICATION_TYPE = {
  NOTE: 'note',
  CALL: 'call',
  EMAIL: 'email',
  MEETING: 'meeting',
} as const;

export type CommunicationType = (typeof COMMUNICATION_TYPE)[keyof typeof COMMUNICATION_TYPE];

// ── Recurring Invoice Frequencies ──
export const RECURRING_FREQUENCY = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
} as const;

export type RecurringFrequency = (typeof RECURRING_FREQUENCY)[keyof typeof RECURRING_FREQUENCY];

// ── Payment Terms (days) ──
export const PAYMENT_TERMS = [0, 7, 14, 30] as const;

// ── Currency Codes and Symbols ──
export const CURRENCY_CODES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  CAD: 'CA$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
};

// ── Theme IDs ──
export const THEME_IDS = {
  DEFAULT: 'default',
  STUDIO: 'studio',
  TERMINAL: 'terminal',
  CRAFT: 'craft',
  MOTION: 'motion',
  LENS: 'lens',
  SCALE: 'scale',
} as const;

export type ThemeId = (typeof THEME_IDS)[keyof typeof THEME_IDS];

// ── Achievement Keys ──
export const ACHIEVEMENT_KEYS = {
  FIRST_CLIENT: 'first_client',
  FIRST_PROJECT: 'first_project',
  FIRST_PROPOSAL: 'first_proposal',
  FIRST_INVOICE: 'first_invoice',
  FIRST_PAYMENT: 'first_payment',
  TEN_HOURS: 'ten_hours',
  FIVE_CLIENTS: 'five_clients',
  THREE_PROPOSALS_SENT: 'three_proposals_sent',
  TEN_INVOICES: 'ten_invoices',
  TIME_30_DAYS: 'time_30_days',
  CONTRACT_SIGNED: 'contract_signed',
  FULL_DASHBOARD: 'full_dashboard',
  EXPORT: 'export',
  IMPORT: 'import',
} as const;

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[keyof typeof ACHIEVEMENT_KEYS];

// ── Timing Constants ──
export const TIMING = {
  COMMAND_PALETTE_DEBOUNCE_MS: 150,
  AUTOUPDATER_DELAY_MS: 3000,
  FOLLOW_UP_CHECK_INTERVAL_MS: 30 * 60 * 1000,
  EXPIRY_CHECK_INTERVAL_MS: 60 * 60 * 1000,
  PORTAL_POLL_INTERVAL_MS: 30000,
  SERVER_REQUEST_TIMEOUT_MS: 30000,
  RATE_LIMIT_MAX_REQUESTS: 60,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  SPLASH_MIN_DURATION_MS: 2000,
} as const;

// ── Default Payment Terms ──
export const DEFAULT_PAYMENT_TERMS = 14;

// ── Default Currency ──
export const DEFAULT_CURRENCY: CurrencyCode = 'CAD';

// ── Default Follow-Up Settings ──
export const DEFAULT_FOLLOW_UP_SETTINGS = {
  enabled: true,
  proposal_delay_days: 3,
  invoice_delay_days: 0,
  templates: {} as Record<string, string>,
  subject_templates: {} as Record<string, string>,
};

// ── Local Storage Keys ──
export const STORAGE_KEYS = {
  THEME: 'lance:theme',
  DENSITY: 'lance:density',
  ACCENT_COLOR: 'lance:accent-color',
  SEEDED: 'lance:seeded',
  SEEDED_TOAST_SHOWN: 'lance:seeded-toast-shown',
  TEMPLATES_SEEDED: 'lance:templates-seeded',
  TOUR_PENDING: 'lance:tour-pending',
  CHANGELOG_SEEN: 'lance:changelog-seen',
  LAST_TIMER_CONFIG: 'lance:last-timer-config',
  FOLLOW_UP_SETTINGS: 'lance:follow-up-settings',
  HAS_EXPORTED: 'lance:has-exported',
  AI_ENABLED: 'lance:ai-enabled',
} as const;

// ── Attachment Entity Types ──
export const ATTACHMENT_ENTITY_TYPE = {
  CLIENT: 'client',
  PROJECT: 'project',
  PROPOSAL: 'proposal',
  CONTRACT: 'contract',
  INVOICE: 'invoice',
  LIBRARY: 'library',
} as const;

export type AttachmentEntityType = (typeof ATTACHMENT_ENTITY_TYPE)[keyof typeof ATTACHMENT_ENTITY_TYPE];

// ── Rate Types ──
export const RATE_TYPE = {
  FLAT: 'flat',
  HOURLY: 'hourly',
} as const;

export type RateType = (typeof RATE_TYPE)[keyof typeof RATE_TYPE];

// ── Writing Styles ──
export const WRITING_STYLE = {
  PROFESSIONAL: 'professional',
  FRIENDLY: 'friendly',
  CREATIVE: 'creative',
  TECHNICAL: 'technical',
} as const;

export type WritingStyle = (typeof WRITING_STYLE)[keyof typeof WRITING_STYLE];

// ── Density Options ──
export const DENSITY = {
  COMFORTABLE: 'comfortable',
  COMPACT: 'compact',
} as const;

export type Density = (typeof DENSITY)[keyof typeof DENSITY];

// ── Follow-Up Template Keys ──
export const FOLLOW_UP_TEMPLATE_KEYS = {
  PROPOSAL_DAY3: 'proposal_day3',
  PROPOSAL_DAY7: 'proposal_day7',
  PROPOSAL_DAY14: 'proposal_day14',
  INVOICE_DAY1: 'invoice_day1',
  INVOICE_DAY7: 'invoice_day7',
  INVOICE_DAY14: 'invoice_day14',
} as const;

export type FollowUpTemplateKey = (typeof FOLLOW_UP_TEMPLATE_KEYS)[keyof typeof FOLLOW_UP_TEMPLATE_KEYS];

// ── Share Token Entity Types ──
export const SHARE_TOKEN_ENTITY_TYPE = {
  PROPOSAL: 'proposal',
  CONTRACT: 'contract',
} as const;

// ── Built-in Template Names (used for seeding checks) ──
export const BUILT_IN_TEMPLATE_NAMES = [
  'Web Design Project',
  'Brand Identity',
  'Copywriting Project',
  'Monthly Retainer',
  'Photography Package',
  'Development Sprint',
] as const;

// ── Dashboard max items to display ──
export const DASHBOARD_MAX_RECENT = 5;
export const DASHBOARD_MAX_FOLLOW_UPS = 3;
export const DASHBOARD_MAX_PORTAL_ACTIVITY = 5;

// ── Search / Command Palette ──
export const SEARCH_MAX_PER_GROUP: Record<string, number> = {
  client: 4,
  proposal: 4,
  project: 4,
  invoice: 4,
  contract: 4,
  time_entry: 3,
  expense: 3,
  asset: 3,
};

// ── File Import ──
export const MAX_PREVIEW_ROWS = 50;
export const SPREADSHEET_EXTS = ['xlsx', 'csv', 'xls'] as const;
export const DOCUMENT_EXTS = ['pdf', 'docx', 'doc'] as const;
export const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] as const;

// ── License Tiers ──
export const LICENSE_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  TRIAL: 'trial',
  EXPIRED: 'expired',
  OFFLINE_CACHED: 'cached',
  LEGACY_LIFETIME: 'lifetime',
} as const;

export type LicenseTier = (typeof LICENSE_TIERS)[keyof typeof LICENSE_TIERS];

// ── Trial Constants ──
export const TRIAL = {
  FULL_DAYS: 30,
  SOFT_DAY: 30,
  HARD_DAY: 37,
} as const;

// ── Feature Flags per Tier ──
export const FEATURE_FLAGS: Record<LicenseTier, Record<string, boolean>> = {
  [LICENSE_TIERS.FREE]: {
    contractPdf: true,
    docxExport: true,
    clientPortal: true,
    recurringInvoices: true,
    archetypeDepth: false,
    scopeCreepProtection: false,
    advancedInsights: false,
  },
  [LICENSE_TIERS.TRIAL]: {
    contractPdf: true,
    docxExport: true,
    clientPortal: true,
    recurringInvoices: true,
    archetypeDepth: true,
    scopeCreepProtection: true,
    advancedInsights: true,
  },
  [LICENSE_TIERS.PRO]: {
    contractPdf: true,
    docxExport: true,
    clientPortal: true,
    recurringInvoices: true,
    archetypeDepth: true,
    scopeCreepProtection: true,
    advancedInsights: true,
  },
  [LICENSE_TIERS.LEGACY_LIFETIME]: {
    contractPdf: true,
    docxExport: true,
    clientPortal: true,
    recurringInvoices: true,
    archetypeDepth: true,
    scopeCreepProtection: true,
    advancedInsights: true,
  },
  [LICENSE_TIERS.EXPIRED]: {
    contractPdf: true,
    docxExport: true,
    clientPortal: true,
    recurringInvoices: true,
    archetypeDepth: false,
    scopeCreepProtection: false,
    advancedInsights: false,
  },
  [LICENSE_TIERS.OFFLINE_CACHED]: {
    contractPdf: true,
    docxExport: true,
    clientPortal: true,
    recurringInvoices: true,
    archetypeDepth: false,
    scopeCreepProtection: false,
    advancedInsights: false,
  },
} as const;

// ── Feature Flag Helper ──
export function getFeatureFlags(tier: LicenseTier): Record<string, boolean> {
  return FEATURE_FLAGS[tier] ?? FEATURE_FLAGS[LICENSE_TIERS.FREE];
}
