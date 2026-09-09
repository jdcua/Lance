import { describe, it, expect } from 'vitest';
import { BACKUP_TABLES, TABLE_INSERT_MAP, fetchBackupTables } from './backup';

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
