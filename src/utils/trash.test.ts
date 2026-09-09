import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadTrash,
  pushTrashEntry,
  removeTrashEntry,
  clearTrash,
  restoreTrashEntry,
  TRASH_RETENTION_DAYS,
} from './trash';

beforeEach(() => {
  localStorage.clear();
});

describe('trash bin', () => {
  it('pushes and lists entries newest-first', () => {
    pushTrashEntry('clients', 'c1', 'Acme', { id: 'c1', name: 'Acme' });
    pushTrashEntry('invoices', 'i1', 'INV-1', { id: 'i1' });
    const entries = loadTrash();
    expect(entries.length).toBe(2);
    expect(entries[0].table).toBe('invoices');
  });

  it('purges entries past retention', () => {
    pushTrashEntry('clients', 'c1', 'Acme', { id: 'c1', name: 'Acme' });
    const raw = JSON.parse(localStorage.getItem('lance:trash') || '[]');
    raw[0].deletedAt = new Date(Date.now() - (TRASH_RETENTION_DAYS + 1) * 86400000).toISOString();
    localStorage.setItem('lance:trash', JSON.stringify(raw));
    expect(loadTrash().length).toBe(0);
  });

  it('removes a single entry', () => {
    const e = pushTrashEntry('clients', 'c1', 'Acme', { id: 'c1', name: 'Acme' });
    removeTrashEntry(e.trashId);
    expect(loadTrash().length).toBe(0);
  });

  it('clears everything', () => {
    pushTrashEntry('clients', 'c1', 'Acme', { id: 'c1', name: 'Acme' });
    clearTrash();
    expect(loadTrash().length).toBe(0);
  });

  it('restores a row with its original id', async () => {
    const e = pushTrashEntry('clients', 'c1', 'Acme', { id: 'c1', name: 'Acme' });
    await restoreTrashEntry(e);
    const { getDb } = await import('../db');
    const db = await getDb();
    const rows = await db.select<Array<{ id: string; name: string }>>(
      'SELECT id, name FROM clients WHERE id = ?',
      ['c1'],
    );
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Acme');
  });
});
