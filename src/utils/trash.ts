import { TABLE_INSERT_MAP } from './backup';

/**
 * Recently-deleted bin. Every destructive delete snapshots the row here
 * first, so a misclick is recoverable for 30 days. Restore re-inserts the
 * exact row (same id, so surviving relations keep working).
 *
 * Persistence is the same localStorage the browser shim uses, so it works
 * in the app and the browser without a Rust migration. Entries auto-purge
 * past RETENTION_DAYS. Restoring brings back the record itself; rows
 * destroyed by cascade deletes are not reconstructed.
 */

export interface TrashEntry {
  trashId: string;
  table: string;
  entityId: string;
  label: string;
  snapshot: Record<string, unknown>;
  deletedAt: string;
}

const TRASH_KEY = 'lance:trash';
export const TRASH_RETENTION_DAYS = 30;
const TRASH_CAP = 100;

export function trashLabel(table: string, row: Record<string, unknown>): string {
  const r = row as Record<string, unknown>;
  const label =
    (r.name as string) ||
    (r.title as string) ||
    (r.invoice_number as string) ||
    (r.filename as string) ||
    (r.keyword as string) ||
    '';
  return label ? `${label}` : `${table} ${String(r.id || '').slice(0, 8)}`;
}

function readTrash(): TrashEntry[] {
  try {
    const raw = localStorage.getItem(TRASH_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTrash(entries: TrashEntry[]): void {
  try {
    localStorage.setItem(TRASH_KEY, JSON.stringify(entries.slice(0, TRASH_CAP)));
  } catch {
    /* private mode: trash just will not persist */
  }
}

/** Load entries, dropping anything past retention. */
export function loadTrash(): TrashEntry[] {
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 86400000;
  const live = readTrash().filter((e) => {
    const t = new Date(e.deletedAt).getTime();
    return !isNaN(t) && t >= cutoff;
  });
  if (live.length !== readTrash().length) writeTrash(live);
  return live.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

export function pushTrashEntry(
  table: string,
  entityId: string,
  label: string,
  snapshot: Record<string, unknown>,
): TrashEntry {
  const entry: TrashEntry = {
    trashId:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    table,
    entityId,
    label,
    snapshot: { ...snapshot },
    deletedAt: new Date().toISOString(),
  };
  const live = loadTrash();
  writeTrash([entry, ...live]);
  return entry;
}

export function removeTrashEntry(trashId: string): void {
  writeTrash(loadTrash().filter((e) => e.trashId !== trashId));
}

export function clearTrash(): void {
  writeTrash([]);
}

/**
 * Re-insert a trashed row with its original id. Returns the table so the
 * caller can reload that list. Throws when the table has no mapping.
 */
export async function restoreTrashEntry(entry: TrashEntry): Promise<string> {
  const mapping = TABLE_INSERT_MAP[entry.table];
  if (!mapping) throw new Error(`No restore mapping for ${entry.table}`);
  const { getDb } = await import('../db');
  const db = await getDb();
  const values = mapping.columns.map((col) => {
    const val = entry.snapshot[col];
    if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
      return JSON.stringify(val);
    }
    return val ?? null;
  });
  const placeholders = mapping.columns.map(() => '?').join(', ');
  // Plain INSERT (not OR REPLACE): the row was deleted, so the id is free
  // in both SQLite and the browser mock. A conflict surfaces as an error.
  await db.execute(
    `INSERT INTO ${mapping.table} (${mapping.columns.join(', ')}) VALUES (${placeholders})`,
    values,
  );
  return entry.table;
}
