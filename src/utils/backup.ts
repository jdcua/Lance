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
}

export interface AutoBackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  backup_path: string;
}

export function createExportEnvelope(
  data: Record<string, unknown[]>,
  version: string,
  schemaVersion: number
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
    if (!Array.isArray(value)) {
      return { valid: false, error: `Invalid data for table "${key}": expected an array` };
    }
    if (value.length > 0) {
      const first = value[0] as Record<string, unknown>;
      // user_profile is a singleton row and may predate the id column —
      // its shape check below is the real gate, not a generic id.
      if (key !== 'user_profile' && !first.id) {
        return { valid: false, error: `Invalid record in "${key}": missing "id" field` };
      }
      try {
        validateTableShape(key, first);
      } catch (e) {
        return { valid: false, error: (e as Error)?.message || `Invalid record in "${key}"` };
      }
    }
    tableCounts[key] = value.length;
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
 * Read every user table via the db layer (works in Tauri and browser).
 * Missing tables yield []. share_tokens is browser-only (no SQLite table):
 * included best-effort, skipped on restore (no mapping by design).
 */
export async function fetchBackupTables(): Promise<Record<string, unknown[]>> {
  const { getDb } = await import('../db');
  const db = await getDb();
  const data: Record<string, unknown[]> = {};
  for (const table of [...TABLE_ORDER, 'share_tokens']) {
    try {
      const rows = await db.select<Record<string, unknown>[]>(`SELECT * FROM ${table}`);
      data[table] = Array.isArray(rows) ? rows : [];
    } catch {
      data[table] = [];
    }
  }
  return data;
}

export const TABLE_INSERT_MAP: Record<string, { table: string; columns: string[] }> = {
  clients: {
    table: 'clients',
    columns: ['id', 'user_id', 'name', 'email', 'phone', 'company', 'notes', 'preferred_currency', 'seeded', 'created_at'],
  },
  projects: {
    table: 'projects',
    columns: ['id', 'user_id', 'client_id', 'title', 'status', 'start_date', 'end_date', 'budget', 'notes', 'color', 'seeded', 'created_at'],
  },
  proposals: {
    table: 'proposals',
    columns: ['id', 'user_id', 'client_id', 'project_id', 'title', 'status', 'scope', 'timeline', 'rate', 'rate_type', 'body', 'sent_at', 'expires_at', 'seeded', 'created_at'],
  },
  contracts: {
    table: 'contracts',
    columns: ['id', 'user_id', 'client_id', 'project_id', 'proposal_id', 'title', 'status', 'body', 'signed_at', 'seeded', 'created_at'],
  },
  time_entries: {
    table: 'time_entries',
    columns: ['id', 'user_id', 'project_id', 'client_id', 'description', 'start_time', 'end_time', 'duration_minutes', 'billable', 'invoiced', 'seeded'],
  },
  invoices: {
    table: 'invoices',
    columns: ['id', 'user_id', 'client_id', 'project_id', 'invoice_number', 'status', 'line_items', 'subtotal', 'tax_rate', 'total', 'due_date', 'paid_at', 'notes', 'currency', 'seeded', 'created_at'],
  },
  invoice_payments: {
    table: 'invoice_payments',
    columns: ['id', 'user_id', 'invoice_id', 'amount', 'payment_date', 'payment_method', 'reference', 'notes', 'created_at'],
  },
  expenses: {
    table: 'expenses',
    columns: ['id', 'user_id', 'category', 'description', 'amount', 'date', 'recurring', 'frequency', 'seeded'],
  },
  milestones: {
    table: 'milestones',
    columns: ['id', 'user_id', 'project_id', 'title', 'due_date', 'completed', 'invoice_on_completion'],
  },
  recurring_invoices: {
    table: 'recurring_invoices',
    columns: ['id', 'user_id', 'client_id', 'project_id', 'title', 'frequency', 'line_items', 'subtotal', 'tax_rate', 'total', 'notes', 'active', 'next_due', 'last_generated', 'last_catch_up_warning', 'seeded', 'created_at'],
  },
  user_profile: {
    table: 'user_profile',
    columns: ['id', 'name', 'email', 'hourly_rate', 'currency', 'writing_voice', 'tax_rate', 'payment_terms', 'tagline', 'always_include', 'writing_style', 'theme', 'license_key', 'licensed_at', 'ai_enabled', 'profession', 'custom_archetype_config', 'density', 'accent_color', 'proposal_expiry_days', 'exchange_rates'],
  },
  communications: {
    table: 'communications',
    columns: ['id', 'user_id', 'client_id', 'type', 'summary', 'date', 'created_at'],
  },
  follow_up_log: {
    table: 'follow_up_log',
    columns: ['id', 'user_id', 'entity_type', 'entity_id', 'stage', 'status', 'drafted_at', 'actioned_at', 'action'],
  },
  attachments: {
    table: 'attachments',
    columns: ['id', 'user_id', 'entity_type', 'entity_id', 'filename', 'file_path', 'mime_type', 'size_bytes', 'tags', 'notes', 'created_at'],
  },
  metric_definitions: {
    table: 'metric_definitions',
    columns: ['id', 'user_id', 'client_id', 'name', 'metric_type', 'unit_label', 'is_headline', 'sort_order', 'created_at'],
  },
  metric_values: {
    table: 'metric_values',
    columns: ['id', 'user_id', 'definition_id', 'client_id', 'value', 'period', 'notes', 'created_at'],
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
    columns: ['id', 'name', 'description', 'default_budget', 'default_status', 'is_default', 'created_at'],
  },
  project_template_milestones: {
    table: 'project_template_milestones',
    columns: ['id', 'template_id', 'title', 'days_from_start', 'invoice_on_completion'],
  },
  export_templates: {
    table: 'export_templates',
    columns: ['id', 'user_id', 'name', 'type', 'header', 'footer', 'sections', 'color_scheme', 'created_at'],
  },
  contract_templates: {
    table: 'contract_templates',
    columns: ['id', 'name', 'category', 'body', 'variables', 'created_at'],
  },
  archetype_render_log: {
    table: 'archetype_render_log',
    columns: ['id', 'user_id', 'project_id', 'pass_name', 'duration_minutes', 'software', 'frame_range', 'notes', 'created_at'],
  },
  archetype_sessions: {
    table: 'archetype_sessions',
    columns: ['id', 'user_id', 'client_id', 'project_id', 'session_type', 'duration_minutes', 'notes', 'action_items', 'next_session_date', 'created_at'],
  },
  archetype_shoots: {
    table: 'archetype_shoots',
    columns: ['id', 'user_id', 'project_id', 'shoot_date', 'location', 'shoot_type', 'camera_system', 'hours_on_location', 'conditions_notes', 'created_at'],
  },
  archetype_revisions: {
    table: 'archetype_revisions',
    columns: ['id', 'user_id', 'project_id', 'round_number', 'change_summary', 'approved', 'created_at'],
  },
  archetype_builds: {
    table: 'archetype_builds',
    columns: ['id', 'user_id', 'project_id', 'version', 'platform', 'notes', 'created_at'],
  },
  archetype_keywords: {
    table: 'archetype_keywords',
    columns: ['id', 'user_id', 'client_id', 'keyword', 'position_start', 'position_current', 'target_position', 'created_at'],
  },
  archetype_datasets: {
    table: 'archetype_datasets',
    columns: ['id', 'user_id', 'project_id', 'dataset_name', 'source', 'size_bytes', 'format_type', 'license_type', 'created_at'],
  },
  import_log: {
    table: 'import_log',
    columns: ['id', 'user_id', 'filename', 'file_type', 'file_path', 'detected_type', 'target_entity', 'target_id', 'status', 'error_message', 'imported_at'],
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
    columns: ['id', 'column_id', 'project_id', 'title', 'description', 'priority', 'hours_estimated', 'hours_actual', 'due_date', 'labels', 'assignee', 'sort_order', 'created_at'],
  },
};

export async function performImport(
  envelope: BackupEnvelope,
  mode: 'additive' | 'replace'
): Promise<ImportResult> {
  const { getDb } = await import('../db');
  const db = await getDb();

  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    tablesWritten: 0,
  };

  await db.execute('BEGIN TRANSACTION');

  try {
    if (mode === 'replace') {
      for (const tableName of TABLE_ORDER) {
        const mapping = TABLE_INSERT_MAP[tableName];
        if (mapping) {
          try {
            await db.execute(`DELETE FROM ${mapping.table}`);
          } catch {
            /* table may not exist yet */
          }
        }
      }
    }

    for (const tableName of TABLE_ORDER) {
      const records = envelope.data[tableName];
      if (!records || !Array.isArray(records) || records.length === 0) continue;

      const mapping = TABLE_INSERT_MAP[tableName];
      if (!mapping) continue;

      let tableWritten = false;

      for (const record of records) {
        try {
          const values = mapping.columns.map((col) => {
            const val = (record as Record<string, unknown>)[col];
            if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
              return JSON.stringify(val);
            }
            return val ?? null;
          });

          if (tableName === 'user_profile') {
            await upsertUserProfile(values, mapping.columns);
            result.imported++;
            if (!tableWritten) {
              tableWritten = true;
              result.tablesWritten++;
            }
            continue;
          }

          const placeholders = mapping.columns.map(() => '?').join(', ');
          const columnsStr = mapping.columns.join(', ');

          try {
            await db.execute(
              `INSERT INTO ${mapping.table} (${columnsStr}) VALUES (${placeholders})`,
              values
            );
            result.imported++;
            if (!tableWritten) {
              tableWritten = true;
              result.tablesWritten++;
            }
          } catch (insertErr) {
            const msg = (insertErr as Error)?.message || String(insertErr);
            if (msg.includes('UNIQUE constraint') || msg.includes('PRIMARY KEY')) {
              result.skipped++;
            } else {
              result.failed++;
              result.errors.push(`${tableName}[${(record as Record<string, unknown>).id}]: ${msg}`);
            }
          }
        } catch (err) {
          result.failed++;
          result.errors.push(`${tableName}: ${(err as Error)?.message || String(err)}`);
        }
      }
    }

    await db.execute('COMMIT');
  } catch (err) {
    try { await db.execute('ROLLBACK'); } catch { /* ignore */ }
    result.failed += result.imported;
    result.imported = 0;
    result.tablesWritten = 0;
    result.errors.push(`Transaction rolled back: ${(err as Error)?.message || String(err)}`);
  }

  return result;
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
  };

  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([table, count]) => `${count} ${labels[table] || table}`)
    .join(', ');
}

export async function logVersionEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(
      'INSERT INTO app_events (event_type, payload) VALUES (?, ?)',
      [eventType, JSON.stringify(payload)]
    );
  } catch {
    /* non-critical */
  }
}

export async function saveProfileForImport(profile: UserProfile): Promise<void> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  await tauriInvoke('upsert_user_profile', { payload: profile });
}

async function upsertUserProfile(
  values: unknown[],
  columns: string[]
): Promise<void> {
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
    values
  );
}

export async function runAutoBackup(): Promise<{ success: boolean; error?: string }> {
  try {
    const { getDb } = await import('../db');
    const db = await getDb();

    const rows = await db.select<{
      enabled: number;
      frequency: string;
      backup_path: string;
      last_backup_at: string | null;
    }[]>(
      'SELECT enabled, frequency, backup_path, last_backup_at FROM auto_backup_state LIMIT 1'
    );

    if (!rows || rows.length === 0 || !rows[0].enabled) {
      return { success: true };
    }

    const { frequency, backup_path, last_backup_at: lastBackupAt } = rows[0];

    if (!backup_path) {
      await db.execute(
        "UPDATE auto_backup_state SET last_backup_error = ? WHERE id = 1",
        ['No backup path configured']
      );
      return { success: false, error: 'No backup path configured' };
    }

    const now = new Date();
    if (lastBackupAt) {
      const lastDate = new Date(lastBackupAt);
      const diffMs = now.getTime() - lastDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      switch (frequency) {
        case 'daily':
          if (diffHours < 24) return { success: true };
          break;
        case 'weekly':
          if (diffHours < 24 * 7) return { success: true };
          break;
        case 'monthly':
          if (diffHours < 24 * 30) return { success: true };
          break;
      }
    }

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
      [now.toISOString()]
    );

    await cleanupOldBackups(backup_path);

    return { success: true };
  } catch (err) {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      const msg = (err as Error)?.message || String(err);
      await db.execute(
        "UPDATE auto_backup_state SET last_backup_error = ? WHERE id = 1",
        [msg]
      );
    } catch { /* non-critical */ }
    return { success: false, error: (err as Error)?.message || String(err) };
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
    const rows = await db.select<{
      enabled: number;
      last_backup_at: string | null;
      last_backup_error: string | null;
    }[]>('SELECT enabled, last_backup_at, last_backup_error FROM auto_backup_state LIMIT 1');

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
