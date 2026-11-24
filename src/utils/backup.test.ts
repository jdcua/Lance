import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Backup completeness.
 *
 * The previous version of this file compared TABLE_ORDER to BACKUP_TABLES, and
 * `export const BACKUP_TABLES = TABLE_ORDER`. Both tests were tautological:
 * setting TABLE_ORDER to [] made them pass vacuously. That is why a Blocker
 * shipped: the export used a hand-maintained list while the archetype feature
 * creates ~136 tables at runtime, so Export reported success and dropped
 * retainers, ledger_entries, bookings, sprint_tasks and everything else.
 *
 * These tests assert against the LIVE schema instead, so adding a table without
 * adding it to the export is caught here.
 */

const createdTables: string[] = [];
let execCalls: string[] = [];

const db = {
  execute: vi.fn(async (sql: string) => {
    execCalls.push(sql);
    return { rowsAffected: 0 };
  }),
  select: vi.fn(async (sql: string): Promise<Record<string, unknown>[]> => {
    execCalls.push(sql);
    if (sql.includes('sqlite_master')) {
      return createdTables.map((name) => ({ name }));
    }
    if (sql.includes('MAX(id)')) return [{ max_id: 100 }];
    return [];
  }),
};

// browserStoreTableNames is what discoverBackupTables falls back to when there
// is no sqlite_master (always, in browser mode). Mocked here so these tests
// stay focused on the SQLite path; src/utils/backupTables.test.ts covers the
// browser-store fallback against the real implementation.
vi.mock('../db', () => ({
  getDb: async () => db,
  browserStoreTableNames: () => [],
}));

async function load() {
  vi.resetModules();
  return import('./backup');
}

beforeEach(() => {
  execCalls = [];
  db.execute.mockClear();
  db.select.mockClear();
});

describe('discoverBackupTables', () => {
  it('includes runtime tables that no hand-written list mentions', async () => {
    // Retainers and ledger_entries hold real money. They exist only because the
    // archetype feature created them, so a static list can never stay correct.
    createdTables.length = 0;
    createdTables.push('retainers', 'ledger_entries', 'bookings', 'sprint_tasks', 'clients');
    const { discoverBackupTables } = await load();
    const found = await discoverBackupTables();
    expect(found).toContain('retainers');
    expect(found).toContain('ledger_entries');
    expect(found).toContain('sprint_tasks');
  });

  it('always includes the core hand-listed tables even with no introspection', async () => {
    createdTables.length = 0;
    db.select.mockImplementationOnce(async () => {
      throw new Error('no sqlite_master');
    });
    const { discoverBackupTables } = await load();
    const found = await discoverBackupTables();
    expect(found).toContain('clients');
    expect(found).toContain('invoices');
    expect(found).toContain('user_profile');
  });

  it('excludes schema bookkeeping that must not travel', async () => {
    createdTables.length = 0;
    createdTables.push('clients', 'schema_version', 'sqlite_sequence');
    const { discoverBackupTables } = await load();
    const found = await discoverBackupTables();
    expect(found).not.toContain('schema_version');
    expect(found).not.toContain('sqlite_sequence');
  });
});

describe('fetchBackupTables', () => {
  it('reads rows for a discovered runtime table', async () => {
    createdTables.length = 0;
    createdTables.push('retainers');
    db.select.mockImplementation(async (sql: string) => {
      if (sql.includes('sqlite_master')) return [{ name: 'retainers' }];
      if (sql.includes('FROM retainers')) return [{ id: 1, rate: 4000, hours_used: 3 }];
      return [];
    });
    const { fetchBackupTables } = await load();
    const data = await fetchBackupTables();
    expect(data.retainers).toEqual([{ id: 1, rate: 4000, hours_used: 3 }]);
  });
});

describe('restore skips schema bookkeeping keys', () => {
  it('does not try to write schema_version', async () => {
    const { performImport } = await load();
    await performImport(
      {
        version: 'test',
        exported_at: new Date().toISOString(),
        data: { schema_version: [{ version: 99 }], clients: [] },
      } as never,
      'additive',
      undefined,
    );
    const wrote = execCalls.filter((s) => /INSERT INTO schema_version/i.test(s));
    expect(wrote).toHaveLength(0);
  });
});
