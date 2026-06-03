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
} from '../types';

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
  loadProfile: () => Promise<void>;
  saveProfile: (data: UserProfile) => Promise<void>;
}

interface CommunicationSlice {
  communications: Record<string, Communication[]>;
  loadCommunications: (clientId: string) => Promise<void>;
  addCommunication: (data: Communication) => Promise<Communication>;
  removeCommunication: (id: string, clientId: string) => Promise<void>;
}

interface RecurringInvoiceSlice {
  recurringInvoices: RecurringInvoice[];
  loadRecurringInvoices: () => Promise<void>;
  addRecurringInvoice: (data: Omit<RecurringInvoice, 'id' | 'created_at' | 'last_generated'>) => Promise<RecurringInvoice>;
  updateRecurringInvoice: (data: RecurringInvoice) => Promise<void>;
  removeRecurringInvoice: (id: string) => Promise<void>;
}

export type AppStore = ClientSlice & ProjectSlice & MilestoneSlice & ProposalSlice & ContractSlice & TimeSlice & InvoiceSlice & ExpenseSlice & ProfileSlice & CommunicationSlice & RecurringInvoiceSlice;

const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
};

export const useStore = create<AppStore>((set, get) => ({
  // Clients
  clients: [],
  loadClients: async () => {
    const clients = await invoke<Client[]>('get_clients');
    set({ clients });
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
    const projects = await invoke<Project[]>('get_projects');
    set({ projects });
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
    const proposals = await invoke<Proposal[]>('get_proposals');
    set({ proposals });
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
    const contracts = await invoke<Contract[]>('get_contracts');
    set({ contracts });
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
    const timeEntries = await invoke<TimeEntry[]>('get_time_entries');
    set({ timeEntries });
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
    const raw = await invoke<Invoice[]>('get_invoices');
    const invoices = raw.map((inv: Invoice) => ({
      ...inv,
      line_items: typeof inv.line_items === 'string' ? JSON.parse(inv.line_items as string) : inv.line_items,
    }));
    set({ invoices });
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
    const expenses = await invoke<Expense[]>('get_expenses');
    set({ expenses });
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
  loadProfile: async () => {
    const profile = await invoke<UserProfile | null>('get_user_profile');
    set({ profile, profileLoaded: true });
  },
  saveProfile: async (data) => {
    await invoke('upsert_user_profile', { payload: data });
    set({ profile: data });
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
  removeCommunication: async (id, clientId) => {
    await invoke('delete_communication', { id });
    const existing = get().communications[clientId] || [];
    set({ communications: { ...get().communications, [clientId]: existing.filter((c) => c.id !== id) } });
  },

  // Recurring Invoices
  recurringInvoices: [],
  loadRecurringInvoices: async () => {
    const raw = await invoke<RecurringInvoice[]>('get_recurring_invoices');
    const items = raw.map((ri: RecurringInvoice) => ({
      ...ri,
      line_items: typeof ri.line_items === 'string' ? JSON.parse(ri.line_items as string) : ri.line_items,
    }));
    set({ recurringInvoices: items });
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
}));
