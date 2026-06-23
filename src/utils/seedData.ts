import { getDb } from '../db';

function daysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().split('T')[0];
}

function daysFromNow(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().split('T')[0];
}

function isoNow(): string {
  return new Date().toISOString();
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

  const db = await getDb();
  const now = isoNow();

  const existing = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM project_templates WHERE is_default = 1');
  if (existing[0] && (existing[0] as unknown as { count: number }).count > 0) {
    localStorage.setItem('lance:templates-seeded', 'true');
    return;
  }

  for (const tpl of BUILT_IN_TEMPLATES) {
    const templateId = crypto.randomUUID();
    await db.execute(
      'INSERT INTO project_templates (id, name, description, default_budget, default_status, is_default, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
      [templateId, tpl.name, tpl.description, tpl.default_budget, tpl.default_status, now]
    );
    for (const ms of tpl.milestones) {
      await db.execute(
        'INSERT INTO project_template_milestones (id, template_id, title, days_from_start, invoice_on_completion) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), templateId, ms.title, ms.days_from_start, ms.invoice_on_completion ? 1 : 0]
      );
    }
  }

  localStorage.setItem('lance:templates-seeded', 'true');
}

export async function seedSampleData(): Promise<void> {
  if (localStorage.getItem('lance:seeded') === 'true') return;

  const db = await getDb();
  const now = isoNow();

  await seedBuiltInTemplates();

  // --- CLIENTS ---
  const client1Id = crypto.randomUUID();
  const client2Id = crypto.randomUUID();
  const client3Id = crypto.randomUUID();
  const client4Id = crypto.randomUUID();

  await db.execute(
    `INSERT INTO clients (id, name, email, phone, company, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [client1Id, 'Mara Jensen', 'mara@designco.com', null, 'DesignCo', 'Brand designer at a startup. Responsive and easy to work with.', now]
  );
  await db.execute(
    `INSERT INTO clients (id, name, email, phone, company, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [client2Id, 'Kol & Nash Studio', 'hello@kolnash.com', null, 'Kol & Nash Studio', 'Creative agency with 12 employees. Proposals go through their ops lead.', now]
  );
  await db.execute(
    `INSERT INTO clients (id, name, email, phone, company, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [client3Id, 'David Okoro', 'david@okoro.io', null, null, 'Solo founder building a SaaS product. Prefers async communication.', now]
  );
  await db.execute(
    `INSERT INTO clients (id, name, email, phone, company, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [client4Id, 'The Bloom Co.', 'team@thebloomco.com', null, 'The Bloom Co.', 'Retail brand specializing in sustainable floristry. Completed project — happy client.', now]
  );

  // --- PROJECTS ---
  const proj1Id = crypto.randomUUID();
  const proj2Id = crypto.randomUUID();
  const proj3Id = crypto.randomUUID();
  const proj4Id = crypto.randomUUID();

  await db.execute(
    `INSERT INTO projects (id, client_id, title, status, start_date, budget, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [proj1Id, client1Id, 'Brand Identity Refresh', 'active', daysAgo(21), 6500, 'Complete rebrand including logo, color palette, typography, and brand guidelines document.', now]
  );
  await db.execute(
    `INSERT INTO projects (id, client_id, title, status, start_date, end_date, budget, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [proj2Id, client4Id, 'E-commerce Site Redesign', 'completed', daysAgo(60), daysAgo(14), 4200, 'Full site redesign on Shopify. Delivered ahead of schedule.', now]
  );
  await db.execute(
    `INSERT INTO projects (id, client_id, title, status, start_date, budget, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [proj3Id, client3Id, 'Product Launch Strategy', 'active', daysAgo(10), 2800, 'Go-to-market strategy, messaging framework, and launch timeline.', now]
  );
  await db.execute(
    `INSERT INTO projects (id, client_id, title, status, start_date, budget, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [proj4Id, client2Id, 'Marketing Site Copy', 'paused', daysAgo(14), 1500, 'Website copy for their new service landing pages. Paused while they finalize product names.', now]
  );

  // --- MILESTONES (for Brand Identity Refresh) ---
  await db.execute(
    `INSERT INTO milestones (id, project_id, title, due_date, completed, invoice_on_completion, seeded) VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [crypto.randomUUID(), proj1Id, 'Research & Discovery', daysAgo(7), 1, 0]
  );
  await db.execute(
    `INSERT INTO milestones (id, project_id, title, due_date, completed, invoice_on_completion, seeded) VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [crypto.randomUUID(), proj1Id, 'Design Concepts', daysFromNow(7), 0, 0]
  );
  await db.execute(
    `INSERT INTO milestones (id, project_id, title, due_date, completed, invoice_on_completion, seeded) VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [crypto.randomUUID(), proj1Id, 'Final Delivery', daysFromNow(21), 0, 1]
  );

  // --- PROPOSALS ---
  const prop1Id = crypto.randomUUID();
  const prop2Id = crypto.randomUUID();
  const prop3Id = crypto.randomUUID();

  await db.execute(
    `INSERT INTO proposals (id, client_id, project_id, title, status, rate, rate_type, sent_at, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [prop1Id, client2Id, null, 'Q3 Content Campaign', 'sent', 3200, 'flat', daysAgo(8), isoNow(), 1]
  );
  await db.execute(
    `INSERT INTO proposals (id, client_id, project_id, title, status, rate, rate_type, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [prop2Id, client3Id, null, 'Social Media Audit', 'draft', 850, 'flat', isoNow(), 1]
  );
  await db.execute(
    `INSERT INTO proposals (id, client_id, project_id, title, status, rate, rate_type, sent_at, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [prop3Id, client1Id, proj1Id, 'Brand Identity Refresh', 'accepted', 6500, 'flat', daysAgo(21), isoNow(), 1]
  );

  // --- CONTRACTS ---
  await db.execute(
    `INSERT INTO contracts (id, client_id, project_id, proposal_id, title, status, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [crypto.randomUUID(), client1Id, proj1Id, prop3Id, 'Service Agreement — Brand Identity', 'active', isoNow(), 1]
  );
  await db.execute(
    `INSERT INTO contracts (id, client_id, project_id, title, status, signed_at, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [crypto.randomUUID(), client4Id, proj2Id, 'Service Agreement — Site Redesign', 'completed', daysAgo(60), isoNow(), 1]
  );

  // --- TIME ENTRIES ---
  const timeEntries = [
    { desc: 'Discovery call with Mara', proj: proj1Id, cl: client1Id, mins: 60, daysAgo: 14, billable: 1, invoiced: 1 },
    { desc: 'Competitive brand audit', proj: proj1Id, cl: client1Id, mins: 150, daysAgo: 13, billable: 1, invoiced: 1 },
    { desc: 'Logo concepts — round 1', proj: proj1Id, cl: client1Id, mins: 180, daysAgo: 10, billable: 1, invoiced: 1 },
    { desc: 'Logo concepts — round 2', proj: proj1Id, cl: client1Id, mins: 120, daysAgo: 7, billable: 1, invoiced: 0 },
    { desc: 'Color palette exploration', proj: proj1Id, cl: client1Id, mins: 90, daysAgo: 5, billable: 1, invoiced: 0 },
    { desc: 'Typography system', proj: proj1Id, cl: client1Id, mins: 60, daysAgo: 3, billable: 1, invoiced: 0 },
    { desc: 'Client revisions call', proj: proj1Id, cl: client1Id, mins: 45, daysAgo: 2, billable: 0, invoiced: 0 },
    { desc: 'Homepage wireframes', proj: proj2Id, cl: client4Id, mins: 180, daysAgo: 45, billable: 1, invoiced: 1 },
    { desc: 'Product page designs', proj: proj2Id, cl: client4Id, mins: 120, daysAgo: 42, billable: 1, invoiced: 1 },
    { desc: 'Mobile responsive QA', proj: proj2Id, cl: client4Id, mins: 90, daysAgo: 30, billable: 1, invoiced: 1 },
    { desc: 'Launch strategy workshop', proj: proj3Id, cl: client3Id, mins: 120, daysAgo: 8, billable: 1, invoiced: 0 },
    { desc: 'Messaging framework draft', proj: proj3Id, cl: client3Id, mins: 150, daysAgo: 5, billable: 1, invoiced: 0 },
  ];
  for (const te of timeEntries) {
    const d = daysAgo(te.daysAgo);
    await db.execute(
      `INSERT INTO time_entries (id, project_id, client_id, description, start_time, duration_minutes, billable, invoiced, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [crypto.randomUUID(), te.proj, te.cl, te.desc, `${d}T09:00:00.000Z`, te.mins, te.billable, te.invoiced]
    );
  }

  // --- INVOICES ---
  await db.execute(
    `INSERT INTO invoices (id, client_id, project_id, invoice_number, status, line_items, subtotal, total, due_date, paid_at, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [crypto.randomUUID(), client4Id, proj2Id, 'INV-001', 'paid', JSON.stringify([{ id: crypto.randomUUID(), description: 'E-commerce Site Redesign', quantity: 1, unit_price: 4200, total: 4200 }]), 4200, 4200, daysAgo(44), daysAgo(21), 'Full payment received on time.', now]
  );
  await db.execute(
    `INSERT INTO invoices (id, client_id, project_id, invoice_number, status, line_items, subtotal, total, due_date, paid_at, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [crypto.randomUUID(), client1Id, proj1Id, 'INV-002', 'paid', JSON.stringify([{ id: crypto.randomUUID(), description: 'Brand Identity Refresh — 30% Deposit', quantity: 1, unit_price: 2000, total: 2000 }]), 2000, 2000, daysAgo(42), daysAgo(35), 'Deposit paid promptly.', now]
  );
  await db.execute(
    `INSERT INTO invoices (id, client_id, project_id, invoice_number, status, line_items, subtotal, total, due_date, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [crypto.randomUUID(), client1Id, proj1Id, 'INV-003', 'sent', JSON.stringify([{ id: crypto.randomUUID(), description: 'Brand Identity Refresh — Progress Payment', quantity: 1, unit_price: 2000, total: 2000 }]), 2000, 2000, daysFromNow(7), 'Due after design concept approval.', now]
  );
  await db.execute(
    `INSERT INTO invoices (id, client_id, project_id, invoice_number, status, line_items, subtotal, total, due_date, notes, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [crypto.randomUUID(), client3Id, proj3Id, 'INV-004', 'overdue', JSON.stringify([{ id: crypto.randomUUID(), description: 'Product Launch Strategy', quantity: 1, unit_price: 850, total: 850 }]), 850, 850, daysAgo(12), 'First milestone payment.', now]
  );

  // --- RECURRING INVOICE ---
  await db.execute(
    `INSERT INTO recurring_invoices (id, client_id, project_id, title, frequency, line_items, subtotal, total, notes, active, next_due, created_at, seeded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [crypto.randomUUID(), client3Id, proj3Id, 'Monthly Retainer', 'monthly', JSON.stringify([{ id: crypto.randomUUID(), description: 'Monthly Strategy Retainer', quantity: 1, unit_price: 800, total: 800 }]), 800, 800, 'Ongoing strategy and analytics support.', 1, daysFromNow(14), now]
  );

  // --- EXPENSES ---
  const expenseData = [
    { cat: 'Software', desc: 'Figma Professional', amt: 15, date: daysAgo(30) },
    { cat: 'Marketing', desc: 'Stock photo pack — Unsplash+', amt: 45, date: daysAgo(5) },
    { cat: 'Equipment', desc: 'Samsung T7 SSD 1TB', amt: 89, date: daysAgo(42) },
    { cat: 'Software', desc: 'Adobe Creative Cloud', amt: 55, date: daysAgo(30) },
    { cat: 'Software', desc: 'Notion Pro', amt: 10, date: daysAgo(30) },
  ];
  for (const e of expenseData) {
    await db.execute(
      `INSERT INTO expenses (id, category, description, amount, date, seeded) VALUES (?, ?, ?, ?, ?, 1)`,
      [crypto.randomUUID(), e.cat, e.desc, e.amt, e.date]
    );
  }

  localStorage.setItem('lance:seeded', 'true');
}

export async function clearSampleData(): Promise<void> {
  const db = await getDb();

  await db.execute(`DELETE FROM milestones WHERE project_id IN (SELECT id FROM projects WHERE seeded = 1)`);
  await db.execute(`DELETE FROM follow_up_log WHERE entity_id IN (SELECT id FROM proposals WHERE seeded = 1) OR entity_id IN (SELECT id FROM invoices WHERE seeded = 1)`);

  const tables = ['time_entries', 'invoices', 'recurring_invoices', 'contracts', 'proposals', 'projects', 'expenses', 'clients'];
  for (const table of tables) {
    await db.execute(`DELETE FROM ${table} WHERE seeded = 1`);
  }
  localStorage.removeItem('lance:seeded');
  localStorage.removeItem('lance:seeded-toast-shown');
}
