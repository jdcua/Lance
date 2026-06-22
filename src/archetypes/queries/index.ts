import Database from '@tauri-apps/plugin-sql';

export async function activeProjectsCount(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select("SELECT COUNT(*) as c FROM projects WHERE status = 'active'");
  return rows[0]?.c ?? 0;
}

export async function totalOutstanding(db: Database, profileId: number): Promise<string | number> {
  const prof = await db.select("SELECT currency FROM user_profile WHERE id = $1", [profileId]);
  const currency = (prof as any[])[0]?.currency || 'CAD';
  const rows: any[] = await db.select("SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE status IN ('sent', 'overdue')");
  const val = rows[0]?.s ?? 0;
  return formatCurrency(val, currency);
}

export async function unpaidInvoicesCount(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select("SELECT COUNT(*) as c FROM invoices WHERE status IN ('sent', 'overdue')");
  return rows[0]?.c ?? 0;
}

export async function totalPaidRevenue(db: Database, profileId: number): Promise<string | number> {
  const prof = await db.select("SELECT currency FROM user_profile WHERE id = $1", [profileId]);
  const currency = (prof as any[])[0]?.currency || 'CAD';
  const rows: any[] = await db.select("SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE status = 'paid'");
  const val = rows[0]?.s ?? 0;
  return formatCurrency(val, currency);
}

export async function todaysHours(db: Database, _profileId: number): Promise<string | number> {
  const today = new Date().toISOString().split('T')[0];
  const rows: any[] = await db.select(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE start_time LIKE $1",
    [`${today}%`]
  );
  const mins = rows[0]?.m ?? 0;
  return mins > 0 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : '—';
}

export async function thisWeeksHours(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const rows: any[] = await db.select(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE start_time >= $1",
    [weekAgo]
  );
  const mins = rows[0]?.m ?? 0;
  return `${Math.floor(mins / 60)}h`;
}

export async function activeProjectsWithHours(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select(`
    SELECT p.title, COALESCE(SUM(te.duration_minutes), 0) as mins
    FROM projects p
    LEFT JOIN time_entries te ON te.project_id = p.id
    WHERE p.status = 'active' AND te.start_time >= $1
    GROUP BY p.id
    ORDER BY mins DESC
    LIMIT 1
  `, [new Date(new Date().getTime() - 7 * 86400000).toISOString()]);
  if (!rows[0] || rows[0].mins === 0) return '—';
  const hrs = Math.round(rows[0].mins / 6) / 10;
  return `${rows[0].title.substring(0, 20)} (${hrs}h)`;
}

export async function unbilledRenderHours(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE billable = 0"
  );
  const mins = rows[0]?.m ?? 0;
  return `${Math.floor(mins / 60)}h`;
}

export async function upcomingMilestones(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date().toISOString();
  const rows: any[] = await db.select(
    "SELECT COUNT(*) as c FROM milestones WHERE due_date >= $1 AND completed = 0",
    [now.split('T')[0]]
  );
  return rows[0]?.c ?? 0;
}

export async function utilizationRate(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const totalRows: any[] = await db.select(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE start_time >= $1",
    [monthStart]
  );
  const billableRows: any[] = await db.select(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE start_time >= $1 AND billable = 1",
    [monthStart]
  );
  const total = totalRows[0]?.m ?? 0;
  const billable = billableRows[0]?.m ?? 0;
  return total > 0 ? `${Math.round((billable / total) * 100)}%` : '—';
}

export async function effectiveHourlyRate(db: Database, profileId: number): Promise<string | number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const profRows: any[] = await db.select("SELECT currency FROM user_profile WHERE id = $1", [profileId]);
  const currency = profRows[0]?.currency || 'CAD';

  const revRows: any[] = await db.select(
    "SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE status = 'paid' AND paid_at >= $1",
    [monthStart]
  );
  const hoursRows: any[] = await db.select(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE start_time >= $1 AND billable = 1",
    [monthStart]
  );
  const rev = revRows[0]?.s ?? 0;
  const hours = (hoursRows[0]?.m ?? 0) / 60;
  if (hours === 0) return '—';
  return formatCurrency(rev / hours, currency);
}

export async function unbilledHours(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE invoiced = 0 AND billable = 1"
  );
  const mins = rows[0]?.m ?? 0;
  return `${Math.floor(mins / 60)}h`;
}

export async function draftsCount(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select("SELECT COUNT(*) as c FROM proposals WHERE status = 'draft'");
  return rows[0]?.c ?? 0;
}

export async function assetsCount(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select("SELECT COUNT(*) as c FROM attachments");
  return rows[0]?.c ?? 0;
}

export async function shootsThisMonth(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const rows: any[] = await db.select(
    "SELECT COUNT(*) as c FROM time_entries WHERE start_time >= $1 AND description LIKE '%shoot%'",
    [monthStart]
  );
  return rows[0]?.c ?? 0;
}

export async function editingVsShootRatio(db: Database, _profileId: number): Promise<string | number> {
  const shootRows: any[] = await db.select(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE description LIKE '%shoot%'"
  );
  const editRows: any[] = await db.select(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE description NOT LIKE '%shoot%' AND duration_minutes > 0"
  );
  const shoot = shootRows[0]?.m ?? 0;
  const edit = editRows[0]?.m ?? 0;
  if (shoot === 0) return '—';
  return `${Math.round((edit / shoot) * 10) / 10}:1`;
}

export async function deadlinePressure(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const rows: any[] = await db.select(
    "SELECT COUNT(*) as c FROM milestones WHERE due_date >= $1 AND due_date <= $2 AND completed = 0",
    [today, weekFromNow]
  );
  return rows[0]?.c ?? 0;
}

export async function activeRetainers(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select(
    "SELECT COUNT(*) as c FROM projects WHERE status = 'active' AND notes LIKE '%retainer%'"
  );
  return rows[0]?.c ?? 0;
}

export async function sessionsThisWeek(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const rows: any[] = await db.select(
    "SELECT COUNT(*) as c FROM time_entries WHERE start_time >= $1 AND description LIKE '%session%'",
    [weekAgo]
  );
  return rows[0]?.c ?? 0;
}

export async function clientsCount(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select("SELECT COUNT(*) as c FROM clients");
  return rows[0]?.c ?? 0;
}

export async function proposalsWinRate(db: Database, _profileId: number): Promise<string | number> {
  const totalRows: any[] = await db.select("SELECT COUNT(*) as c FROM proposals");
  const acceptedRows: any[] = await db.select("SELECT COUNT(*) as c FROM proposals WHERE status = 'accepted'");
  const total = totalRows[0]?.c ?? 0;
  const accepted = acceptedRows[0]?.c ?? 0;
  return total > 0 ? `${Math.round((accepted / total) * 100)}%` : '—';
}

export async function revenuePerProjectAvg(db: Database, profileId: number): Promise<string | number> {
  const profRows: any[] = await db.select("SELECT currency FROM user_profile WHERE id = $1", [profileId]);
  const currency = profRows[0]?.currency || 'CAD';
  const rows: any[] = await db.select("SELECT AVG(total) as a FROM invoices WHERE status = 'paid'");
  const avg = rows[0]?.a ?? 0;
  return formatCurrency(avg, currency);
}

export async function overdueCount(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select("SELECT COUNT(*) as c FROM invoices WHERE status = 'overdue'");
  return rows[0]?.c ?? 0;
}

export async function expensesTotal(db: Database, profileId: number): Promise<string | number> {
  const profRows: any[] = await db.select("SELECT currency FROM user_profile WHERE id = $1", [profileId]);
  const currency = profRows[0]?.currency || 'CAD';
  const rows: any[] = await db.select("SELECT COALESCE(SUM(amount), 0) as s FROM expenses");
  return formatCurrency(rows[0]?.s ?? 0, currency);
}

export async function openCommissionsCount(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select("SELECT COUNT(*) as c FROM projects WHERE status = 'active'");
  return rows[0]?.c ?? 0;
}

export async function revisionsRemaining(db: Database, _profileId: number): Promise<string | number> {
  return '—';
}

export async function daysUntilNextShoot(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select(
    "SELECT MIN(due_date) as d FROM milestones WHERE due_date >= $1 AND completed = 0",
    [new Date().toISOString().split('T')[0]]
  );
  if (!rows[0]?.d) return '—';
  const days = Math.ceil((new Date(rows[0].d).getTime() - Date.now()) / 86400000);
  return `${days}d`;
}

export async function projectsCompleted(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select("SELECT COUNT(*) as c FROM projects WHERE status = 'completed'");
  return rows[0]?.c ?? 0;
}

export async function totalHoursTracked(db: Database, _profileId: number): Promise<string | number> {
  const rows: any[] = await db.select("SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries");
  return `${Math.floor((rows[0]?.m ?? 0) / 60)}h`;
}

export async function profitMargin(db: Database, _profileId: number): Promise<string | number> {
  const revRows: any[] = await db.select("SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE status = 'paid'");
  const expRows: any[] = await db.select("SELECT COALESCE(SUM(amount), 0) as s FROM expenses");
  const rev = revRows[0]?.s ?? 0;
  const exp = expRows[0]?.s ?? 0;
  if (rev === 0) return '—';
  return `${Math.round(((rev - exp) / rev) * 100)}%`;
}

export async function retainerVsProjectSplit(db: Database, _profileId: number): Promise<string | number> {
  return '—';
}

export async function clientRetentionRate(db: Database, _profileId: number): Promise<string | number> {
  return '—';
}

function formatCurrency(val: number, currency: string): string {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
  try { return fmt.format(val); } catch { return `$${Math.round(val).toLocaleString()}`; }
}
