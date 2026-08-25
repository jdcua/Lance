import Database from '@tauri-apps/plugin-sql';

interface CountRow { c: number }
interface SumRow { s: number }
interface MinutesRow { m: number }
interface TitleMinsRow { title: string; mins: number }
interface ProfileRow { currency: string }
interface AvgRow { a: number }
interface DateRow { d: string }

function first<T>(rows: T[]): T | undefined {
  return rows[0];
}

function getCount(rows: CountRow[]): number {
  return first(rows)?.c ?? 0;
}

function getSum(rows: SumRow[]): number {
  return first(rows)?.s ?? 0;
}

function getMins(rows: MinutesRow[]): number {
  return first(rows)?.m ?? 0;
}

export async function activeProjectsCount(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM projects WHERE status = 'active'");
  return first(rows)?.c ?? 0;
}

export async function totalOutstanding(db: Database, profileId: number): Promise<string | number> {
  const prof = await db.select<ProfileRow[]>("SELECT currency FROM user_profile WHERE id = $1", [profileId]);
  const currency = first(prof)?.currency || 'CAD';
  const rows = await db.select<SumRow[]>("SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE status IN ('sent', 'partial', 'overdue')");
  const val = first(rows)?.s ?? 0;
  return formatCurrency(val, currency);
}

export async function unpaidInvoicesCount(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM invoices WHERE status IN ('sent', 'partial', 'overdue')");
  return first(rows)?.c ?? 0;
}

export async function totalPaidRevenue(db: Database, profileId: number): Promise<string | number> {
  const prof = await db.select<ProfileRow[]>("SELECT currency FROM user_profile WHERE id = $1", [profileId]);
  const currency = first(prof)?.currency || 'CAD';
  const rows = await db.select<SumRow[]>("SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE status = 'paid'");
  const val = first(rows)?.s ?? 0;
  return formatCurrency(val, currency);
}

export async function todaysHours(db: Database, _profileId: number): Promise<string | number> {
  const today = new Date().toISOString().split('T')[0];
  const rows = await db.select<MinutesRow[]>(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE start_time LIKE $1",
    [`${today}%`]
  );
  const mins = first(rows)?.m ?? 0;
  return mins > 0 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : '--';
}

export async function thisWeeksHours(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const rows = await db.select<MinutesRow[]>(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE start_time >= $1",
    [weekAgo]
  );
  const mins = first(rows)?.m ?? 0;
  return `${Math.floor(mins / 60)}h`;
}

export async function activeProjectsWithHours(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<TitleMinsRow[]>(`
    SELECT p.title, COALESCE(SUM(te.duration_minutes), 0) as mins
    FROM projects p
    LEFT JOIN time_entries te ON te.project_id = p.id
    WHERE p.status = 'active' AND te.start_time >= $1
    GROUP BY p.id
    ORDER BY mins DESC
    LIMIT 1
  `, [new Date(new Date().getTime() - 7 * 86400000).toISOString()]);
  if (!first(rows) || first(rows)!.mins === 0) return '--';
  const hrs = Math.round(first(rows)!.mins / 6) / 10;
  return `${first(rows)!.title.substring(0, 20)} (${hrs}h)`;
}

export async function unbilledRenderHours(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<MinutesRow[]>(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE billable = 0"
  );
  const mins = first(rows)?.m ?? 0;
  return `${Math.floor(mins / 60)}h`;
}

export async function upcomingMilestones(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date().toISOString();
  const rows = await db.select<CountRow[]>(
    "SELECT COUNT(*) as c FROM milestones WHERE due_date >= $1 AND completed = 0",
    [now.split('T')[0]]
  );
  return first(rows)?.c ?? 0;
}

export async function utilizationRate(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const totalRows = await db.select<MinutesRow[]>(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE start_time >= $1",
    [monthStart]
  );
  const billableRows = await db.select<MinutesRow[]>(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE start_time >= $1 AND billable = 1",
    [monthStart]
  );
  const total = first(totalRows)?.m ?? 0;
  const billable = first(billableRows)?.m ?? 0;
  return total > 0 ? `${Math.round((billable / total) * 100)}%` : '--';
}

export async function effectiveHourlyRate(db: Database, profileId: number): Promise<string | number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const profRows = await db.select<ProfileRow[]>("SELECT currency FROM user_profile WHERE id = $1", [profileId]);
  const currency = first(profRows)?.currency || 'CAD';

  const revRows = await db.select<SumRow[]>(
    "SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE status = 'paid' AND paid_at >= $1",
    [monthStart]
  );
  const hoursRows = await db.select<MinutesRow[]>(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE start_time >= $1 AND billable = 1",
    [monthStart]
  );
  const rev = first(revRows)?.s ?? 0;
  const hours = (first(hoursRows)?.m ?? 0) / 60;
  if (hours === 0) return '--';
  return formatCurrency(rev / hours, currency);
}

export async function unbilledHours(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<MinutesRow[]>(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE invoiced = 0 AND billable = 1"
  );
  const mins = first(rows)?.m ?? 0;
  return `${Math.floor(mins / 60)}h`;
}

export async function draftsCount(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM proposals WHERE status = 'draft'");
  return first(rows)?.c ?? 0;
}

export async function assetsCount(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM attachments");
  return first(rows)?.c ?? 0;
}

export async function shootsThisMonth(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const rows = await db.select<CountRow[]>(
    "SELECT COUNT(*) as c FROM time_entries WHERE start_time >= $1 AND description LIKE '%shoot%'",
    [monthStart]
  );
  return first(rows)?.c ?? 0;
}

export async function editingVsShootRatio(db: Database, _profileId: number): Promise<string | number> {
  const shootRows = await db.select<MinutesRow[]>(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE description LIKE '%shoot%'"
  );
  const editRows = await db.select<MinutesRow[]>(
    "SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries WHERE description NOT LIKE '%shoot%' AND duration_minutes > 0"
  );
  const shoot = first(shootRows)?.m ?? 0;
  const edit = first(editRows)?.m ?? 0;
  if (shoot === 0) return '--';
  return `${Math.round((edit / shoot) * 10) / 10}:1`;
}

export async function deadlinePressure(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const rows = await db.select<CountRow[]>(
    "SELECT COUNT(*) as c FROM milestones WHERE due_date >= $1 AND due_date <= $2 AND completed = 0",
    [today, weekFromNow]
  );
  return first(rows)?.c ?? 0;
}

export async function activeRetainers(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<CountRow[]>(
    "SELECT COUNT(*) as c FROM projects WHERE status = 'active' AND notes LIKE '%retainer%'"
  );
  return first(rows)?.c ?? 0;
}

export async function sessionsThisWeek(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const rows = await db.select<CountRow[]>(
    "SELECT COUNT(*) as c FROM archetype_sessions WHERE created_at >= $1",
    [weekAgo]
  );
  return first(rows)?.c ?? 0;
}

export async function clientsCount(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM clients");
  return first(rows)?.c ?? 0;
}

export async function proposalsWinRate(db: Database, _profileId: number): Promise<string | number> {
  const totalRows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM proposals");
  const acceptedRows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM proposals WHERE status = 'accepted'");
  const total = first(totalRows)?.c ?? 0;
  const accepted = first(acceptedRows)?.c ?? 0;
  return total > 0 ? `${Math.round((accepted / total) * 100)}%` : '--';
}

export async function revenuePerProjectAvg(db: Database, profileId: number): Promise<string | number> {
  const profRows = await db.select<ProfileRow[]>("SELECT currency FROM user_profile WHERE id = $1", [profileId]);
  const currency = first(profRows)?.currency || 'CAD';
  const rows = await db.select<AvgRow[]>("SELECT AVG(total) as a FROM invoices WHERE status = 'paid'");
  const avg = first(rows)?.a ?? 0;
  return formatCurrency(avg, currency);
}

export async function overdueCount(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM invoices WHERE status = 'overdue'");
  return first(rows)?.c ?? 0;
}

export async function expensesTotal(db: Database, profileId: number): Promise<string | number> {
  const profRows = await db.select<ProfileRow[]>("SELECT currency FROM user_profile WHERE id = $1", [profileId]);
  const currency = first(profRows)?.currency || 'CAD';
  const rows = await db.select<SumRow[]>("SELECT COALESCE(SUM(amount), 0) as s FROM expenses");
  return formatCurrency(first(rows)?.s ?? 0, currency);
}

export async function openCommissionsCount(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM projects WHERE status = 'active'");
  return first(rows)?.c ?? 0;
}

export async function revisionsRemaining(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<CountRow[]>(
    "SELECT COUNT(*) as c FROM archetype_revisions WHERE approved = 0"
  );
  const count = first(rows)?.c ?? 0;
  return count > 0 ? `${count} pending` : '--';
}

export async function daysUntilNextShoot(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<DateRow[]>(
    "SELECT MIN(shoot_date) as d FROM archetype_shoots WHERE shoot_date >= $1",
    [new Date().toISOString().split('T')[0]]
  );
  if (!first(rows)?.d) return '--';
  const days = Math.ceil((new Date(first(rows)!.d).getTime() - Date.now()) / 86400000);
  return `${days}d`;
}

export async function projectsCompleted(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM projects WHERE status = 'completed'");
  return first(rows)?.c ?? 0;
}

export async function totalHoursTracked(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<MinutesRow[]>("SELECT COALESCE(SUM(duration_minutes), 0) as m FROM time_entries");
  return `${Math.floor((first(rows)?.m ?? 0) / 60)}h`;
}

export async function profitMargin(db: Database, _profileId: number): Promise<string | number> {
  const revRows = await db.select<SumRow[]>("SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE status = 'paid'");
  const expRows = await db.select<SumRow[]>("SELECT COALESCE(SUM(amount), 0) as s FROM expenses");
  const rev = first(revRows)?.s ?? 0;
  const exp = first(expRows)?.s ?? 0;
  if (rev === 0) return '--';
  return `${Math.round(((rev - exp) / rev) * 100)}%`;
}

export async function retainerVsProjectSplit(db: Database, _profileId: number): Promise<string | number> {
  const retainerRows = await db.select<CountRow[]>(
    "SELECT COUNT(*) as c FROM projects WHERE status = 'active' AND notes LIKE '%retainer%'"
  );
  const projectRows = await db.select<CountRow[]>(
    "SELECT COUNT(*) as c FROM projects WHERE status = 'active' AND (notes NOT LIKE '%retainer%' OR notes IS NULL)"
  );
  const r = first(retainerRows)?.c ?? 0;
  const p = first(projectRows)?.c ?? 0;
  if (r + p === 0) return '--';
  return `${r} retainer / ${p} project`;
}

export async function clientRetentionRate(db: Database, _profileId: number): Promise<string | number> {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 86400000).toISOString();
  const totalRows = await db.select<CountRow[]>(
    "SELECT COUNT(DISTINCT client_id) as c FROM invoices WHERE created_at >= $1",
    [threeMonthsAgo]
  );
  const repeatRows = await db.select<CountRow[]>(
    "SELECT COUNT(DISTINCT client_id) as c FROM invoices WHERE created_at >= $1 AND client_id IN (SELECT DISTINCT client_id FROM invoices WHERE created_at < $1)",
    [threeMonthsAgo]
  );
  const total = first(totalRows)?.c ?? 0;
  const repeat = first(repeatRows)?.c ?? 0;
  if (total === 0) return '--';
  return `${Math.round((repeat / total) * 100)}%`;
}

function formatCurrency(val: number, currency: string): string {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
  try { return fmt.format(val); } catch { return `$${Math.round(val).toLocaleString()}`; }
}

export async function blockedTasks(db: Database, _profileId: number): Promise<string | number> {
  const rows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM milestones WHERE completed = 0");
  return first(rows)?.c ?? 0;
}

export async function cancellationRate(db: Database, _profileId: number): Promise<string | number> {
  const totalRows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM projects");
  const cancelledRows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM projects WHERE status = 'cancelled'");
  const total = first(totalRows)?.c ?? 0;
  const cancelled = first(cancelledRows)?.c ?? 0;
  if (total === 0) return '--';
  return `${Math.round((cancelled / total) * 100)}%`;
}

export async function auditionConversion(db: Database, _profileId: number): Promise<string | number> {
  const totalRows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM proposals WHERE status IN ('sent', 'accepted', 'declined')");
  const acceptedRows = await db.select<CountRow[]>("SELECT COUNT(*) as c FROM proposals WHERE status = 'accepted'");
  const total = first(totalRows)?.c ?? 0;
  const accepted = first(acceptedRows)?.c ?? 0;
  if (total === 0) return '--';
  return `${Math.round((accepted / total) * 100)}%`;
}
