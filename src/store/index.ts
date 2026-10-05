import { create } from 'zustand';
import type {
  Client,
  Project,
  Milestone,
  Proposal,
  Contract,
  TimeEntry,
  Invoice,
  InvoicePayment,
  LineItem,
  Expense,
  UserProfile,
  Communication,
  RecurringInvoice,
  ImportLog,
  Attachment,
  AssetStats,
  MetricDefinition,
  MetricValue,
  MetricTemplate,
  HeadlineMetric,
  FollowUpLog,
  FollowUpSettings,
  ExportTemplate,
  ContractTemplate,
  ArchetypeRenderLog,
  ArchetypeSession,
  ArchetypeShoot,
  ArchetypeRevision,
  ArchetypeBuild,
  ArchetypeKeyword,
  ArchetypeDataset,
  ProjectTemplate,
  ProjectTemplateMilestone,
  ShareToken,
  PortalActivity,
} from '../types';
import type { Achievement } from '../achievements/index';
import { validateLicenseKey } from '../license';
import { sanitizeInput, truncate, MAX_LENGTHS } from '../utils/sanitize';
import { DAY_MS } from '../utils/format';
import type { LicenseTier } from '../lib/constants';
import type { Update } from '@tauri-apps/plugin-updater';
import { TRIAL } from '../lib/constants';
import {
  pushTrashEntry,
  trashLabel,
  restoreTrashEntry as restoreTrashRow,
  type TrashEntry,
} from '../utils/trash';
import { sanitizeRates, normalizeRates } from '../lib/currency';

// Public URL of the license worker. Mirrors the value baked into the desktop
// binary via LANCE_LICENSE_WORKER_URL; needed here because browser mode has no
// Rust to make the request.
const LICENSE_WORKER_URL = 'https://lance-license.your-subdomain.workers.dev';

const licenseCache = new Map<string, boolean>();

// Re-validate a key every 7 days. Long enough that we are not pinging on every
// launch, short enough that a refund or a chargeback actually downgrades the
// install instead of waiting for a reinstall.
const LICENSE_REVALIDATE_MS = 7 * 24 * 60 * 60 * 1000;

/** True when the key has never been validated, or the last check is stale. */
function licenseValidationIsStale(validatedAt?: string | null): boolean {
  if (!validatedAt) return true;
  const at = new Date(validatedAt).getTime();
  if (Number.isNaN(at)) return true;
  return Date.now() - at > LICENSE_REVALIDATE_MS;
}

async function cachedValidateLicense(key: string): Promise<boolean> {
  if (licenseCache.has(key)) return licenseCache.get(key)!;
  const valid = await validateLicenseKey(key);
  licenseCache.set(key, valid);
  return valid;
}

const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  const { tauriInvoke } = await import('../utils/tauri');
  return tauriInvoke<T>(cmd, args);
};

/**
 * Best-effort teardown of share links when their entity is deleted.
 * Without this, links die as a confusing "not found", revoked links say
 * "revoked". Loops because several live links can exist per entity.
 */
async function revokeTokensForEntity(
  entityType: 'proposal' | 'contract',
  entityId: string,
): Promise<void> {
  for (let i = 0; i < 10; i++) {
    try {
      const tok = await invoke<{ token: string } | null>('get_share_token_for_entity', {
        entityType,
        entityId,
      });
      if (!tok) return;
      await invoke('revoke_share_token', { token: tok.token });
    } catch {
      return;
    }
  }
}

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'unlock';

type ToastAction = {
  label: string;
  onClick: () => void;
};

type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  actions?: ToastAction[];
};

const toastTimers = new Map<
  string,
  { timeoutId: ReturnType<typeof setTimeout>; startedAt: number; duration: number }
>();

function clearToastTimer(id: string) {
  const timer = toastTimers.get(id);
  if (timer) clearTimeout(timer.timeoutId);
}

type LoadingKey = string;
type ErrorKey = string;

export interface UnifiedStore {
  // ── Data (flat arrays) ──
  clients: Client[];
  projects: Project[];
  milestones: Milestone[];
  proposals: Proposal[];
  contracts: Contract[];
  timeEntries: TimeEntry[];
  invoices: Invoice[];
  payments: InvoicePayment[];
  expenses: Expense[];
  profile: UserProfile | null;
  profileLoaded: boolean;
  communications: Communication[];
  recurringInvoices: RecurringInvoice[];
  importHistory: ImportLog[];
  allAttachments: Attachment[];
  assetStats: AssetStats | null;
  metricDefs: MetricDefinition[];
  metricValues: MetricValue[];
  metricTemplates: MetricTemplate[];
  headlineMetrics: HeadlineMetric[];
  followUpLogs: Record<string, FollowUpLog[]>;
  pendingFollowUps: FollowUpLog[];
  portalActivity: PortalActivity[];
  followUpSettings: FollowUpSettings;
  exportTemplates: ExportTemplate[];
  contractTemplates: ContractTemplate[];
  projectTemplates: ProjectTemplate[];
  templateMilestones: ProjectTemplateMilestone[];
  renderLogs: ArchetypeRenderLog[];
  sessions: ArchetypeSession[];
  shoots: ArchetypeShoot[];
  revisions: ArchetypeRevision[];
  builds: ArchetypeBuild[];
  keywords: ArchetypeKeyword[];
  datasets: ArchetypeDataset[];
  shareTokens: ShareToken[];
  achievements: Achievement[];

  // ── Meta ──
  initialized: boolean;
  loading: Record<LoadingKey, boolean>;
  errors: Record<ErrorKey, string | null>;
  isLicensed: boolean;
  portalPort: number | null;
  portalFailed: boolean;
  archetypeAppliedAt: number | null;

  // ── Notifications ──
  toasts: Toast[];
  addToast: (
    message: string,
    type?: ToastType,
    duration?: number,
    actions?: ToastAction[],
  ) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, message: string) => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;

  // ── Updater ──
  updateAvailable: boolean;
  updateData: Update | null;
  isDownloading: boolean;
  downloadProgressMB: string | null;
  setUpdateAvailable: (data: Update) => void;
  setDownloading: (val: boolean) => void;
  setDownloadProgress: (mb: string) => void;
  dismissUpdate: () => void;

  // ── Init ──
  initialize: () => Promise<void>;

  // ── Clients ──
  loadClients: () => Promise<void>;
  createClient: (data: Omit<Client, 'id' | 'created_at'>) => Promise<Client>;
  updateClient: (data: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  // ── Projects ──
  loadProjects: () => Promise<void>;
  createProject: (data: Omit<Project, 'id' | 'created_at'>) => Promise<Project>;
  updateProject: (data: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // ── Milestones ──
  loadMilestones: () => Promise<void>;
  createMilestone: (data: Omit<Milestone, 'id'>) => Promise<Milestone>;
  updateMilestone: (data: Milestone) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;

  // ── Proposals ──
  loadProposals: () => Promise<void>;
  createProposal: (data: Omit<Proposal, 'id' | 'created_at'>) => Promise<Proposal>;
  updateProposal: (data: Proposal) => Promise<void>;
  deleteProposal: (id: string) => Promise<void>;

  // ── Contracts ──
  loadContracts: () => Promise<void>;
  createContract: (data: Omit<Contract, 'id' | 'created_at' | 'signed_at'>) => Promise<Contract>;
  updateContract: (data: Contract) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;

  // ── Time Entries ──
  loadTimeEntries: () => Promise<void>;
  createTimeEntry: (data: Omit<TimeEntry, 'id' | 'invoiced'>) => Promise<TimeEntry>;
  updateTimeEntry: (data: TimeEntry) => Promise<void>;
  deleteTimeEntry: (id: string) => Promise<void>;

  // ── Invoices ──
  loadInvoices: () => Promise<void>;
  createInvoice: (
    data: Omit<Invoice, 'id' | 'created_at' | 'paid_at' | 'line_items'> & {
      line_items: LineItem[];
    },
  ) => Promise<Invoice>;
  updateInvoice: (data: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  // ── Payments ──
  loadPayments: () => Promise<void>;
  createPayment: (data: {
    invoice_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference?: string;
    notes?: string;
  }) => Promise<InvoicePayment>;
  deletePayment: (id: string) => Promise<void>;

  // ── Expenses ──
  loadExpenses: () => Promise<void>;
  createExpense: (data: Omit<Expense, 'id'>) => Promise<Expense>;
  updateExpense: (data: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  restoreTrashEntry: (entry: TrashEntry) => Promise<void>;
  // ── Profile ──
  loadProfile: () => Promise<UserProfile | null>;
  saveProfile: (data: UserProfile) => Promise<void>;
  activateLicense: (key: string) => Promise<boolean>;
  removeLicense: () => Promise<void>;
  setPortalPort: (port: number) => void;
  setPortalFailed: () => void;
  setArchetypeAppliedAt: (ts: number) => void;

  // ── Communications ──
  loadCommunications: () => Promise<void>;
  createCommunication: (data: Omit<Communication, 'id' | 'created_at'>) => Promise<Communication>;
  updateCommunication: (id: string, summary: string) => Promise<void>;
  deleteCommunication: (id: string, clientId: string) => Promise<void>;

  // ── Recurring Invoices ──
  loadRecurringInvoices: () => Promise<void>;
  createRecurringInvoice: (
    data: Omit<RecurringInvoice, 'id' | 'created_at' | 'last_generated'>,
  ) => Promise<RecurringInvoice>;
  updateRecurringInvoice: (data: RecurringInvoice) => Promise<void>;
  deleteRecurringInvoice: (id: string) => Promise<void>;

  // ── Import ──
  loadImportHistory: () => Promise<void>;
  saveImportFile: (file: File) => Promise<string>;
  logImport: (data: Omit<ImportLog, 'id' | 'imported_at'>) => Promise<ImportLog>;
  getImportsDir: () => Promise<string>;

  // ── Attachments ──
  loadAllAttachments: () => Promise<void>;
  createAttachment: (data: Omit<Attachment, 'id' | 'created_at'>) => Promise<Attachment>;
  deleteAttachment: (id: string, entityType: string, entityId: string) => Promise<void>;
  saveAssetFile: (file: File) => Promise<string>;
  getAssetsDir: () => Promise<string>;
  renameAttachment: (id: string, newFilename: string) => Promise<Attachment>;
  moveAttachment: (
    id: string,
    entityType: string,
    entityId: string,
    oldEntityType: string,
    oldEntityId: string,
  ) => Promise<Attachment>;
  updateAttachmentMeta: (
    id: string,
    data: { tags?: string; notes?: string },
  ) => Promise<Attachment>;
  loadAssetStats: () => Promise<void>;
  searchAssets: (query: string) => Promise<Attachment[]>;

  // ── Metrics ──
  loadMetricDefs: () => Promise<void>;
  createMetricDef: (data: Omit<MetricDefinition, 'id' | 'created_at'>) => Promise<MetricDefinition>;
  updateMetricDef: (data: Omit<MetricDefinition, 'client_id' | 'created_at'>) => Promise<void>;
  deleteMetricDef: (id: string) => Promise<void>;
  loadMetricValues: (definitionId?: string, limit?: number) => Promise<void>;
  createMetricValue: (data: Omit<MetricValue, 'id' | 'created_at'>) => Promise<MetricValue>;
  deleteMetricValue: (id: string) => Promise<void>;
  loadHeadlineMetrics: () => Promise<void>;
  loadMetricTemplates: () => Promise<void>;
  saveMetricTemplate: (
    name: string,
    definitions: Omit<MetricDefinition, 'id' | 'client_id' | 'created_at'>[],
  ) => Promise<void>;
  deleteMetricTemplate: (id: string) => Promise<void>;
  applyMetricTemplate: (templateName: string, clientId: string) => Promise<void>;

  // ── Follow-ups ──
  loadFollowUpSettings: () => void;
  saveFollowUpSettings: (settings: Partial<FollowUpSettings>) => void;
  createFollowUp: (data: {
    entity_type: string;
    entity_id: string;
    stage: number;
  }) => Promise<FollowUpLog>;
  updateFollowUpStatus: (id: string, status: string, action?: string) => Promise<void>;
  loadPendingFollowUps: () => Promise<void>;
  /** Pending follow-ups whose invoice/proposal still exists. Deletes dismiss
      linked rows going forward, but legacy orphans (pre-dismissal rows,
      stress-test leftovers) stay pending in the DB forever — badge counts
      and lists must read through here so they agree. */
  getActiveFollowUps: () => FollowUpLog[];
  loadAllFollowUpLogs: () => Promise<void>;
  loadPortalActivity: () => Promise<void>;

  // ── Export Templates ──
  loadExportTemplates: () => Promise<void>;
  createExportTemplate: (
    data: Omit<ExportTemplate, 'id' | 'created_at'>,
  ) => Promise<ExportTemplate>;
  updateExportTemplate: (data: ExportTemplate) => Promise<void>;
  deleteExportTemplate: (id: string) => Promise<void>;

  // ── Contract Templates ──
  loadContractTemplates: () => Promise<void>;
  createContractTemplate: (
    data: Omit<ContractTemplate, 'id' | 'created_at'>,
  ) => Promise<ContractTemplate>;
  deleteContractTemplate: (id: string) => Promise<void>;

  // ── Project Templates ──
  loadProjectTemplates: () => Promise<void>;
  loadTemplateMilestones: (templateId: string) => Promise<void>;
  createProjectTemplate: (
    data: { name: string; description?: string; default_budget?: number; default_status?: string },
    milestones: { title: string; days_from_start: number; invoice_on_completion: boolean }[],
  ) => Promise<ProjectTemplate>;
  updateProjectTemplate: (
    id: string,
    data: { name?: string; description?: string; default_budget?: number; default_status?: string },
  ) => Promise<void>;
  deleteProjectTemplate: (id: string) => Promise<void>;

  // ── Archetype: Render Logs ──
  loadRenderLogs: () => Promise<void>;
  createRenderLog: (
    data: Omit<ArchetypeRenderLog, 'id' | 'created_at'>,
  ) => Promise<ArchetypeRenderLog>;
  deleteRenderLog: (id: string) => Promise<void>;

  // ── Archetype: Sessions ──
  loadSessions: (clientId?: string, projectId?: string) => Promise<void>;
  createSession: (data: Omit<ArchetypeSession, 'id' | 'created_at'>) => Promise<ArchetypeSession>;
  deleteSession: (id: string) => Promise<void>;

  // ── Archetype: Shoots ──
  loadShoots: () => Promise<void>;
  createShoot: (data: Omit<ArchetypeShoot, 'id' | 'created_at'>) => Promise<ArchetypeShoot>;
  deleteShoot: (id: string) => Promise<void>;

  // ── Archetype: Revisions ──
  loadRevisions: () => Promise<void>;
  createRevision: (
    data: Omit<ArchetypeRevision, 'id' | 'created_at'>,
  ) => Promise<ArchetypeRevision>;
  deleteRevision: (id: string) => Promise<void>;

  // ── Archetype: Builds ──
  loadBuilds: () => Promise<void>;
  createBuild: (data: Omit<ArchetypeBuild, 'id' | 'created_at'>) => Promise<ArchetypeBuild>;
  deleteBuild: (id: string) => Promise<void>;

  // ── Archetype: Keywords ──
  loadKeywords: () => Promise<void>;
  createKeyword: (data: Omit<ArchetypeKeyword, 'id' | 'created_at'>) => Promise<ArchetypeKeyword>;
  updateKeyword: (
    id: string,
    clientId: string,
    positionCurrent?: number,
    targetPosition?: number,
  ) => Promise<void>;
  deleteKeyword: (id: string, clientId: string) => Promise<void>;

  // ── Archetype: Datasets ──
  loadDatasets: () => Promise<void>;
  createDataset: (data: Omit<ArchetypeDataset, 'id' | 'created_at'>) => Promise<ArchetypeDataset>;
  deleteDataset: (id: string) => Promise<void>;

  // ── Backward compatibility aliases (old add→create, remove→delete) ──
  addClient: (data: Omit<Client, 'id' | 'created_at'>) => Promise<Client>;
  addProject: (data: Omit<Project, 'id' | 'created_at'>) => Promise<Project>;
  addMilestone: (data: Omit<Milestone, 'id'>) => Promise<Milestone>;
  addProposal: (data: Omit<Proposal, 'id' | 'created_at'>) => Promise<Proposal>;
  addContract: (data: Omit<Contract, 'id' | 'created_at' | 'signed_at'>) => Promise<Contract>;
  addTimeEntry: (data: Omit<TimeEntry, 'id' | 'invoiced'>) => Promise<TimeEntry>;
  addInvoice: (
    data: Omit<Invoice, 'id' | 'created_at' | 'paid_at' | 'line_items'> & {
      line_items: LineItem[];
    },
  ) => Promise<Invoice>;
  addPayment: (data: {
    invoice_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference?: string;
    notes?: string;
  }) => Promise<InvoicePayment>;
  addExpense: (data: Omit<Expense, 'id'>) => Promise<Expense>;
  addCommunication: (data: Communication) => Promise<Communication>;
  addRecurringInvoice: (
    data: Omit<RecurringInvoice, 'id' | 'created_at' | 'last_generated'>,
  ) => Promise<RecurringInvoice>;
  addAttachment: (data: Omit<Attachment, 'id' | 'created_at'>) => Promise<Attachment>;
  addMetricDef: (data: Omit<MetricDefinition, 'id' | 'created_at'>) => Promise<MetricDefinition>;
  addExportTemplate: (data: Omit<ExportTemplate, 'id' | 'created_at'>) => Promise<ExportTemplate>;
  addContractTemplate: (
    data: Omit<ContractTemplate, 'id' | 'created_at'>,
  ) => Promise<ContractTemplate>;
  addProjectTemplate: (
    data: { name: string; description?: string; default_budget?: number; default_status?: string },
    milestones: { title: string; days_from_start: number; invoice_on_completion: boolean }[],
  ) => Promise<ProjectTemplate>;
  addRenderLog: (
    data: Omit<ArchetypeRenderLog, 'id' | 'created_at'>,
  ) => Promise<ArchetypeRenderLog>;
  addSession: (data: Omit<ArchetypeSession, 'id' | 'created_at'>) => Promise<ArchetypeSession>;
  addShoot: (data: Omit<ArchetypeShoot, 'id' | 'created_at'>) => Promise<ArchetypeShoot>;
  addRevision: (data: Omit<ArchetypeRevision, 'id' | 'created_at'>) => Promise<ArchetypeRevision>;
  addBuild: (data: Omit<ArchetypeBuild, 'id' | 'created_at'>) => Promise<ArchetypeBuild>;
  addKeyword: (data: Omit<ArchetypeKeyword, 'id' | 'created_at'>) => Promise<ArchetypeKeyword>;
  addDataset: (data: Omit<ArchetypeDataset, 'id' | 'created_at'>) => Promise<ArchetypeDataset>;

  removeClient: (id: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  removeMilestone: (id: string) => Promise<void>;
  removeProposal: (id: string) => Promise<void>;
  removeContract: (id: string) => Promise<void>;
  removeTimeEntry: (id: string) => Promise<void>;
  removeInvoice: (id: string) => Promise<void>;
  removePayment: (id: string, invoiceId: string) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  removeCommunication: (id: string, clientId: string) => Promise<void>;
  removeRecurringInvoice: (id: string) => Promise<void>;
  removeAttachment: (id: string, entityType: string, entityId: string) => Promise<void>;
  removeMetricDef: (id: string, clientId: string) => Promise<void>;
  removeMetricValue: (id: string, definitionId: string) => Promise<void>;
  removeMetricTemplate: (id: string) => Promise<void>;
  removeExportTemplate: (id: string) => Promise<void>;
  removeContractTemplate: (id: string) => Promise<void>;
  removeProjectTemplate: (id: string) => Promise<void>;
  removeRenderLog: (id: string, projectId: string) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  removeShoot: (id: string, projectId: string) => Promise<void>;
  removeRevision: (id: string, projectId: string) => Promise<void>;
  removeBuild: (id: string, projectId: string) => Promise<void>;
  removeKeyword: (id: string, clientId: string) => Promise<void>;
  removeDataset: (id: string, projectId: string) => Promise<void>;

  logFollowUp: (data: {
    entity_type: string;
    entity_id: string;
    stage: number;
  }) => Promise<FollowUpLog>;
  logMetricValue: (data: Omit<MetricValue, 'id' | 'created_at'>) => Promise<MetricValue>;
  loadAllPayments: () => Promise<void>;
  projectTemplateMilestones: Record<string, ProjectTemplateMilestone[]>;

  // ── Computed selectors ──
  getClientProjects: (clientId: string) => Project[];
  getProjectTimeEntries: (projectId: string) => TimeEntry[];
  getClientInvoices: (clientId: string) => Invoice[];
  getInvoicePayments: (invoiceId: string) => InvoicePayment[];
  getProjectMilestones: (projectId: string) => Milestone[];
  getClientCommunications: (clientId: string) => Communication[];
  getClientMetrics: (clientId: string) => { defs: MetricDefinition[]; values: MetricValue[] };
  getInvoiceBalance: (invoiceId: string) => number;
  getUnpaidInvoices: () => Invoice[];
  getPendingProposals: () => Proposal[];
  getActiveContracts: () => Contract[];
  getUpcomingFollowUps: (days?: number) => FollowUpLog[];
  getProjectMetrics: (projectId: string) => {
    totalTime: number;
    totalBillable: number;
    totalInvoiced: number;
    milestoneProgress: number;
  };
  getFinanceSummary: () => {
    paidFromPayments: number;
    totalExpenses: number;
    totalPaidRevenue: number;
    totalInvoiced: number;
    totalOutstanding: number;
    profit: number;
  };

  // ── License / Trial / Grace ──
  initLicenseFlow: () => Promise<void>;
  pingLicenseServer: () => Promise<void>;
  startTrial: () => Promise<'started' | 'already' | 'expired' | 'licensed' | 'no-profile'>;
  isTier: (tier: string) => boolean;
  getActiveTier: () => LicenseTier;
  getFeatureFlags: () => Promise<Record<string, boolean>>;
  // ── Test mode (dev + trial builds only; see demo/testMode.ts) ──
  testMode: { active: boolean; tier: LicenseTier | null };
  enableTestMode: (tier: LicenseTier) => Promise<void>;
  setTestTier: (tier: LicenseTier) => void;
  setTestTrialClock: (daysAgo: number | null) => Promise<void>;
  disableTestMode: () => Promise<void>;
}

export type AppStore = UnifiedStore;

export const useStore = create<UnifiedStore>((set, get) => {
  const startLoad = (key: LoadingKey) => {
    const s = get();
    // A (re)load clears its own stale failure: otherwise a recovered load
    // leaves the error banner up forever. Loading and error keys share
    // names by convention ('clients', 'timeEntries', …).
    set({
      loading: { ...s.loading, [key]: true },
      errors: s.errors[key] ? { ...s.errors, [key]: null } : s.errors,
    });
  };
  const endLoad = (key: LoadingKey) => set({ loading: { ...get().loading, [key]: false } });
  const setError = (key: ErrorKey, err: string | null) =>
    set({ errors: { ...get().errors, [key]: err } });

  /** Parse a TEXT-column string list defensively: one corrupt row degrades
   *  to [] instead of failing the whole table load. */
  function parseStringList(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw !== 'string') return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  function parseLineItems<T extends Invoice | RecurringInvoice>(inv: T): T {
    const lineItems = inv.line_items as unknown;
    if (typeof lineItems !== 'string') return inv;
    // One hand-edited or legacy-corrupt row must not brick the whole
    // invoice list (raw.map(parseLineItems) throws on the first bad row,
    // leaving the screen empty behind a load-error banner).
    try {
      const parsed: unknown = JSON.parse(lineItems);
      if (!Array.isArray(parsed)) return { ...inv, line_items: [] as unknown as T['line_items'] };
      return { ...inv, line_items: parsed as T['line_items'] };
    } catch {
      console.warn('[store] dropping corrupt line_items for invoice', inv.id);
      return { ...inv, line_items: [] as unknown as T['line_items'] };
    }
  }

  /** Snapshot a row into the trash bin before a destructive delete. */
  function snapshotForTrash(
    table: string,
    id: string,
    row: Record<string, unknown> | undefined,
  ): void {
    if (!row) return;
    try {
      pushTrashEntry(table, id, trashLabel(table, row), { ...row });
    } catch {
      /* trash is best-effort; the delete still proceeds */
    }
  }

  return {
    // ── Data init ──
    clients: [],
    projects: [],
    milestones: [],
    proposals: [],
    contracts: [],
    timeEntries: [],
    invoices: [],
    payments: [],
    expenses: [],
    profile: null,
    profileLoaded: false,
    communications: [],
    recurringInvoices: [],
    importHistory: [],
    allAttachments: [],
    assetStats: null,
    metricDefs: [],
    metricValues: [],
    metricTemplates: [],
    headlineMetrics: [],
    followUpLogs: {},
    pendingFollowUps: [],
    portalActivity: [],
    followUpSettings: {
      enabled: true,
      proposal_delay_days: 3,
      invoice_delay_days: 0,
      templates: {},
      subject_templates: {},
    },
    exportTemplates: [],
    contractTemplates: [],
    projectTemplates: [],
    templateMilestones: [],
    renderLogs: [],
    sessions: [],
    shoots: [],
    revisions: [],
    builds: [],
    keywords: [],
    datasets: [],
    shareTokens: [],
    achievements: [],

    // ── Meta init ──
    initialized: false,
    loading: {},
    errors: {},
    isLicensed: false,
    portalPort: null,
    portalFailed: false,
    archetypeAppliedAt: null,

    // ── Toasts init ──
    toasts: [],
    addToast: (message, type = 'info', duration, actions) => {
      const id = crypto.randomUUID();
      const ms = duration ?? (actions ? 0 : type === 'unlock' ? 4000 : 3000);
      // Deduplicate identical transient toasts (triple-click saves, retry
      // loops): refresh the existing one's timer instead of stacking three
      // copies. Interactive toasts (actions) always stand alone.
      if (!actions && ms !== 0) {
        const dupe = get().toasts.find(
          (t) => t.message === message && t.type === type && !t.actions,
        );
        if (dupe) {
          clearToastTimer(dupe.id);
          toastTimers.delete(dupe.id);
          const timeoutId = setTimeout(() => {
            toastTimers.delete(dupe.id);
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== dupe.id) }));
          }, ms);
          toastTimers.set(dupe.id, { timeoutId, startedAt: Date.now(), duration: ms });
          return dupe.id;
        }
      }
      set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, type, duration, actions }] }));
      if (ms === 0) return id;
      const timeoutId = setTimeout(() => {
        toastTimers.delete(id);
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, ms);
      toastTimers.set(id, { timeoutId, startedAt: Date.now(), duration: ms });
      return id;
    },
    removeToast: (id) => {
      clearToastTimer(id);
      toastTimers.delete(id);
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },
    updateToast: (id, message) => {
      set((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, message } : t)) }));
    },
    pauseToast: (id) => {
      const timer = toastTimers.get(id);
      if (!timer) return;
      clearTimeout(timer.timeoutId);
      const elapsed = Date.now() - timer.startedAt;
      timer.duration = Math.max(0, timer.duration - elapsed);
      timer.startedAt = 0;
    },
    resumeToast: (id) => {
      const timer = toastTimers.get(id);
      if (!timer) return;
      const ms = timer.duration;
      const startedAt = Date.now();
      const timeoutId = setTimeout(() => {
        toastTimers.delete(id);
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, ms);
      toastTimers.set(id, { timeoutId, startedAt, duration: ms });
    },

    // ── Updater init ──
    updateAvailable: false,
    updateData: null,
    isDownloading: false,
    downloadProgressMB: null,
    setUpdateAvailable: (data) => set({ updateAvailable: true, updateData: data }),
    setDownloading: (val) => set({ isDownloading: val }),
    setDownloadProgress: (mb) => set({ downloadProgressMB: mb }),
    dismissUpdate: () =>
      set({
        updateAvailable: false,
        updateData: null,
        isDownloading: false,
        downloadProgressMB: null,
      }),

    // ── Init ──
    initialize: async () => {
      if (get().initialized) return;
      const profile = await get().loadProfile();
      if (!profile) return;
      await Promise.all([
        get().loadClients(),
        get().loadProjects(),
        get().loadProposals(),
        get().loadContracts(),
        get().loadTimeEntries(),
        get().loadInvoices(),
        get().loadExpenses(),
        get().loadRecurringInvoices(),
        get().loadMilestones(),
        get().loadCommunications(),
        get().loadImportHistory(),
        get().loadAllAttachments(),
        get().loadAssetStats(),
        get().loadHeadlineMetrics(),
        get().loadMetricTemplates(),
        get().loadPendingFollowUps(),
        get().loadExportTemplates(),
        get().loadContractTemplates(),
        get().loadProjectTemplates(),
        get().loadRenderLogs(),
        get().loadSessions(),
        get().loadShoots(),
        get().loadRevisions(),
        get().loadBuilds(),
        get().loadKeywords(),
        get().loadDatasets(),
        get().loadMetricDefs(),
        get().loadMetricValues(),
      ]);
      set({ initialized: true });
    },

    // ── Clients ──
    loadClients: async () => {
      startLoad('clients');
      try {
        set({ clients: await invoke<Client[]>('get_clients') });
      } catch (e) {
        console.error('[store] loadClients failed:', e);
        setError('clients', String(e));
      } finally {
        endLoad('clients');
      }
    },
    createClient: async (data) => {
      const client = await invoke<Client>('create_client', { payload: data });
      set({ clients: [...get().clients, client] });
      return client;
    },
    updateClient: async (data) => {
      await invoke('update_client', { payload: data });
      set({ clients: get().clients.map((c) => (c.id === data.id ? data : c)) });
    },
    deleteClient: async (id) => {
      // Neither backend cascades core tables (the browser mock has no FK
      // enforcement; SQLite FKs mostly lack ON DELETE CASCADE), so blocking
      // here keeps both backends identical: no silent orphans in browser,
      // no raw constraint errors in Tauri. Lists are (re)loaded first so the
      // check never passes on stale/empty state.
      //
      // time_entries + communications are in this list because the browser
      // shim's delete_client DOES cascade them: deleting a client used to
      // wipe their logged billable hours and notes with no warning, while
      // the in-memory store kept showing them until the next reload, so the
      // hours silently disappeared after a refresh. Blocking here is the only
      // outcome that is honest in both backends.
      await Promise.all([
        get().loadProjects(),
        get().loadInvoices(),
        get().loadProposals(),
        get().loadContracts(),
        get().loadRecurringInvoices(),
        get().loadTimeEntries(),
        get().loadCommunications(),
        get().loadKeywords(),
      ]);
      const s = get();
      const linked: string[] = [];
      const count = (n: number, one: string, many: string) => {
        if (n > 0) linked.push(`${n} ${n === 1 ? one : many}`);
      };
      count(s.projects.filter((p) => p.client_id === id).length, 'project', 'projects');
      count(s.invoices.filter((i) => i.client_id === id).length, 'invoice', 'invoices');
      count(s.proposals.filter((p) => p.client_id === id).length, 'proposal', 'proposals');
      count(s.contracts.filter((c) => c.client_id === id).length, 'contract', 'contracts');
      count(
        s.recurringInvoices.filter((r) => r.client_id === id).length,
        'recurring invoice',
        'recurring invoices',
      );
      count(s.timeEntries.filter((t) => t.client_id === id).length, 'time entry', 'time entries');
      count(
        s.communications.filter((c) => c.client_id === id).length,
        'communication',
        'communications',
      );
      // Keywords are client-scoped (ArchetypeKeyword has client_id, no
      // project_id), so the shim's cascade wipes them with the client too.
      count(s.keywords.filter((k) => k.client_id === id).length, 'keyword', 'keywords');
      if (linked.length > 0) {
        throw new Error(
          `Cannot delete this client, ${linked.join(', ')} still linked. Delete those first.`,
        );
      }
      snapshotForTrash(
        'clients',
        id,
        get().clients.find((c) => c.id === id),
      );
      await invoke('delete_client', { id });
      set({ clients: get().clients.filter((c) => c.id !== id) });
    },

    // ── Projects ──
    loadProjects: async () => {
      startLoad('projects');
      try {
        set({ projects: await invoke<Project[]>('get_projects') });
      } catch (e) {
        console.error('[store] loadProjects failed:', e);
        setError('projects', String(e));
      } finally {
        endLoad('projects');
      }
    },
    createProject: async (data) => {
      const project = await invoke<Project>('create_project', { payload: data });
      set({ projects: [...get().projects, project] });
      return project;
    },
    updateProject: async (data) => {
      await invoke('update_project', { payload: data });
      set({ projects: get().projects.map((p) => (p.id === data.id ? data : p)) });
    },
    deleteProject: async (id) => {
      // Same reasoning as deleteClient: the browser shim cascades every
      // project_id-scoped row, so anything NOT checked here is destroyed
      // silently. That includes the archetype work logs (shoot logs, build
      // logs, revision rounds, sessions, keyword rankings, dataset versions,
      // render passes) — real billable history, not scratch data.
      await Promise.all([
        get().loadMilestones(),
        get().loadTimeEntries(),
        get().loadInvoices(),
        get().loadProposals(),
        get().loadRecurringInvoices(),
        get().loadShoots(),
        get().loadBuilds(),
        get().loadRevisions(),
        get().loadSessions(),
        get().loadKeywords(),
        get().loadDatasets(),
        get().loadRenderLogs(),
      ]);
      const s = get();
      const linked: string[] = [];
      const count = (n: number, one: string, many: string) => {
        if (n > 0) linked.push(`${n} ${n === 1 ? one : many}`);
      };
      count(s.milestones.filter((m) => m.project_id === id).length, 'milestone', 'milestones');
      count(s.timeEntries.filter((t) => t.project_id === id).length, 'time entry', 'time entries');
      count(s.invoices.filter((i) => i.project_id === id).length, 'invoice', 'invoices');
      count(s.proposals.filter((p) => p.project_id === id).length, 'proposal', 'proposals');
      count(
        s.recurringInvoices.filter((r) => r.project_id === id).length,
        'recurring invoice',
        'recurring invoices',
      );
      count(s.shoots.filter((x) => x.project_id === id).length, 'shoot log', 'shoot logs');
      count(s.builds.filter((x) => x.project_id === id).length, 'build log', 'build logs');
      count(
        s.revisions.filter((x) => x.project_id === id).length,
        'revision round',
        'revision rounds',
      );
      count(
        s.sessions.filter((x) => x.project_id === id).length,
        'session log',
        'session logs',
      );
      count(s.datasets.filter((x) => x.project_id === id).length, 'dataset', 'datasets');
      count(
        s.renderLogs.filter((x) => x.project_id === id).length,
        'render pass',
        'render passes',
      );
      if (linked.length > 0) {
        throw new Error(
          `Cannot delete this project, ${linked.join(', ')} still linked. Delete those first.`,
        );
      }
      snapshotForTrash(
        'projects',
        id,
        get().projects.find((p) => p.id === id),
      );
      await invoke('delete_project', { id });
      set({ projects: get().projects.filter((p) => p.id !== id) });
    },

    // ── Milestones ──
    loadMilestones: async () => {
      startLoad('milestones');
      try {
        set({ milestones: await invoke<Milestone[]>('get_milestones') });
      } catch (e) {
        console.error('[store] loadMilestones failed:', e);
        setError('milestones', String(e));
      } finally {
        endLoad('milestones');
      }
    },
    createMilestone: async (data) => {
      const milestone = await invoke<Milestone>('create_milestone', { payload: data });
      set({ milestones: [...get().milestones, milestone] });
      return milestone;
    },
    updateMilestone: async (data) => {
      await invoke('update_milestone', { payload: data });
      set({ milestones: get().milestones.map((m) => (m.id === data.id ? data : m)) });
    },
    deleteMilestone: async (id) => {
      snapshotForTrash(
        'milestones',
        id,
        get().milestones.find((m) => m.id === id),
      );
      await invoke('delete_milestone', { id });
      set({ milestones: get().milestones.filter((m) => m.id !== id) });
    },

    // ── Proposals ──
    loadProposals: async () => {
      startLoad('proposals');
      try {
        set({ proposals: await invoke<Proposal[]>('get_proposals') });
      } catch (e) {
        console.error('[store] loadProposals failed:', e);
        setError('proposals', String(e));
      } finally {
        endLoad('proposals');
      }
    },
    createProposal: async (data) => {
      const proposal = await invoke<Proposal>('create_proposal', { payload: data });
      set({ proposals: [...get().proposals, proposal] });
      return proposal;
    },
    updateProposal: async (data) => {
      const prev = get().proposals.find((p) => p.id === data.id);
      await invoke('update_proposal', { payload: data });
      set({ proposals: get().proposals.map((p) => (p.id === data.id ? data : p)) });
      // Terminal states retire open nudges: a pending "chase this proposal"
      // after accept/decline/expiry is embarrassing. Status (not delete) so
      // the history guard never re-drafts the same stage.
      if (prev && prev.status === 'sent' && data.status !== 'sent') {
        const terminal =
          data.status === 'accepted' || data.status === 'declined' ? 'responded' : 'dismissed';
        try {
          for (const l of get().pendingFollowUps.filter(
            (f) => f.entity_type === 'proposal' && f.entity_id === data.id,
          )) {
            await get().updateFollowUpStatus(l.id, terminal, 'auto-resolved');
          }
        } catch {
          /* resolution stands even if nudge cleanup fails */
        }
      }
    },
    deleteProposal: async (id) => {
      snapshotForTrash(
        'proposals',
        id,
        get().proposals.find((p) => p.id === id),
      );
      await invoke('delete_proposal', { id });
      set({ proposals: get().proposals.filter((p) => p.id !== id) });
      await revokeTokensForEntity('proposal', id);
      try {
        for (const l of get().pendingFollowUps.filter(
          (f) => f.entity_type === 'proposal' && f.entity_id === id,
        )) {
          await get().updateFollowUpStatus(l.id, 'dismissed', 'auto-resolved');
        }
      } catch {
        /* deletion stands */
      }
    },

    // ── Contracts ──
    loadContracts: async () => {
      startLoad('contracts');
      try {
        set({ contracts: await invoke<Contract[]>('get_contracts') });
      } catch (e) {
        console.error('[store] loadContracts failed:', e);
        setError('contracts', String(e));
      } finally {
        endLoad('contracts');
      }
    },
    createContract: async (data) => {
      const contract = await invoke<Contract>('create_contract', { payload: data });
      set({ contracts: [...get().contracts, contract] });
      return contract;
    },
    updateContract: async (data) => {
      await invoke('update_contract', { payload: data });
      set({ contracts: get().contracts.map((c) => (c.id === data.id ? data : c)) });
    },
    deleteContract: async (id) => {
      snapshotForTrash(
        'contracts',
        id,
        get().contracts.find((c) => c.id === id),
      );
      await invoke('delete_contract', { id });
      set({ contracts: get().contracts.filter((c) => c.id !== id) });
      await revokeTokensForEntity('contract', id);
    },

    // ── Time Entries ──
    loadTimeEntries: async () => {
      startLoad('timeEntries');
      try {
        set({ timeEntries: await invoke<TimeEntry[]>('get_time_entries') });
      } catch (e) {
        console.error('[store] loadTimeEntries failed:', e);
        setError('timeEntries', String(e));
      } finally {
        endLoad('timeEntries');
      }
    },
    createTimeEntry: async (data) => {
      const entry = await invoke<TimeEntry>('create_time_entry', { payload: data });
      set({ timeEntries: [...get().timeEntries, entry] });
      return entry;
    },
    updateTimeEntry: async (data) => {
      await invoke('update_time_entry', { payload: data });
      set({ timeEntries: get().timeEntries.map((t) => (t.id === data.id ? data : t)) });
    },
    deleteTimeEntry: async (id) => {
      // Billed hours belong to an invoice: deleting the entry would hide
      // hours the client was charged for while the invoice keeps billing
      // them. Block when a live invoice references this entry (line-item
      // linkage); legacy flagged rows with no live link may go.
      await get().loadInvoices();
      const linker = get().invoices.find((inv) => {
        const items = Array.isArray(inv.line_items) ? inv.line_items : [];
        return items.some((li) => (li.time_entry_ids || []).includes(id));
      });
      if (linker) {
        throw new Error(
          `Cannot delete, this time is billed on ${linker.invoice_number}. Adjust or delete the invoice first.`,
        );
      }
      snapshotForTrash(
        'time_entries',
        id,
        get().timeEntries.find((t) => t.id === id),
      );
      await invoke('delete_time_entry', { id });
      set({ timeEntries: get().timeEntries.filter((t) => t.id !== id) });
    },

    // ── Invoices ──
    loadInvoices: async () => {
      startLoad('invoices');
      try {
        const raw = await invoke<Invoice[]>('get_invoices');
        set({ invoices: raw.map(parseLineItems) });
      } catch (e) {
        console.error('[store] loadInvoices failed:', e);
        setError('invoices', String(e));
      } finally {
        endLoad('invoices');
      }
    },
    createInvoice: async (data) => {
      const payload = { ...data, line_items: JSON.stringify(data.line_items) };
      const invoice = await invoke<Invoice>('create_invoice', { payload });
      const parsed = parseLineItems(invoice);
      set({ invoices: [...get().invoices, parsed] });
      return parsed;
    },
    updateInvoice: async (data) => {
      const payload = { ...data, line_items: JSON.stringify(data.line_items) };
      const prev = get().invoices.find((i) => i.id === data.id);
      await invoke('update_invoice', { payload });
      set({ invoices: get().invoices.map((i) => (i.id === data.id ? data : i)) });
      // Paid invoices retire open dunning for the same reason as proposals.
      if (prev && prev.status !== 'paid' && data.status === 'paid') {
        try {
          for (const l of get().pendingFollowUps.filter(
            (f) => f.entity_type === 'invoice' && f.entity_id === data.id,
          )) {
            await get().updateFollowUpStatus(l.id, 'paid', 'auto-resolved');
          }
        } catch {
          /* resolution stands even if nudge cleanup fails */
        }
      }
    },
    deleteInvoice: async (id) => {
      // Payments are money records: resurrecting an invoice without them
      // (trash holds only the invoice row) would corrupt paid status, and
      // no backend cascades them, so block until they are removed first.
      await get().loadPayments();
      const n = get().payments.filter((p) => p.invoice_id === id).length;
      if (n > 0) {
        throw new Error(
          `Cannot delete this invoice, ${n} payment${n === 1 ? '' : 's'} recorded. Delete the payment${n === 1 ? '' : 's'} first.`,
        );
      }
      snapshotForTrash(
        'invoices',
        id,
        get().invoices.find((i) => i.id === id),
      );
      // Unmark billed hours: line items remember their time entries, so the
      // hours return to unbilled instead of vanishing. Entries deleted since
      // are simply skipped. Pre-linkage invoices have no ids, nothing to do.
      const doomed = get().invoices.find((i) => i.id === id);
      const doomedItems = Array.isArray(doomed?.line_items) ? doomed.line_items : [];
      const linkedEntryIds = new Set(doomedItems.flatMap((li) => li.time_entry_ids || []));
      await invoke('delete_invoice', { id });
      set({ invoices: get().invoices.filter((i) => i.id !== id) });
      if (linkedEntryIds.size > 0) {
        try {
          await get().loadTimeEntries();
          await Promise.allSettled(
            get()
              .timeEntries.filter((t) => linkedEntryIds.has(t.id) && t.invoiced)
              .map((t) => get().updateTimeEntry({ ...t, invoiced: false })),
          );
        } catch {
          /* deletion stands even if unmarking fails */
        }
      }
      try {
        for (const l of get().pendingFollowUps.filter(
          (f) => f.entity_type === 'invoice' && f.entity_id === id,
        )) {
          await get().updateFollowUpStatus(l.id, 'dismissed', 'auto-resolved');
        }
      } catch {
        /* deletion stands */
      }
    },

    // ── Payments ──
    loadPayments: async () => {
      startLoad('payments');
      try {
        set({ payments: await invoke<InvoicePayment[]>('get_all_invoice_payments') });
      } catch (e) {
        console.error('[store] loadPayments failed:', e);
        setError('payments', String(e));
      } finally {
        endLoad('payments');
      }
    },
    createPayment: async (data) => {
      const payment = await invoke<InvoicePayment>('create_invoice_payment', { payload: data });
      set({ payments: [...get().payments, payment] });
      return payment;
    },
    deletePayment: async (id) => {
      await invoke('delete_invoice_payment', { id });
      set({ payments: get().payments.filter((p) => p.id !== id) });
    },

    // ── Expenses ──
    loadExpenses: async () => {
      startLoad('expenses');
      try {
        set({ expenses: await invoke<Expense[]>('get_expenses') });
      } catch (e) {
        console.error('[store] loadExpenses failed:', e);
        setError('expenses', String(e));
      } finally {
        endLoad('expenses');
      }
    },
    createExpense: async (data) => {
      const expense = await invoke<Expense>('create_expense', { payload: data });
      set({ expenses: [...get().expenses, expense] });
      return expense;
    },
    updateExpense: async (data) => {
      await invoke('update_expense', { payload: data });
      set({ expenses: get().expenses.map((e) => (e.id === data.id ? data : e)) });
    },
    deleteExpense: async (id) => {
      snapshotForTrash(
        'expenses',
        id,
        get().expenses.find((e) => e.id === id),
      );
      await invoke('delete_expense', { id });
      set({ expenses: get().expenses.filter((e) => e.id !== id) });
    },
    restoreTrashEntry: async (entry) => {
      const table = await restoreTrashRow(entry);
      const reload: Record<string, () => Promise<void>> = {
        clients: get().loadClients,
        projects: get().loadProjects,
        milestones: get().loadMilestones,
        proposals: get().loadProposals,
        contracts: get().loadContracts,
        time_entries: get().loadTimeEntries,
        invoices: get().loadInvoices,
        expenses: get().loadExpenses,
      };
      await reload[table]?.();
    },

    // ── Profile ──
    loadProfile: async () => {
      startLoad('profile');
      try {
        const profile = await invoke<UserProfile | null>('get_user_profile');
        // Tauri stores rates as a TEXT column (JSON string); browser mode
        // keeps the object. Normalize once so the UI always sees an object.
        if (profile && profile.exchange_rates !== undefined) {
          profile.exchange_rates = normalizeRates(profile.exchange_rates);
        }
        const licensed = !!(
          profile?.license_key && (await cachedValidateLicense(profile.license_key))
        );
        set({ profile, profileLoaded: true, isLicensed: licensed });
        // Rehydrate test mode across reloads: the flag outlives the page,
        // and loadProfile is the real boot entry point. Guarded by the
        // build-time constant, not a runtime check, an unguarded rehydrate
        // here meant one localStorage write granted permanent Pro in a
        // production desktop build.
        if (__TEST_MODE__) {
          try {
            const { loadTestMode } = await import('../demo/testMode');
            const persisted = loadTestMode();
            if (persisted.active && persisted.tier) {
              set({ testMode: persisted, isLicensed: true });
            }
          } catch {
            /* test mode stays off */
          }
        }
        return profile;
      } catch (e) {
        console.error('[store] loadProfile failed:', e);
        set({ profileLoaded: true, profile: null });
        return null;
      } finally {
        endLoad('profile');
      }
    },
    saveProfile: async (data) => {
      // Exchange rates are defined relative to the profile currency, and
      // most callers (Settings form, onboarding, archetype picker) don't
      // carry them, so an omitted field must INHERIT, not wipe. The one
      // exception: the base currency itself changed, which silently
      // invalidates stored rates ("per old base"), then they are cleared
      // with an explanatory toast instead of misconverting.
      const prevCurrency = get().profile?.currency;
      const incomingRates =
        data.exchange_rates !== undefined
          ? sanitizeRates(data.exchange_rates)
          : sanitizeRates(get().profile?.exchange_rates || {});
      let effectiveRates = incomingRates;
      let ratesNote: string | null = null;
      if (
        prevCurrency &&
        data.currency &&
        prevCurrency !== data.currency &&
        Object.keys(incomingRates).length > 0
      ) {
        effectiveRates = {};
        ratesNote = `Currency changed ${prevCurrency} → ${data.currency}: exchange rates were cleared. Re-enter them under Finance.`;
      }
      const sanitized: UserProfile = {
        ...data,
        name: truncate(sanitizeInput(data.name || ''), MAX_LENGTHS.name),
        email: truncate(sanitizeInput(data.email || ''), MAX_LENGTHS.email),
        writing_voice: sanitizeInput(data.writing_voice || ''),
        tagline: truncate(sanitizeInput(data.tagline || ''), MAX_LENGTHS.tagline),
        always_include: sanitizeInput(data.always_include || ''),
        payment_instructions: truncate(
          sanitizeInput(data.payment_instructions || ''),
          MAX_LENGTHS.notes,
        ),
        // Clamp numeric profile fields to sane ranges (no negatives, no infinity)
        hourly_rate:
          data.hourly_rate != null && isFinite(data.hourly_rate)
            ? Math.max(0, data.hourly_rate)
            : data.hourly_rate,
        tax_rate:
          data.tax_rate != null && isFinite(data.tax_rate)
            ? Math.min(100, Math.max(0, data.tax_rate))
            : data.tax_rate,
        payment_terms:
          data.payment_terms != null && isFinite(data.payment_terms)
            ? Math.max(0, Math.round(data.payment_terms))
            : data.payment_terms,
        proposal_expiry_days:
          data.proposal_expiry_days != null && isFinite(data.proposal_expiry_days)
            ? Math.max(0, Math.round(data.proposal_expiry_days))
            : undefined,
        // Rates are manual multipliers (1 foreign unit = N profile units).
        // Sanitize on the way in; the Tauri backend stores them as TEXT.
        // Omitted input inherits (see above), never silently wiped.
        exchange_rates: effectiveRates,
      };
      // Currency-less invoices inherit the profile currency (invCurOf
      // fallback), so switching base would silently re-denominate history.
      // Stamp the old base onto them first; explicit rows are untouched.
      if (prevCurrency && data.currency && prevCurrency !== data.currency) {
        try {
          await get().loadInvoices();
          const bare = get().invoices.filter((i) => !i.currency);
          for (const inv of bare) {
            await get().updateInvoice({ ...inv, currency: prevCurrency });
          }
        } catch {
          /* history keeps the fallback; rates notice still applies */
        }
      }
      await invoke('upsert_user_profile', { payload: sanitized });
      const licensed = !!(
        sanitized.license_key && (await cachedValidateLicense(sanitized.license_key))
      );
      set({ profile: sanitized, isLicensed: licensed });
      if (ratesNote) get().addToast(ratesNote, 'info', 6000);
    },
    activateLicense: async (key) => {
      if (!(await cachedValidateLicense(key))) return false;
      const profile = get().profile;
      if (!profile) return false;
      const now = new Date().toISOString();
      const updated = { ...profile, license_key: key, licensed_at: now };
      await invoke('upsert_user_profile', { payload: updated });
      set({ profile: updated, isLicensed: true });
      return true;
    },
    removeLicense: async () => {
      const profile = get().profile;
      if (!profile) return;
      const updated = {
        ...profile,
        license_key: undefined,
        licensed_at: undefined,
        license_tier: undefined,
        license_expires_at: undefined,
        license_validated_at: undefined,
        license_grace_until: undefined,
      };
      await invoke('upsert_user_profile', { payload: updated });
      set({ profile: updated, isLicensed: false });
    },
    startTrial: async () => {
      // Explicit "Try Pro free" action behind every trial CTA. Starts the
      // clock only if it never started (never resets, that would mint
      // infinite trials). Returns the resulting state so callers can show
      // the right next step instead of leaving the plan visibly unchanged.
      const profile = get().profile;
      if (!profile) return 'no-profile';
      if (profile.license_key) return 'licensed';
      if (profile.trial_started_at) {
        return get().getActiveTier() === 'trial' ? 'already' : 'expired';
      }
      const updated = { ...profile, trial_started_at: new Date().toISOString() };
      await invoke('upsert_user_profile', { payload: updated });
      set({ profile: updated });
      console.log('[license] Trial started by user:', updated.trial_started_at);
      return 'started';
    },

    // ── License tier / trial / grace ───
    initLicenseFlow: async () => {
      const profile = get().profile;
      if (!profile) return;
      const now = new Date().toISOString();

      // One-time relaunch amnesty: every keyless profile gets a fresh full
      // 37-day trial, including early profiles whose clocks started before
      // the trial tier actually resolved. Licensed profiles are untouched.
      // Runs once per machine (flagged in localStorage).
      if (!profile.license_key && !profile.license_tier) {
        let amnesty = false;
        try {
          amnesty = localStorage.getItem('lance:trial-reset-v1') !== 'done';
        } catch {
          /* private mode: fall through to normal start */
        }
        if (amnesty) {
          const updated = { ...profile, trial_started_at: now };
          await invoke('upsert_user_profile', { payload: updated });
          set({ profile: updated });
          try {
            localStorage.setItem('lance:trial-reset-v1', 'done');
          } catch {
            /* private mode */
          }
          console.log('[license] Trial amnesty granted:', now);
          return;
        }
      }

      // Start trial if never started
      if (!profile.trial_started_at) {
        const updated = { ...profile, trial_started_at: now };
        await invoke('upsert_user_profile', { payload: updated });
        set({ profile: updated });
        console.log('[license] Trial started:', now);
      }

      // Re-validate on a schedule, not once ever. `license_validated_at` was
      // written on first success and never re-checked, so a refunded or
      // chargeback'd key kept `isLicensed: true` indefinitely, the worker's
      // `revoked` flag never reached an activated install.
      if (profile.license_key && licenseValidationIsStale(profile.license_validated_at)) {
        await get().pingLicenseServer();
      }
    },

    pingLicenseServer: async () => {
      const profile = get().profile;
      if (!profile?.license_key) return;

      const { isTauri } = await import('../utils/tauri');

      try {
        // In Tauri, call the Rust command to ping the license server.
        // In browser mode we call the worker directly, otherwise a trial user
        // redeeming a key could never be validated online at all, since Rust
        // is not there to do it.
        const result = isTauri()
          ? await invoke<{
              valid: boolean;
              tier: string;
              expires_at?: string;
              message: string;
            }>('validate_license_online', { key: profile.license_key })
          : await fetch(`${LICENSE_WORKER_URL}/validate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: profile.license_key }),
            }).then((r) => {
              if (!r.ok) throw new Error(`license worker returned ${r.status}`);
              return r.json();
            });

        if (result.valid) {
          const profile = get().profile;
          if (!profile) return;
          const updated = {
            ...profile,
            currency: profile.currency || 'CAD',
            license_tier: result.tier,
            license_expires_at: result.expires_at,
            license_validated_at: new Date().toISOString(),
            license_grace_until: undefined,
            isLicensed: true,
          };
          await invoke('upsert_user_profile', { payload: updated });
          set({ profile: updated, isLicensed: true });
          console.log('[license] Online validation OK:', result.tier);
        } else if (result.tier) {
          // Server said invalid/expired/revoked but gave us a tier. Record it
          // and start a 2-day grace, so a customer who refunded does not lose
          // access mid-session while a transient worker failure cannot lock
          // them out. `revoked` arrives here as tier 'expired'.
          const profile = get().profile;
          if (!profile) return;
          const updated = {
            ...profile,
            currency: profile.currency || 'CAD',
            license_tier: result.tier,
            license_expires_at: result.expires_at,
            license_validated_at: new Date().toISOString(),
            license_grace_until: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          };
          await invoke('upsert_user_profile', { payload: updated });
          set({
            profile: updated,
            isLicensed: result.tier !== 'free' && result.tier !== 'expired',
          });
          console.warn('[license] Online validation failed, grace started:', result.message);
        }
      } catch (e) {
        console.warn('[license] Online ping failed, using cached/offline:', e);
        const profile = get().profile;
        if (profile?.license_validated_at && profile.license_grace_until) {
          const graceUntil = new Date(profile.license_grace_until).getTime();
          if (Date.now() > graceUntil) {
            const updated = { ...profile, license_tier: 'free', isLicensed: false };
            await invoke('upsert_user_profile', { payload: updated });
            set({ profile: updated, isLicensed: false });
            console.warn('[license] Grace period expired, downgraded to free');
          }
        }
      }
    },

    isTier: (tier: string) => {
      if (__TEST_MODE__) {
        const testMode = get().testMode;
        if (testMode.active && testMode.tier) return testMode.tier === tier;
      }
      const profile = get().profile;
      return profile?.license_tier === tier;
    },

    getActiveTier: (): LicenseTier => {
      if (__TEST_MODE__) {
        const testMode = get().testMode;
        if (testMode.active && testMode.tier) return testMode.tier;
      }
      const profile = get().profile;
      if (!profile) return 'free';
      // Server-validated or downgraded tiers win, but paid tiers require
      // the key to still be present. Otherwise removing a key would leave
      // a stale 'pro' tier granting free Pro forever.
      if (profile.license_tier) {
        const serverTier = profile.license_tier as LicenseTier;
        if (serverTier !== 'pro' && serverTier !== 'lifetime') return serverTier;
        if (profile.license_key) return serverTier;
      }
      // Deliberately NOT `else if (profile.license_key) return 'lifetime'`.
      // With no server-recorded tier, inferring 'lifetime' from the mere
      // presence of a key meant every offline-validated key, including a
      // monthly subscriber's, and including one the server has never seen ,
      // displayed as Lifetime. No tier is known here, so the honest answer is
      // to fall through to the trial clock and resolve 'free'.
      // Keyless trial derived from the trial clock: full Pro through the
      // grace window (day 37), expired after. Without this, trial users
      // silently resolved to 'free' and the trial never existed.
      if (profile.trial_started_at) {
        const started = new Date(profile.trial_started_at).getTime();
        if (!isNaN(started)) {
          const ageDays = Math.floor((Date.now() - started) / DAY_MS);
          if (ageDays <= TRIAL.HARD_DAY) return 'trial';
          return 'expired';
        }
      }
      return 'free';
    },

    getFeatureFlags: async () => {
      const { getFeatureFlags } = await import('../lib/constants');
      return getFeatureFlags(get().getActiveTier());
    },

    // ── Test mode (dev + trial builds only; entry UI lives in Settings) ──
    testMode: { active: false, tier: null },

    enableTestMode: async (tier) => {
      // Hard no-op in production desktop builds. Guarding the render site was
      // not enough: these are store actions, callable from the console or from
      // any injected script, so every one of them needs the gate.
      if (!__TEST_MODE__) return;
      const { loadTestMode, activateTestMode, snapshotProfile } = await import('../demo/testMode');
      const persisted = loadTestMode();
      if (persisted.active && persisted.tier) {
        set({ testMode: persisted, isLicensed: true });
        return;
      }
      snapshotProfile();
      set({ testMode: activateTestMode(tier), isLicensed: true });
    },

    setTestTier: (tier) => {
      if (!__TEST_MODE__) return;
      if (!get().testMode.active) return;
      import('../demo/testMode').then(({ activateTestMode }) => {
        set({ testMode: activateTestMode(tier), isLicensed: true });
      });
    },

    setTestTrialClock: async (daysAgo) => {
      if (!__TEST_MODE__) return;
      const profile = get().profile;
      if (!profile) return;
      const trial_started_at =
        daysAgo === null ? undefined : new Date(Date.now() - daysAgo * DAY_MS).toISOString();
      const updated = { ...profile, trial_started_at };
      await invoke('upsert_user_profile', { payload: updated });
      set({ profile: updated });
    },

    disableTestMode: async () => {
      if (!__TEST_MODE__) return;
      const { deactivateTestMode, restoreProfileSnapshot } = await import('../demo/testMode');
      set({ testMode: deactivateTestMode() });
      restoreProfileSnapshot();
      await get().loadProfile();
    },

    setPortalPort: (port) => set({ portalPort: port, portalFailed: false }),
    setPortalFailed: () => set({ portalFailed: true }),
    setArchetypeAppliedAt: (ts) => set({ archetypeAppliedAt: ts }),

    // ── Communications ──
    loadCommunications: async () => {
      startLoad('communications');
      try {
        set({ communications: await invoke<Communication[]>('get_communications') });
      } catch (e) {
        console.error('[store] loadCommunications failed:', e);
        setError('communications', String(e));
      } finally {
        endLoad('communications');
      }
    },
    createCommunication: async (data) => {
      const comm = await invoke<Communication>('create_communication', { payload: data });
      set({ communications: [...get().communications, comm] });
      return comm;
    },
    deleteCommunication: async (id, _clientId) => {
      await invoke('delete_communication', { id });
      set({ communications: get().communications.filter((c) => c.id !== id) });
    },
    updateCommunication: async (id, summary) => {
      await invoke('update_communication', { payload: { id, summary } });
      set({
        communications: get().communications.map((c) => (c.id === id ? { ...c, summary } : c)),
      });
    },

    // ── Recurring Invoices ──
    loadRecurringInvoices: async () => {
      startLoad('recurringInvoices');
      try {
        const raw = await invoke<RecurringInvoice[]>('get_recurring_invoices');
        set({ recurringInvoices: raw.map(parseLineItems) });
      } catch (e) {
        console.error('[store] loadRecurringInvoices failed:', e);
        setError('recurringInvoices', String(e));
      } finally {
        endLoad('recurringInvoices');
      }
    },
    createRecurringInvoice: async (data) => {
      const payload = { ...data, line_items: JSON.stringify(data.line_items) };
      const ri = await invoke<RecurringInvoice>('create_recurring_invoice', { payload });
      const parsed = parseLineItems(ri);
      set({ recurringInvoices: [...get().recurringInvoices, parsed] });
      return parsed;
    },
    updateRecurringInvoice: async (data) => {
      const payload = { ...data, line_items: JSON.stringify(data.line_items) };
      await invoke('update_recurring_invoice', { payload });
      set({ recurringInvoices: get().recurringInvoices.map((r) => (r.id === data.id ? data : r)) });
    },
    deleteRecurringInvoice: async (id) => {
      await invoke('delete_recurring_invoice', { id });
      set({ recurringInvoices: get().recurringInvoices.filter((r) => r.id !== id) });
    },

    // ── Import ──
    loadImportHistory: async () => {
      startLoad('importHistory');
      try {
        set({ importHistory: await invoke<ImportLog[]>('get_import_log') });
      } catch (e) {
        console.error('[store] loadImportHistory failed:', e);
        setError('importHistory', String(e));
      } finally {
        endLoad('importHistory');
      }
    },
    saveImportFile: async (file) => {
      const buffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      return invoke<string>('save_import_file', { filename: file.name, data });
    },
    logImport: async (data) => {
      const log = await invoke<ImportLog>('log_import', { payload: data });
      set({ importHistory: [log, ...get().importHistory] });
      return log;
    },
    getImportsDir: () => invoke<string>('get_imports_dir'),

    // ── Attachments ──
    loadAllAttachments: async () => {
      startLoad('allAttachments');
      try {
        set({ allAttachments: await invoke<Attachment[]>('get_all_attachments') });
      } catch (e) {
        console.error('[store] loadAllAttachments failed:', e);
      } finally {
        endLoad('allAttachments');
      }
    },
    createAttachment: async (data) => {
      const attachment = await invoke<Attachment>('create_attachment', { payload: data });
      set({ allAttachments: [attachment, ...get().allAttachments] });
      return attachment;
    },
    deleteAttachment: async (id, _entityType, _entityId) => {
      const doomed = get().allAttachments.find((a) => a.id === id);
      await invoke('delete_attachment', { id });
      set({ allAttachments: get().allAttachments.filter((a) => a.id !== id) });
      // Drop trial bytes too (no-op for desktop paths and unknown ids).
      if (doomed && doomed.file_path.startsWith('idb:')) {
        const { deleteAssetFile } = await import('../demo/assetStore');
        await deleteAssetFile(doomed.file_path.slice(4));
      }
    },
    saveAssetFile: async (file) => {
      // Browser mode keeps bytes in IndexedDB (see demo/assetStore) so
      // previews survive reloads with zero server. Desktop writes to disk.
      const { isTauri } = await import('../utils/tauri');
      if (!isTauri()) {
        const { putAssetFile } = await import('../demo/assetStore');
        const id = crypto.randomUUID();
        return putAssetFile(id, file);
      }
      const buffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      return invoke<string>('save_asset_file', { filename: file.name, data });
    },
    getAssetsDir: () => invoke<string>('get_assets_dir'),
    renameAttachment: async (id, newFilename) => {
      const attachment = await invoke<Attachment>('rename_attachment', {
        payload: { id, new_filename: newFilename },
      });
      set({ allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)) });
      return attachment;
    },
    moveAttachment: async (id, entityType, entityId, _oldEntityType, _oldEntityId) => {
      const attachment = await invoke<Attachment>('move_attachment', {
        payload: { id, entity_type: entityType, entity_id: entityId },
      });
      set({ allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)) });
      return attachment;
    },
    updateAttachmentMeta: async (id, data) => {
      const attachment = await invoke<Attachment>('update_attachment_meta', {
        payload: { id, ...data },
      });
      set({ allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)) });
      return attachment;
    },
    loadAssetStats: async () => {
      try {
        set({ assetStats: await invoke<AssetStats>('get_asset_stats') });
      } catch (e) {
        console.error('[store] loadAssetStats failed:', e);
      }
    },
    searchAssets: (query) => invoke<Attachment[]>('search_assets', { query }),

    // ── Metrics ──
    loadMetricDefs: async () => {
      startLoad('metricDefs');
      try {
        set({ metricDefs: await invoke<MetricDefinition[]>('get_all_metric_definitions') });
      } catch (e) {
        console.error('[store] loadMetricDefs failed:', e);
        setError('metricDefs', String(e));
      } finally {
        endLoad('metricDefs');
      }
    },
    createMetricDef: async (data) => {
      // Metric names/units render raw in widgets and feed SQL-adjacent
      // filters: sanitize at the store boundary so every caller is covered.
      const clean = {
        ...data,
        name: sanitizeInput(data.name || '').trim(),
        unit_label: data.unit_label ? sanitizeInput(data.unit_label).trim() || undefined : undefined,
      };
      const def = await invoke<MetricDefinition>('create_metric_definition', { payload: clean });
      set({ metricDefs: [...get().metricDefs, def] });
      return def;
    },
    updateMetricDef: async (data) => {
      const clean = {
        ...data,
        name: sanitizeInput(data.name || '').trim(),
        unit_label: data.unit_label ? sanitizeInput(data.unit_label).trim() || undefined : undefined,
      };
      await invoke('update_metric_definition', { payload: clean });
      set({ metricDefs: get().metricDefs.map((d) => (d.id === data.id ? { ...d, ...clean } : d)) });
    },
    deleteMetricDef: async (id) => {
      await invoke('delete_metric_definition', { id });
      set({ metricDefs: get().metricDefs.filter((d) => d.id !== id) });
    },
    loadMetricValues: async (definitionId, limit) => {
      startLoad('metricValues');
      try {
        const values = await invoke<MetricValue[]>('get_metric_values', {
          definitionId: definitionId ?? null,
          limit: limit ?? null,
        });
        set({ metricValues: values });
      } catch (e) {
        console.error('[store] loadMetricValues failed:', e);
        setError('metricValues', String(e));
      } finally {
        endLoad('metricValues');
      }
    },
    createMetricValue: async (data) => {
      const val = await invoke<MetricValue>('log_metric_value', { payload: data });
      set({ metricValues: [...get().metricValues, val] });
      return val;
    },
    deleteMetricValue: async (id) => {
      await invoke('delete_metric_value', { id });
      set({ metricValues: get().metricValues.filter((v) => v.id !== id) });
    },
    loadHeadlineMetrics: async () => {
      try {
        set({ headlineMetrics: await invoke<HeadlineMetric[]>('get_all_headline_metrics') });
      } catch (e) {
        console.error('[store] loadHeadlineMetrics failed:', e);
      }
    },
    loadMetricTemplates: async () => {
      try {
        set({ metricTemplates: await invoke<MetricTemplate[]>('get_metric_templates') });
      } catch (e) {
        console.error('[store] loadMetricTemplates failed:', e);
      }
    },
    saveMetricTemplate: async (name, definitions) => {
      // Same-name save replaces (upsert): otherwise the picker fills with
      // indistinguishable duplicates and apply() grabs the first blindly.
      const templates = get().metricTemplates.length
        ? get().metricTemplates
        : await invoke<MetricTemplate[]>('get_metric_templates');
      const existing = templates.find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        await invoke('delete_metric_template', { id: existing.id });
      }
      await invoke('save_metric_template', {
        payload: { name, definitions_json: JSON.stringify(definitions) },
      });
      await get().loadMetricTemplates();
    },
    deleteMetricTemplate: async (id) => {
      await invoke('delete_metric_template', { id });
      set({ metricTemplates: get().metricTemplates.filter((t) => t.id !== id) });
    },
    applyMetricTemplate: async (templateName, clientId) => {
      const templates = get().metricTemplates.length
        ? get().metricTemplates
        : await invoke<MetricTemplate[]>('get_metric_templates');
      const tmpl = templates.find((t) => t.name === templateName);
      if (!tmpl) return;
      let definitions: Array<
        Pick<MetricDefinition, 'name' | 'metric_type' | 'unit_label' | 'is_headline' | 'sort_order'>
      >;
      try {
        definitions = JSON.parse(tmpl.definitions_json);
      } catch {
        throw new Error(`Template "${templateName}" is corrupted and cannot be applied.`);
      }
      if (!Array.isArray(definitions)) {
        throw new Error(`Template "${templateName}" is corrupted and cannot be applied.`);
      }
      const validTypes = ['number', 'percentage', 'currency', 'text'] as const;
      await get().loadMetricDefs();
      const existingNames = new Set(
        get()
          .metricDefs.filter((d) => d.client_id === clientId)
          .map((d) => d.name.toLowerCase()),
      );
      for (const def of definitions) {
        const name = (def?.name || '').trim();
        // Skip nameless rows and defs the client already has: re-applying a
        // template must be idempotent, not a duplicate factory.
        if (!name || existingNames.has(name.toLowerCase())) continue;
        const metric_type = (validTypes as readonly string[]).includes(def.metric_type)
          ? (def.metric_type as MetricDefinition['metric_type'])
          : 'number';
        await get().createMetricDef({
          client_id: clientId,
          name,
          metric_type,
          unit_label: def.unit_label,
          is_headline: !!def.is_headline,
          sort_order: typeof def.sort_order === 'number' ? def.sort_order : 0,
        });
        existingNames.add(name.toLowerCase());
      }
    },

    // ── Follow-ups ──
    loadFollowUpSettings: () => {
      try {
        const stored = localStorage.getItem('lance:follow-up-settings');
        if (stored) {
          const defaults = {
            enabled: true,
            proposal_delay_days: 3,
            invoice_delay_days: 0,
            templates: {},
            subject_templates: {},
          };
          const raw = JSON.parse(stored) as Record<string, unknown>;
          // Hand-edited or legacy values flow straight into scheduling math
          // (a string delay disables nagging silently), so validate shapes.
          const num = (v: unknown, lo: number, hi: number, fb: number) =>
            typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fb;
          const tones = ['auto', 'warm', 'direct', 'formal'] as const;
          type Tone = (typeof tones)[number];
          const strRecord = (v: unknown): Record<string, string> => {
            if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
            const out: Record<string, string> = {};
            for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
              if (typeof val === 'string') out[k] = val;
            }
            return out;
          };
          set({
            followUpSettings: {
              ...defaults,
              enabled: typeof raw.enabled === 'boolean' ? raw.enabled : defaults.enabled,
              proposal_delay_days: num(
                raw.proposal_delay_days,
                1,
                30,
                defaults.proposal_delay_days,
              ),
              invoice_delay_days: num(raw.invoice_delay_days, 0, 30, defaults.invoice_delay_days),
              tone: (typeof raw.tone === 'string' && (tones as readonly string[]).includes(raw.tone)
                ? raw.tone
                : undefined) as Tone | undefined,
              templates: strRecord(raw.templates),
              subject_templates: strRecord(raw.subject_templates),
            },
          });
        }
      } catch {
        /* use defaults */
      }
    },
    saveFollowUpSettings: (updates) => {
      const merged = { ...get().followUpSettings, ...updates };
      set({ followUpSettings: merged });
      try {
        localStorage.setItem('lance:follow-up-settings', JSON.stringify(merged));
      } catch {
        /* private mode: settings apply for the session only */
      }
    },
    createFollowUp: async (data) => {
      const log = await invoke<FollowUpLog>('log_follow_up', { payload: data });
      const key = `${data.entity_type}:${data.entity_id}`;
      const current = { ...get().followUpLogs };
      current[key] = [current[key] || [], log].flat();
      set({ followUpLogs: current });
      return log;
    },
    updateFollowUpStatus: async (id, status, action) => {
      await invoke('update_follow_up_status', { payload: { id, status, action: action ?? null } });
      const allLogs = { ...get().followUpLogs };
      for (const key of Object.keys(allLogs)) {
        allLogs[key] = allLogs[key].map((l: FollowUpLog) =>
          l.id === id
            ? {
                ...l,
                status: status as FollowUpLog['status'],
                action: action ?? l.action,
                actioned_at: new Date().toISOString(),
              }
            : l,
        );
      }
      set({
        followUpLogs: allLogs,
        pendingFollowUps: get().pendingFollowUps.filter((l) => l.id !== id),
      });
    },
    loadPendingFollowUps: async () => {
      try {
        set({ pendingFollowUps: await invoke<FollowUpLog[]>('get_all_pending_follow_ups') });
      } catch (e) {
        console.error('[store] loadPendingFollowUps failed:', e);
      }
    },
    getActiveFollowUps: () => {
      const { pendingFollowUps, invoices, proposals } = get();
      return pendingFollowUps.filter((l) =>
        l.entity_type === 'proposal'
          ? proposals.some((p) => p.id === l.entity_id)
          : invoices.some((i) => i.id === l.entity_id),
      );
    },
    loadAllFollowUpLogs: async () => {
      try {
        const logs = await invoke<FollowUpLog[]>('get_all_follow_up_logs');
        const keyed: Record<string, FollowUpLog[]> = {};
        for (const log of logs) {
          const key = `${log.entity_type}:${log.entity_id}`;
          keyed[key] = [...(keyed[key] || []), log];
        }
        set({ followUpLogs: keyed });
      } catch (e) {
        console.error('[store] loadAllFollowUpLogs failed:', e);
      }
    },
    // Shared portal activity (proposal/contract opens + responses). One
    // loader feeds the dashboard feed, proposal badges, and Pro open alerts.
    loadPortalActivity: async () => {
      try {
        const activities = await invoke<PortalActivity[]>('get_portal_activity');
        set({ portalActivity: activities || [] });
      } catch (e) {
        console.error('[store] loadPortalActivity failed:', e);
      }
    },

    // ── Export Templates ──
    loadExportTemplates: async () => {
      startLoad('exportTemplates');
      try {
        const { getDb } = await import('../db');
        const db = await getDb();
        const rows = await db.select<ExportTemplate[]>(
          'SELECT id, name, type, header, footer, sections, color_scheme, created_at FROM export_templates ORDER BY created_at DESC',
        );
        set({
          exportTemplates: rows.map((r: ExportTemplate) => ({
            ...r,
            sections: parseStringList(r.sections as unknown),
          })),
        });
      } catch (e) {
        console.error('[store] loadExportTemplates failed:', e);
        setError('exportTemplates', String(e));
      } finally {
        endLoad('exportTemplates');
      }
    },
    createExportTemplate: async (data) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute(
        'INSERT INTO export_templates (id, name, type, header, footer, sections, color_scheme, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          data.name,
          data.type,
          data.header || '',
          data.footer || '',
          JSON.stringify(data.sections || []),
          data.color_scheme || '',
          now,
        ],
      );
      const template: ExportTemplate = { id, ...data, created_at: now };
      set({ exportTemplates: [template, ...get().exportTemplates] });
      return template;
    },
    updateExportTemplate: async (data) => {
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute(
        'UPDATE export_templates SET name = ?, type = ?, header = ?, footer = ?, sections = ?, color_scheme = ? WHERE id = ?',
        [
          data.name,
          data.type,
          data.header || '',
          data.footer || '',
          JSON.stringify(data.sections || []),
          data.color_scheme || '',
          data.id,
        ],
      );
      set({ exportTemplates: get().exportTemplates.map((t) => (t.id === data.id ? data : t)) });
    },
    deleteExportTemplate: async (id) => {
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute('DELETE FROM export_templates WHERE id = ?', [id]);
      set({ exportTemplates: get().exportTemplates.filter((t) => t.id !== id) });
    },

    // ── Contract Templates ──
    loadContractTemplates: async () => {
      startLoad('contractTemplates');
      try {
        const { getDb } = await import('../db');
        const db = await getDb();
        const rows = await db.select<ContractTemplate[]>(
          'SELECT id, name, category, body, variables, created_at FROM contract_templates ORDER BY created_at DESC',
        );
        set({
          contractTemplates: rows.map((r: ContractTemplate) => ({
            ...r,
            variables: parseStringList(r.variables as unknown),
          })),
        });
      } catch (e) {
        console.error('[store] loadContractTemplates failed:', e);
        setError('contractTemplates', String(e));
      } finally {
        endLoad('contractTemplates');
      }
    },
    createContractTemplate: async (data) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute(
        'INSERT INTO contract_templates (id, name, category, body, variables, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.name, data.category || '', data.body, JSON.stringify(data.variables || []), now],
      );
      const template: ContractTemplate = { id, ...data, created_at: now };
      set({ contractTemplates: [template, ...get().contractTemplates] });
      return template;
    },
    deleteContractTemplate: async (id) => {
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute('DELETE FROM contract_templates WHERE id = ?', [id]);
      set({ contractTemplates: get().contractTemplates.filter((t) => t.id !== id) });
    },

    // ── Project Templates ──
    loadProjectTemplates: async () => {
      startLoad('projectTemplates');
      try {
        const { getDb } = await import('../db');
        const db = await getDb();
        const rows = await db.select<ProjectTemplate[]>(
          'SELECT id, name, description, default_budget, default_status, is_default, created_at FROM project_templates ORDER BY created_at DESC',
        );
        set({
          projectTemplates: rows.map((r: ProjectTemplate) => ({
            ...r,
            is_default: !!r.is_default,
          })),
        });
      } catch (e) {
        console.error('[store] loadProjectTemplates failed:', e);
        setError('projectTemplates', String(e));
      } finally {
        endLoad('projectTemplates');
      }
    },
    loadTemplateMilestones: async (templateId) => {
      try {
        const { getDb } = await import('../db');
        const db = await getDb();
        const rows = await db.select<ProjectTemplateMilestone[]>(
          'SELECT id, template_id, title, days_from_start, invoice_on_completion FROM project_template_milestones WHERE template_id = ? ORDER BY days_from_start ASC',
          [templateId],
        );
        set({ templateMilestones: rows });
      } catch (e) {
        console.error('[store] loadTemplateMilestones failed:', e);
      }
    },
    createProjectTemplate: async (data, milestones) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute(
        'INSERT INTO project_templates (id, name, description, default_budget, default_status, is_default, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [
          id,
          data.name,
          data.description || null,
          data.default_budget ?? null,
          data.default_status || 'Active',
          now,
        ],
      );
      for (const m of milestones) {
        await db.execute(
          'INSERT INTO project_template_milestones (id, template_id, title, days_from_start, invoice_on_completion) VALUES (?, ?, ?, ?, ?)',
          [crypto.randomUUID(), id, m.title, m.days_from_start, m.invoice_on_completion ? 1 : 0],
        );
      }
      const template: ProjectTemplate = {
        id,
        name: data.name,
        description: data.description,
        default_budget: data.default_budget,
        default_status: data.default_status || 'Active',
        is_default: false,
        created_at: now,
      };
      set({ projectTemplates: [template, ...get().projectTemplates] });
      return template;
    },
    updateProjectTemplate: async (id, data) => {
      const { getDb } = await import('../db');
      const db = await getDb();
      const sets: string[] = [];
      const vals: (string | number | null)[] = [];
      if (data.name !== undefined) {
        sets.push('name = ?');
        vals.push(data.name);
      }
      if (data.description !== undefined) {
        sets.push('description = ?');
        vals.push(data.description || null);
      }
      if (data.default_budget !== undefined) {
        sets.push('default_budget = ?');
        vals.push(data.default_budget ?? null);
      }
      if (data.default_status !== undefined) {
        sets.push('default_status = ?');
        vals.push(data.default_status);
      }
      if (sets.length === 0) return;
      vals.push(id);
      await db.execute(`UPDATE project_templates SET ${sets.join(', ')} WHERE id = ?`, vals);
      set({
        projectTemplates: get().projectTemplates.map((t) => (t.id === id ? { ...t, ...data } : t)),
      });
    },
    deleteProjectTemplate: async (id) => {
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute('DELETE FROM project_template_milestones WHERE template_id = ?', [id]);
      await db.execute('DELETE FROM project_templates WHERE id = ?', [id]);
      set({ projectTemplates: get().projectTemplates.filter((t) => t.id !== id) });
    },

    // ── Archetype: Render Logs ──
    loadRenderLogs: async () => {
      startLoad('renderLogs');
      try {
        set({ renderLogs: await invoke<ArchetypeRenderLog[]>('get_all_render_logs') });
      } catch (e) {
        console.error('[store] loadRenderLogs failed:', e);
        setError('renderLogs', String(e));
      } finally {
        endLoad('renderLogs');
      }
    },
    createRenderLog: async (data) => {
      const log = await invoke<ArchetypeRenderLog>('create_render_log', { payload: data });
      set({ renderLogs: [log, ...get().renderLogs] });
      return log;
    },
    deleteRenderLog: async (id) => {
      await invoke('delete_render_log', { id });
      set({ renderLogs: get().renderLogs.filter((l) => l.id !== id) });
    },

    // ── Archetype: Sessions ──
    loadSessions: async (clientId, projectId) => {
      startLoad('sessions');
      try {
        set({
          sessions: await invoke<ArchetypeSession[]>('get_sessions', {
            clientId: clientId ?? null,
            projectId: projectId ?? null,
          }),
        });
      } catch (e) {
        console.error('[store] loadSessions failed:', e);
        setError('sessions', String(e));
      } finally {
        endLoad('sessions');
      }
    },
    createSession: async (data) => {
      const session = await invoke<ArchetypeSession>('create_session', { payload: data });
      set({ sessions: [session, ...get().sessions] });
      return session;
    },
    deleteSession: async (id) => {
      await invoke('delete_session', { id });
      set({ sessions: get().sessions.filter((s) => s.id !== id) });
    },

    // ── Archetype: Shoots ──
    loadShoots: async () => {
      startLoad('shoots');
      try {
        set({ shoots: await invoke<ArchetypeShoot[]>('get_all_shoots') });
      } catch (e) {
        console.error('[store] loadShoots failed:', e);
        setError('shoots', String(e));
      } finally {
        endLoad('shoots');
      }
    },
    createShoot: async (data) => {
      const shoot = await invoke<ArchetypeShoot>('create_shoot', { payload: data });
      set({ shoots: [shoot, ...get().shoots] });
      return shoot;
    },
    deleteShoot: async (id) => {
      await invoke('delete_shoot', { id });
      set({ shoots: get().shoots.filter((s) => s.id !== id) });
    },

    // ── Archetype: Revisions ──
    loadRevisions: async () => {
      startLoad('revisions');
      try {
        set({ revisions: await invoke<ArchetypeRevision[]>('get_all_revisions') });
      } catch (e) {
        console.error('[store] loadRevisions failed:', e);
        setError('revisions', String(e));
      } finally {
        endLoad('revisions');
      }
    },
    createRevision: async (data) => {
      const revision = await invoke<ArchetypeRevision>('create_revision', { payload: data });
      set({ revisions: [revision, ...get().revisions] });
      return revision;
    },
    deleteRevision: async (id) => {
      await invoke('delete_revision', { id });
      set({ revisions: get().revisions.filter((r) => r.id !== id) });
    },

    // ── Archetype: Builds ──
    loadBuilds: async () => {
      startLoad('builds');
      try {
        set({ builds: await invoke<ArchetypeBuild[]>('get_all_builds') });
      } catch (e) {
        console.error('[store] loadBuilds failed:', e);
        setError('builds', String(e));
      } finally {
        endLoad('builds');
      }
    },
    createBuild: async (data) => {
      const build = await invoke<ArchetypeBuild>('create_build', { payload: data });
      set({ builds: [build, ...get().builds] });
      return build;
    },
    deleteBuild: async (id) => {
      await invoke('delete_build', { id });
      set({ builds: get().builds.filter((b) => b.id !== id) });
    },

    // ── Archetype: Keywords ──
    loadKeywords: async () => {
      startLoad('keywords');
      try {
        set({ keywords: await invoke<ArchetypeKeyword[]>('get_all_keywords') });
      } catch (e) {
        console.error('[store] loadKeywords failed:', e);
        setError('keywords', String(e));
      } finally {
        endLoad('keywords');
      }
    },
    createKeyword: async (data) => {
      const keyword = await invoke<ArchetypeKeyword>('create_keyword', { payload: data });
      set({ keywords: [keyword, ...get().keywords] });
      return keyword;
    },
    updateKeyword: async (id, clientId, positionCurrent, targetPosition) => {
      await invoke('update_keyword', {
        id,
        positionCurrent: positionCurrent ?? null,
        targetPosition: targetPosition ?? null,
      });
      set({
        keywords: get().keywords.map((k) =>
          k.id === id
            ? {
                ...k,
                position_current: positionCurrent ?? k.position_current,
                target_position: targetPosition ?? k.target_position,
              }
            : k,
        ),
      });
    },
    deleteKeyword: async (id, _clientId) => {
      await invoke('delete_keyword', { id });
      set({ keywords: get().keywords.filter((k) => k.id !== id) });
    },

    // ── Archetype: Datasets ──
    loadDatasets: async () => {
      startLoad('datasets');
      try {
        set({ datasets: await invoke<ArchetypeDataset[]>('get_all_datasets') });
      } catch (e) {
        console.error('[store] loadDatasets failed:', e);
        setError('datasets', String(e));
      } finally {
        endLoad('datasets');
      }
    },
    createDataset: async (data) => {
      const dataset = await invoke<ArchetypeDataset>('create_dataset', { payload: data });
      set({ datasets: [dataset, ...get().datasets] });
      return dataset;
    },
    deleteDataset: async (id) => {
      await invoke('delete_dataset', { id });
      set({ datasets: get().datasets.filter((d) => d.id !== id) });
    },

    // ── Backward compatibility aliases ──
    addClient: (data) => get().createClient(data),
    addProject: (data) => get().createProject(data),
    addMilestone: (data) => get().createMilestone(data),
    addProposal: (data) => get().createProposal(data),
    addContract: (data) => get().createContract(data),
    addTimeEntry: (data) => get().createTimeEntry(data),
    addInvoice: (data) => get().createInvoice(data),
    addPayment: (data) => get().createPayment(data),
    addExpense: (data) => get().createExpense(data),
    addCommunication: (data) => get().createCommunication(data),
    addRecurringInvoice: (data) => get().createRecurringInvoice(data),
    addAttachment: (data) => get().createAttachment(data),
    addMetricDef: (data) => get().createMetricDef(data),
    addExportTemplate: (data) => get().createExportTemplate(data),
    addContractTemplate: (data) => get().createContractTemplate(data),
    addProjectTemplate: (data, milestones) => get().createProjectTemplate(data, milestones),
    addRenderLog: (data) => get().createRenderLog(data),
    addSession: (data) => get().createSession(data),
    addShoot: (data) => get().createShoot(data),
    addRevision: (data) => get().createRevision(data),
    addBuild: (data) => get().createBuild(data),
    addKeyword: (data) => get().createKeyword(data),
    addDataset: (data) => get().createDataset(data),

    removeClient: (id) => get().deleteClient(id),
    removeProject: (id) => get().deleteProject(id),
    removeMilestone: (id) => get().deleteMilestone(id),
    removeProposal: (id) => get().deleteProposal(id),
    removeContract: (id) => get().deleteContract(id),
    removeTimeEntry: (id) => get().deleteTimeEntry(id),
    removeInvoice: (id) => get().deleteInvoice(id),
    removePayment: (id, _invoiceId) => get().deletePayment(id),
    removeExpense: (id) => get().deleteExpense(id),
    removeCommunication: (id, clientId) => get().deleteCommunication(id, clientId),
    removeRecurringInvoice: (id) => get().deleteRecurringInvoice(id),
    removeAttachment: (id, entityType, entityId) =>
      get().deleteAttachment(id, entityType, entityId),
    removeMetricDef: (id, _clientId) => get().deleteMetricDef(id),
    removeMetricValue: (id, _definitionId) => get().deleteMetricValue(id),
    removeMetricTemplate: (id) => get().deleteMetricTemplate(id),
    removeExportTemplate: (id) => get().deleteExportTemplate(id),
    removeContractTemplate: (id) => get().deleteContractTemplate(id),
    removeProjectTemplate: (id) => get().deleteProjectTemplate(id),
    removeRenderLog: (id, _projectId) => get().deleteRenderLog(id),
    removeSession: (id) => get().deleteSession(id),
    removeShoot: (id, _projectId) => get().deleteShoot(id),
    removeRevision: (id, _projectId) => get().deleteRevision(id),
    removeBuild: (id, _projectId) => get().deleteBuild(id),
    removeKeyword: (id, clientId) => get().deleteKeyword(id, clientId),
    removeDataset: (id, _projectId) => get().deleteDataset(id),

    logFollowUp: (data) => get().createFollowUp(data),
    logMetricValue: (data) => get().createMetricValue(data),
    loadAllPayments: () => get().loadPayments(),
    get projectTemplateMilestones() {
      const all = get().templateMilestones;
      const map: Record<string, ProjectTemplateMilestone[]> = {};
      for (const m of all) {
        if (!map[m.template_id]) map[m.template_id] = [];
        map[m.template_id].push(m);
      }
      return map;
    },

    // ── Computed selectors ──
    getClientProjects: (clientId) => get().projects.filter((p) => p.client_id === clientId),
    getProjectTimeEntries: (projectId) =>
      get().timeEntries.filter((t) => t.project_id === projectId),
    getClientInvoices: (clientId) => get().invoices.filter((i) => i.client_id === clientId),
    getInvoicePayments: (invoiceId) => get().payments.filter((p) => p.invoice_id === invoiceId),
    getProjectMilestones: (projectId) => get().milestones.filter((m) => m.project_id === projectId),
    getClientCommunications: (clientId) =>
      get().communications.filter((c) => c.client_id === clientId),
    getClientMetrics: (clientId) => ({
      defs: get().metricDefs.filter((d) => d.client_id === clientId),
      values: get().metricValues.filter((v) => v.client_id === clientId),
    }),
    getInvoiceBalance: (invoiceId) => {
      const inv = get().invoices.find((i) => String(i.id) === String(invoiceId));
      if (!inv) return 0;
      // String compare both sides: Payment.invoice_id is typed string,
      // Invoice.id is number, and an imported backup can carry either.
      const totalPaid = get()
        .payments.filter((p) => String(p.invoice_id) === String(invoiceId))
        .reduce((s, p) => s + p.amount, 0);
      return inv.total - totalPaid;
    },
    getUnpaidInvoices: () =>
      get().invoices.filter(
        (i) => i.status === 'sent' || i.status === 'overdue' || i.status === 'partial',
      ),
    getPendingProposals: () =>
      get().proposals.filter((p) => p.status === 'draft' || p.status === 'sent'),
    getActiveContracts: () => get().contracts.filter((c) => c.status === 'active'),
    getUpcomingFollowUps: (days = 7) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      return get().getActiveFollowUps().filter((f) => new Date(f.drafted_at) <= cutoff);
    },
    getProjectMetrics: (projectId) => {
      const entries = get().timeEntries.filter((t) => t.project_id === projectId);
      const totalTime = entries.reduce((s, t) => s + (t.duration_minutes || 0), 0);
      const totalBillable = entries
        .filter((t) => t.billable)
        .reduce((s, t) => s + (t.duration_minutes || 0), 0);
      const invs = get().invoices.filter((i) => i.project_id === projectId);
      const totalInvoiced = invs.reduce((s, i) => s + i.total, 0);
      const ms = get().milestones.filter((m) => m.project_id === projectId);
      const milestoneProgress =
        ms.length > 0 ? (ms.filter((m) => m.completed).length / ms.length) * 100 : 0;
      return { totalTime, totalBillable, totalInvoiced, milestoneProgress };
    },
    getFinanceSummary: () => {
      // Canonical money summary. Revenue is PER INVOICE, never a global
      // either/or: an invoice with no payment rows is paid at its total, and an
      // invoice with payment rows is paid at what actually arrived (capped at
      // its total). The previous version did `paidFromPayments > 0 ?
      // paidFromPayments : totalPaid`, a single global branch that REPLACED
      // the sum of paid invoices. Recording one $500 payment against a book
      // with $6,200 of paid invoices reported $500 revenue and inverted every
      // KPI on the Finance screen.
      //
      // Orphan payments (invoice deleted or missing via import) are excluded:
      // phantom revenue is worse than an unattributed row.
      const invoices = get().invoices;
      // Compare as strings on both sides. Payment.invoice_id is typed `string`
      // while Invoice.id is `number`, and a JSON import can hand back either
      // shape, a strict Set<number>.has(p.invoice_id) then classified a real
      // payment as an orphan and dropped the revenue.
      const invoiceIds = new Set(invoices.map((i) => String(i.id)));
      const livePayments = get().payments.filter((p) => invoiceIds.has(String(p.invoice_id)));
      const paidFromPayments = livePayments.reduce((s, p) => s + p.amount, 0);
      const totalExpenses = get().expenses.reduce((s, e) => s + e.amount, 0);

      // Payment.invoice_id is typed string while Invoice.id is number (SQLite
      // INTEGER vs the TS model), so key the map by string and compare with
      // String(). Using them raw silently matched nothing.
      const paidByInvoice = new Map<string, number>();
      for (const p of livePayments) {
        const id = String(p.invoice_id);
        paidByInvoice.set(id, (paidByInvoice.get(id) ?? 0) + p.amount);
      }

      const isSettled = (inv: Invoice): boolean => {
        const received = paidByInvoice.get(String(inv.id));
        if (received === undefined) return inv.status === 'paid';
        return received >= inv.total;
      };

      let totalPaidRevenue = 0;
      for (const inv of invoices) {
        if (inv.status === 'draft') continue;
        const received = paidByInvoice.get(String(inv.id));
        totalPaidRevenue +=
          received === undefined ? (isSettled(inv) ? inv.total : 0) : Math.min(received, inv.total);
      }

      const totalInvoiced = invoices
        .filter((i) => i.status !== 'draft')
        .reduce((s, i) => s + i.total, 0);
      const totalOutstanding = totalInvoiced - totalPaidRevenue;
      const profit = totalPaidRevenue - totalExpenses;
      return {
        paidFromPayments,
        totalExpenses,
        totalPaidRevenue,
        totalInvoiced,
        totalOutstanding,
        profit,
      };
    },
  };
});
