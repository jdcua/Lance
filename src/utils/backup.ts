import type { UserProfile } from '../types';

export interface BackupEnvelope {
  lance_backup: true;
  version: string;
  exported_at: string;
  schema_version: number;
  data: Record<string, unknown[]>;
}

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  envelope?: BackupEnvelope;
  tableCounts?: Record<string, number>;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
  tablesWritten: number;
  blobsRestored: number;
  blobsSkipped: number;
}

export interface AutoBackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  backup_path: string;
}

export function createExportEnvelope(
  data: Record<string, unknown[]>,
  version: string,
  schemaVersion: number,
): BackupEnvelope {
  return {
    lance_backup: true,
    version,
    exported_at: new Date().toISOString(),
    schema_version: schemaVersion,
    data,
  };
}

export function validateImportEnvelope(raw: unknown): ImportValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Invalid JSON: not an object' };
  }

  const obj = raw as Record<string, unknown>;

  if (obj.lance_backup !== true) {
    return { valid: false, error: 'Not a valid Lance backup file (missing lance_backup flag)' };
  }

  if (typeof obj.version !== 'string') {
    return { valid: false, error: 'Not a valid Lance backup file (missing version)' };
  }

  if (typeof obj.schema_version !== 'number') {
    return { valid: false, error: 'Not a valid Lance backup file (missing schema_version)' };
  }

  if (!obj.data || typeof obj.data !== 'object') {
    return { valid: false, error: 'Not a valid Lance backup file (missing data)' };
  }

  const data = obj.data as Record<string, unknown>;
  const tableCounts: Record<string, number> = {};

  for (const [key, value] of Object.entries(data)) {
    const error = validateDataTable(key, value, tableCounts);
    if (error) return { valid: false, error };
  }

  const envelope: BackupEnvelope = {
    lance_backup: true,
    version: obj.version,
    exported_at: typeof obj.exported_at === 'string' ? obj.exported_at : new Date().toISOString(),
    schema_version: obj.schema_version,
    data: data as Record<string, unknown[]>,
  };

  return { valid: true, envelope, tableCounts };
}

/** Validate one table's rows; returns an error message or undefined on success. */
function validateDataTable(
  key: string,
  value: unknown,
  tableCounts: Record<string, number>,
): string | undefined {
  if (!Array.isArray(value)) return `Invalid data for table "${key}": expected an array`;
  if (value.length > 0) {
    const first = value[0] as Record<string, unknown>;
    // user_profile is a singleton row and may predate the id column ,
    // its shape check below is the real gate, not a generic id.
    if (key !== 'user_profile' && !first.id) {
      return `Invalid record in "${key}": missing "id" field`;
    }
    try {
      validateTableShape(key, first);
    } catch (e) {
      return (e as Error)?.message || `Invalid record in "${key}"`;
    }
  }
  tableCounts[key] = value.length;
  return undefined;
}

/** Uniform string coercion for errors thrown anywhere in this module. */
function errorMessage(err: unknown): string {
  return (err as Error)?.message || String(err);
}

function validateTableShape(table: string, record: Record<string, unknown>): void {
  const requiredByTable: Record<string, string[]> = {
    clients: ['id', 'name', 'created_at'],
    projects: ['id', 'client_id', 'title', 'created_at'],
    proposals: ['id', 'client_id', 'title', 'created_at'],
    contracts: ['id', 'client_id', 'title', 'created_at'],
    time_entries: ['id', 'project_id', 'start_time'],
    invoices: ['id', 'client_id', 'invoice_number', 'created_at'],
    expenses: ['id', 'category', 'description', 'amount', 'date'],
    milestones: ['id', 'project_id', 'title'],
    user_profile: ['currency'],
  };

  const required = requiredByTable[table];
  if (required) {
    for (const field of required) {
      if (!(field in record)) {
        throw new Error(`Invalid record in "${table}": missing "${field}" field`);
      }
    }
  }
}

const TABLE_ORDER = [
  'user_profile',
  'clients',
  'projects',
  'milestones',
  'proposals',
  'contracts',
  'time_entries',
  'invoices',
  'invoice_payments',
  'expenses',
  'recurring_invoices',
  'communications',
  'follow_up_log',
  'attachments',
  'metric_definitions',
  'metric_values',
  'metric_templates',
  'achievements',
  'project_templates',
  'project_template_milestones',
  'export_templates',
  'contract_templates',
  'archetype_render_log',
  'archetype_sessions',
  'archetype_shoots',
  'archetype_revisions',
  'archetype_builds',
  'archetype_keywords',
  'archetype_datasets',
  'import_log',
  'app_events',
  'kanban_boards',
  'kanban_columns',
  'kanban_cards',
];

export const BACKUP_TABLES = TABLE_ORDER;

/**
 * Columns for a table with no hand-written mapping, taken from the record
 * itself. Only keys that are plain column names: no `__proto__`, no `constructor`,
 * so a crafted backup cannot smuggle a property name into an INSERT statement.
 */
function inferColumns(record: unknown): string[] {
  if (!record || typeof record !== 'object') return [];
  const out: string[] = [];
  for (const key of Object.keys(record as Record<string, unknown>)) {
    if (!/^[a-z_][a-z0-9_]*$/.test(key)) continue;
    out.push(key);
  }
  return out;
}

/** Highest existing INTEGER id, so a restore re-keys instead of colliding. */
async function maxNumericId(
  db: Awaited<ReturnType<typeof import('../db').getDb>>,
  table: string,
  columns: string[],
): Promise<number> {
  if (!columns.includes('id')) return 0;
  if (!/^[a-z_][a-z0-9_]*$/.test(table)) return 0;
  try {
    const rows = await db.select<{ max_id: number | null }[]>(
      `SELECT MAX(id) as max_id FROM ${table}`,
    );
    const max = rows?.[0]?.max_id;
    return typeof max === 'number' && max > 0 ? max : 0;
  } catch {
    return 0;
  }
}

/**
 * Discover every table that actually exists, so nothing can be silently left
 * behind.
 *
 * TABLE_ORDER above is a HAND-MAINTAINED list, and it drifted badly: the
 * archetype feature creates ~136 tables at runtime from src/db/index.ts
 * (retainers, ledger_entries, bookings, sprint_tasks, action_items, sops, ...).
 * None of them were in the list, so Export said "Data exported successfully" and
 * dropped all of it. Retainers and ledger_entries hold real money.
 *
 * So the export enumerates the live schema and unions it with the hand list,
 * rather than trusting the hand list. Tables that do not exist yield [] and are
 * dropped, so an older backup importing into a newer app still works.
 */
export async function discoverBackupTables(): Promise<string[]> {
  const { getDb, browserStoreTableNames } = await import('../db');
  const db = await getDb();
  const found = new Set<string>(TABLE_ORDER);
  found.add('share_tokens');
  try {
    const rows = await db.select<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    );
    for (const row of rows ?? []) {
      if (typeof row?.name === 'string' && row.name) found.add(row.name);
    }
  } catch {
    // No SQLite introspection available; the store scan below covers it.
  }
  // Browser mode has no sqlite_master at all — the mock db answers the query
  // with [] rather than throwing — so the hand list alone would omit ~100
  // archetype tables and Export would report success while dropping every
  // mood board, retainer, ledger entry and campaign the user entered. This
  // scan is a no-op under Tauri (nothing writes lance:store:* there).
  try {
    for (const name of browserStoreTableNames()) found.add(name);
  } catch {
    /* nothing else to try */
  }
  // schema_version describes the schema itself; carrying it across machines
  // would tell the importer the wrong version.
  found.delete('schema_version');
  found.delete('sqlite_sequence');
  return [...found];
}

/**
 * Read every user table via the db layer (works in Tauri and browser).
 * Missing tables yield []. share_tokens is browser-only (no SQLite table):
 * included best-effort, skipped on restore (no mapping by design).
 */
export async function fetchBackupTables(): Promise<Record<string, unknown[]>> {
  const { getDb } = await import('../db');
  const db = await getDb();
  const data: Record<string, unknown[]> = {};
  for (const table of await discoverBackupTables()) {
    try {
      const rows = await db.select<Record<string, unknown>[]>(`SELECT * FROM ${table}`);
      data[table] = Array.isArray(rows) ? rows : [];
    } catch {
      data[table] = [];
    }
  }
  return data;
}

/**
 * Portable file bytes. Attachment ROWS travel in their table; BYTES travel
 * here so a backup carries actual files across machines.
 * Caps keep JSON backups sane; bigger files import as metadata with the row
 * intact (the file itself stays behind). Older app versions ignore this
 * section (no TABLE_INSERT_MAP entry), so the format stays compatible.
 */
export interface AttachmentBlob {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  /** Raw bytes, base64. */
  data: string;
}

export const ATTACHMENT_BLOB_TABLE = 'attachment_blobs';
export const ATTACHMENT_BLOB_MAX_PER_FILE = 2 * 1024 * 1024;
export const ATTACHMENT_BLOB_MAX_TOTAL = 8 * 1024 * 1024;

// Ceiling on an import envelope, checked against File.size before the file is
// read. Enforcing it after JSON.parse is too late: parsing a 900MB JSON string
// exhausts the renderer heap before any validation runs.
export const MAX_IMPORT_MB = 50;
export const MAX_IMPORT_BYTES = MAX_IMPORT_MB * 1024 * 1024;

/** Materialize blob bytes on import. Returns the file_path to store. */
export type BlobMaterializer = (
  id: string,
  bytes: Uint8Array,
  mime: string,
  filename: string,
) => Promise<string>;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToBytes(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function sanitizeBlobName(name: string): string {
  const safe = String(name || 'file')
    .replace(/[/\\:*?"<>|]/g, '_')
    .slice(0, 120);
  return safe || 'file';
}

/** Read the bytes for one attachment row, or null when unreachable. */
async function readAttachmentBytes(
  row: { file_path: string },
  tauri: boolean,
): Promise<Uint8Array | null> {
  try {
    if (!tauri && row.file_path.startsWith('idb:')) {
      const { getAssetFile } = await import('../demo/assetStore');
      const blob = await getAssetFile(row.file_path.slice(4));
      if (blob) return new Uint8Array(await blob.arrayBuffer());
    } else if (tauri) {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      return await readFile(row.file_path);
    }
  } catch {
    /* unreachable bytes */
  }
  return null;
}

/**
 * Collect portable bytes for attachments whose contents are reachable:
 * browser idb: paths (IndexedDB) and desktop disk files. Returns blobs plus
 * the count skipped by caps or unreachable paths.
 */
export async function fetchAttachmentBlobs(): Promise<{
  blobs: AttachmentBlob[];
  skipped: number;
}> {
  const blobs: AttachmentBlob[] = [];
  let skipped = 0;
  let total = 0;
  try {
    const { getDb } = await import('../db');
    const db = await getDb();
    const rows = await db.select<
      {
        id: string;
        filename: string;
        mime_type: string;
        file_path: string;
      }[]
    >(`SELECT id, filename, mime_type, file_path FROM attachments`);
    const { isTauri } = await import('./tauri');
    const tauri = isTauri();
    for (const row of rows || []) {
      if (!row || !row.id) continue;
      const bytes = await readAttachmentBytes(row, tauri);
      if (!bytes || bytes.length === 0) {
        skipped++;
        continue;
      }
      if (
        bytes.length > ATTACHMENT_BLOB_MAX_PER_FILE ||
        total + bytes.length > ATTACHMENT_BLOB_MAX_TOTAL
      ) {
        skipped++;
        continue;
      }
      total += bytes.length;
      blobs.push({
        id: row.id,
        filename: sanitizeBlobName(row.filename),
        mime_type: row.mime_type || 'application/octet-stream',
        size_bytes: bytes.length,
        data: bytesToBase64(bytes),
      });
    }
  } catch {
    return { blobs, skipped };
  }
  return { blobs, skipped };
}

export const TABLE_INSERT_MAP: Record<string, { table: string; columns: string[] }> = {
  clients: {
    table: 'clients',
    columns: [
      'id',
      'user_id',
      'name',
      'email',
      'phone',
      'company',
      'notes',
      'preferred_currency',
      'seeded',
      'created_at',
    ],
  },
  projects: {
    table: 'projects',
    columns: [
      'id',
      'user_id',
      'client_id',
      'title',
      'status',
      'start_date',
      'end_date',
      'budget',
      'notes',
      'color',
      'seeded',
      'created_at',
    ],
  },
  proposals: {
    table: 'proposals',
    columns: [
      'id',
      'user_id',
      'client_id',
      'project_id',
      'title',
      'status',
      'scope',
      'timeline',
      'rate',
      'rate_type',
      'body',
      'sent_at',
      'expires_at',
      'seeded',
      'created_at',
    ],
  },
  contracts: {
    table: 'contracts',
    columns: [
      'id',
      'user_id',
      'client_id',
      'project_id',
      'proposal_id',
      'title',
      'status',
      'body',
      'signed_at',
      'seeded',
      'created_at',
    ],
  },
  time_entries: {
    table: 'time_entries',
    columns: [
      'id',
      'user_id',
      'project_id',
      'client_id',
      'description',
      'start_time',
      'end_time',
      'duration_minutes',
      'billable',
      'invoiced',
      'seeded',
    ],
  },
  invoices: {
    table: 'invoices',
    columns: [
      'id',
      'user_id',
      'client_id',
      'project_id',
      'invoice_number',
      'status',
      'line_items',
      'subtotal',
      'tax_rate',
      'total',
      'due_date',
      'paid_at',
      'notes',
      'currency',
      'seeded',
      'created_at',
    ],
  },
  invoice_payments: {
    table: 'invoice_payments',
    columns: [
      'id',
      'user_id',
      'invoice_id',
      'amount',
      'payment_date',
      'payment_method',
      'reference',
      'notes',
      'created_at',
    ],
  },
  expenses: {
    table: 'expenses',
    columns: [
      'id',
      'user_id',
      'category',
      'description',
      'amount',
      'date',
      'recurring',
      'frequency',
      'seeded',
    ],
  },
  milestones: {
    table: 'milestones',
    columns: [
      'id',
      'user_id',
      'project_id',
      'title',
      'due_date',
      'completed',
      'invoice_on_completion',
    ],
  },
  recurring_invoices: {
    table: 'recurring_invoices',
    columns: [
      'id',
      'user_id',
      'client_id',
      'project_id',
      'title',
      'frequency',
      'line_items',
      'subtotal',
      'tax_rate',
      'total',
      'notes',
      'active',
      'next_due',
      'last_generated',
      'last_catch_up_warning',
      'seeded',
      'created_at',
    ],
  },
  user_profile: {
    table: 'user_profile',
    columns: [
      'id',
      'name',
      'email',
      'hourly_rate',
      'currency',
      'writing_voice',
      'tax_rate',
      'payment_terms',
      'tagline',
      'always_include',
      'writing_style',
      'theme',
      // Legacy license fields are deliberately excluded from backups.
      'ai_enabled',
      'profession',
      'custom_archetype_config',
      'density',
      'accent_color',
      'proposal_expiry_days',
      'exchange_rates',
    ],
  },
  communications: {
    table: 'communications',
    columns: ['id', 'user_id', 'client_id', 'type', 'summary', 'date', 'created_at'],
  },
  follow_up_log: {
    table: 'follow_up_log',
    columns: [
      'id',
      'user_id',
      'entity_type',
      'entity_id',
      'stage',
      'status',
      'drafted_at',
      'actioned_at',
      'action',
    ],
  },
  attachments: {
    table: 'attachments',
    columns: [
      'id',
      'user_id',
      'entity_type',
      'entity_id',
      'filename',
      'file_path',
      'mime_type',
      'size_bytes',
      'tags',
      'notes',
      'created_at',
    ],
  },
  metric_definitions: {
    table: 'metric_definitions',
    columns: [
      'id',
      'user_id',
      'client_id',
      'name',
      'metric_type',
      'unit_label',
      'is_headline',
      'sort_order',
      'created_at',
    ],
  },
  metric_values: {
    table: 'metric_values',
    columns: [
      'id',
      'user_id',
      'definition_id',
      'client_id',
      'value',
      'period',
      'notes',
      'created_at',
    ],
  },
  metric_templates: {
    table: 'metric_templates',
    columns: ['id', 'name', 'definitions_json', 'created_at'],
  },
  achievements: {
    table: 'achievements',
    columns: ['id', 'key', 'unlocked_at'],
  },
  project_templates: {
    table: 'project_templates',
    columns: [
      'id',
      'name',
      'description',
      'default_budget',
      'default_status',
      'is_default',
      'created_at',
    ],
  },
  project_template_milestones: {
    table: 'project_template_milestones',
    columns: ['id', 'template_id', 'title', 'days_from_start', 'invoice_on_completion'],
  },
  export_templates: {
    table: 'export_templates',
    columns: [
      'id',
      'user_id',
      'name',
      'type',
      'header',
      'footer',
      'sections',
      'color_scheme',
      'created_at',
    ],
  },
  contract_templates: {
    table: 'contract_templates',
    columns: ['id', 'name', 'category', 'body', 'variables', 'created_at'],
  },
  archetype_render_log: {
    table: 'archetype_render_log',
    columns: [
      'id',
      'user_id',
      'project_id',
      'pass_name',
      'duration_minutes',
      'software',
      'frame_range',
      'notes',
      'created_at',
    ],
  },
  archetype_sessions: {
    table: 'archetype_sessions',
    columns: [
      'id',
      'user_id',
      'client_id',
      'project_id',
      'session_type',
      'duration_minutes',
      'notes',
      'action_items',
      'next_session_date',
      'created_at',
    ],
  },
  archetype_shoots: {
    table: 'archetype_shoots',
    columns: [
      'id',
      'user_id',
      'project_id',
      'shoot_date',
      'location',
      'shoot_type',
      'camera_system',
      'hours_on_location',
      'conditions_notes',
      'created_at',
    ],
  },
  archetype_revisions: {
    table: 'archetype_revisions',
    columns: [
      'id',
      'user_id',
      'project_id',
      'round_number',
      'change_summary',
      'approved',
      'created_at',
    ],
  },
  archetype_builds: {
    table: 'archetype_builds',
    columns: ['id', 'user_id', 'project_id', 'version', 'platform', 'notes', 'created_at'],
  },
  archetype_keywords: {
    table: 'archetype_keywords',
    columns: [
      'id',
      'user_id',
      'client_id',
      'keyword',
      'position_start',
      'position_current',
      'target_position',
      'created_at',
    ],
  },
  archetype_datasets: {
    table: 'archetype_datasets',
    columns: [
      'id',
      'user_id',
      'project_id',
      'dataset_name',
      'source',
      'size_bytes',
      'format_type',
      'license_type',
      'created_at',
    ],
  },
  import_log: {
    table: 'import_log',
    columns: [
      'id',
      'user_id',
      'filename',
      'file_type',
      'file_path',
      'detected_type',
      'target_entity',
      'target_id',
      'status',
      'error_message',
      'imported_at',
    ],
  },
  app_events: {
    table: 'app_events',
    columns: ['id', 'event_type', 'payload', 'created_at'],
  },
  kanban_boards: {
    table: 'kanban_boards',
    columns: ['id', 'project_id', 'name', 'created_at'],
  },
  kanban_columns: {
    table: 'kanban_columns',
    columns: ['id', 'board_id', 'name', 'color', 'sort_order', 'wip_limit', 'created_at'],
  },
  kanban_cards: {
    table: 'kanban_cards',
    columns: [
      'id',
      'column_id',
      'project_id',
      'title',
      'description',
      'priority',
      'hours_estimated',
      'hours_actual',
      'due_date',
      'labels',
      'assignee',
      'sort_order',
      'created_at',
    ],
  },
};

type LanceDb = Awaited<ReturnType<typeof import('../db').getDb>>;
type InsertMapping = { table: string; columns: string[] };

/** Walk the envelope's OWN keys, hand-listed tables first in dependency order. */
function orderBackupTableNames(data: Record<string, unknown[]>): string[] {
  return Object.keys(data)
    .filter((name) => name !== 'schema_version' && name !== 'sqlite_sequence')
    .sort((a, b) => {
      const ai = TABLE_ORDER.indexOf(a);
      const bi = TABLE_ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
}

/** Clear tables in reverse dependency order for a replace import. */
async function clearTablesForReplace(db: LanceDb, present: string[]): Promise<void> {
  for (const tableName of present) {
    const mapping = TABLE_INSERT_MAP[tableName];
    try {
      await db.execute(`DELETE FROM ${mapping ? mapping.table : tableName}`);
    } catch {
      /* table may not exist in this app version */
    }
  }
}

/** Coerce record values to SQL params, re-keying unmapped tables. */
function prepareRecordValues(record: unknown, columns: string[], offsetId: number): unknown[] {
  const values = columns.map((col) => {
    const val = (record as Record<string, unknown>)[col];
    if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
      return JSON.stringify(val);
    }
    return val ?? null;
  });
  if (offsetId > 0) {
    const idIdx = columns.indexOf('id');
    if (idIdx !== -1 && typeof values[idIdx] === 'number') {
      values[idIdx] = (values[idIdx] as number) + offsetId;
    }
  }
  return values;
}

/** Import one record; returns true only when a row was actually written. */
async function importBackupRecord(
  db: LanceDb,
  tableName: string,
  mapping: InsertMapping | undefined,
  columns: string[],
  offsetId: number,
  record: unknown,
  result: ImportResult,
): Promise<boolean> {
  try {
    const values = prepareRecordValues(record, columns, offsetId);

    if (tableName === 'user_profile' && mapping) {
      await upsertUserProfile(values, mapping.columns);
      return true;
    }

    if (columns.length === 0) return false;
    const targetTable = mapping ? mapping.table : tableName;
    const placeholders = columns.map(() => '?').join(', ');
    const columnsStr = columns.join(', ');

    try {
      await db.execute(
        `INSERT INTO ${targetTable} (${columnsStr}) VALUES (${placeholders})`,
        values,
      );
      return true;
    } catch (insertErr) {
      const msg = errorMessage(insertErr);
      if (msg.includes('UNIQUE constraint') || msg.includes('PRIMARY KEY')) {
        result.skipped++;
      } else {
        result.failed++;
        result.errors.push(`${tableName}[${(record as Record<string, unknown>).id}]: ${msg}`);
      }
      return false;
    }
  } catch (err) {
    result.failed++;
    result.errors.push(`${tableName}: ${errorMessage(err)}`);
    return false;
  }
}

/** Import all records of one table, counting one write per written table. */
async function importBackupTable(
  db: LanceDb,
  tableName: string,
  records: unknown,
  result: ImportResult,
): Promise<void> {
  if (!records || !Array.isArray(records) || records.length === 0) return;

  const mapping = TABLE_INSERT_MAP[tableName];
  let tableWritten = false;
  // No hand-written mapping: one of the ~136 archetype tables. Derive columns
  // from the first record and re-key ids so a restore cannot collide.
  const columns = mapping?.columns ?? inferColumns(records[0]);
  let offsetId = 0;
  if (!mapping && columns.length > 0) {
    offsetId = await maxNumericId(db, tableName, columns);
  }

  for (const record of records) {
    const written = await importBackupRecord(
      db,
      tableName,
      mapping,
      columns,
      offsetId,
      record,
      result,
    );
    if (written) {
      result.imported++;
      if (!tableWritten) {
        tableWritten = true;
        result.tablesWritten++;
      }
    }
  }
}

export async function performImport(
  envelope: BackupEnvelope,
  mode: 'additive' | 'replace',
  materializeBlob?: BlobMaterializer,
): Promise<ImportResult> {
  const { getDb } = await import('../db');
  const db = await getDb();

  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    tablesWritten: 0,
    blobsRestored: 0,
    blobsSkipped: 0,
  };

  await db.execute('BEGIN TRANSACTION');

  try {
    const present = orderBackupTableNames(envelope.data ?? {});
    if (mode === 'replace') {
      await clearTablesForReplace(db, present);
    }
    for (const tableName of present) {
      await importBackupTable(db, tableName, envelope.data[tableName], result);
    }
    await db.execute('COMMIT');
  } catch (err) {
    try {
      await db.execute('ROLLBACK');
    } catch {
      /* ignore */
    }
    result.failed += result.imported;
    result.imported = 0;
    result.tablesWritten = 0;
    result.errors.push(`Transaction rolled back: ${errorMessage(err)}`);
  }

  // File bytes ride outside the transaction: a failed thumbnail must never
  // roll back the business data, and rows exist by now in both modes.
  await restoreAttachmentBlobs(envelope, materializeBlob, result);

  return result;
}

/**
 * Write exported blob bytes back to storage and point each attachment row
 * at the restored file. Without a materializer (or without blobs in the
 * envelope) rows keep whatever file_path they carried, metadata intact,
 * bytes wherever they were.
 */
async function restoreAttachmentBlobs(
  envelope: BackupEnvelope,
  materialize: BlobMaterializer | undefined,
  result: ImportResult,
): Promise<void> {
  const raw = envelope.data[ATTACHMENT_BLOB_TABLE];
  if (!Array.isArray(raw) || raw.length === 0) return;
  if (!materialize) {
    result.blobsSkipped += raw.length;
    return;
  }
  const { getDb } = await import('../db');
  const db = await getDb();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      result.blobsSkipped++;
      continue;
    }
    const blob = entry as Record<string, unknown>;
    if (typeof blob.id !== 'string' || typeof blob.data !== 'string') {
      result.blobsSkipped++;
      continue;
    }
    try {
      const bytes = base64ToBytes(blob.data);
      if (bytes.length === 0 || bytes.length > ATTACHMENT_BLOB_MAX_PER_FILE) {
        result.blobsSkipped++;
        continue;
      }
      const filePath = await materialize(
        blob.id,
        bytes,
        typeof blob.mime_type === 'string' ? blob.mime_type : 'application/octet-stream',
        typeof blob.filename === 'string' ? blob.filename : 'file',
      );
      await db.execute('UPDATE attachments SET file_path = ? WHERE id = ?', [filePath, blob.id]);
      result.blobsRestored++;
    } catch {
      result.blobsSkipped++;
    }
  }
}

export function formatTableCounts(counts: Record<string, number>): string {
  const labels: Record<string, string> = {
    clients: 'clients',
    projects: 'projects',
    proposals: 'proposals',
    contracts: 'contracts',
    time_entries: 'time entries',
    invoices: 'invoices',
    expenses: 'expenses',
    milestones: 'milestones',
    recurring_invoices: 'recurring invoices',
    user_profile: 'user profiles',
    invoice_payments: 'invoice payments',
    communications: 'communications',
    follow_up_log: 'follow-up logs',
    attachments: 'attachments',
    metric_definitions: 'metric definitions',
    metric_values: 'metric values',
    achievements: 'achievements',
    project_templates: 'project templates',
    project_template_milestones: 'project template milestones',
    export_templates: 'export templates',
    contract_templates: 'contract templates',
    attachment_blobs: 'attachment files',
  };

  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([table, count]) => `${count} ${labels[table] || table}`)
    .join(', ');
}

export async function logVersionEvent(
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute('INSERT INTO app_events (event_type, payload) VALUES (?, ?)', [
      eventType,
      JSON.stringify(payload),
    ]);
  } catch {
    /* non-critical */
  }
}

export async function saveProfileForImport(profile: UserProfile): Promise<void> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  await tauriInvoke('upsert_user_profile', { payload: profile });
}

async function upsertUserProfile(values: unknown[], columns: string[]): Promise<void> {
  const { getDb } = await import('../db');
  const db = await getDb();
  const setClauses = columns
    .filter((col) => col !== 'id')
    .map((col) => `${col} = excluded.${col}`)
    .join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const columnsStr = columns.join(', ');
  await db.execute(
    `INSERT INTO user_profile (${columnsStr}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${setClauses}`,
    values,
  );
}

/** True when the configured frequency's interval has elapsed (or no run yet). */
function shouldRunBackup(frequency: string, lastBackupAt: string | null, now: Date): boolean {
  if (!lastBackupAt) return true;
  const diffMs = now.getTime() - new Date(lastBackupAt).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  let skip = false;
  switch (frequency) {
    case 'daily':
      if (diffHours < 24) skip = true;
      break;
    case 'weekly':
      if (diffHours < 24 * 7) skip = true;
      break;
    case 'monthly':
      if (diffHours < 24 * 30) skip = true;
      break;
  }
  return !skip;
}

export async function runAutoBackup(): Promise<{ success: boolean; error?: string }> {
  try {
    const { getDb } = await import('../db');
    const db = await getDb();

    const rows = await db.select<
      {
        enabled: number;
        frequency: string;
        backup_path: string;
        last_backup_at: string | null;
      }[]
    >('SELECT enabled, frequency, backup_path, last_backup_at FROM auto_backup_state LIMIT 1');

    if (!rows || rows.length === 0 || !rows[0].enabled) {
      return { success: true };
    }

    const { frequency, backup_path, last_backup_at: lastBackupAt } = rows[0];

    if (!backup_path) {
      await db.execute('UPDATE auto_backup_state SET last_backup_error = ? WHERE id = 1', [
        'No backup path configured',
      ]);
      return { success: false, error: 'No backup path configured' };
    }

    const now = new Date();
    if (!shouldRunBackup(frequency, lastBackupAt, now)) return { success: true };

    const data: Record<string, unknown[]> = await fetchBackupTables();

    const { getVersion } = await import('@tauri-apps/api/app');
    const APP_VERSION = await getVersion();
    const { getCurrentSchemaVersion } = await import('../db');
    const schemaVersion = getCurrentSchemaVersion();
    const envelope = createExportEnvelope(data, APP_VERSION, schemaVersion);

    const dateStr = now.toISOString().split('T')[0];
    const filename = `lance-backup-${dateStr}.json`;
    const { writeFile, mkdir, exists } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');

    const dirExists = await exists(backup_path);
    if (!dirExists) {
      await mkdir(backup_path, { recursive: true });
    }

    const filePath = await join(backup_path, filename);
    const json = JSON.stringify(envelope, null, 2);
    await writeFile(filePath, new TextEncoder().encode(json));

    await db.execute(
      'UPDATE auto_backup_state SET last_backup_at = ?, last_backup_error = NULL WHERE id = 1',
      [now.toISOString()],
    );

    await cleanupOldBackups(backup_path);

    return { success: true };
  } catch (err) {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      await db.execute('UPDATE auto_backup_state SET last_backup_error = ? WHERE id = 1', [
        errorMessage(err),
      ]);
    } catch {
      /* non-critical */
    }
    return { success: false, error: errorMessage(err) };
  }
}

async function cleanupOldBackups(dirPath: string): Promise<void> {
  try {
    const { readDir, remove } = await import('@tauri-apps/plugin-fs');
    const entries = await readDir(dirPath);
    const backupFiles = entries
      .filter((e) => e.name && e.name.startsWith('lance-backup-') && e.name.endsWith('.json'))
      .sort((a, b) => (b.name || '').localeCompare(a.name || ''));

    while (backupFiles.length > 10) {
      const oldest = backupFiles.pop();
      if (oldest?.name) {
        const { join } = await import('@tauri-apps/api/path');
        const filePath = await join(dirPath, oldest.name);
        try {
          await remove(filePath);
        } catch {
          /* non-critical */
        }
      }
    }
  } catch {
    /* non-critical */
  }
}

export async function getLastBackupInfo(): Promise<{
  enabled: boolean;
  last_backup_at: string | null;
  last_backup_error: string | null;
} | null> {
  try {
    const { getDb } = await import('../db');
    const db = await getDb();
    const rows = await db.select<
      {
        enabled: number;
        last_backup_at: string | null;
        last_backup_error: string | null;
      }[]
    >('SELECT enabled, last_backup_at, last_backup_error FROM auto_backup_state LIMIT 1');

    if (!rows || rows.length === 0) return null;
    return {
      enabled: !!rows[0].enabled,
      last_backup_at: rows[0].last_backup_at,
      last_backup_error: rows[0].last_backup_error,
    };
  } catch {
    return null;
  }
}
