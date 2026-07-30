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
  ProjectPhase,
  ProjectTemplate,
  ProjectTemplateMilestone,
} from '../types';
import { validateLicenseKey } from '../license';

const licenseCache = new Map<string, boolean>();

async function cachedValidateLicense(key: string): Promise<boolean> {
  if (licenseCache.has(key)) return licenseCache.get(key)!;
  const valid = await validateLicenseKey(key);
  licenseCache.set(key, valid);
  return valid;
}

interface ClientSlice {
  clients: Client[];
  loadClients: () => Promise<void>;
  addClient: (data: Omit<Client, 'id' | 'created_at'>) => Promise<Client>;
  updateClient: (data: Client) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
  refreshClient: (id: string) => Promise<Client | null>;
}

interface ProjectSlice {
  projects: Project[];
  loadProjects: () => Promise<void>;
  addProject: (data: Omit<Project, 'id' | 'created_at'>) => Promise<Project>;
  updateProject: (data: Project) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  refreshProject: (id: string) => Promise<Project | null>;
}

interface MilestoneSlice {
  milestones: Record<string, Milestone[]>;
  loadMilestones: (projectId: string) => Promise<void>;
  addMilestone: (data: Omit<Milestone, 'id'>) => Promise<Milestone>;
  updateMilestone: (data: Milestone) => Promise<void>;
  removeMilestone: (id: string) => Promise<void>;
}

interface ProposalSlice {
  proposals: Proposal[];
  loadProposals: () => Promise<void>;
  addProposal: (data: Omit<Proposal, 'id' | 'created_at'>) => Promise<Proposal>;
  updateProposal: (data: Proposal) => Promise<void>;
  removeProposal: (id: string) => Promise<void>;
  refreshProposal: (id: string) => Promise<Proposal | null>;
}

interface ContractSlice {
  contracts: Contract[];
  loadContracts: () => Promise<void>;
  addContract: (data: Omit<Contract, 'id' | 'created_at' | 'signed_at'>) => Promise<Contract>;
  updateContract: (data: Contract) => Promise<void>;
  removeContract: (id: string) => Promise<void>;
  refreshContract: (id: string) => Promise<Contract | null>;
}

interface TimeSlice {
  timeEntries: TimeEntry[];
  loadTimeEntries: () => Promise<void>;
  addTimeEntry: (data: Omit<TimeEntry, 'id' | 'invoiced'>) => Promise<TimeEntry>;
  updateTimeEntry: (data: TimeEntry) => Promise<void>;
  removeTimeEntry: (id: string) => Promise<void>;
  refreshTimeEntry: (id: string) => Promise<TimeEntry | null>;
}

interface InvoiceSlice {
  invoices: Invoice[];
  loadInvoices: () => Promise<void>;
  addInvoice: (data: Omit<Invoice, 'id' | 'created_at' | 'paid_at' | 'line_items'> & { line_items: LineItem[] }) => Promise<Invoice>;
  updateInvoice: (data: Invoice) => Promise<void>;
  removeInvoice: (id: string) => Promise<void>;
  refreshInvoice: (id: string) => Promise<Invoice | null>;
}

interface InvoicePaymentSlice {
  payments: Record<string, InvoicePayment[]>;
  loadPayments: (invoiceId: string) => Promise<void>;
  loadAllPayments: () => Promise<void>;
  addPayment: (data: { invoice_id: string; amount: number; payment_date: string; payment_method: string; reference?: string; notes?: string }) => Promise<InvoicePayment>;
  removePayment: (id: string, invoiceId: string) => Promise<void>;
}

interface ExpenseSlice {
  expenses: Expense[];
  loadExpenses: () => Promise<void>;
  addExpense: (data: Omit<Expense, 'id'>) => Promise<Expense>;
  updateExpense: (data: Expense) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
}

interface ProfileSlice {
  profile: UserProfile | null;
  profileLoaded: boolean;
  isLicensed: boolean;
  portalPort: number | null;
  portalFailed: boolean;
  setPortalPort: (port: number) => void;
  setPortalFailed: () => void;
  loadProfile: () => Promise<void>;
  saveProfile: (data: UserProfile) => Promise<void>;
  activateLicense: (key: string) => Promise<boolean>;
  removeLicense: () => Promise<void>;
  archetypeAppliedAt: number | null;
  setArchetypeAppliedAt: (ts: number) => void;
}

interface CommunicationSlice {
  communications: Record<string, Communication[]>;
  loadCommunications: (clientId: string) => Promise<void>;
  addCommunication: (data: Communication) => Promise<Communication>;
  updateCommunication: (id: string, clientId: string, summary: string) => Promise<void>;
  removeCommunication: (id: string, clientId: string) => Promise<void>;
}

interface RecurringInvoiceSlice {
  recurringInvoices: RecurringInvoice[];
  loadRecurringInvoices: () => Promise<void>;
  addRecurringInvoice: (data: Omit<RecurringInvoice, 'id' | 'created_at' | 'last_generated'>) => Promise<RecurringInvoice>;
  updateRecurringInvoice: (data: RecurringInvoice) => Promise<void>;
  removeRecurringInvoice: (id: string) => Promise<void>;
}

interface ImportSlice {
  importHistory: ImportLog[];
  loadImportHistory: () => Promise<void>;
  saveImportFile: (file: File) => Promise<string>;
  logImport: (data: Omit<ImportLog, 'id' | 'imported_at'>) => Promise<ImportLog>;
  getImportsDir: () => Promise<string>;
}

interface AttachmentSlice {
  attachments: Record<string, Attachment[]>;
  allAttachments: Attachment[];
  assetStats: AssetStats | null;
  loadAttachments: (entityType: string, entityId: string) => Promise<void>;
  loadAllAttachments: () => Promise<void>;
  addAttachment: (data: Omit<Attachment, 'id' | 'created_at'>) => Promise<Attachment>;
  removeAttachment: (id: string, entityType: string, entityId: string) => Promise<void>;
  saveAssetFile: (file: File) => Promise<string>;
  getAssetsDir: () => Promise<string>;
  renameAttachment: (id: string, newFilename: string) => Promise<Attachment>;
  moveAttachment: (id: string, entityType: string, entityId: string, oldEntityType: string, oldEntityId: string) => Promise<Attachment>;
  updateAttachmentMeta: (id: string, data: { tags?: string; notes?: string }) => Promise<Attachment>;
  loadAssetStats: () => Promise<void>;
  searchAssets: (query: string) => Promise<Attachment[]>;
}

interface MetricSlice {
  metricDefs: Record<string, MetricDefinition[]>;
  metricValues: Record<string, MetricValue[]>;
  headlineMetrics: HeadlineMetric[];
  metricTemplates: MetricTemplate[];
  loadMetricDefs: (clientId: string) => Promise<void>;
  addMetricDef: (data: Omit<MetricDefinition, 'id' | 'created_at'>) => Promise<MetricDefinition>;
  updateMetricDef: (data: Omit<MetricDefinition, 'client_id' | 'created_at'>) => Promise<void>;
  removeMetricDef: (id: string, clientId: string) => Promise<void>;
  loadMetricValues: (definitionId: string, limit?: number) => Promise<void>;
  logMetricValue: (data: Omit<MetricValue, 'id' | 'created_at'>) => Promise<MetricValue>;
  removeMetricValue: (id: string, definitionId: string) => Promise<void>;
  loadHeadlineMetrics: () => Promise<void>;
  loadMetricTemplates: () => Promise<void>;
  saveMetricTemplate: (name: string, definitions: Omit<MetricDefinition, 'id' | 'client_id' | 'created_at'>[]) => Promise<void>;
  removeMetricTemplate: (id: string) => Promise<void>;
  applyMetricTemplate: (templateName: string, clientId: string) => Promise<void>;
}

interface FollowUpSlice {
  followUpLogs: Record<string, FollowUpLog[]>;
  pendingFollowUps: FollowUpLog[];
  followUpSettings: FollowUpSettings;
  loadFollowUpSettings: () => void;
  saveFollowUpSettings: (settings: Partial<FollowUpSettings>) => void;
  loadFollowUpLog: (entityType: string, entityId: string) => Promise<void>;
  logFollowUp: (data: { entity_type: string; entity_id: string; stage: number }) => Promise<FollowUpLog>;
  updateFollowUpStatus: (id: string, status: string, action?: string) => Promise<void>;
  loadPendingFollowUps: () => Promise<void>;
}

interface ExportTemplateSlice {
  exportTemplates: ExportTemplate[];
  loadExportTemplates: () => Promise<void>;
  addExportTemplate: (data: Omit<ExportTemplate, 'id' | 'created_at'>) => Promise<ExportTemplate>;
  updateExportTemplate: (data: ExportTemplate) => Promise<void>;
  removeExportTemplate: (id: string) => Promise<void>;
}

interface ContractTemplateSlice {
  contractTemplates: ContractTemplate[];
  loadContractTemplates: () => Promise<void>;
  addContractTemplate: (data: Omit<ContractTemplate, 'id' | 'created_at'>) => Promise<ContractTemplate>;
  updateContractTemplate: (data: ContractTemplate) => Promise<void>;
  removeContractTemplate: (id: string) => Promise<void>;
}

interface ProjectTemplateSlice {
  projectTemplates: ProjectTemplate[];
  projectTemplateMilestones: Record<string, ProjectTemplateMilestone[]>;
  loadProjectTemplates: () => Promise<void>;
  loadTemplateMilestones: (templateId: string) => Promise<void>;
  addProjectTemplate: (data: { name: string; description?: string; default_budget?: number; default_status?: string }, milestones: { title: string; days_from_start: number; invoice_on_completion: boolean }[]) => Promise<ProjectTemplate>;
  updateProjectTemplate: (id: string, data: { name?: string; description?: string; default_budget?: number; default_status?: string }) => Promise<void>;
  removeProjectTemplate: (id: string) => Promise<void>;
}

interface ArchetypeRenderLogSlice {
  renderLogs: Record<string, ArchetypeRenderLog[]>;
  loadRenderLogs: (projectId: string) => Promise<void>;
  addRenderLog: (data: Omit<ArchetypeRenderLog, 'id' | 'created_at'>) => Promise<ArchetypeRenderLog>;
  removeRenderLog: (id: string, projectId: string) => Promise<void>;
}

interface ArchetypeSessionSlice {
  sessions: ArchetypeSession[];
  loadSessions: (clientId?: string, projectId?: string) => Promise<void>;
  addSession: (data: Omit<ArchetypeSession, 'id' | 'created_at'>) => Promise<ArchetypeSession>;
  removeSession: (id: string) => Promise<void>;
}

interface ArchetypeShootSlice {
  shoots: Record<string, ArchetypeShoot[]>;
  loadShoots: (projectId: string) => Promise<void>;
  addShoot: (data: Omit<ArchetypeShoot, 'id' | 'created_at'>) => Promise<ArchetypeShoot>;
  removeShoot: (id: string, projectId: string) => Promise<void>;
}

interface ArchetypeRevisionSlice {
  revisions: Record<string, ArchetypeRevision[]>;
  loadRevisions: (projectId: string) => Promise<void>;
  addRevision: (data: Omit<ArchetypeRevision, 'id' | 'created_at'>) => Promise<ArchetypeRevision>;
  removeRevision: (id: string, projectId: string) => Promise<void>;
}

interface ArchetypeBuildSlice {
  builds: Record<string, ArchetypeBuild[]>;
  loadBuilds: (projectId: string) => Promise<void>;
  addBuild: (data: Omit<ArchetypeBuild, 'id' | 'created_at'>) => Promise<ArchetypeBuild>;
  removeBuild: (id: string, projectId: string) => Promise<void>;
}

interface ArchetypeKeywordSlice {
  keywords: Record<string, ArchetypeKeyword[]>;
  loadKeywords: (clientId: string) => Promise<void>;
  addKeyword: (data: Omit<ArchetypeKeyword, 'id' | 'created_at'>) => Promise<ArchetypeKeyword>;
  updateKeyword: (id: string, clientId: string, positionCurrent?: number, targetPosition?: number) => Promise<void>;
  removeKeyword: (id: string, clientId: string) => Promise<void>;
}

interface ArchetypeDatasetSlice {
  datasets: Record<string, ArchetypeDataset[]>;
  loadDatasets: (projectId: string) => Promise<void>;
  addDataset: (data: Omit<ArchetypeDataset, 'id' | 'created_at'>) => Promise<ArchetypeDataset>;
  removeDataset: (id: string, projectId: string) => Promise<void>;
}

// ── Phase tracker ──
interface PhaseTrackerSlice {
  projectPhases: Record<string, ProjectPhase[]>;
  loadProjectPhases: (projectId: string) => Promise<void>;
  addProjectPhase: (data: Omit<ProjectPhase, 'id'>) => Promise<ProjectPhase>;
  updateProjectPhase: (id: string, projectId: string, data: Partial<Pick<ProjectPhase, 'phase_name' | 'status' | 'color'>>) => Promise<void>;
  removeProjectPhase: (id: string, projectId: string) => Promise<void>;
}
export type AppStore = ClientSlice & ProjectSlice & MilestoneSlice & ProposalSlice & ContractSlice & TimeSlice & InvoiceSlice & InvoicePaymentSlice & ExpenseSlice & ProfileSlice & CommunicationSlice & RecurringInvoiceSlice & ImportSlice & AttachmentSlice & MetricSlice & FollowUpSlice & ExportTemplateSlice & ContractTemplateSlice & ProjectTemplateSlice & ArchetypeRenderLogSlice & ArchetypeSessionSlice & ArchetypeShootSlice & ArchetypeRevisionSlice & ArchetypeBuildSlice & ArchetypeKeywordSlice & ArchetypeDatasetSlice & PhaseTrackerSlice;

const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  const { tauriInvoke } = await import('../utils/tauri');
  return tauriInvoke<T>(cmd, args);
};

/** Return true if we can use the SQLite database (Tauri plugin-sql). */
function canUseDb(): boolean {
  try {
    return typeof window !== 'undefined' && typeof (window as any).__TAURI_INTERNALS__ === 'object';
  } catch {
    return false;
  }
}

export const useStore = create<AppStore>((set, get) => ({
  // Clients
  clients: [],
  loadClients: async () => {
    try {
      const clients = await invoke<Client[]>('get_clients');
      set({ clients });
    } catch (e) {
      console.error('[store] loadClients failed:', e);
    }
  },
  addClient: async (data) => {
    const client = await invoke<Client>('create_client', { payload: data });
    set({ clients: [...get().clients, client] });
    return client;
  },
  updateClient: async (data) => {
    await invoke('update_client', { payload: data });
    set({ clients: get().clients.map((c) => (c.id === data.id ? data : c)) });
  },
  removeClient: async (id) => {
    await invoke('delete_client', { id });
    set({ clients: get().clients.filter((c) => c.id !== id) });
  },
  refreshClient: async (id) => {
    const client = await invoke<Client | null>('get_client', { id });
    if (client) {
      set({ clients: get().clients.map((c) => (c.id === id ? client : c)) });
    }
    return client;
  },

  // Projects
  projects: [],
  loadProjects: async () => {
    try {
      const projects = await invoke<Project[]>('get_projects');
      set({ projects });
    } catch (e) {
      console.error('[store] loadProjects failed:', e);
    }
  },
  addProject: async (data) => {
    const project = await invoke<Project>('create_project', { payload: data });
    set({ projects: [...get().projects, project] });
    return project;
  },
  updateProject: async (data) => {
    await invoke('update_project', { payload: data });
    set({ projects: get().projects.map((p) => (p.id === data.id ? data : p)) });
  },
  removeProject: async (id) => {
    await invoke('delete_project', { id });
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },
  refreshProject: async (id) => {
    const project = await invoke<Project | null>('get_project', { id });
    if (project) {
      set({ projects: get().projects.map((p) => (p.id === id ? project : p)) });
    }
    return project;
  },

  // Milestones
  milestones: {},
  loadMilestones: async (projectId) => {
    const milestones = await invoke<Milestone[]>('get_milestones', { projectId });
    set({ milestones: { ...get().milestones, [projectId]: milestones } });
  },
  addMilestone: async (data) => {
    const milestone = await invoke<Milestone>('create_milestone', { payload: data });
    const existing = get().milestones[data.project_id] || [];
    set({ milestones: { ...get().milestones, [data.project_id]: [...existing, milestone] } });
    return milestone;
  },
  updateMilestone: async (data) => {
    await invoke('update_milestone', { payload: data });
    const updated = { ...get().milestones };
    for (const key of Object.keys(updated)) {
      updated[key] = updated[key].map((m) => (m.id === data.id ? data : m));
    }
    set({ milestones: updated });
  },
  removeMilestone: async (id) => {
    await invoke('delete_milestone', { id });
    const updated = { ...get().milestones };
    for (const key of Object.keys(updated)) {
      updated[key] = updated[key].filter((m) => m.id !== id);
    }
    set({ milestones: updated });
  },

  // Proposals
  proposals: [],
  loadProposals: async () => {
    try {
      const proposals = await invoke<Proposal[]>('get_proposals');
      set({ proposals });
    } catch (e) {
      console.error('[store] loadProposals failed:', e);
    }
  },
  addProposal: async (data) => {
    const proposal = await invoke<Proposal>('create_proposal', { payload: data });
    set({ proposals: [...get().proposals, proposal] });
    return proposal;
  },
  updateProposal: async (data) => {
    await invoke('update_proposal', { payload: data });
    set({ proposals: get().proposals.map((p) => (p.id === data.id ? data : p)) });
  },
  removeProposal: async (id) => {
    await invoke('delete_proposal', { id });
    set({ proposals: get().proposals.filter((p) => p.id !== id) });
  },
  refreshProposal: async (id) => {
    const proposal = await invoke<Proposal | null>('get_proposal', { id });
    if (proposal) {
      set({ proposals: get().proposals.map((p) => (p.id === id ? proposal : p)) });
    }
    return proposal;
  },

  // Contracts
  contracts: [],
  loadContracts: async () => {
    try {
      const contracts = await invoke<Contract[]>('get_contracts');
      set({ contracts });
    } catch (e) {
      console.error('[store] loadContracts failed:', e);
    }
  },
  addContract: async (data) => {
    const contract = await invoke<Contract>('create_contract', { payload: data });
    set({ contracts: [...get().contracts, contract] });
    return contract;
  },
  updateContract: async (data) => {
    await invoke('update_contract', { payload: data });
    set({ contracts: get().contracts.map((c) => (c.id === data.id ? data : c)) });
  },
  removeContract: async (id) => {
    await invoke('delete_contract', { id });
    set({ contracts: get().contracts.filter((c) => c.id !== id) });
  },
  refreshContract: async (id) => {
    const contract = await invoke<Contract | null>('get_contract', { id });
    if (contract) {
      set({ contracts: get().contracts.map((c) => (c.id === id ? contract : c)) });
    }
    return contract;
  },

  // Time Entries
  timeEntries: [],
  loadTimeEntries: async () => {
    try {
      const timeEntries = await invoke<TimeEntry[]>('get_time_entries');
      set({ timeEntries });
    } catch (e) {
      console.error('[store] loadTimeEntries failed:', e);
    }
  },
  addTimeEntry: async (data) => {
    const entry = await invoke<TimeEntry>('create_time_entry', { payload: data });
    set({ timeEntries: [...get().timeEntries, entry] });
    return entry;
  },
  updateTimeEntry: async (data) => {
    await invoke('update_time_entry', { payload: data });
    set({ timeEntries: get().timeEntries.map((t) => (t.id === data.id ? data : t)) });
  },
  removeTimeEntry: async (id) => {
    await invoke('delete_time_entry', { id });
    set({ timeEntries: get().timeEntries.filter((t) => t.id !== id) });
  },
  refreshTimeEntry: async (id) => {
    const entry = await invoke<TimeEntry | null>('get_time_entry', { id });
    if (entry) {
      set({ timeEntries: get().timeEntries.map((t) => (t.id === id ? entry : t)) });
    }
    return entry;
  },

  // Invoices
  invoices: [],
  loadInvoices: async () => {
    try {
      const raw = await invoke<Invoice[]>('get_invoices');
      const invoices = raw.map((inv: Invoice) => ({
        ...inv,
        line_items: typeof inv.line_items === 'string' ? JSON.parse(inv.line_items) : inv.line_items,
      }));
      set({ invoices });
    } catch (e) {
      console.error('[store] loadInvoices failed:', e);
    }
  },
  addInvoice: async (data) => {
    const payload = { ...data, line_items: JSON.stringify(data.line_items) };
    const invoice = await invoke<Invoice>('create_invoice', { payload });
    const parsed = { ...invoice, line_items: typeof invoice.line_items === 'string' ? JSON.parse(invoice.line_items as string) : invoice.line_items };
    set({ invoices: [...get().invoices, parsed] });
    return parsed;
  },
  updateInvoice: async (data) => {
    const payload = { ...data, line_items: JSON.stringify(data.line_items) };
    await invoke('update_invoice', { payload });
    set({ invoices: get().invoices.map((i) => (i.id === data.id ? data : i)) });
  },
  removeInvoice: async (id) => {
    await invoke('delete_invoice', { id });
    set({ invoices: get().invoices.filter((i) => i.id !== id) });
  },
  refreshInvoice: async (id) => {
    const invoice = await invoke<Invoice | null>('get_invoice', { id });
    if (invoice) {
      set({ invoices: get().invoices.map((i) => (i.id === id ? invoice : i)) });
    }
    return invoice;
  },

  // Invoice Payments
  payments: {},
  loadPayments: async (invoiceId) => {
    try {
      const payments = await invoke<InvoicePayment[]>('get_invoice_payments', { invoiceId });
      set({ payments: { ...get().payments, [invoiceId]: payments } });
    } catch (e) {
      console.error('[store] loadPayments failed:', e);
    }
  },
  loadAllPayments: async () => {
    try {
      const allPayments = await invoke<InvoicePayment[]>('get_all_invoice_payments');
      const byInvoice: Record<string, InvoicePayment[]> = {};
      for (const p of allPayments) {
        if (!byInvoice[p.invoice_id]) byInvoice[p.invoice_id] = [];
        byInvoice[p.invoice_id].push(p);
      }
      set({ payments: byInvoice });
    } catch (e) {
      console.error('[store] loadAllPayments failed:', e);
    }
  },
  addPayment: async (data) => {
    const payment = await invoke<InvoicePayment>('create_invoice_payment', { payload: data });
    const existing = get().payments[data.invoice_id] || [];
    set({ payments: { ...get().payments, [data.invoice_id]: [payment, ...existing] } });
    return payment;
  },
  removePayment: async (id, invoiceId) => {
    await invoke('delete_invoice_payment', { id });
    const existing = get().payments[invoiceId] || [];
    set({ payments: { ...get().payments, [invoiceId]: existing.filter((p) => p.id !== id) } });
  },

  // Expenses
  expenses: [],
  loadExpenses: async () => {
    try {
      const expenses = await invoke<Expense[]>('get_expenses');
      set({ expenses });
    } catch (e) {
      console.error('[store] loadExpenses failed:', e);
    }
  },
  addExpense: async (data) => {
    const expense = await invoke<Expense>('create_expense', { payload: data });
    set({ expenses: [...get().expenses, expense] });
    return expense;
  },
  updateExpense: async (data) => {
    await invoke('update_expense', { payload: data });
    set({ expenses: get().expenses.map((e) => (e.id === data.id ? data : e)) });
  },
  removeExpense: async (id) => {
    await invoke('delete_expense', { id });
    set({ expenses: get().expenses.filter((e) => e.id !== id) });
  },

  // Profile
  profile: null,
  profileLoaded: false,
  isLicensed: false,
  portalPort: null,
  portalFailed: false,
  setPortalPort: (port) => set({ portalPort: port, portalFailed: false }),
  setPortalFailed: () => set({ portalFailed: true }),
  loadProfile: async () => {
    try {
      const profile = await invoke<UserProfile | null>('get_user_profile');
      const licensed = !!(profile?.license_key && await cachedValidateLicense(profile.license_key));
      set({ profile, profileLoaded: true, isLicensed: licensed });
    } catch (e) {
      console.error('[store] loadProfile failed:', e);
      set({ profileLoaded: true });
    }
  },
  saveProfile: async (data) => {
    console.trace('[store] saveProfile called with', data);
    await invoke('upsert_user_profile', { payload: data });
    const licensed = !!(data.license_key && await cachedValidateLicense(data.license_key));
    set({ profile: data, isLicensed: licensed });
    console.trace('[store] saveProfile completed, profile set');
  },
  archetypeAppliedAt: null,
  setArchetypeAppliedAt: (ts) => set({ archetypeAppliedAt: ts }),
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
    const updated = { ...profile, license_key: undefined, licensed_at: undefined };
    await invoke('upsert_user_profile', { payload: updated });
    set({ profile: updated, isLicensed: false });
  },

  // Communications
  communications: {},
  loadCommunications: async (clientId) => {
    const comms = await invoke<Communication[]>('get_communications', { clientId });
    set({ communications: { ...get().communications, [clientId]: comms } });
  },
  addCommunication: async (data) => {
    const comm = await invoke<Communication>('create_communication', { payload: data });
    const existing = get().communications[data.client_id] || [];
    const updated = [comm, ...existing].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    set({ communications: { ...get().communications, [data.client_id]: updated } });
    return comm;
  },
  updateCommunication: async (id, clientId, summary) => {
    await invoke('update_communication', { id, summary });
    const existing = get().communications[clientId] || [];
    const updated = existing.map((c) => (c.id === id ? { ...c, summary } : c));
    set({ communications: { ...get().communications, [clientId]: updated } });
  },
  removeCommunication: async (id, clientId) => {
    await invoke('delete_communication', { id });
    const existing = get().communications[clientId] || [];
    set({ communications: { ...get().communications, [clientId]: existing.filter((c) => c.id !== id) } });
  },

  // Recurring Invoices
  recurringInvoices: [],
  loadRecurringInvoices: async () => {
    try {
      const raw = await invoke<RecurringInvoice[]>('get_recurring_invoices');
      const items = raw.map((ri: RecurringInvoice) => ({
        ...ri,
        line_items: typeof ri.line_items === 'string' ? JSON.parse(ri.line_items as string) : ri.line_items,
      }));
      set({ recurringInvoices: items });
    } catch (e) {
      console.error('[store] loadRecurringInvoices failed:', e);
    }
  },
  addRecurringInvoice: async (data) => {
    const payload = { ...data, line_items: JSON.stringify(data.line_items) };
    const ri = await invoke<RecurringInvoice>('create_recurring_invoice', { payload });
    const parsed = { ...ri, line_items: typeof ri.line_items === 'string' ? JSON.parse(ri.line_items as string) : ri.line_items };
    set({ recurringInvoices: [...get().recurringInvoices, parsed] });
    return parsed;
  },
  updateRecurringInvoice: async (data) => {
    const payload = { ...data, line_items: JSON.stringify(data.line_items) };
    await invoke('update_recurring_invoice', { payload });
    set({ recurringInvoices: get().recurringInvoices.map((r) => (r.id === data.id ? data : r)) });
  },
  removeRecurringInvoice: async (id) => {
    await invoke('delete_recurring_invoice', { id });
    set({ recurringInvoices: get().recurringInvoices.filter((r) => r.id !== id) });
  },

  // Import History
  importHistory: [],
  loadImportHistory: async () => {
    try {
      const logs = await invoke<ImportLog[]>('get_import_log');
      set({ importHistory: logs });
    } catch (e) {
      console.error('[store] loadImportHistory failed:', e);
    }
  },
  saveImportFile: async (file: File) => {
    const buffer = await file.arrayBuffer();
    const data = Array.from(new Uint8Array(buffer));
    const path = await invoke<string>('save_import_file', { filename: file.name, data });
    return path;
  },
  logImport: async (data) => {
    const log = await invoke<ImportLog>('log_import', { payload: data });
    set({ importHistory: [log, ...get().importHistory] });
    return log;
  },
  getImportsDir: async () => {
    return invoke<string>('get_imports_dir');
  },

  // Attachments
  attachments: {},
  allAttachments: [],
  assetStats: null,
  loadAttachments: async (entityType, entityId) => {
    const key = `${entityType}:${entityId}`;
    const items = await invoke<Attachment[]>('get_attachments', { entityType, entityId });
    set({ attachments: { ...get().attachments, [key]: items } });
  },
  loadAllAttachments: async () => {
    try {
      const items = await invoke<Attachment[]>('get_all_attachments');
      set({ allAttachments: items });
    } catch (e) {
      console.error('[store] loadAllAttachments failed:', e);
    }
  },
  addAttachment: async (data) => {
    const attachment = await invoke<Attachment>('create_attachment', { payload: data });
    const key = `${data.entity_type}:${data.entity_id}`;
    const existing = get().attachments[key] || [];
    set({
      attachments: { ...get().attachments, [key]: [attachment, ...existing] },
      allAttachments: [attachment, ...get().allAttachments],
    });
    return attachment;
  },
  removeAttachment: async (id, entityType, entityId) => {
    await invoke('delete_attachment', { id });
    const key = `${entityType}:${entityId}`;
    const existing = get().attachments[key] || [];
    set({
      attachments: { ...get().attachments, [key]: existing.filter((a) => a.id !== id) },
      allAttachments: get().allAttachments.filter((a) => a.id !== id),
    });
  },
  saveAssetFile: async (file: File) => {
    const buffer = await file.arrayBuffer();
    const data = Array.from(new Uint8Array(buffer));
    const path = await invoke<string>('save_asset_file', { filename: file.name, data });
    return path;
  },
  getAssetsDir: async () => {
    return invoke<string>('get_assets_dir');
  },
  renameAttachment: async (id, newFilename) => {
    const attachment = await invoke<Attachment>('rename_attachment', {
      payload: { id, new_filename: newFilename },
    });
    set({
      allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)),
      attachments: Object.fromEntries(
        Object.entries(get().attachments).map(([k, v]) => [
          k,
          v.map((a) => (a.id === id ? attachment : a)),
        ])
      ),
    });
    return attachment;
  },
  moveAttachment: async (id, entityType, entityId, oldEntityType, oldEntityId) => {
    const attachment = await invoke<Attachment>('move_attachment', {
      payload: { id, entity_type: entityType, entity_id: entityId },
    });
    const oldKey = `${oldEntityType}:${oldEntityId}`;
    const newKey = `${entityType}:${entityId}`;
    const oldList = (get().attachments[oldKey] || []).filter((a) => a.id !== id);
    const newList = [attachment, ...(get().attachments[newKey] || [])];
    set({
      attachments: { ...get().attachments, [oldKey]: oldList, [newKey]: newList },
      allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)),
    });
    return attachment;
  },
  updateAttachmentMeta: async (id, data) => {
    const attachment = await invoke<Attachment>('update_attachment_meta', {
      payload: { id, ...data },
    });
    set({
      allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)),
      attachments: Object.fromEntries(
        Object.entries(get().attachments).map(([k, v]) => [
          k,
          v.map((a) => (a.id === id ? attachment : a)),
        ])
      ),
    });
    return attachment;
  },
  loadAssetStats: async () => {
    try {
      const stats = await invoke<AssetStats>('get_asset_stats');
      set({ assetStats: stats });
    } catch (e) {
      console.error('[store] loadAssetStats failed:', e);
    }
  },
  searchAssets: async (query) => {
    return invoke<Attachment[]>('search_assets', { query });
  },

  // Metrics
  metricDefs: {},
  metricValues: {},
  headlineMetrics: [],
  metricTemplates: [],
  loadMetricDefs: async (clientId) => {
    try {
      const defs = await invoke<MetricDefinition[]>('get_metric_definitions', { clientId });
      set({ metricDefs: { ...get().metricDefs, [clientId]: defs } });
    } catch (e) {
      console.error('[store] loadMetricDefs failed:', e);
    }
  },
  addMetricDef: async (data) => {
    const def = await invoke<MetricDefinition>('create_metric_definition', { payload: data });
    const existing = get().metricDefs[data.client_id] || [];
    set({ metricDefs: { ...get().metricDefs, [data.client_id]: [...existing, def] } });
    return def;
  },
  updateMetricDef: async (data) => {
    await invoke('update_metric_definition', { payload: data });
    const updated = { ...get().metricDefs };
    for (const key of Object.keys(updated)) {
      updated[key] = updated[key].map((d) => (d.id === data.id ? { ...d, ...data } : d));
    }
    set({ metricDefs: updated });
  },
  removeMetricDef: async (id, clientId) => {
    await invoke('delete_metric_definition', { id });
    const updated = { ...get().metricDefs };
    updated[clientId] = (updated[clientId] || []).filter((d) => d.id !== id);
    set({ metricDefs: updated });
  },
  loadMetricValues: async (definitionId, limit) => {
    try {
      const values = await invoke<MetricValue[]>('get_metric_values', { definitionId, limit: limit ?? null });
      set({ metricValues: { ...get().metricValues, [definitionId]: values } });
    } catch (e) {
      console.error('[store] loadMetricValues failed:', e);
    }
  },
  logMetricValue: async (data) => {
    const val = await invoke<MetricValue>('log_metric_value', { payload: data });
    const existing = get().metricValues[data.definition_id] || [];
    set({ metricValues: { ...get().metricValues, [data.definition_id]: [...existing, val] } });
    return val;
  },
  removeMetricValue: async (id, definitionId) => {
    await invoke('delete_metric_value', { id });
    const existing = get().metricValues[definitionId] || [];
    set({ metricValues: { ...get().metricValues, [definitionId]: existing.filter((v) => v.id !== id) } });
  },
  loadHeadlineMetrics: async () => {
    try {
      const metrics = await invoke<HeadlineMetric[]>('get_all_headline_metrics');
      set({ headlineMetrics: metrics });
    } catch (e) {
      console.error('[store] loadHeadlineMetrics failed:', e);
    }
  },
  loadMetricTemplates: async () => {
    try {
      const templates = await invoke<MetricTemplate[]>('get_metric_templates');
      set({ metricTemplates: templates });
    } catch (e) {
      console.error('[store] loadMetricTemplates failed:', e);
    }
  },
  saveMetricTemplate: async (name, definitions) => {
    await invoke('save_metric_template', {
      payload: { name, definitions_json: JSON.stringify(definitions) },
    });
    await get().loadMetricTemplates();
  },
  removeMetricTemplate: async (id) => {
    await invoke('delete_metric_template', { id });
    set({ metricTemplates: get().metricTemplates.filter((t) => t.id !== id) });
  },
  applyMetricTemplate: async (templateName, clientId) => {
    const templates = get().metricTemplates;
    if (!templates.length) await get().loadMetricTemplates();
    const tmpl = get().metricTemplates.find((t) => t.name === templateName);
    if (!tmpl) return;
    const definitions: Array<Pick<MetricDefinition, 'name' | 'metric_type' | 'unit_label' | 'is_headline' | 'sort_order'>> = JSON.parse(tmpl.definitions_json);
    for (const def of definitions) {
      await get().addMetricDef({
        client_id: clientId,
        name: def.name,
        metric_type: def.metric_type as MetricDefinition['metric_type'],
        unit_label: def.unit_label,
        is_headline: def.is_headline,
        sort_order: def.sort_order,
      });
    }
  },

  // Follow-ups
  followUpLogs: {},
  pendingFollowUps: [],
  followUpSettings: { enabled: true, proposal_delay_days: 3, invoice_delay_days: 0, templates: {}, subject_templates: {} },
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
    const current = get().followUpSettings;
    const merged = { ...current, ...updates };
    set({ followUpSettings: merged });
    localStorage.setItem('lance:follow-up-settings', JSON.stringify(merged));
  },
  loadFollowUpLog: async (entityType, entityId) => {
    try {
      const key = `${entityType}:${entityId}`;
      const logs = await invoke<FollowUpLog[]>('get_follow_up_log', { entityType, entityId });
      set({ followUpLogs: { ...get().followUpLogs, [key]: logs } });
    } catch (e) {
      console.error('[store] loadFollowUpLog failed:', e);
    }
  },
  logFollowUp: async (data) => {
    const log = await invoke<FollowUpLog>('log_follow_up', { payload: data });
    const key = `${data.entity_type}:${data.entity_id}`;
    const existing = get().followUpLogs[key] || [];
    set({ followUpLogs: { ...get().followUpLogs, [key]: [log, ...existing] } });
    return log;
  },
  updateFollowUpStatus: async (id, status, action) => {
    await invoke('update_follow_up_status', { payload: { id, status, action: action ?? null } });
    const allLogs = { ...get().followUpLogs };
    for (const key of Object.keys(allLogs)) {
      allLogs[key] = allLogs[key].map((l) =>
          l.id === id ? { ...l, status: status as FollowUpLog['status'], action: action ?? l.action, actioned_at: new Date().toISOString() } : l
      );
    }
    set({
      followUpLogs: allLogs,
      pendingFollowUps: get().pendingFollowUps.filter((l) => l.id !== id),
    });
  },
  loadPendingFollowUps: async () => {
    try {
      const logs = await invoke<FollowUpLog[]>('get_all_pending_follow_ups');
      set({ pendingFollowUps: logs });
    } catch (e) {
      console.error('[store] loadPendingFollowUps failed:', e);
    }
  },

  // Export Templates
  exportTemplates: [],
  loadExportTemplates: async () => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      const rows = await db.select<ExportTemplate[]>('SELECT id, name, type, header, footer, sections, color_scheme, created_at FROM export_templates ORDER BY created_at DESC');
      const parsed = rows.map((r: ExportTemplate) => ({
        ...r,
        sections: typeof r.sections === 'string' ? JSON.parse(r.sections as string) : r.sections,
      }));
      set({ exportTemplates: parsed });
    } catch (e) {
      console.error('[store] loadExportTemplates failed:', e);
    }
  },
  addExportTemplate: async (data) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(
      'INSERT INTO export_templates (id, name, type, header, footer, sections, color_scheme, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.name, data.type, data.header || '', data.footer || '', JSON.stringify(data.sections || []), data.color_scheme || '', now]
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
      [data.name, data.type, data.header || '', data.footer || '', JSON.stringify(data.sections || []), data.color_scheme || '', data.id]
    );
    set({ exportTemplates: get().exportTemplates.map((t) => (t.id === data.id ? data : t)) });
  },
  removeExportTemplate: async (id) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute('DELETE FROM export_templates WHERE id = ?', [id]);
    set({ exportTemplates: get().exportTemplates.filter((t) => t.id !== id) });
  },

  // Contract Templates
  contractTemplates: [],
  loadContractTemplates: async () => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      const rows = await db.select<ContractTemplate[]>('SELECT id, name, category, body, variables, created_at FROM contract_templates ORDER BY created_at DESC');
      const parsed = rows.map((r: ContractTemplate) => ({
        ...r,
        variables: typeof r.variables === 'string' ? JSON.parse(r.variables as string) : r.variables,
      }));
      set({ contractTemplates: parsed });
    } catch (e) {
      console.error('[store] loadContractTemplates failed:', e);
    }
  },
  addContractTemplate: async (data) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(
      'INSERT INTO contract_templates (id, name, category, body, variables, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.name, data.category || '', data.body, JSON.stringify(data.variables || []), now]
    );
    const template: ContractTemplate = { id, ...data, created_at: now };
    set({ contractTemplates: [template, ...get().contractTemplates] });
    return template;
  },
  updateContractTemplate: async (data) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(
      'UPDATE contract_templates SET name = ?, category = ?, body = ?, variables = ? WHERE id = ?',
      [data.name, data.category || '', data.body, JSON.stringify(data.variables || []), data.id]
    );
    set({ contractTemplates: get().contractTemplates.map((t) => (t.id === data.id ? data : t)) });
  },
  removeContractTemplate: async (id) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute('DELETE FROM contract_templates WHERE id = ?', [id]);
    set({ contractTemplates: get().contractTemplates.filter((t) => t.id !== id) });
  },

  // ── Project Templates ──
  projectTemplates: [],
  projectTemplateMilestones: {},
  loadProjectTemplates: async () => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      const rows = await db.select<ProjectTemplate[]>('SELECT id, name, description, default_budget, default_status, is_default, created_at FROM project_templates ORDER BY created_at DESC');
      const parsed = rows.map((r: ProjectTemplate) => ({
        ...r,
        is_default: !!(r as Record<string, unknown>).is_default,
      }));
      set({ projectTemplates: parsed });
    } catch (e) {
      console.error('[store] loadProjectTemplates failed:', e);
    }
  },
  loadTemplateMilestones: async (templateId) => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      const rows = await db.select<ProjectTemplateMilestone[]>('SELECT id, template_id, title, days_from_start, invoice_on_completion FROM project_template_milestones WHERE template_id = ? ORDER BY days_from_start ASC', [templateId]);
      set({ projectTemplateMilestones: { ...get().projectTemplateMilestones, [templateId]: rows } });
    } catch (e) {
      console.error('[store] loadTemplateMilestones failed:', e);
    }
  },
  addProjectTemplate: async (data, milestones) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(
      'INSERT INTO project_templates (id, name, description, default_budget, default_status, is_default, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [id, data.name, data.description || null, data.default_budget ?? null, data.default_status || 'Active', now]
    );
    for (const m of milestones) {
      await db.execute(
        'INSERT INTO project_template_milestones (id, template_id, title, days_from_start, invoice_on_completion) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), id, m.title, m.days_from_start, m.invoice_on_completion ? 1 : 0]
      );
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
  removeProjectTemplate: async (id) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute('DELETE FROM project_template_milestones WHERE template_id = ?', [id]);
    await db.execute('DELETE FROM project_templates WHERE id = ?', [id]);
    set({ projectTemplates: get().projectTemplates.filter((t) => t.id !== id) });
  },

  // ── Archetype: Render Log ──
  renderLogs: {},
  loadRenderLogs: async (projectId) => {
    try {
      const logs = await invoke<ArchetypeRenderLog[]>('get_render_logs', { projectId });
      set({ renderLogs: { ...get().renderLogs, [projectId]: logs } });
    } catch (e) {
      console.error('[store] loadRenderLogs failed:', e);
    }
  },
  addRenderLog: async (data) => {
    const log = await invoke<ArchetypeRenderLog>('create_render_log', { payload: data });
    const existing = get().renderLogs[log.project_id] || [];
    set({ renderLogs: { ...get().renderLogs, [log.project_id]: [log, ...existing] } });
    return log;
  },
  removeRenderLog: async (id, projectId) => {
    await invoke('delete_render_log', { id });
    const updated = { ...get().renderLogs };
    updated[projectId] = (updated[projectId] || []).filter((l) => l.id !== id);
    set({ renderLogs: updated });
  },

  // ── Archetype: Sessions ──
  sessions: [],
  loadSessions: async (clientId, projectId) => {
    try {
      const sessions = await invoke<ArchetypeSession[]>('get_sessions', { clientId: clientId ?? null, projectId: projectId ?? null });
      set({ sessions });
    } catch (e) {
      console.error('[store] loadSessions failed:', e);
    }
  },
  addSession: async (data) => {
    const session = await invoke<ArchetypeSession>('create_session', { payload: data });
    set({ sessions: [session, ...get().sessions] });
    return session;
  },
  removeSession: async (id) => {
    await invoke('delete_session', { id });
    set({ sessions: get().sessions.filter((s) => s.id !== id) });
  },

  // ── Archetype: Shoots ──
  shoots: {},
  loadShoots: async (projectId) => {
    try {
      const shoots = await invoke<ArchetypeShoot[]>('get_shoots', { projectId });
      set({ shoots: { ...get().shoots, [projectId]: shoots } });
    } catch (e) {
      console.error('[store] loadShoots failed:', e);
    }
  },
  addShoot: async (data) => {
    const shoot = await invoke<ArchetypeShoot>('create_shoot', { payload: data });
    const existing = get().shoots[shoot.project_id] || [];
    set({ shoots: { ...get().shoots, [shoot.project_id]: [shoot, ...existing] } });
    return shoot;
  },
  removeShoot: async (id, projectId) => {
    await invoke('delete_shoot', { id });
    const updated = { ...get().shoots };
    updated[projectId] = (updated[projectId] || []).filter((s) => s.id !== id);
    set({ shoots: updated });
  },

  // ── Archetype: Revisions ──
  revisions: {},
  loadRevisions: async (projectId) => {
    try {
      const revisions = await invoke<ArchetypeRevision[]>('get_revisions', { projectId });
      set({ revisions: { ...get().revisions, [projectId]: revisions } });
    } catch (e) {
      console.error('[store] loadRevisions failed:', e);
    }
  },
  addRevision: async (data) => {
    const revision = await invoke<ArchetypeRevision>('create_revision', { payload: data });
    const existing = get().revisions[revision.project_id] || [];
    set({ revisions: { ...get().revisions, [revision.project_id]: [revision, ...existing] } });
    return revision;
  },
  removeRevision: async (id, projectId) => {
    await invoke('delete_revision', { id });
    const updated = { ...get().revisions };
    updated[projectId] = (updated[projectId] || []).filter((r) => r.id !== id);
    set({ revisions: updated });
  },

  // ── Archetype: Builds ──
  builds: {},
  loadBuilds: async (projectId) => {
    try {
      const builds = await invoke<ArchetypeBuild[]>('get_builds', { projectId });
      set({ builds: { ...get().builds, [projectId]: builds } });
    } catch (e) {
      console.error('[store] loadBuilds failed:', e);
    }
  },
  addBuild: async (data) => {
    const build = await invoke<ArchetypeBuild>('create_build', { payload: data });
    const existing = get().builds[build.project_id] || [];
    set({ builds: { ...get().builds, [build.project_id]: [build, ...existing] } });
    return build;
  },
  removeBuild: async (id, projectId) => {
    await invoke('delete_build', { id });
    const updated = { ...get().builds };
    updated[projectId] = (updated[projectId] || []).filter((b) => b.id !== id);
    set({ builds: updated });
  },

  // ── Archetype: Keywords ──
  keywords: {},
  loadKeywords: async (clientId) => {
    try {
      const keywords = await invoke<ArchetypeKeyword[]>('get_keywords', { clientId });
      set({ keywords: { ...get().keywords, [clientId]: keywords } });
    } catch (e) {
      console.error('[store] loadKeywords failed:', e);
    }
  },
  addKeyword: async (data) => {
    const keyword = await invoke<ArchetypeKeyword>('create_keyword', { payload: data });
    const existing = get().keywords[keyword.client_id] || [];
    set({ keywords: { ...get().keywords, [keyword.client_id]: [keyword, ...existing] } });
    return keyword;
  },
  updateKeyword: async (id, clientId, positionCurrent, targetPosition) => {
    await invoke('update_keyword', { id, positionCurrent: positionCurrent ?? null, targetPosition: targetPosition ?? null });
    const updated = { ...get().keywords };
    updated[clientId] = (updated[clientId] || []).map((k) =>
      k.id === id ? { ...k, position_current: positionCurrent ?? k.position_current, target_position: targetPosition ?? k.target_position } : k
    );
    set({ keywords: updated });
  },
  removeKeyword: async (id, clientId) => {
    await invoke('delete_keyword', { id });
    const updated = { ...get().keywords };
    updated[clientId] = (updated[clientId] || []).filter((k) => k.id !== id);
    set({ keywords: updated });
  },

  // ── Archetype: Datasets ──
  datasets: {},
  loadDatasets: async (projectId) => {
    try {
      const datasets = await invoke<ArchetypeDataset[]>('get_datasets', { projectId });
      set({ datasets: { ...get().datasets, [projectId]: datasets } });
    } catch (e) {
      console.error('[store] loadDatasets failed:', e);
    }
  },
  addDataset: async (data) => {
    const dataset = await invoke<ArchetypeDataset>('create_dataset', { payload: data });
    const existing = get().datasets[dataset.project_id] || [];
    set({ datasets: { ...get().datasets, [dataset.project_id]: [dataset, ...existing] } });
    return dataset;
  },
  removeDataset: async (id, projectId) => {
    await invoke('delete_dataset', { id });
    const updated = { ...get().datasets };
    updated[projectId] = (updated[projectId] || []).filter((d) => d.id !== id);
    set({ datasets: updated });
  },

  // ── Phase Tracker ──
  projectPhases: {},
  loadProjectPhases: async (projectId) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    const rows = await db.select<(ProjectPhase & Record<string, unknown>)[]>('SELECT id, project_id, phase_name, status, color FROM project_phases WHERE project_id = ? ORDER BY id ASC', [projectId]);
    set({ projectPhases: { ...get().projectPhases, [projectId]: rows.map(r => ({ id: r.id as string, project_id: r.project_id as string, phase_name: r.phase_name as string, status: r.status as string, color: r.color as string | undefined })) } });
  },
  addProjectPhase: async (data) => {
    const id = crypto.randomUUID();
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute('INSERT INTO project_phases (id, project_id, phase_name, status, color) VALUES (?, ?, ?, ?, ?)', [id, data.project_id, data.phase_name, data.status || 'pending', data.color || null]);
    const item: ProjectPhase = { id, ...data, status: data.status || 'pending' };
    const existing = get().projectPhases[data.project_id] || [];
    set({ projectPhases: { ...get().projectPhases, [data.project_id]: [item, ...existing] } });
    return item;
  },
  updateProjectPhase: async (id, projectId, pdata) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    if (pdata.phase_name !== undefined) await db.execute('UPDATE project_phases SET phase_name = ? WHERE id = ?', [pdata.phase_name, id]);
    if (pdata.status !== undefined) await db.execute('UPDATE project_phases SET status = ? WHERE id = ?', [pdata.status, id]);
    if (pdata.color !== undefined) await db.execute('UPDATE project_phases SET color = ? WHERE id = ?', [pdata.color, id]);
    const updated = { ...get().projectPhases };
    updated[projectId] = (updated[projectId] || []).map((p) => p.id === id ? { ...p, ...pdata } : p);
    set({ projectPhases: updated });
  },
  removeProjectPhase: async (id, projectId) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute('DELETE FROM project_phases WHERE id = ?', [id]);
    const updated = { ...get().projectPhases };
    updated[projectId] = (updated[projectId] || []).filter((p) => p.id !== id);
    set({ projectPhases: updated });
  },
}));
