import { create } from 'zustand';
import type {
  Client, Project, Milestone, Proposal, Contract, TimeEntry, Invoice,
  InvoicePayment, LineItem, Expense, UserProfile, Communication,
  RecurringInvoice, ImportLog, Attachment, AssetStats, MetricDefinition,
  MetricValue, MetricTemplate, HeadlineMetric, FollowUpLog, FollowUpSettings,
  ExportTemplate, ContractTemplate, ArchetypeRenderLog, ArchetypeSession,
  ArchetypeShoot, ArchetypeRevision, ArchetypeBuild, ArchetypeKeyword,
  ArchetypeDataset, ProjectTemplate, ProjectTemplateMilestone,
  ShareToken, PortalActivity,
} from '../types';
import type { Achievement } from '../achievements/index';
import { validateLicenseKey } from '../license';
import { sanitizeInput, truncate, MAX_LENGTHS } from '../utils/sanitize';
import { DAY_MS } from '../utils/format';
import type { LicenseTier } from '../lib/constants';
import { TRIAL } from '../lib/constants';

const licenseCache = new Map<string, boolean>();

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

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

const toastTimers = new Map<string, { timeoutId: ReturnType<typeof setTimeout>; startedAt: number; duration: number }>();

function clearToastTimer(id: string) {
  const timer = toastTimers.get(id);
  if (timer) clearTimeout(timer.timeoutId);
}

type LoadingKey = string;
type ErrorKey = string;

export interface UnifiedStore {
  // ── Data (flat arrays) ──
  clients: Client[]
  projects: Project[]
  milestones: Milestone[]
  proposals: Proposal[]
  contracts: Contract[]
  timeEntries: TimeEntry[]
  invoices: Invoice[]
  payments: InvoicePayment[]
  expenses: Expense[]
  profile: UserProfile | null
  profileLoaded: boolean
  communications: Communication[]
  recurringInvoices: RecurringInvoice[]
  importHistory: ImportLog[]
  allAttachments: Attachment[]
  assetStats: AssetStats | null
  metricDefs: MetricDefinition[]
  metricValues: MetricValue[]
  metricTemplates: MetricTemplate[]
  headlineMetrics: HeadlineMetric[]
  followUpLogs: Record<string, FollowUpLog[]>
  pendingFollowUps: FollowUpLog[]
  portalActivity: PortalActivity[]
  followUpSettings: FollowUpSettings
  exportTemplates: ExportTemplate[]
  contractTemplates: ContractTemplate[]
  projectTemplates: ProjectTemplate[]
  templateMilestones: ProjectTemplateMilestone[]
  renderLogs: ArchetypeRenderLog[]
  sessions: ArchetypeSession[]
  shoots: ArchetypeShoot[]
  revisions: ArchetypeRevision[]
  builds: ArchetypeBuild[]
  keywords: ArchetypeKeyword[]
  datasets: ArchetypeDataset[]
  shareTokens: ShareToken[]
  achievements: Achievement[]

  // ── Meta ──
  initialized: boolean
  loading: Record<LoadingKey, boolean>
  errors: Record<ErrorKey, string | null>
  isLicensed: boolean
  portalPort: number | null
  portalFailed: boolean
  archetypeAppliedAt: number | null

  // ── Notifications ──
  toasts: Toast[]
  addToast: (message: string, type?: ToastType, duration?: number, actions?: ToastAction[]) => string
  removeToast: (id: string) => void
  updateToast: (id: string, message: string) => void
  pauseToast: (id: string) => void
  resumeToast: (id: string) => void

  // ── Updater ──
  updateAvailable: boolean
  updateData: any | null
  isDownloading: boolean
  downloadProgressMB: string | null
  setUpdateAvailable: (data: unknown) => void
  setDownloading: (val: boolean) => void
  setDownloadProgress: (mb: string) => void
  dismissUpdate: () => void

  // ── Init ──
  initialize: () => Promise<void>

  // ── Clients ──
  loadClients: () => Promise<void>
  createClient: (data: Omit<Client, 'id' | 'created_at'>) => Promise<Client>
  updateClient: (data: Client) => Promise<void>
  deleteClient: (id: string) => Promise<void>

  // ── Projects ──
  loadProjects: () => Promise<void>
  createProject: (data: Omit<Project, 'id' | 'created_at'>) => Promise<Project>
  updateProject: (data: Project) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // ── Milestones ──
  loadMilestones: () => Promise<void>
  createMilestone: (data: Omit<Milestone, 'id'>) => Promise<Milestone>
  updateMilestone: (data: Milestone) => Promise<void>
  deleteMilestone: (id: string) => Promise<void>

  // ── Proposals ──
  loadProposals: () => Promise<void>
  createProposal: (data: Omit<Proposal, 'id' | 'created_at'>) => Promise<Proposal>
  updateProposal: (data: Proposal) => Promise<void>
  deleteProposal: (id: string) => Promise<void>

  // ── Contracts ──
  loadContracts: () => Promise<void>
  createContract: (data: Omit<Contract, 'id' | 'created_at' | 'signed_at'>) => Promise<Contract>
  updateContract: (data: Contract) => Promise<void>
  deleteContract: (id: string) => Promise<void>

  // ── Time Entries ──
  loadTimeEntries: () => Promise<void>
  createTimeEntry: (data: Omit<TimeEntry, 'id' | 'invoiced'>) => Promise<TimeEntry>
  updateTimeEntry: (data: TimeEntry) => Promise<void>
  deleteTimeEntry: (id: string) => Promise<void>

  // ── Invoices ──
  loadInvoices: () => Promise<void>
  createInvoice: (data: Omit<Invoice, 'id' | 'created_at' | 'paid_at' | 'line_items'> & { line_items: LineItem[] }) => Promise<Invoice>
  updateInvoice: (data: Invoice) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>

  // ── Payments ──
  loadPayments: () => Promise<void>
  createPayment: (data: { invoice_id: string; amount: number; payment_date: string; payment_method: string; reference?: string; notes?: string }) => Promise<InvoicePayment>
  deletePayment: (id: string) => Promise<void>

  // ── Expenses ──
  loadExpenses: () => Promise<void>
  createExpense: (data: Omit<Expense, 'id'>) => Promise<Expense>
  updateExpense: (data: Expense) => Promise<void>
  deleteExpense: (id: string) => Promise<void>

  // ── Profile ──
  loadProfile: () => Promise<UserProfile | null>
  saveProfile: (data: UserProfile) => Promise<void>
  activateLicense: (key: string) => Promise<boolean>
  removeLicense: () => Promise<void>
  setPortalPort: (port: number) => void
  setPortalFailed: () => void
  setArchetypeAppliedAt: (ts: number) => void

  // ── Communications ──
  loadCommunications: () => Promise<void>
  createCommunication: (data: Omit<Communication, 'id' | 'created_at'>) => Promise<Communication>
  deleteCommunication: (id: string, clientId: string) => Promise<void>

  // ── Recurring Invoices ──
  loadRecurringInvoices: () => Promise<void>
  createRecurringInvoice: (data: Omit<RecurringInvoice, 'id' | 'created_at' | 'last_generated'>) => Promise<RecurringInvoice>
  updateRecurringInvoice: (data: RecurringInvoice) => Promise<void>
  deleteRecurringInvoice: (id: string) => Promise<void>

  // ── Import ──
  loadImportHistory: () => Promise<void>
  saveImportFile: (file: File) => Promise<string>
  logImport: (data: Omit<ImportLog, 'id' | 'imported_at'>) => Promise<ImportLog>
  getImportsDir: () => Promise<string>

  // ── Attachments ──
  loadAllAttachments: () => Promise<void>
  createAttachment: (data: Omit<Attachment, 'id' | 'created_at'>) => Promise<Attachment>
  deleteAttachment: (id: string, entityType: string, entityId: string) => Promise<void>
  saveAssetFile: (file: File) => Promise<string>
  getAssetsDir: () => Promise<string>
  renameAttachment: (id: string, newFilename: string) => Promise<Attachment>
  moveAttachment: (id: string, entityType: string, entityId: string, oldEntityType: string, oldEntityId: string) => Promise<Attachment>
  updateAttachmentMeta: (id: string, data: { tags?: string; notes?: string }) => Promise<Attachment>
  loadAssetStats: () => Promise<void>
  searchAssets: (query: string) => Promise<Attachment[]>

  // ── Metrics ──
  loadMetricDefs: () => Promise<void>
  createMetricDef: (data: Omit<MetricDefinition, 'id' | 'created_at'>) => Promise<MetricDefinition>
  updateMetricDef: (data: Omit<MetricDefinition, 'client_id' | 'created_at'>) => Promise<void>
  deleteMetricDef: (id: string) => Promise<void>
  loadMetricValues: (definitionId?: string, limit?: number) => Promise<void>
  createMetricValue: (data: Omit<MetricValue, 'id' | 'created_at'>) => Promise<MetricValue>
  deleteMetricValue: (id: string) => Promise<void>
  loadHeadlineMetrics: () => Promise<void>
  loadMetricTemplates: () => Promise<void>
  saveMetricTemplate: (name: string, definitions: Omit<MetricDefinition, 'id' | 'client_id' | 'created_at'>[]) => Promise<void>
  deleteMetricTemplate: (id: string) => Promise<void>
  applyMetricTemplate: (templateName: string, clientId: string) => Promise<void>

  // ── Follow-ups ──
  loadFollowUpSettings: () => void
  saveFollowUpSettings: (settings: Partial<FollowUpSettings>) => void
  createFollowUp: (data: { entity_type: string; entity_id: string; stage: number }) => Promise<FollowUpLog>
  updateFollowUpStatus: (id: string, status: string, action?: string) => Promise<void>
  loadPendingFollowUps: () => Promise<void>
  loadAllFollowUpLogs: () => Promise<void>
  loadPortalActivity: () => Promise<void>

  // ── Export Templates ──
  loadExportTemplates: () => Promise<void>
  createExportTemplate: (data: Omit<ExportTemplate, 'id' | 'created_at'>) => Promise<ExportTemplate>
  updateExportTemplate: (data: ExportTemplate) => Promise<void>
  deleteExportTemplate: (id: string) => Promise<void>

  // ── Contract Templates ──
  loadContractTemplates: () => Promise<void>
  createContractTemplate: (data: Omit<ContractTemplate, 'id' | 'created_at'>) => Promise<ContractTemplate>
  deleteContractTemplate: (id: string) => Promise<void>

  // ── Project Templates ──
  loadProjectTemplates: () => Promise<void>
  loadTemplateMilestones: (templateId: string) => Promise<void>
  createProjectTemplate: (data: { name: string; description?: string; default_budget?: number; default_status?: string }, milestones: { title: string; days_from_start: number; invoice_on_completion: boolean }[]) => Promise<ProjectTemplate>
  updateProjectTemplate: (id: string, data: { name?: string; description?: string; default_budget?: number; default_status?: string }) => Promise<void>
  deleteProjectTemplate: (id: string) => Promise<void>

  // ── Archetype: Render Logs ──
  loadRenderLogs: () => Promise<void>
  createRenderLog: (data: Omit<ArchetypeRenderLog, 'id' | 'created_at'>) => Promise<ArchetypeRenderLog>
  deleteRenderLog: (id: string) => Promise<void>

  // ── Archetype: Sessions ──
  loadSessions: (clientId?: string, projectId?: string) => Promise<void>
  createSession: (data: Omit<ArchetypeSession, 'id' | 'created_at'>) => Promise<ArchetypeSession>
  deleteSession: (id: string) => Promise<void>

  // ── Archetype: Shoots ──
  loadShoots: () => Promise<void>
  createShoot: (data: Omit<ArchetypeShoot, 'id' | 'created_at'>) => Promise<ArchetypeShoot>
  deleteShoot: (id: string) => Promise<void>

  // ── Archetype: Revisions ──
  loadRevisions: () => Promise<void>
  createRevision: (data: Omit<ArchetypeRevision, 'id' | 'created_at'>) => Promise<ArchetypeRevision>
  deleteRevision: (id: string) => Promise<void>

  // ── Archetype: Builds ──
  loadBuilds: () => Promise<void>
  createBuild: (data: Omit<ArchetypeBuild, 'id' | 'created_at'>) => Promise<ArchetypeBuild>
  deleteBuild: (id: string) => Promise<void>

  // ── Archetype: Keywords ──
  loadKeywords: () => Promise<void>
  createKeyword: (data: Omit<ArchetypeKeyword, 'id' | 'created_at'>) => Promise<ArchetypeKeyword>
  updateKeyword: (id: string, clientId: string, positionCurrent?: number, targetPosition?: number) => Promise<void>
  deleteKeyword: (id: string, clientId: string) => Promise<void>

  // ── Archetype: Datasets ──
  loadDatasets: () => Promise<void>
  createDataset: (data: Omit<ArchetypeDataset, 'id' | 'created_at'>) => Promise<ArchetypeDataset>
  deleteDataset: (id: string) => Promise<void>

  // ── Backward compatibility aliases (old add→create, remove→delete) ──
  addClient: (data: Omit<Client, 'id' | 'created_at'>) => Promise<Client>
  addProject: (data: Omit<Project, 'id' | 'created_at'>) => Promise<Project>
  addMilestone: (data: Omit<Milestone, 'id'>) => Promise<Milestone>
  addProposal: (data: Omit<Proposal, 'id' | 'created_at'>) => Promise<Proposal>
  addContract: (data: Omit<Contract, 'id' | 'created_at' | 'signed_at'>) => Promise<Contract>
  addTimeEntry: (data: Omit<TimeEntry, 'id' | 'invoiced'>) => Promise<TimeEntry>
  addInvoice: (data: Omit<Invoice, 'id' | 'created_at' | 'paid_at' | 'line_items'> & { line_items: LineItem[] }) => Promise<Invoice>
  addPayment: (data: { invoice_id: string; amount: number; payment_date: string; payment_method: string; reference?: string; notes?: string }) => Promise<InvoicePayment>
  addExpense: (data: Omit<Expense, 'id'>) => Promise<Expense>
  addCommunication: (data: Communication) => Promise<Communication>
  addRecurringInvoice: (data: Omit<RecurringInvoice, 'id' | 'created_at' | 'last_generated'>) => Promise<RecurringInvoice>
  addAttachment: (data: Omit<Attachment, 'id' | 'created_at'>) => Promise<Attachment>
  addMetricDef: (data: Omit<MetricDefinition, 'id' | 'created_at'>) => Promise<MetricDefinition>
  addExportTemplate: (data: Omit<ExportTemplate, 'id' | 'created_at'>) => Promise<ExportTemplate>
  addContractTemplate: (data: Omit<ContractTemplate, 'id' | 'created_at'>) => Promise<ContractTemplate>
  addProjectTemplate: (data: { name: string; description?: string; default_budget?: number; default_status?: string }, milestones: { title: string; days_from_start: number; invoice_on_completion: boolean }[]) => Promise<ProjectTemplate>
  addRenderLog: (data: Omit<ArchetypeRenderLog, 'id' | 'created_at'>) => Promise<ArchetypeRenderLog>
  addSession: (data: Omit<ArchetypeSession, 'id' | 'created_at'>) => Promise<ArchetypeSession>
  addShoot: (data: Omit<ArchetypeShoot, 'id' | 'created_at'>) => Promise<ArchetypeShoot>
  addRevision: (data: Omit<ArchetypeRevision, 'id' | 'created_at'>) => Promise<ArchetypeRevision>
  addBuild: (data: Omit<ArchetypeBuild, 'id' | 'created_at'>) => Promise<ArchetypeBuild>
  addKeyword: (data: Omit<ArchetypeKeyword, 'id' | 'created_at'>) => Promise<ArchetypeKeyword>
  addDataset: (data: Omit<ArchetypeDataset, 'id' | 'created_at'>) => Promise<ArchetypeDataset>

  removeClient: (id: string) => Promise<void>
  removeProject: (id: string) => Promise<void>
  removeMilestone: (id: string) => Promise<void>
  removeProposal: (id: string) => Promise<void>
  removeContract: (id: string) => Promise<void>
  removeTimeEntry: (id: string) => Promise<void>
  removeInvoice: (id: string) => Promise<void>
  removePayment: (id: string, invoiceId: string) => Promise<void>
  removeExpense: (id: string) => Promise<void>
  removeCommunication: (id: string, clientId: string) => Promise<void>
  removeRecurringInvoice: (id: string) => Promise<void>
  removeAttachment: (id: string, entityType: string, entityId: string) => Promise<void>
  removeMetricDef: (id: string, clientId: string) => Promise<void>
  removeMetricValue: (id: string, definitionId: string) => Promise<void>
  removeMetricTemplate: (id: string) => Promise<void>
  removeExportTemplate: (id: string) => Promise<void>
  removeContractTemplate: (id: string) => Promise<void>
  removeProjectTemplate: (id: string) => Promise<void>
  removeRenderLog: (id: string, projectId: string) => Promise<void>
  removeSession: (id: string) => Promise<void>
  removeShoot: (id: string, projectId: string) => Promise<void>
  removeRevision: (id: string, projectId: string) => Promise<void>
  removeBuild: (id: string, projectId: string) => Promise<void>
  removeKeyword: (id: string, clientId: string) => Promise<void>
  removeDataset: (id: string, projectId: string) => Promise<void>

  logFollowUp: (data: { entity_type: string; entity_id: string; stage: number }) => Promise<FollowUpLog>
  logMetricValue: (data: Omit<MetricValue, 'id' | 'created_at'>) => Promise<MetricValue>
  loadAllPayments: () => Promise<void>
  projectTemplateMilestones: Record<string, ProjectTemplateMilestone[]>

  // ── Computed selectors ──
  getClientProjects: (clientId: string) => Project[]
  getProjectTimeEntries: (projectId: string) => TimeEntry[]
  getClientInvoices: (clientId: string) => Invoice[]
  getInvoicePayments: (invoiceId: string) => InvoicePayment[]
  getProjectMilestones: (projectId: string) => Milestone[]
  getClientCommunications: (clientId: string) => Communication[]
  getClientMetrics: (clientId: string) => { defs: MetricDefinition[]; values: MetricValue[] }
  getInvoiceBalance: (invoiceId: string) => number
  getUnpaidInvoices: () => Invoice[]
  getPendingProposals: () => Proposal[]
  getActiveContracts: () => Contract[]
  getUpcomingFollowUps: (days?: number) => FollowUpLog[]
  getProjectMetrics: (projectId: string) => { totalTime: number; totalBillable: number; totalInvoiced: number; milestoneProgress: number }
  getFinanceSummary: () => { revenue: number; expenses: number; outstanding: number; forecast: number; totalPaid: number }

  // ── License / Trial / Grace ──
  initLicenseFlow: () => Promise<void>
  pingLicenseServer: () => Promise<void>
  isTier: (tier: string) => boolean
  getActiveTier: () => LicenseTier
  getFeatureFlags: () => Promise<Record<string, boolean>>
}

export type AppStore = UnifiedStore;

export const useStore = create<UnifiedStore>((set, get) => {
  const startLoad = (key: LoadingKey) => set({ loading: { ...get().loading, [key]: true } });
  const endLoad = (key: LoadingKey) => set({ loading: { ...get().loading, [key]: false } });
  const setError = (key: ErrorKey, err: string | null) => set({ errors: { ...get().errors, [key]: err } });

  function parseLineItems(inv: Invoice | RecurringInvoice): any {
    return { ...inv, line_items: typeof inv.line_items === 'string' ? JSON.parse(inv.line_items as string) : inv.line_items };
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
    followUpSettings: { enabled: true, proposal_delay_days: 3, invoice_delay_days: 0, templates: {}, subject_templates: {} },
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
    dismissUpdate: () => set({ updateAvailable: false, updateData: null, isDownloading: false, downloadProgressMB: null }),

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
      try { set({ clients: await invoke<Client[]>('get_clients') }); }
      catch (e) { console.error('[store] loadClients failed:', e); setError('clients', String(e)); }
      finally { endLoad('clients'); }
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
      await invoke('delete_client', { id });
      set({ clients: get().clients.filter((c) => c.id !== id) });
    },

    // ── Projects ──
    loadProjects: async () => {
      startLoad('projects');
      try { set({ projects: await invoke<Project[]>('get_projects') }); }
      catch (e) { console.error('[store] loadProjects failed:', e); setError('projects', String(e)); }
      finally { endLoad('projects'); }
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
      await invoke('delete_project', { id });
      set({ projects: get().projects.filter((p) => p.id !== id) });
    },

    // ── Milestones ──
    loadMilestones: async () => {
      startLoad('milestones');
      try { set({ milestones: await invoke<Milestone[]>('get_milestones') }); }
      catch (e) { console.error('[store] loadMilestones failed:', e); setError('milestones', String(e)); }
      finally { endLoad('milestones'); }
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
      await invoke('delete_milestone', { id });
      set({ milestones: get().milestones.filter((m) => m.id !== id) });
    },

    // ── Proposals ──
    loadProposals: async () => {
      startLoad('proposals');
      try { set({ proposals: await invoke<Proposal[]>('get_proposals') }); }
      catch (e) { console.error('[store] loadProposals failed:', e); setError('proposals', String(e)); }
      finally { endLoad('proposals'); }
    },
    createProposal: async (data) => {
      const proposal = await invoke<Proposal>('create_proposal', { payload: data });
      set({ proposals: [...get().proposals, proposal] });
      return proposal;
    },
    updateProposal: async (data) => {
      await invoke('update_proposal', { payload: data });
      set({ proposals: get().proposals.map((p) => (p.id === data.id ? data : p)) });
    },
    deleteProposal: async (id) => {
      await invoke('delete_proposal', { id });
      set({ proposals: get().proposals.filter((p) => p.id !== id) });
    },

    // ── Contracts ──
    loadContracts: async () => {
      startLoad('contracts');
      try { set({ contracts: await invoke<Contract[]>('get_contracts') }); }
      catch (e) { console.error('[store] loadContracts failed:', e); setError('contracts', String(e)); }
      finally { endLoad('contracts'); }
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
      await invoke('delete_contract', { id });
      set({ contracts: get().contracts.filter((c) => c.id !== id) });
    },

    // ── Time Entries ──
    loadTimeEntries: async () => {
      startLoad('timeEntries');
      try { set({ timeEntries: await invoke<TimeEntry[]>('get_time_entries') }); }
      catch (e) { console.error('[store] loadTimeEntries failed:', e); setError('timeEntries', String(e)); }
      finally { endLoad('timeEntries'); }
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
      await invoke('delete_time_entry', { id });
      set({ timeEntries: get().timeEntries.filter((t) => t.id !== id) });
    },

    // ── Invoices ──
    loadInvoices: async () => {
      startLoad('invoices');
      try {
        const raw = await invoke<Invoice[]>('get_invoices');
        set({ invoices: raw.map(parseLineItems) });
      } catch (e) { console.error('[store] loadInvoices failed:', e); setError('invoices', String(e)); }
      finally { endLoad('invoices'); }
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
      await invoke('update_invoice', { payload });
      set({ invoices: get().invoices.map((i) => (i.id === data.id ? data : i)) });
    },
    deleteInvoice: async (id) => {
      await invoke('delete_invoice', { id });
      set({ invoices: get().invoices.filter((i) => i.id !== id) });
    },

    // ── Payments ──
    loadPayments: async () => {
      startLoad('payments');
      try { set({ payments: await invoke<InvoicePayment[]>('get_all_invoice_payments') }); }
      catch (e) { console.error('[store] loadPayments failed:', e); setError('payments', String(e)); }
      finally { endLoad('payments'); }
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
      try { set({ expenses: await invoke<Expense[]>('get_expenses') }); }
      catch (e) { console.error('[store] loadExpenses failed:', e); setError('expenses', String(e)); }
      finally { endLoad('expenses'); }
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
      await invoke('delete_expense', { id });
      set({ expenses: get().expenses.filter((e) => e.id !== id) });
    },

    // ── Profile ──
    loadProfile: async () => {
      startLoad('profile');
      try {
        const profile = await invoke<UserProfile | null>('get_user_profile');
        const licensed = !!(profile?.license_key && await cachedValidateLicense(profile.license_key));
        set({ profile, profileLoaded: true, isLicensed: licensed });
        return profile;
      } catch (e) {
        console.error('[store] loadProfile failed:', e);
        set({ profileLoaded: true, profile: null });
        return null;
      } finally { endLoad('profile'); }
    },
    saveProfile: async (data) => {
      const sanitized: UserProfile = {
        ...data,
        name: truncate(sanitizeInput(data.name || ''), MAX_LENGTHS.name),
        email: truncate(sanitizeInput(data.email || ''), MAX_LENGTHS.email),
        writing_voice: sanitizeInput(data.writing_voice || ''),
        tagline: truncate(sanitizeInput(data.tagline || ''), MAX_LENGTHS.tagline),
        always_include: sanitizeInput(data.always_include || ''),
        payment_instructions: truncate(sanitizeInput(data.payment_instructions || ''), MAX_LENGTHS.notes),
        // Clamp numeric profile fields to sane ranges (no negatives, no infinity)
        hourly_rate: data.hourly_rate != null && isFinite(data.hourly_rate) ? Math.max(0, data.hourly_rate) : data.hourly_rate,
        tax_rate: data.tax_rate != null && isFinite(data.tax_rate) ? Math.min(100, Math.max(0, data.tax_rate)) : data.tax_rate,
        payment_terms: data.payment_terms != null && isFinite(data.payment_terms) ? Math.max(0, Math.round(data.payment_terms)) : data.payment_terms,
      };
      await invoke('upsert_user_profile', { payload: sanitized });
      const licensed = !!(sanitized.license_key && await cachedValidateLicense(sanitized.license_key));
      set({ profile: sanitized, isLicensed: licensed });
    },
    activateLicense: async (key) => {
      if (!await cachedValidateLicense(key)) return false;
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
      const updated = { ...profile, license_key: undefined, licensed_at: undefined, license_tier: undefined, license_expires_at: undefined, license_validated_at: undefined, license_grace_until: undefined };
      await invoke('upsert_user_profile', { payload: updated });
      set({ profile: updated, isLicensed: false });
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
        } catch { /* private mode: fall through to normal start */ }
        if (amnesty) {
          const updated = { ...profile, trial_started_at: now };
          await invoke('upsert_user_profile', { payload: updated });
          set({ profile: updated });
          try {
            localStorage.setItem('lance:trial-reset-v1', 'done');
          } catch { /* private mode */ }
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

      // If we have a license key but haven't validated recently, ping the license server
      if (profile.license_key && !profile.license_validated_at) {
        await get().pingLicenseServer();
      }
    },

    pingLicenseServer: async () => {
      const profile = get().profile;
      if (!profile?.license_key) return;

      const { isTauri } = await import('../utils/tauri');

      try {
        // In Tauri, call the Rust command to ping the license server
        // In browser, we'd call the worker directly (future enhancement)
        if (isTauri()) {
          const result = await invoke<{
            valid: boolean;
            tier: string;
            expires_at?: string;
            message: string;
          }>('validate_license_online', { key: get().profile?.license_key });

          if (result.valid) {
            const profile = get().profile;
            if (!profile) return;
            const now = new Date().toISOString();
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
            // Server said invalid/expired but gave us a tier · update local state
            const profile = get().profile;
            if (!profile) return;
            const updated = {
              ...profile,
              currency: profile.currency || 'CAD',
              license_tier: result.tier,
              license_expires_at: result.expires_at,
              license_validated_at: new Date().toISOString(),
              license_grace_until: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2-day grace
            };
            await invoke('upsert_user_profile', { payload: updated });
            set({ profile: updated, isLicensed: result.tier !== 'free' && result.tier !== 'expired' });
            console.warn('[license] Online validation failed, grace started:', result.message);
          }
        }
      } catch (e) {
        console.warn('[license] Online ping failed, using cached/offline:', e);
        // Offline: if we have a cached validation, check grace period
        const profile = get().profile;
        if (profile?.license_validated_at && profile.license_grace_until) {
          const graceUntil = new Date(profile.license_grace_until).getTime();
          if (Date.now() > graceUntil) {
            // Grace expired · downgrade
            const updated = { ...profile, license_tier: 'free', isLicensed: false };
            await invoke('upsert_user_profile', { payload: updated });
            set({ profile: updated, isLicensed: false });
            console.warn('[license] Grace period expired, downgraded to free');
          }
        }
      }
    },

    isTier: (tier: string) => {
      const profile = get().profile;
      return profile?.license_tier === tier;
    },

    getActiveTier: (): LicenseTier => {
      const profile = get().profile;
      if (!profile) return 'free';
      // Server-validated or downgraded tiers win, but paid tiers require
      // the key to still be present. Otherwise removing a key would leave
      // a stale 'pro' tier granting free Pro forever.
      if (profile.license_tier) {
        const serverTier = profile.license_tier as LicenseTier;
        if (serverTier !== 'pro' && serverTier !== 'lifetime') return serverTier;
        if (profile.license_key) return serverTier;
      } else if (profile.license_key) {
        return 'lifetime';
      }
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

    setPortalPort: (port) => set({ portalPort: port, portalFailed: false }),
    setPortalFailed: () => set({ portalFailed: true }),
    setArchetypeAppliedAt: (ts) => set({ archetypeAppliedAt: ts }),

    // ── Communications ──
    loadCommunications: async () => {
      startLoad('communications');
      try { set({ communications: await invoke<Communication[]>('get_communications') }); }
      catch (e) { console.error('[store] loadCommunications failed:', e); setError('communications', String(e)); }
      finally { endLoad('communications'); }
    },
    createCommunication: async (data) => {
      const comm = await invoke<Communication>('create_communication', { payload: data });
      set({ communications: [...get().communications, comm] });
      return comm;
    },
    deleteCommunication: async (id, clientId) => {
      await invoke('delete_communication', { id });
      set({ communications: get().communications.filter((c) => c.id !== id) });
    },

    // ── Recurring Invoices ──
    loadRecurringInvoices: async () => {
      startLoad('recurringInvoices');
      try {
        const raw = await invoke<RecurringInvoice[]>('get_recurring_invoices');
        set({ recurringInvoices: raw.map(parseLineItems) });
      } catch (e) { console.error('[store] loadRecurringInvoices failed:', e); setError('recurringInvoices', String(e)); }
      finally { endLoad('recurringInvoices'); }
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
      try { set({ importHistory: await invoke<ImportLog[]>('get_import_log') }); }
      catch (e) { console.error('[store] loadImportHistory failed:', e); setError('importHistory', String(e)); }
      finally { endLoad('importHistory'); }
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
      try { set({ allAttachments: await invoke<Attachment[]>('get_all_attachments') }); }
      catch (e) { console.error('[store] loadAllAttachments failed:', e); }
      finally { endLoad('allAttachments'); }
    },
    createAttachment: async (data) => {
      const attachment = await invoke<Attachment>('create_attachment', { payload: data });
      set({ allAttachments: [attachment, ...get().allAttachments] });
      return attachment;
    },
    deleteAttachment: async (id, entityType, entityId) => {
      await invoke('delete_attachment', { id });
      set({ allAttachments: get().allAttachments.filter((a) => a.id !== id) });
    },
    saveAssetFile: async (file) => {
      const buffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      return invoke<string>('save_asset_file', { filename: file.name, data });
    },
    getAssetsDir: () => invoke<string>('get_assets_dir'),
    renameAttachment: async (id, newFilename) => {
      const attachment = await invoke<Attachment>('rename_attachment', { payload: { id, new_filename: newFilename } });
      set({ allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)) });
      return attachment;
    },
    moveAttachment: async (id, entityType, entityId, oldEntityType, oldEntityId) => {
      const attachment = await invoke<Attachment>('move_attachment', { payload: { id, entity_type: entityType, entity_id: entityId } });
      set({ allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)) });
      return attachment;
    },
    updateAttachmentMeta: async (id, data) => {
      const attachment = await invoke<Attachment>('update_attachment_meta', { payload: { id, ...data } });
      set({ allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)) });
      return attachment;
    },
    loadAssetStats: async () => {
      try { set({ assetStats: await invoke<AssetStats>('get_asset_stats') }); }
      catch (e) { console.error('[store] loadAssetStats failed:', e); }
    },
    searchAssets: (query) => invoke<Attachment[]>('search_assets', { query }),

    // ── Metrics ──
    loadMetricDefs: async () => {
      startLoad('metricDefs');
      try { set({ metricDefs: await invoke<MetricDefinition[]>('get_all_metric_definitions') }); }
      catch (e) { console.error('[store] loadMetricDefs failed:', e); setError('metricDefs', String(e)); }
      finally { endLoad('metricDefs'); }
    },
    createMetricDef: async (data) => {
      const def = await invoke<MetricDefinition>('create_metric_definition', { payload: data });
      set({ metricDefs: [...get().metricDefs, def] });
      return def;
    },
    updateMetricDef: async (data) => {
      await invoke('update_metric_definition', { payload: data });
      set({ metricDefs: get().metricDefs.map((d) => (d.id === data.id ? { ...d, ...data } : d)) });
    },
    deleteMetricDef: async (id) => {
      await invoke('delete_metric_definition', { id });
      set({ metricDefs: get().metricDefs.filter((d) => d.id !== id) });
    },
    loadMetricValues: async (definitionId, limit) => {
      startLoad('metricValues');
      try {
        const values = await invoke<MetricValue[]>('get_metric_values', { definitionId: definitionId ?? null, limit: limit ?? null });
        set({ metricValues: values });
      } catch (e) { console.error('[store] loadMetricValues failed:', e); setError('metricValues', String(e)); }
      finally { endLoad('metricValues'); }
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
      try { set({ headlineMetrics: await invoke<HeadlineMetric[]>('get_all_headline_metrics') }); }
      catch (e) { console.error('[store] loadHeadlineMetrics failed:', e); }
    },
    loadMetricTemplates: async () => {
      try { set({ metricTemplates: await invoke<MetricTemplate[]>('get_metric_templates') }); }
      catch (e) { console.error('[store] loadMetricTemplates failed:', e); }
    },
    saveMetricTemplate: async (name, definitions) => {
      await invoke('save_metric_template', { payload: { name, definitions_json: JSON.stringify(definitions) } });
      await get().loadMetricTemplates();
    },
    deleteMetricTemplate: async (id) => {
      await invoke('delete_metric_template', { id });
      set({ metricTemplates: get().metricTemplates.filter((t) => t.id !== id) });
    },
    applyMetricTemplate: async (templateName, clientId) => {
      const templates = get().metricTemplates.length ? get().metricTemplates : await invoke<MetricTemplate[]>('get_metric_templates');
      const tmpl = templates.find((t) => t.name === templateName);
      if (!tmpl) return;
      const definitions: Array<Pick<MetricDefinition, 'name' | 'metric_type' | 'unit_label' | 'is_headline' | 'sort_order'>> = JSON.parse(tmpl.definitions_json);
      for (const def of definitions) {
        await get().createMetricDef({
          client_id: clientId,
          name: def.name,
          metric_type: def.metric_type as MetricDefinition['metric_type'],
          unit_label: def.unit_label,
          is_headline: def.is_headline as boolean,
          sort_order: def.sort_order as number,
        });
      }
    },

    // ── Follow-ups ──
    loadFollowUpSettings: () => {
      try {
        const stored = localStorage.getItem('lance:follow-up-settings');
        if (stored) {
          const defaults = { enabled: true, proposal_delay_days: 3, invoice_delay_days: 0, templates: {}, subject_templates: {} };
          set({ followUpSettings: { ...defaults, ...JSON.parse(stored) } });
        }
      } catch { /* use defaults */ }
    },
    saveFollowUpSettings: (updates) => {
      const merged = { ...get().followUpSettings, ...updates };
      set({ followUpSettings: merged });
      localStorage.setItem('lance:follow-up-settings', JSON.stringify(merged));
    },
    createFollowUp: async (data) => {
      const log = await invoke<FollowUpLog>('log_follow_up', { payload: data });
      const key = `${data.entity_type}:${data.entity_id}`;
      const current = { ...get().followUpLogs };
      (current as any)[key] = [(current as any)[key] || [], log].flat();
      set({ followUpLogs: current });
      return log;
    },
    updateFollowUpStatus: async (id, status, action) => {
      await invoke('update_follow_up_status', { payload: { id, status, action: action ?? null } });
      const allLogs = { ...get().followUpLogs };
      for (const key of Object.keys(allLogs)) {
        (allLogs as any)[key] = (allLogs as any)[key].map((l: FollowUpLog) =>
          l.id === id ? { ...l, status: status as FollowUpLog['status'], action: action ?? l.action, actioned_at: new Date().toISOString() } : l
        );
      }
      set({ followUpLogs: allLogs, pendingFollowUps: get().pendingFollowUps.filter((l) => l.id !== id) });
    },
    loadPendingFollowUps: async () => {
      try { set({ pendingFollowUps: await invoke<FollowUpLog[]>('get_all_pending_follow_ups') }); }
      catch (e) { console.error('[store] loadPendingFollowUps failed:', e); }
    },
    loadAllFollowUpLogs: async () => {
      try {
        const logs = await invoke<FollowUpLog[]>('get_all_follow_up_logs');
        const keyed: Record<string, FollowUpLog[]> = {};
        for (const log of logs) {
          const key = `${log.entity_type}:${log.entity_id}`;
          (keyed as any)[key] = [...((keyed as any)[key] || []), log];
        }
        set({ followUpLogs: keyed });
      } catch (e) { console.error('[store] loadAllFollowUpLogs failed:', e); }
    },
    // Shared portal activity (proposal/contract opens + responses). One
    // loader feeds the dashboard feed, proposal badges, and Pro open alerts.
    loadPortalActivity: async () => {
      try {
        const activities = await invoke<PortalActivity[]>('get_portal_activity');
        set({ portalActivity: activities || [] });
      } catch (e) { console.error('[store] loadPortalActivity failed:', e); }
    },

    // ── Export Templates ──
    loadExportTemplates: async () => {
      startLoad('exportTemplates');
      try {
        const { getDb } = await import('../db');
        const db = await getDb();
        const rows = await db.select<ExportTemplate[]>('SELECT id, name, type, header, footer, sections, color_scheme, created_at FROM export_templates ORDER BY created_at DESC');
        set({ exportTemplates: rows.map((r: ExportTemplate) => ({ ...r, sections: typeof r.sections === 'string' ? JSON.parse(r.sections as string) : r.sections })) });
      } catch (e) { console.error('[store] loadExportTemplates failed:', e); setError('exportTemplates', String(e)); }
      finally { endLoad('exportTemplates'); }
    },
    createExportTemplate: async (data) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute('INSERT INTO export_templates (id, name, type, header, footer, sections, color_scheme, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, data.name, data.type, data.header || '', data.footer || '', JSON.stringify(data.sections || []), data.color_scheme || '', now]);
      const template: ExportTemplate = { id, ...data, created_at: now };
      set({ exportTemplates: [template, ...get().exportTemplates] });
      return template;
    },
    updateExportTemplate: async (data) => {
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute('UPDATE export_templates SET name = ?, type = ?, header = ?, footer = ?, sections = ?, color_scheme = ? WHERE id = ?', [data.name, data.type, data.header || '', data.footer || '', JSON.stringify(data.sections || []), data.color_scheme || '', data.id]);
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
        const rows = await db.select<ContractTemplate[]>('SELECT id, name, category, body, variables, created_at FROM contract_templates ORDER BY created_at DESC');
        set({ contractTemplates: rows.map((r: ContractTemplate) => ({ ...r, variables: typeof r.variables === 'string' ? JSON.parse(r.variables as string) : r.variables })) });
      } catch (e) { console.error('[store] loadContractTemplates failed:', e); setError('contractTemplates', String(e)); }
      finally { endLoad('contractTemplates'); }
    },
    createContractTemplate: async (data) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute('INSERT INTO contract_templates (id, name, category, body, variables, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, data.name, data.category || '', data.body, JSON.stringify(data.variables || []), now]);
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
        const rows = await db.select<ProjectTemplate[]>('SELECT id, name, description, default_budget, default_status, is_default, created_at FROM project_templates ORDER BY created_at DESC');
        set({ projectTemplates: rows.map((r: ProjectTemplate) => ({ ...r, is_default: !!(r as any).is_default })) });
      } catch (e) { console.error('[store] loadProjectTemplates failed:', e); setError('projectTemplates', String(e)); }
      finally { endLoad('projectTemplates'); }
    },
    loadTemplateMilestones: async (templateId) => {
      try {
        const { getDb } = await import('../db');
        const db = await getDb();
        const rows = await db.select<ProjectTemplateMilestone[]>('SELECT id, template_id, title, days_from_start, invoice_on_completion FROM project_template_milestones WHERE template_id = ? ORDER BY days_from_start ASC', [templateId]);
        set({ templateMilestones: rows });
      } catch (e) { console.error('[store] loadTemplateMilestones failed:', e); }
    },
    createProjectTemplate: async (data, milestones) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute('INSERT INTO project_templates (id, name, description, default_budget, default_status, is_default, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)', [id, data.name, data.description || null, data.default_budget ?? null, data.default_status || 'Active', now]);
      for (const m of milestones) {
        await db.execute('INSERT INTO project_template_milestones (id, template_id, title, days_from_start, invoice_on_completion) VALUES (?, ?, ?, ?, ?)', [crypto.randomUUID(), id, m.title, m.days_from_start, m.invoice_on_completion ? 1 : 0]);
      }
      const template: ProjectTemplate = { id, name: data.name, description: data.description, default_budget: data.default_budget, default_status: data.default_status || 'Active', is_default: false, created_at: now };
      set({ projectTemplates: [template, ...get().projectTemplates] });
      return template;
    },
    updateProjectTemplate: async (id, data) => {
      const { getDb } = await import('../db');
      const db = await getDb();
      const sets: string[] = [];
      const vals: (string | number | null)[] = [];
      if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
      if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description || null); }
      if (data.default_budget !== undefined) { sets.push('default_budget = ?'); vals.push(data.default_budget ?? null); }
      if (data.default_status !== undefined) { sets.push('default_status = ?'); vals.push(data.default_status); }
      if (sets.length === 0) return;
      vals.push(id);
      await db.execute(`UPDATE project_templates SET ${sets.join(', ')} WHERE id = ?`, vals);
      set({ projectTemplates: get().projectTemplates.map((t) => (t.id === id ? { ...t, ...data } : t)) });
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
      try { set({ renderLogs: await invoke<ArchetypeRenderLog[]>('get_all_render_logs') }); }
      catch (e) { console.error('[store] loadRenderLogs failed:', e); setError('renderLogs', String(e)); }
      finally { endLoad('renderLogs'); }
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
      try { set({ sessions: await invoke<ArchetypeSession[]>('get_sessions', { clientId: clientId ?? null, projectId: projectId ?? null }) }); }
      catch (e) { console.error('[store] loadSessions failed:', e); setError('sessions', String(e)); }
      finally { endLoad('sessions'); }
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
      try { set({ shoots: await invoke<ArchetypeShoot[]>('get_all_shoots') }); }
      catch (e) { console.error('[store] loadShoots failed:', e); setError('shoots', String(e)); }
      finally { endLoad('shoots'); }
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
      try { set({ revisions: await invoke<ArchetypeRevision[]>('get_all_revisions') }); }
      catch (e) { console.error('[store] loadRevisions failed:', e); setError('revisions', String(e)); }
      finally { endLoad('revisions'); }
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
      try { set({ builds: await invoke<ArchetypeBuild[]>('get_all_builds') }); }
      catch (e) { console.error('[store] loadBuilds failed:', e); setError('builds', String(e)); }
      finally { endLoad('builds'); }
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
      try { set({ keywords: await invoke<ArchetypeKeyword[]>('get_all_keywords') }); }
      catch (e) { console.error('[store] loadKeywords failed:', e); setError('keywords', String(e)); }
      finally { endLoad('keywords'); }
    },
    createKeyword: async (data) => {
      const keyword = await invoke<ArchetypeKeyword>('create_keyword', { payload: data });
      set({ keywords: [keyword, ...get().keywords] });
      return keyword;
    },
    updateKeyword: async (id, clientId, positionCurrent, targetPosition) => {
      await invoke('update_keyword', { id, positionCurrent: positionCurrent ?? null, targetPosition: targetPosition ?? null });
      set({ keywords: get().keywords.map((k) => k.id === id ? { ...k, position_current: positionCurrent ?? k.position_current, target_position: targetPosition ?? k.target_position } : k) });
    },
    deleteKeyword: async (id, clientId) => {
      await invoke('delete_keyword', { id });
      set({ keywords: get().keywords.filter((k) => k.id !== id) });
    },

    // ── Archetype: Datasets ──
    loadDatasets: async () => {
      startLoad('datasets');
      try { set({ datasets: await invoke<ArchetypeDataset[]>('get_all_datasets') }); }
      catch (e) { console.error('[store] loadDatasets failed:', e); setError('datasets', String(e)); }
      finally { endLoad('datasets'); }
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
    removeAttachment: (id, entityType, entityId) => get().deleteAttachment(id, entityType, entityId),
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
    getProjectTimeEntries: (projectId) => get().timeEntries.filter((t) => t.project_id === projectId),
    getClientInvoices: (clientId) => get().invoices.filter((i) => i.client_id === clientId),
    getInvoicePayments: (invoiceId) => get().payments.filter((p) => p.invoice_id === invoiceId),
    getProjectMilestones: (projectId) => get().milestones.filter((m) => m.project_id === projectId),
    getClientCommunications: (clientId) => get().communications.filter((c) => c.client_id === clientId),
    getClientMetrics: (clientId) => ({
      defs: get().metricDefs.filter((d) => d.client_id === clientId),
      values: get().metricValues.filter((v) => v.client_id === clientId),
    }),
    getInvoiceBalance: (invoiceId) => {
      const inv = get().invoices.find((i) => i.id === invoiceId);
      if (!inv) return 0;
      const totalPaid = get().payments.filter((p) => p.invoice_id === invoiceId).reduce((s, p) => s + p.amount, 0);
      return inv.total - totalPaid;
    },
    getUnpaidInvoices: () => get().invoices.filter((i) => i.status === 'sent' || i.status === 'overdue' || i.status === 'partial'),
    getPendingProposals: () => get().proposals.filter((p) => p.status === 'draft' || p.status === 'sent'),
    getActiveContracts: () => get().contracts.filter((c) => c.status === 'active'),
    getUpcomingFollowUps: (days = 7) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      return get().pendingFollowUps.filter((f) => new Date(f.drafted_at) <= cutoff);
    },
    getProjectMetrics: (projectId) => {
      const entries = get().timeEntries.filter((t) => t.project_id === projectId);
      const totalTime = entries.reduce((s, t) => s + (t.duration_minutes || 0), 0);
      const totalBillable = entries.filter((t) => t.billable).reduce((s, t) => s + (t.duration_minutes || 0), 0);
      const invs = get().invoices.filter((i) => i.project_id === projectId);
      const totalInvoiced = invs.reduce((s, i) => s + i.total, 0);
      const ms = get().milestones.filter((m) => m.project_id === projectId);
      const milestoneProgress = ms.length > 0 ? (ms.filter((m) => m.completed).length / ms.length) * 100 : 0;
      return { totalTime, totalBillable, totalInvoiced, milestoneProgress };
    },
    getFinanceSummary: () => {
      const revenue = get().invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
      const expenses = get().expenses.reduce((s, e) => s + e.amount, 0);
      const outstanding = get().invoices.filter((i) => i.status === 'sent' || i.status === 'overdue' || i.status === 'partial').reduce((s, i) => s + i.total, 0);
      const totalPaid = get().payments.reduce((s, p) => s + p.amount, 0);
      const paidInvoices = get().invoices.filter((i) => i.status === 'paid');
      const avgPayment = paidInvoices.length > 0 ? paidInvoices.reduce((s, i) => s + i.total, 0) / paidInvoices.length : 0;
      const forecast = outstanding + (avgPayment * 2);
      return { revenue, expenses, outstanding, forecast, totalPaid };
    },
  };
});
