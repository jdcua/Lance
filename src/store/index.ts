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
  PortalActivity,
} from '../types';
import { sanitizeInput, truncate, MAX_LENGTHS } from '../utils/sanitize';
import {
  pushTrashEntry,
  trashLabel,
  restoreTrashEntry as restoreTrashRow,
} from '../utils/trash';
import { sanitizeRates, normalizeRates } from '../lib/currency';
import { startLoad, endLoad, setError } from './slices/base';
import { createMetaSlice } from './slices/meta';
import { createToastsSlice } from './slices/toasts';
import { createUpdaterSlice } from './slices/updater';
import type { UnifiedStore } from './types';
export type { UnifiedStore, AppStore } from './types';
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

// ── Profile save helpers ──
// Kept pure so saveProfile stays a thin orchestrator: sanitize/clamp first,
// then the one side effect (the upsert) plus its currency-change follow-ups.

function clampHourlyRate(value: number | undefined): number | undefined {
  return value != null && isFinite(value) ? Math.max(0, value) : value;
}

function clampTaxRate(value: number | undefined): number | undefined {
  return value != null && isFinite(value) ? Math.min(100, Math.max(0, value)) : value;
}

function clampWholeNonNegative(value: number | undefined): number | undefined {
  return value != null && isFinite(value) ? Math.max(0, Math.round(value)) : value;
}

function normalizeExpiryDays(value: number | undefined): number | undefined {
  return value != null && isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

/** Omitted rates inherit the saved profile; an explicit empty object clears. */
function resolveIncomingRates(
  data: UserProfile,
  profile: UserProfile | null,
): Record<string, number> {
  return sanitizeRates(
    data.exchange_rates !== undefined ? data.exchange_rates : profile?.exchange_rates || {},
  );
}

/** Notice shown only when a base-currency change invalidates stored rates. */
function clearedRatesNote(
  prevCurrency: string | undefined,
  currency: string | undefined,
  rates: Record<string, number>,
): string | null {
  if (prevCurrency && currency && prevCurrency !== currency && Object.keys(rates).length > 0) {
    return `Currency changed ${prevCurrency} → ${currency}: exchange rates were cleared. Re-enter them under Finance.`;
  }
  return null;
}

function buildSanitizedProfile(
  data: UserProfile,
  effectiveRates: Record<string, number>,
): UserProfile {
  return {
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
    hourly_rate: clampHourlyRate(data.hourly_rate),
    tax_rate: clampTaxRate(data.tax_rate),
    payment_terms: clampWholeNonNegative(data.payment_terms),
    proposal_expiry_days: normalizeExpiryDays(data.proposal_expiry_days),
    exchange_rates: effectiveRates,
  };
}

/** Stamp the old base onto currency-less invoices before switching base. */
async function stampLegacyInvoices(get: () => UnifiedStore, prevCurrency: string): Promise<void> {
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

export const useStore = create<UnifiedStore>((set, get) => {
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

    // ── Slice composition (meta, toasts, updater) ──
    ...createMetaSlice(set, get),
    ...createToastsSlice(set, get),
    ...createUpdaterSlice(set),

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
      startLoad(set, get, 'clients');
      try {
        set({ clients: await invoke<Client[]>('get_clients') });
      } catch (e) {
        console.error('[store] loadClients failed:', e);
        setError(set, get, 'clients', String(e));
      } finally {
        endLoad(set, get, 'clients');
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
      startLoad(set, get, 'projects');
      try {
        set({ projects: await invoke<Project[]>('get_projects') });
      } catch (e) {
        console.error('[store] loadProjects failed:', e);
        setError(set, get, 'projects', String(e));
      } finally {
        endLoad(set, get, 'projects');
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
      count(s.sessions.filter((x) => x.project_id === id).length, 'session log', 'session logs');
      count(s.datasets.filter((x) => x.project_id === id).length, 'dataset', 'datasets');
      count(s.renderLogs.filter((x) => x.project_id === id).length, 'render pass', 'render passes');
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
      startLoad(set, get, 'milestones');
      try {
        set({ milestones: await invoke<Milestone[]>('get_milestones') });
      } catch (e) {
        console.error('[store] loadMilestones failed:', e);
        setError(set, get, 'milestones', String(e));
      } finally {
        endLoad(set, get, 'milestones');
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
      startLoad(set, get, 'proposals');
      try {
        set({ proposals: await invoke<Proposal[]>('get_proposals') });
      } catch (e) {
        console.error('[store] loadProposals failed:', e);
        setError(set, get, 'proposals', String(e));
      } finally {
        endLoad(set, get, 'proposals');
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
      startLoad(set, get, 'contracts');
      try {
        set({ contracts: await invoke<Contract[]>('get_contracts') });
      } catch (e) {
        console.error('[store] loadContracts failed:', e);
        setError(set, get, 'contracts', String(e));
      } finally {
        endLoad(set, get, 'contracts');
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
      startLoad(set, get, 'timeEntries');
      try {
        set({ timeEntries: await invoke<TimeEntry[]>('get_time_entries') });
      } catch (e) {
        console.error('[store] loadTimeEntries failed:', e);
        setError(set, get, 'timeEntries', String(e));
      } finally {
        endLoad(set, get, 'timeEntries');
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
      startLoad(set, get, 'invoices');
      try {
        const raw = await invoke<Invoice[]>('get_invoices');
        set({ invoices: raw.map(parseLineItems) });
      } catch (e) {
        console.error('[store] loadInvoices failed:', e);
        setError(set, get, 'invoices', String(e));
      } finally {
        endLoad(set, get, 'invoices');
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
      startLoad(set, get, 'payments');
      try {
        set({ payments: await invoke<InvoicePayment[]>('get_all_invoice_payments') });
      } catch (e) {
        console.error('[store] loadPayments failed:', e);
        setError(set, get, 'payments', String(e));
      } finally {
        endLoad(set, get, 'payments');
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
      startLoad(set, get, 'expenses');
      try {
        set({ expenses: await invoke<Expense[]>('get_expenses') });
      } catch (e) {
        console.error('[store] loadExpenses failed:', e);
        setError(set, get, 'expenses', String(e));
      } finally {
        endLoad(set, get, 'expenses');
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
      startLoad(set, get, 'profile');
      try {
        const profile = await invoke<UserProfile | null>('get_user_profile');
        // Tauri stores rates as a TEXT column (JSON string); browser mode
        // keeps the object. Normalize once so the UI always sees an object.
        if (profile && profile.exchange_rates !== undefined) {
          profile.exchange_rates = normalizeRates(profile.exchange_rates);
        }
        set({ profile, profileLoaded: true });
        return profile;
      } catch (e) {
        console.error('[store] loadProfile failed:', e);
        set({ profileLoaded: true, profile: null });
        return null;
      } finally {
        endLoad(set, get, 'profile');
      }
    },
    saveProfile: async (data) => {
      // Exchange rates are defined relative to the profile currency, and
      // most callers (Settings form, onboarding, archetype picker) don't
      // carry them, so an omitted field must INHERIT, not wipe. The one
      // exception: the base currency itself changed, which silently
      // invalidates stored rates ("per old base"), then they are cleared
      // with an explanatory toast instead of misconverting.
      const profile = get().profile;
      const prevCurrency = profile?.currency;
      const incomingRates = resolveIncomingRates(data, profile);
      const ratesNote = clearedRatesNote(prevCurrency, data.currency, incomingRates);
      const effectiveRates = ratesNote ? {} : incomingRates;
      const sanitized = buildSanitizedProfile(data, effectiveRates);
      // Currency-less invoices inherit the profile currency (invCurOf
      // fallback), so switching base would silently re-denominate history.
      // Stamp the old base onto them first; explicit rows are untouched.
      const currencyChanged = !!prevCurrency && !!data.currency && prevCurrency !== data.currency;
      if (currencyChanged) await stampLegacyInvoices(get, prevCurrency!);
      await invoke('upsert_user_profile', { payload: sanitized });
      set({ profile: sanitized });
      if (ratesNote) get().addToast(ratesNote, 'info', 6000);
    },
    setPortalPort: (port) => set({ portalPort: port, portalFailed: false }),
    setPortalFailed: () => set({ portalFailed: true }),
    setArchetypeAppliedAt: (ts) => set({ archetypeAppliedAt: ts }),

    // ── Communications ──
    loadCommunications: async () => {
      startLoad(set, get, 'communications');
      try {
        set({ communications: await invoke<Communication[]>('get_communications') });
      } catch (e) {
        console.error('[store] loadCommunications failed:', e);
        setError(set, get, 'communications', String(e));
      } finally {
        endLoad(set, get, 'communications');
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
      startLoad(set, get, 'recurringInvoices');
      try {
        const raw = await invoke<RecurringInvoice[]>('get_recurring_invoices');
        set({ recurringInvoices: raw.map(parseLineItems) });
      } catch (e) {
        console.error('[store] loadRecurringInvoices failed:', e);
        setError(set, get, 'recurringInvoices', String(e));
      } finally {
        endLoad(set, get, 'recurringInvoices');
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
      startLoad(set, get, 'importHistory');
      try {
        set({ importHistory: await invoke<ImportLog[]>('get_import_log') });
      } catch (e) {
        console.error('[store] loadImportHistory failed:', e);
        setError(set, get, 'importHistory', String(e));
      } finally {
        endLoad(set, get, 'importHistory');
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
      startLoad(set, get, 'allAttachments');
      try {
        set({ allAttachments: await invoke<Attachment[]>('get_all_attachments') });
      } catch (e) {
        console.error('[store] loadAllAttachments failed:', e);
      } finally {
        endLoad(set, get, 'allAttachments');
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
      // Drop browser-mode bytes too (no-op for desktop paths and unknown ids).
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
      startLoad(set, get, 'metricDefs');
      try {
        set({ metricDefs: await invoke<MetricDefinition[]>('get_all_metric_definitions') });
      } catch (e) {
        console.error('[store] loadMetricDefs failed:', e);
        setError(set, get, 'metricDefs', String(e));
      } finally {
        endLoad(set, get, 'metricDefs');
      }
    },
    createMetricDef: async (data) => {
      // Metric names/units render raw in widgets and feed SQL-adjacent
      // filters: sanitize at the store boundary so every caller is covered.
      const clean = {
        ...data,
        name: sanitizeInput(data.name || '').trim(),
        unit_label: data.unit_label
          ? sanitizeInput(data.unit_label).trim() || undefined
          : undefined,
      };
      const def = await invoke<MetricDefinition>('create_metric_definition', { payload: clean });
      set({ metricDefs: [...get().metricDefs, def] });
      return def;
    },
    updateMetricDef: async (data) => {
      const clean = {
        ...data,
        name: sanitizeInput(data.name || '').trim(),
        unit_label: data.unit_label
          ? sanitizeInput(data.unit_label).trim() || undefined
          : undefined,
      };
      await invoke('update_metric_definition', { payload: clean });
      set({ metricDefs: get().metricDefs.map((d) => (d.id === data.id ? { ...d, ...clean } : d)) });
    },
    deleteMetricDef: async (id) => {
      await invoke('delete_metric_definition', { id });
      set({ metricDefs: get().metricDefs.filter((d) => d.id !== id) });
    },
    loadMetricValues: async (definitionId, limit) => {
      startLoad(set, get, 'metricValues');
      try {
        const values = await invoke<MetricValue[]>('get_metric_values', {
          definitionId: definitionId ?? null,
          limit: limit ?? null,
        });
        set({ metricValues: values });
      } catch (e) {
        console.error('[store] loadMetricValues failed:', e);
        setError(set, get, 'metricValues', String(e));
      } finally {
        endLoad(set, get, 'metricValues');
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
      startLoad(set, get, 'exportTemplates');
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
        setError(set, get, 'exportTemplates', String(e));
      } finally {
        endLoad(set, get, 'exportTemplates');
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
      startLoad(set, get, 'contractTemplates');
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
        setError(set, get, 'contractTemplates', String(e));
      } finally {
        endLoad(set, get, 'contractTemplates');
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
      startLoad(set, get, 'projectTemplates');
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
        setError(set, get, 'projectTemplates', String(e));
      } finally {
        endLoad(set, get, 'projectTemplates');
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
      startLoad(set, get, 'renderLogs');
      try {
        set({ renderLogs: await invoke<ArchetypeRenderLog[]>('get_all_render_logs') });
      } catch (e) {
        console.error('[store] loadRenderLogs failed:', e);
        setError(set, get, 'renderLogs', String(e));
      } finally {
        endLoad(set, get, 'renderLogs');
      }
    },
    createRenderLog: async (data) => {
      // Guard at the store boundary (single choke point: addRenderLog
      // delegates here): durations must be finite non-negative numbers
      // within a sane cap, text fields sanitized. NaN/negative/garbage
      // previously stored verbatim and poisoned aggregates.
      const MAX_RENDER_MINUTES = 525600; // 1 year; renders take hours, not eons
      const rawDuration = data.duration_minutes;
      const duration =
        typeof rawDuration === 'number' &&
        isFinite(rawDuration) &&
        rawDuration >= 0 &&
        rawDuration <= MAX_RENDER_MINUTES
          ? Math.floor(rawDuration)
          : undefined;
      const clean = {
        ...data,
        pass_name: data.pass_name ? sanitizeInput(data.pass_name).trim() || undefined : undefined,
        duration_minutes: duration,
        software: data.software ? sanitizeInput(data.software).trim() || undefined : undefined,
        frame_range: data.frame_range
          ? sanitizeInput(data.frame_range).trim() || undefined
          : undefined,
        notes: data.notes ? sanitizeInput(data.notes).trim() || undefined : undefined,
      };
      const log = await invoke<ArchetypeRenderLog>('create_render_log', { payload: clean });
      set({ renderLogs: [log, ...get().renderLogs] });
      return log;
    },
    deleteRenderLog: async (id) => {
      await invoke('delete_render_log', { id });
      set({ renderLogs: get().renderLogs.filter((l) => l.id !== id) });
    },

    // ── Archetype: Sessions ──
    loadSessions: async (clientId, projectId) => {
      startLoad(set, get, 'sessions');
      try {
        set({
          sessions: await invoke<ArchetypeSession[]>('get_sessions', {
            clientId: clientId ?? null,
            projectId: projectId ?? null,
          }),
        });
      } catch (e) {
        console.error('[store] loadSessions failed:', e);
        setError(set, get, 'sessions', String(e));
      } finally {
        endLoad(set, get, 'sessions');
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
      startLoad(set, get, 'shoots');
      try {
        set({ shoots: await invoke<ArchetypeShoot[]>('get_all_shoots') });
      } catch (e) {
        console.error('[store] loadShoots failed:', e);
        setError(set, get, 'shoots', String(e));
      } finally {
        endLoad(set, get, 'shoots');
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
      startLoad(set, get, 'revisions');
      try {
        set({ revisions: await invoke<ArchetypeRevision[]>('get_all_revisions') });
      } catch (e) {
        console.error('[store] loadRevisions failed:', e);
        setError(set, get, 'revisions', String(e));
      } finally {
        endLoad(set, get, 'revisions');
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
      startLoad(set, get, 'builds');
      try {
        set({ builds: await invoke<ArchetypeBuild[]>('get_all_builds') });
      } catch (e) {
        console.error('[store] loadBuilds failed:', e);
        setError(set, get, 'builds', String(e));
      } finally {
        endLoad(set, get, 'builds');
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
      startLoad(set, get, 'keywords');
      try {
        set({ keywords: await invoke<ArchetypeKeyword[]>('get_all_keywords') });
      } catch (e) {
        console.error('[store] loadKeywords failed:', e);
        setError(set, get, 'keywords', String(e));
      } finally {
        endLoad(set, get, 'keywords');
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
      startLoad(set, get, 'datasets');
      try {
        set({ datasets: await invoke<ArchetypeDataset[]>('get_all_datasets') });
      } catch (e) {
        console.error('[store] loadDatasets failed:', e);
        setError(set, get, 'datasets', String(e));
      } finally {
        endLoad(set, get, 'datasets');
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
      return get()
        .getActiveFollowUps()
        .filter((f) => new Date(f.drafted_at) <= cutoff);
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
