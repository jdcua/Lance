import { create } from 'zustand';
import type {
  Client,
  Project,
  Milestone,
  Proposal,
  Contract,
  TimeEntry,
  Invoice,
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
} from '../types';
import { validateLicenseKey } from '../license';

interface ClientSlice {
  clients: Client[];
  loadClients: () => Promise<void>;
  addClient: (data: Omit<Client, 'id' | 'created_at'>) => Promise<Client>;
  updateClient: (data: Client) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
}

interface ProjectSlice {
  projects: Project[];
  loadProjects: () => Promise<void>;
  addProject: (data: Omit<Project, 'id' | 'created_at'>) => Promise<Project>;
  updateProject: (data: Project) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
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
}

interface ContractSlice {
  contracts: Contract[];
  loadContracts: () => Promise<void>;
  addContract: (data: Omit<Contract, 'id' | 'created_at' | 'signed_at'>) => Promise<Contract>;
  updateContract: (data: Contract) => Promise<void>;
  removeContract: (id: string) => Promise<void>;
}

interface TimeSlice {
  timeEntries: TimeEntry[];
  loadTimeEntries: () => Promise<void>;
  addTimeEntry: (data: Omit<TimeEntry, 'id' | 'invoiced'>) => Promise<TimeEntry>;
  updateTimeEntry: (data: TimeEntry) => Promise<void>;
  removeTimeEntry: (id: string) => Promise<void>;
}

interface InvoiceSlice {
  invoices: Invoice[];
  loadInvoices: () => Promise<void>;
  addInvoice: (data: Omit<Invoice, 'id' | 'created_at' | 'paid_at' | 'line_items'> & { line_items: LineItem[] }) => Promise<Invoice>;
  updateInvoice: (data: Invoice) => Promise<void>;
  removeInvoice: (id: string) => Promise<void>;
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
  loadProfile: () => Promise<void>;
  saveProfile: (data: UserProfile) => Promise<void>;
  activateLicense: (key: string) => Promise<boolean>;
  removeLicense: () => Promise<void>;
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

export type AppStore = ClientSlice & ProjectSlice & MilestoneSlice & ProposalSlice & ContractSlice & TimeSlice & InvoiceSlice & ExpenseSlice & ProfileSlice & CommunicationSlice & RecurringInvoiceSlice & ImportSlice & AttachmentSlice & MetricSlice & FollowUpSlice & ExportTemplateSlice & ContractTemplateSlice;

const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
};

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

  // Invoices
  invoices: [],
  loadInvoices: async () => {
    try {
      const raw = await invoke<Invoice[]>('get_invoices');
      const invoices = raw.map((inv: Invoice) => ({
        ...inv,
        line_items: typeof inv.line_items === 'string' ? JSON.parse(inv.line_items as string) : inv.line_items,
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
  loadProfile: async () => {
    try {
      const profile = await invoke<UserProfile | null>('get_user_profile');
      const licensed = !!(profile?.license_key && validateLicenseKey(profile.license_key));
      set({ profile, profileLoaded: true, isLicensed: licensed });
    } catch (e) {
      console.error('[store] loadProfile failed:', e);
      set({ profileLoaded: true });
    }
  },
  saveProfile: async (data) => {
    await invoke('upsert_user_profile', { payload: data });
    const licensed = !!(data.license_key && validateLicenseKey(data.license_key));
    set({ profile: data, isLicensed: licensed });
  },
  activateLicense: async (key) => {
    if (!validateLicenseKey(key)) return false;
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
  followUpSettings: { enabled: true, proposal_delay_days: 3, invoice_delay_days: 0, templates: {} },
  loadFollowUpSettings: () => {
    try {
      const stored = localStorage.getItem('lance:follow-up-settings');
      if (stored) {
        const defaults = { enabled: true, proposal_delay_days: 3, invoice_delay_days: 0, templates: {} };
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
      const rows = await db.select<ExportTemplate[]>('SELECT * FROM export_templates ORDER BY created_at DESC');
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
      const rows = await db.select<ContractTemplate[]>('SELECT * FROM contract_templates ORDER BY created_at DESC');
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
}));
