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
import type { Update } from '@tauri-apps/plugin-updater';
import type { TrashEntry } from '../utils/trash';
import type { Toast, ToastAction, ToastType } from './slices/toasts';

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
}

export type AppStore = UnifiedStore;
