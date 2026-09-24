import { describe, it, expect } from 'vitest';
import { BACKUP_TABLES, TABLE_INSERT_MAP, fetchBackupTables, createExportEnvelope, validateImportEnvelope, performImport } from './backup';

describe('backup completeness', () => {
  it('every backed-up table has a restore mapping', () => {
    for (const table of BACKUP_TABLES) {
      expect(TABLE_INSERT_MAP[table], `restore mapping for ${table}`).toBeDefined();
    }
  });

  it('fetchBackupTables returns an array for every table', async () => {
    const data = await fetchBackupTables();
    for (const table of BACKUP_TABLES) {
      expect(Array.isArray(data[table]), `backup covers ${table}`).toBe(true);
    }
  });
});

describe('backup roundtrip validation', () => {
  it('export envelope validates cleanly', () => {
    const envelope = createExportEnvelope(
      {
        clients: [{ id: 'c1', name: 'Ava', created_at: '2026-01-01' }],
        expenses: [{ id: 'e1', category: 'Software', description: 'Hosting', amount: 9, date: '2026-01-02' }],
      },
      '1.0.0',
      1,
    );
    const result = validateImportEnvelope(JSON.parse(JSON.stringify(envelope)));
    expect(result.valid).toBe(true);
    expect(result.tableCounts).toEqual({ clients: 1, expenses: 1 });
  });

  it('malformed records return an error instead of throwing', () => {
    const envelope = createExportEnvelope(
      { clients: [{ id: 'c1', created_at: '2026-01-01' }] },
      '1.0.0',
      1,
    );
    let result;
    expect(() => { result = validateImportEnvelope(envelope); }).not.toThrow();
    expect(result!.valid).toBe(false);
    expect(result!.error).toMatch(/clients/);
  });

  it('legacy user_profile rows without id still validate', () => {
    const envelope = createExportEnvelope({ user_profile: [{ currency: 'CAD' }] }, '1.0.0', 1);
    const result = validateImportEnvelope(envelope);
    expect(result.valid).toBe(true);
  });

  it('rejects non-backup JSON with a friendly error', () => {
    expect(validateImportEnvelope({ foo: 1 }).valid).toBe(false);
    expect(validateImportEnvelope(null).valid).toBe(false);
    expect(validateImportEnvelope({ lance_backup: true, version: 'x', schema_version: 1, data: { clients: {} } }).valid).toBe(false);
  });

  it('re-importing the same backup skips instead of failing', async () => {
    const envelope = createExportEnvelope(
      { clients: [{ id: 'dup-1', name: 'Ava', created_at: '2026-01-01' }] },
      '1.0.0',
      1,
    );
    const first = await performImport(JSON.parse(JSON.stringify(envelope)), 'additive');
    expect(first.failed).toBe(0);
    expect(first.imported).toBeGreaterThan(0);
    const second = await performImport(JSON.parse(JSON.stringify(envelope)), 'additive');
    expect(second.failed).toBe(0);
    expect(second.imported).toBe(0);
    expect(second.skipped).toBeGreaterThan(0);
  });
});
