import { DAY_MS } from './format';

function daysAgo(days: number): string {
  const d = new Date(Date.now() - days * DAY_MS);
  return d.toISOString().split('T')[0];
}

function daysFromNow(days: number): string {
  const d = new Date(Date.now() + days * DAY_MS);
  return d.toISOString().split('T')[0];
}

const BUILT_IN_TEMPLATES = [
  {
    name: 'Web Design Project',
    description: 'A standard web design project from discovery to delivery.',
    default_budget: 5000,
    default_status: 'active',
    milestones: [
      { title: 'Discovery', days_from_start: 0, invoice_on_completion: false },
      { title: 'Wireframes', days_from_start: 14, invoice_on_completion: false },
      { title: 'Design', days_from_start: 28, invoice_on_completion: false },
      { title: 'Revisions', days_from_start: 42, invoice_on_completion: false },
      { title: 'Delivery', days_from_start: 56, invoice_on_completion: false },
    ],
  },
  {
    name: 'Brand Identity',
    description:
      'Complete brand identity package including research, concepts, and final delivery.',
    default_budget: 4000,
    default_status: 'active',
    milestones: [
      { title: 'Brief & Research', days_from_start: 0, invoice_on_completion: false },
      { title: 'Concepts', days_from_start: 21, invoice_on_completion: false },
      { title: 'Refinement', days_from_start: 42, invoice_on_completion: false },
      { title: 'Final Delivery', days_from_start: 56, invoice_on_completion: false },
    ],
  },
  {
    name: 'Copywriting Project',
    description: 'A copywriting project from brief through final delivery.',
    default_budget: 2000,
    default_status: 'active',
    milestones: [
      { title: 'Brief', days_from_start: 0, invoice_on_completion: false },
      { title: 'First Draft', days_from_start: 14, invoice_on_completion: false },
      { title: 'Revisions', days_from_start: 21, invoice_on_completion: false },
      { title: 'Final Copy', days_from_start: 28, invoice_on_completion: false },
    ],
  },
  {
    name: 'Monthly Retainer',
    description: 'Ongoing monthly retainer work with invoicing at each milestone.',
    default_budget: 2400,
    default_status: 'active',
    milestones: [
      { title: 'Month 1', days_from_start: 0, invoice_on_completion: true },
      { title: 'Month 2', days_from_start: 30, invoice_on_completion: true },
      { title: 'Month 3', days_from_start: 60, invoice_on_completion: true },
    ],
  },
  {
    name: 'Photography Package',
    description: 'A photography project from shoot day through gallery delivery.',
    default_budget: 3000,
    default_status: 'active',
    milestones: [
      { title: 'Shoot Day', days_from_start: 0, invoice_on_completion: false },
      { title: 'Culling & Editing', days_from_start: 14, invoice_on_completion: false },
      { title: 'Gallery Delivery', days_from_start: 21, invoice_on_completion: false },
    ],
  },
  {
    name: 'Development Sprint',
    description: 'A software development sprint from planning through deployment.',
    default_budget: 8000,
    default_status: 'active',
    milestones: [
      { title: 'Spec & Planning', days_from_start: 0, invoice_on_completion: false },
      { title: 'Development', days_from_start: 21, invoice_on_completion: false },
      { title: 'Testing & QA', days_from_start: 35, invoice_on_completion: false },
      { title: 'Deployment', days_from_start: 42, invoice_on_completion: false },
    ],
  },
];

export async function seedBuiltInTemplates(): Promise<void> {
  if (localStorage.getItem('lance:templates-seeded') === 'true') return;

  try {
    // Use the store to create templates via invoke() layer
    const { useStore } = await import('../store');
    const store = useStore.getState();

    for (const tpl of BUILT_IN_TEMPLATES) {
      await store.addProjectTemplate(
        {
          name: tpl.name,
          description: tpl.description,
          default_budget: tpl.default_budget,
          default_status: tpl.default_status,
        },
        tpl.milestones,
      );
    }

    localStorage.setItem('lance:templates-seeded', 'true');
  } catch (err) {
    console.warn('[seedData] seedBuiltInTemplates failed (non-critical):', err);
  }
}

// Single-flight guard (two layers):
// - In-memory: rapid effect re-fires within one page lifetime share a run.
// - Persistent claim: full-page reloads reset module state, so overlapping
//   loads coordinate through localStorage. Without this, quick navigations
//   during the first seed insert every client/invoice twice (and corrupt the
//   tracked id list the clearer depends on). A stale claim (>60s, e.g. a
//   killed tab) is taken over.
let seedInFlight: Promise<void> | null = null;
const SEED_CLAIM_KEY = 'lance:seeding-at';
const SEED_CLAIM_TTL_MS = 60_000;

function isSeeded(): boolean {
  try {
    return localStorage.getItem('lance:seeded') === 'true';
  } catch {
    return true; // unreadable storage: never seed blindly
  }
}

function readClaim(): number {
  try {
    return Number(localStorage.getItem(SEED_CLAIM_KEY) || 0);
  } catch {
    return Date.now();
  }
}

function writeClaim(): void {
  try {
    localStorage.setItem(SEED_CLAIM_KEY, String(Date.now()));
  } catch {
    /* private mode: fall through to unguarded seed */
  }
}

function clearClaim(): void {
  try {
    localStorage.removeItem(SEED_CLAIM_KEY);
  } catch {
    /* ignore */
  }
}

/** Wait while a fresh claim exists. True when seeding finished meanwhile. */
async function waitForClaim(): Promise<boolean> {
  for (let i = 0; i < 40; i++) {
    if (isSeeded()) return true;
    if (Date.now() - readClaim() > SEED_CLAIM_TTL_MS) return false;
    await new Promise((r) => setTimeout(r, 500));
  }
  return isSeeded();
}

export function seedSampleData(): Promise<void> {
  if (isSeeded()) return Promise.resolve();
  if (!seedInFlight) {
    seedInFlight = (async () => {
      if (await waitForClaim()) return;
      if (isSeeded()) return;
      writeClaim();
      try {
        await runSeed();
      } finally {
        clearClaim();
      }
    })().finally(() => {
      seedInFlight = null;
    });
  }
  return seedInFlight;
}

async function runSeed(): Promise<void> {
  // Snapshot pre-seed achievements: seed data itself unlocks badges, and
  // clearing the seeds must restore exactly what the user had — neither
  // stale seed-badges nor lost earned ones.
  try {
    const prev = localStorage.getItem('lance:achievements');
    if (prev !== null) localStorage.setItem('lance:achievements-pre-seed', prev);
  } catch {
    /* private mode */
  }

  try {
    const { useStore } = await import('../store');
    const store = useStore.getState();

    // Snapshot pre-seed row ids per table. On clear, exactly the,
    // ids created below are deleted — post-seed user work is untouched.
    // (A `seeded` flag column exists but nothing ever sets it, so id
    // tracking is the honest mechanism.)
    await Promise.all([
      store.loadClients(),
      store.loadProjects(),
      store.loadMilestones(),
      store.loadProposals(),
      store.loadContracts(),
      store.loadTimeEntries(),
      store.loadInvoices(),
      store.loadExpenses(),
      store.loadRecurringInvoices(),
    ]).catch(() => {});
    const idsOf = (rows: { id: string }[]) => rows.map((r) => r.id);
    const preSeedIds = () => {
      const s = useStore.getState();
      return {
        clients: idsOf(s.clients),
        projects: idsOf(s.projects),
        milestones: idsOf(s.milestones),
        proposals: idsOf(s.proposals),
        contracts: idsOf(s.contracts),
        time_entries: idsOf(s.timeEntries),
        invoices: idsOf(s.invoices),
        expenses: idsOf(s.expenses),
        recurring_invoices: idsOf(s.recurringInvoices),
      };
    };
    const before = preSeedIds();

    await seedBuiltInTemplates();

    // ── CLIENTS ──
    // Sample personas are deliberately fictional (RFC 2606 example.com
    // addresses) so demo data never resembles a real person or business.
    const client1 = await store.addClient({
      name: 'Jordan Avery',
      email: 'jordan@example.com',
      phone: undefined,
      company: 'Avery Design',
      notes: 'Brand designer at a startup. Responsive and easy to work with.',
    });
    const client2 = await store.addClient({
      name: 'Riley Chen',
      email: 'riley@example.com',
      phone: undefined,
      company: 'Chen & Partners',
      notes: 'Creative agency with 12 employees. Proposals go through their ops lead.',
    });
    const client3 = await store.addClient({
      name: 'Alex Morgan',
      email: 'alex@example.com',
      phone: undefined,
      company: undefined,
      notes: 'Solo founder building a SaaS product. Prefers async communication.',
    });
    const client4 = await store.addClient({
      name: 'Fern & Field Co.',
      email: 'hello@example.com',
      phone: undefined,
      company: 'Fern & Field Co.',
      notes: 'Retail brand specializing in sustainable floristry. Completed project. Happy client.',
    });

    // ── PROJECTS ──
    const proj1 = await store.addProject({
      client_id: client1.id,
      title: 'Brand Identity Refresh',
      status: 'active',
      start_date: daysAgo(21),
      end_date: undefined,
      budget: 6500,
      notes:
        'Complete rebrand including logo, color palette, typography, and brand guidelines document.',
    });
    const proj2 = await store.addProject({
      client_id: client4.id,
      title: 'E-commerce Site Redesign',
      status: 'completed',
      start_date: daysAgo(60),
      end_date: daysAgo(14),
      budget: 4200,
      notes: 'Full site redesign on Shopify. Delivered ahead of schedule.',
    });
    const proj3 = await store.addProject({
      client_id: client3.id,
      title: 'Product Launch Strategy',
      status: 'active',
      start_date: daysAgo(10),
      end_date: undefined,
      budget: 2800,
      notes: 'Go-to-market strategy, messaging framework, and launch timeline.',
    });
    await store.addProject({
      client_id: client2.id,
      title: 'Marketing Site Copy',
      status: 'paused',
      start_date: daysAgo(14),
      end_date: undefined,
      budget: 1500,
      notes:
        'Website copy for their new service landing pages. Paused while they finalize product names.',
    });

    // ── MILESTONES (for Brand Identity Refresh) ──
    await store.addMilestone({
      project_id: proj1.id,
      title: 'Research & Discovery',
      due_date: daysAgo(7),
      completed: true,
      invoice_on_completion: false,
    });
    await store.addMilestone({
      project_id: proj1.id,
      title: 'Design Concepts',
      due_date: daysFromNow(7),
      completed: false,
      invoice_on_completion: false,
    });
    await store.addMilestone({
      project_id: proj1.id,
      title: 'Final Delivery',
      due_date: daysFromNow(21),
      completed: false,
      invoice_on_completion: true,
    });

    // ── PROPOSALS ──
    await store.addProposal({
      client_id: client2.id,
      project_id: undefined,
      title: 'Q3 Content Campaign',
      status: 'sent',
      rate: 3200,
      rate_type: 'flat',
      sent_at: daysAgo(8),
    });
    await store.addProposal({
      client_id: client3.id,
      project_id: undefined,
      title: 'Social Media Audit',
      status: 'draft',
      rate: 850,
      rate_type: 'flat',
      sent_at: undefined,
    });
    const prop3 = await store.addProposal({
      client_id: client1.id,
      project_id: proj1.id,
      title: 'Brand Identity Refresh',
      status: 'accepted',
      rate: 6500,
      rate_type: 'flat',
      sent_at: daysAgo(21),
    });

    // ── CONTRACTS ──
    await store.addContract({
      client_id: client1.id,
      project_id: proj1.id,
      proposal_id: prop3.id,
      title: 'Service Agreement · Brand Identity',
      status: 'active',
    });
    await store.addContract({
      client_id: client4.id,
      project_id: proj2.id,
      proposal_id: undefined,
      title: 'Service Agreement · Site Redesign',
      status: 'completed',
    });

    // ── TIME ENTRIES ──
    // Month-filtered metrics (utilization, effective rate, "this week") only
    // count the current calendar month, so the two most recent entries are
    // anchored to today — otherwise a seed run on the 1st shows "--" hero
    // metrics on every craft dashboard.
    const timeEntries = [
      {
        desc: 'Discovery call with Jordan',
        proj: proj1.id,
        cl: client1.id,
        mins: 60,
        daysAgo: 0,
        billable: 1,
      },
      {
        desc: 'Competitive brand audit',
        proj: proj1.id,
        cl: client1.id,
        mins: 150,
        daysAgo: 0,
        billable: 1,
      },
      {
        desc: 'Logo concepts · round 1',
        proj: proj1.id,
        cl: client1.id,
        mins: 180,
        daysAgo: 10,
        billable: 1,
      },
      {
        desc: 'Logo concepts · round 2',
        proj: proj1.id,
        cl: client1.id,
        mins: 120,
        daysAgo: 7,
        billable: 1,
      },
      {
        desc: 'Color palette exploration',
        proj: proj1.id,
        cl: client1.id,
        mins: 90,
        daysAgo: 5,
        billable: 1,
      },
      {
        desc: 'Typography system',
        proj: proj1.id,
        cl: client1.id,
        mins: 60,
        daysAgo: 3,
        billable: 1,
      },
      {
        desc: 'Client revisions call',
        proj: proj1.id,
        cl: client1.id,
        mins: 45,
        daysAgo: 2,
        billable: 0,
      },
      {
        desc: 'Homepage wireframes',
        proj: proj2.id,
        cl: client4.id,
        mins: 180,
        daysAgo: 45,
        billable: 1,
      },
      {
        desc: 'Product page designs',
        proj: proj2.id,
        cl: client4.id,
        mins: 120,
        daysAgo: 42,
        billable: 1,
      },
      {
        desc: 'Mobile responsive QA',
        proj: proj2.id,
        cl: client4.id,
        mins: 90,
        daysAgo: 30,
        billable: 1,
      },
      {
        desc: 'Launch strategy workshop',
        proj: proj3.id,
        cl: client3.id,
        mins: 120,
        daysAgo: 8,
        billable: 1,
      },
      {
        desc: 'Messaging framework draft',
        proj: proj3.id,
        cl: client3.id,
        mins: 150,
        daysAgo: 5,
        billable: 1,
      },
    ];
    for (const [idx, te] of timeEntries.entries()) {
      const d = daysAgo(te.daysAgo);
      // Stagger start times across the workday so seeded days read human.
      const startHour = 8 + ((idx * 37) % 10);
      const startMin = (idx * 53) % 60;
      const start = new Date(
        `${d}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00.000Z`,
      );
      // Closed entries carry an end_time: without one the app (correctly)
      // reads the entry as a still-running timer and counts from its start.
      const end = new Date(start.getTime() + te.mins * 60000);
      await store.addTimeEntry({
        project_id: te.proj,
        client_id: te.cl,
        description: te.desc,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_minutes: te.mins,
        billable: te.billable === 1,
      });
    }

    // ── INVOICES ──
    // Paid invoices stamp paid_at = today: month-filtered revenue metrics
    // (and "paid this month" style panels) stay populated no matter which
    // day of the month the seed runs on. createInvoice omits paid_at, so it
    // lands via update right after creation.
    const paidAtToday = new Date().toISOString();
    const inv1 = await store.addInvoice({
      client_id: client4.id,
      project_id: proj2.id,
      invoice_number: 'INV-001',
      status: 'paid',
      subtotal: 4200,
      total: 4200,
      due_date: daysAgo(44),
      notes: 'Full payment received on time.',
      line_items: [
        {
          id: crypto.randomUUID(),
          description: 'E-commerce Site Redesign',
          quantity: 1,
          unit_price: 4200,
          total: 4200,
        },
      ],
    });
    await store.updateInvoice({ ...inv1, paid_at: paidAtToday });
    const inv2 = await store.addInvoice({
      client_id: client1.id,
      project_id: proj1.id,
      invoice_number: 'INV-002',
      status: 'paid',
      subtotal: 2000,
      total: 2000,
      due_date: daysAgo(42),
      notes: 'Deposit paid promptly.',
      line_items: [
        {
          id: crypto.randomUUID(),
          description: 'Brand Identity Refresh · 30% Deposit',
          quantity: 1,
          unit_price: 2000,
          total: 2000,
        },
      ],
    });
    await store.updateInvoice({ ...inv2, paid_at: paidAtToday });
    await store.addInvoice({
      client_id: client1.id,
      project_id: proj1.id,
      invoice_number: 'INV-003',
      status: 'sent',
      subtotal: 2000,
      total: 2000,
      due_date: daysFromNow(7),
      notes: 'Due after design concept approval.',
      line_items: [
        {
          id: crypto.randomUUID(),
          description: 'Brand Identity Refresh · Progress Payment',
          quantity: 1,
          unit_price: 2000,
          total: 2000,
        },
      ],
    });
    await store.addInvoice({
      client_id: client3.id,
      project_id: proj3.id,
      invoice_number: 'INV-004',
      status: 'overdue',
      subtotal: 850,
      total: 850,
      due_date: daysAgo(12),
      notes: 'First milestone payment.',
      line_items: [
        {
          id: crypto.randomUUID(),
          description: 'Product Launch Strategy',
          quantity: 1,
          unit_price: 850,
          total: 850,
        },
      ],
    });

    // ── EXPENSES ──
    const expenseData = [
      { cat: 'Software', desc: 'Figma Professional', amt: 15, date: daysAgo(30) },
      { cat: 'Marketing', desc: 'Stock photo pack · Unsplash+', amt: 45, date: daysAgo(5) },
      { cat: 'Equipment', desc: 'Samsung T7 SSD 1TB', amt: 89, date: daysAgo(42) },
      { cat: 'Software', desc: 'Adobe Creative Cloud', amt: 55, date: daysAgo(30) },
      { cat: 'Software', desc: 'Notion Pro', amt: 10, date: daysAgo(30) },
    ];
    for (const e of expenseData) {
      await store.addExpense({
        category: e.cat,
        description: e.desc,
        amount: e.amt,
        date: e.date,
      });
    }

    // Persist exactly the ids created above (current minus pre-seed).
    try {
      const after = preSeedIds();
      const created: Record<string, string[]> = {};
      for (const table of Object.keys(after) as (keyof typeof after)[]) {
        const seen = new Set(before[table]);
        created[table] = after[table].filter((id) => !seen.has(id));
      }
      localStorage.setItem('lance:seeded-ids', JSON.stringify(created));
    } catch {
      /* private mode */
    }

    localStorage.setItem('lance:seeded', 'true');
    localStorage.setItem('lance:seeded-toast-shown', 'true');
    // Default the timer to the sample business's flagship project — but only
    // when the user has no remembered choice. The global toggle asks rather
    // than guesses with several active projects, and the sample seeds three,
    // so without this every first timer press in the demo would error.
    try {
      if (!localStorage.getItem('lance:last-timer-config')) {
        localStorage.setItem(
          'lance:last-timer-config',
          JSON.stringify({ projectId: proj1.id, clientId: client1.id }),
        );
      }
    } catch {
      /* private mode */
    }
  } catch (err) {
    console.error('[seedData] seedSampleData failed:', err);
  }
}

type SeedDb = Awaited<ReturnType<typeof import('../db').getDb>>;
type DeletedSeeds = { proposals: Set<string>; invoices: Set<string> };

/** Read the ids seeding created, or throw when this is a legacy seed. */
function readTrackedSeedIds(): Record<string, string[]> {
  let tracked: Record<string, string[]> | null = null;
  try {
    const raw = localStorage.getItem('lance:seeded-ids');
    tracked = raw ? (JSON.parse(raw) as Record<string, string[]>) : null;
  } catch {
    tracked = null;
  }
  if (!tracked) {
    throw new Error('These sample rows predate selective clearing — use Reset all data instead.');
  }
  return tracked;
}

/** Children before parents so FK enforcement never trips. */
function trackedDeletionOrder(tracked: Record<string, string[]>): Array<[string, string[]]> {
  return [
    ['milestones', tracked.milestones || []],
    ['time_entries', tracked.time_entries || []],
    ['invoices', tracked.invoices || []],
    ['recurring_invoices', tracked.recurring_invoices || []],
    ['contracts', tracked.contracts || []],
    ['proposals', tracked.proposals || []],
    ['expenses', tracked.expenses || []],
    ['projects', tracked.projects || []],
    ['clients', tracked.clients || []],
  ];
}

/** Delete exactly the tracked rows and remember proposal/invoice ids. */
async function deleteTrackedRows(
  db: SeedDb,
  order: Array<[string, string[]]>,
  deleted: DeletedSeeds,
): Promise<void> {
  for (const [table, ids] of order) {
    for (const id of ids) {
      try {
        await db.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
      } catch {
        /* already gone — keep going */
      }
    }
    if (table === 'proposals' || table === 'invoices') {
      for (const id of ids) deleted[table].add(id);
    }
  }
}

/** Follow-ups drafted from seed rows (by the auto-engine) would orphan. */
async function cleanupDraftFollowUps(db: SeedDb, deleted: DeletedSeeds): Promise<void> {
  try {
    for (const id of [...deleted.proposals, ...deleted.invoices]) {
      await db.execute('DELETE FROM follow_up_log WHERE entity_id = ?', [id]).catch(() => {});
    }
  } catch {
    /* best-effort */
  }
}

/** Prune client-side follow-up caches referencing deleted seed rows. */
function pruneFollowUpLists(deleted: DeletedSeeds): void {
  try {
    for (const key of ['lance:store:pending_follow_ups']) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const list = JSON.parse(raw) as Array<{ entity_id?: string }>;
      if (!Array.isArray(list)) continue;
      localStorage.setItem(
        key,
        JSON.stringify(
          list.filter(
            (l) =>
              !deleted.proposals.has(l.entity_id || '') && !deleted.invoices.has(l.entity_id || ''),
          ),
        ),
      );
    }
    // Browser-mode follow_up_logs is an object keyed `type:id`.
    const rawLogs = localStorage.getItem('lance:store:follow_up_logs');
    if (rawLogs) {
      try {
        const obj = JSON.parse(rawLogs) as Record<string, unknown>;
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          for (const k of Object.keys(obj)) {
            const id = k.split(':').slice(1).join(':');
            if (deleted.proposals.has(id) || deleted.invoices.has(id)) delete obj[k];
          }
          localStorage.setItem('lance:store:follow_up_logs', JSON.stringify(obj));
        }
      } catch {
        /* leave logs untouched on parse failure */
      }
    }
  } catch {
    /* Tauri keeps these in SQLite; the DELETE above covered it */
  }
}

/** Forget the selective-seed bookkeeping, keeping the user's other data. */
function clearSeedFlags(): void {
  try {
    localStorage.removeItem('lance:seeded-ids');
  } catch {
    /* private mode */
  }
  localStorage.removeItem('lance:seeded');
  localStorage.removeItem('lance:seeded-toast-shown');
}

export async function clearSampleData(): Promise<void> {
  // Deletes exactly the rows seeding created (tracked in lance:seeded-ids),
  // children before parents so FK enforcement never trips. Anything the
  // user added after seeding is untouched — the old `seeded = 1` flag was
  // never set on any row, so that path deleted nothing while reporting
  // success. Legacy seeds (no id tracking) must use Reset all data.
  const tracked = readTrackedSeedIds();
  const order = trackedDeletionOrder(tracked);
  const { getDb } = await import('../db');
  const db = await getDb();
  const deleted: DeletedSeeds = { proposals: new Set<string>(), invoices: new Set<string>() };
  await deleteTrackedRows(db, order, deleted);
  await cleanupDraftFollowUps(db, deleted);
  pruneFollowUpLists(deleted);
  await restorePreSeedAchievements();
  clearSeedFlags();
}

/**
 * Restore the achievement set captured before seeding (or empty when the
 * account was fresh), in both the local list and the Tauri table.
 */
async function restorePreSeedAchievements(): Promise<void> {
  try {
    const snapshot = localStorage.getItem('lance:achievements-pre-seed');
    if (snapshot !== null) {
      localStorage.setItem('lance:achievements', snapshot);
    } else {
      localStorage.removeItem('lance:achievements');
    }
    localStorage.removeItem('lance:achievements-pre-seed');
    const { getDb } = await import('../db');
    const db = await getDb().catch(() => null);
    if (db) {
      const keep: string[] = snapshot !== null ? JSON.parse(snapshot) : [];
      if (keep.length === 0) {
        await db.execute('DELETE FROM achievements').catch(() => {});
      } else {
        const placeholders = keep.map(() => '?').join(',');
        await db
          .execute(`DELETE FROM achievements WHERE key NOT IN (${placeholders})`, keep)
          .catch(() => {});
      }
    }
  } catch {
    /* best-effort; stale badges beat a failed clear */
  }
}
