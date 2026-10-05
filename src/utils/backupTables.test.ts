/**
 * Browser-mode backup coverage.
 *
 * A regression guard for the bug where Export reported success in the browser
 * while dropping every archetype table: sqlite_master does not exist there, so
 * schema discovery has to come from the store keys that hold real rows.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { discoverBackupTables, fetchBackupTables } from './backup';

const KEY = (t: string) => `lance:store:${t}`;

describe('browser-mode backup table discovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('includes the hand-listed core tables even with an empty store', async () => {
    const tables = await discoverBackupTables();
    for (const core of ['clients', 'projects', 'invoices', 'time_entries', 'user_profile']) {
      expect(tables).toContain(core);
    }
  });

  it('discovers an archetype table that only exists in the store', async () => {
    // Exactly the browser-mode case: no SQLite, so the table is invisible to
    // sqlite_master and only reachable through its store key.
    localStorage.setItem(KEY('project_phases'), JSON.stringify([{ id: 'p1' }]));
    const tables = await discoverBackupTables();
    expect(tables).toContain('project_phases');
  });

  it('reports archetype rows in the fetched payload', async () => {
    localStorage.setItem(KEY('project_phases'), JSON.stringify([{ id: 'p1' }, { id: 'p2' }]));
    const data = await fetchBackupTables();
    expect(data.project_phases).toHaveLength(2);
  });

  it('maps an aliased store key back to its schema table name', async () => {
    // archetype_shoots is stored under the short key `shoots`.
    localStorage.setItem(KEY('shoots'), JSON.stringify([{ id: 's1' }]));
    const tables = await discoverBackupTables();
    expect(tables).toContain('archetype_shoots');
    expect(tables).not.toContain('shoots');
  });

  it('excludes derived caches that are not tables', async () => {
    localStorage.setItem(KEY('pending_follow_ups'), JSON.stringify([{ id: 'f1' }]));
    localStorage.setItem(KEY('follow_up_logs'), JSON.stringify({ 'invoice:i1': [{ id: 'l1' }] }));
    const tables = await discoverBackupTables();
    expect(tables).not.toContain('pending_follow_ups');
    expect(tables).not.toContain('follow_up_logs');
  });

  it('never exports schema_version or sqlite_sequence', async () => {
    const tables = await discoverBackupTables();
    expect(tables).not.toContain('schema_version');
    expect(tables).not.toContain('sqlite_sequence');
  });

  it('survives garbage in a store key', async () => {
    localStorage.setItem(KEY('deliverables'), '{not json');
    const tables = await discoverBackupTables();
    expect(Array.isArray(tables)).toBe(true);
    const data = await fetchBackupTables();
    expect(data.deliverables).toEqual([]);
  });
});
