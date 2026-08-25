function daysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().split('T')[0];
}

function daysFromNow(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
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
    description: 'Complete brand identity package including research, concepts, and final delivery.',
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
      await store.addProjectTemplate({
        name: tpl.name,
        description: tpl.description,
        default_budget: tpl.default_budget,
        default_status: tpl.default_status,
      }, tpl.milestones);
    }

    localStorage.setItem('lance:templates-seeded', 'true');
  } catch (err) {
    console.warn('[seedData] seedBuiltInTemplates failed (non-critical):', err);
  }
}

export async function seedSampleData(): Promise<void> {
  if (localStorage.getItem('lance:seeded') === 'true') return;

  try {
    const { useStore } = await import('../store');
    const store = useStore.getState();

    await seedBuiltInTemplates();

    // ── CLIENTS ──
    const client1 = await store.addClient({
      name: 'Mara Jensen',
      email: 'mara@designco.com',
      phone: undefined,
      company: 'DesignCo',
      notes: 'Brand designer at a startup. Responsive and easy to work with.',
    });
    const client2 = await store.addClient({
      name: 'Kol & Nash Studio',
      email: 'hello@kolnash.com',
      phone: undefined,
      company: 'Kol & Nash Studio',
      notes: 'Creative agency with 12 employees. Proposals go through their ops lead.',
    });
    const client3 = await store.addClient({
      name: 'David Okoro',
      email: 'david@okoro.io',
      phone: undefined,
      company: undefined,
      notes: 'Solo founder building a SaaS product. Prefers async communication.',
    });
    const client4 = await store.addClient({
      name: 'The Bloom Co.',
      email: 'team@thebloomco.com',
      phone: undefined,
      company: 'The Bloom Co.',
      notes: 'Retail brand specializing in sustainable floristry. Completed project -- happy client.',
    });

    // ── PROJECTS ──
    const proj1 = await store.addProject({
      client_id: client1.id,
      title: 'Brand Identity Refresh',
      status: 'active',
      start_date: daysAgo(21),
      end_date: undefined,
      budget: 6500,
      notes: 'Complete rebrand including logo, color palette, typography, and brand guidelines document.',
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
    const proj4 = await store.addProject({
      client_id: client2.id,
      title: 'Marketing Site Copy',
      status: 'paused',
      start_date: daysAgo(14),
      end_date: undefined,
      budget: 1500,
      notes: 'Website copy for their new service landing pages. Paused while they finalize product names.',
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
    const prop1 = await store.addProposal({
      client_id: client2.id,
      project_id: undefined,
      title: 'Q3 Content Campaign',
      status: 'sent',
      rate: 3200,
      rate_type: 'flat',
      sent_at: daysAgo(8),
    });
    const prop2 = await store.addProposal({
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
      title: 'Service Agreement -- Brand Identity',
      status: 'active',
    });
    await store.addContract({
      client_id: client4.id,
      project_id: proj2.id,
      proposal_id: undefined,
      title: 'Service Agreement -- Site Redesign',
      status: 'completed',
    });

    // ── TIME ENTRIES ──
    const timeEntries = [
      { desc: 'Discovery call with Mara', proj: proj1.id, cl: client1.id, mins: 60, daysAgo: 14, billable: 1 },
      { desc: 'Competitive brand audit', proj: proj1.id, cl: client1.id, mins: 150, daysAgo: 13, billable: 1 },
      { desc: 'Logo concepts -- round 1', proj: proj1.id, cl: client1.id, mins: 180, daysAgo: 10, billable: 1 },
      { desc: 'Logo concepts -- round 2', proj: proj1.id, cl: client1.id, mins: 120, daysAgo: 7, billable: 1 },
      { desc: 'Color palette exploration', proj: proj1.id, cl: client1.id, mins: 90, daysAgo: 5, billable: 1 },
      { desc: 'Typography system', proj: proj1.id, cl: client1.id, mins: 60, daysAgo: 3, billable: 1 },
      { desc: 'Client revisions call', proj: proj1.id, cl: client1.id, mins: 45, daysAgo: 2, billable: 0 },
      { desc: 'Homepage wireframes', proj: proj2.id, cl: client4.id, mins: 180, daysAgo: 45, billable: 1 },
      { desc: 'Product page designs', proj: proj2.id, cl: client4.id, mins: 120, daysAgo: 42, billable: 1 },
      { desc: 'Mobile responsive QA', proj: proj2.id, cl: client4.id, mins: 90, daysAgo: 30, billable: 1 },
      { desc: 'Launch strategy workshop', proj: proj3.id, cl: client3.id, mins: 120, daysAgo: 8, billable: 1 },
      { desc: 'Messaging framework draft', proj: proj3.id, cl: client3.id, mins: 150, daysAgo: 5, billable: 1 },
    ];
    for (const te of timeEntries) {
      const d = daysAgo(te.daysAgo);
      await store.addTimeEntry({
        project_id: te.proj,
        client_id: te.cl,
        description: te.desc,
        start_time: `${d}T09:00:00.000Z`,
        duration_minutes: te.mins,
        billable: te.billable === 1,
      });
    }

    // ── INVOICES ──
    await store.addInvoice({
      client_id: client4.id,
      project_id: proj2.id,
      invoice_number: 'INV-001',
      status: 'paid',
      subtotal: 4200,
      total: 4200,
      due_date: daysAgo(44),
      notes: 'Full payment received on time.',
      line_items: [{ id: crypto.randomUUID(), description: 'E-commerce Site Redesign', quantity: 1, unit_price: 4200, total: 4200 }],
    });
    await store.addInvoice({
      client_id: client1.id,
      project_id: proj1.id,
      invoice_number: 'INV-002',
      status: 'paid',
      subtotal: 2000,
      total: 2000,
      due_date: daysAgo(42),
      notes: 'Deposit paid promptly.',
      line_items: [{ id: crypto.randomUUID(), description: 'Brand Identity Refresh -- 30% Deposit', quantity: 1, unit_price: 2000, total: 2000 }],
    });
    await store.addInvoice({
      client_id: client1.id,
      project_id: proj1.id,
      invoice_number: 'INV-003',
      status: 'sent',
      subtotal: 2000,
      total: 2000,
      due_date: daysFromNow(7),
      notes: 'Due after design concept approval.',
      line_items: [{ id: crypto.randomUUID(), description: 'Brand Identity Refresh -- Progress Payment', quantity: 1, unit_price: 2000, total: 2000 }],
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
      line_items: [{ id: crypto.randomUUID(), description: 'Product Launch Strategy', quantity: 1, unit_price: 850, total: 850 }],
    });

    // ── EXPENSES ──
    const expenseData = [
      { cat: 'Software', desc: 'Figma Professional', amt: 15, date: daysAgo(30) },
      { cat: 'Marketing', desc: 'Stock photo pack -- Unsplash+', amt: 45, date: daysAgo(5) },
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

    localStorage.setItem('lance:seeded', 'true');
    localStorage.setItem('lance:seeded-toast-shown', 'true');
  } catch (err) {
    console.error('[seedData] seedSampleData failed:', err);
  }
}

export async function clearSampleData(): Promise<void> {
  // In browser mode, we can clear the localStorage entries
  // In Tauri mode, the original SQL-based function handles this
  const { getDb } = await import('../db');
  const db = await getDb().catch(() => null);
  if (db) {
    // Tauri mode: use SQL
    try {
      await db.execute('BEGIN TRANSACTION');
      await db.execute(`DELETE FROM milestones WHERE project_id IN (SELECT id FROM projects WHERE seeded = 1)`);
      await db.execute(`DELETE FROM follow_up_log WHERE entity_id IN (SELECT id FROM proposals WHERE seeded = 1) OR entity_id IN (SELECT id FROM invoices WHERE seeded = 1)`);
      const tables = ['time_entries', 'invoices', 'recurring_invoices', 'contracts', 'proposals', 'projects', 'expenses', 'clients'];
      for (const table of tables) {
        await db.execute(`DELETE FROM ${table} WHERE seeded = 1`);
      }
      await db.execute('COMMIT');
    } catch {
      await db.execute('ROLLBACK');
    }
  } else {
    // Browser mode: reload from clean state -- store data isn't flagged,
    // but clearing localStorage entries resets everything
    const keys = Object.keys(localStorage).filter(k => k.startsWith('lance:store:') || k === 'lance:seeded' || k === 'lance:seeded-toast-shown' || k === 'lance:templates-seeded');
    keys.forEach(k => localStorage.removeItem(k));
  }
  localStorage.removeItem('lance:seeded');
  localStorage.removeItem('lance:seeded-toast-shown');
}
