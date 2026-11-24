/**
 * Browser-mode store boundary hardening.
 *
 * A single malformed row in localStorage used to reach every caller and blow
 * up the first `.status` read, which blanked the Dashboard and the follow-up
 * engine entirely. These lock the boundary behaviour that fixes it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { tauriInvoke } from './tauri';

const KEY = 'lance:store:proposals';

describe('browser-mode store boundary', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('drops null and primitive rows, keeps real ones', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([null, 'garbage', 42, { id: 'p1', status: 'sent' }, undefined]),
    );
    const rows = await tauriInvoke<Array<{ id: string }>>('get_proposals');
    expect(rows).toEqual([{ id: 'p1', status: 'sent' }]);
  });

  it('returns [] when the stored value is an object, not a list', async () => {
    localStorage.setItem(KEY, JSON.stringify({ a: 1 }));
    expect(await tauriInvoke('get_proposals')).toEqual([]);
  });

  it('returns [] when the stored value is unparseable', async () => {
    localStorage.setItem(KEY, '{not json');
    expect(await tauriInvoke('get_proposals')).toEqual([]);
  });

  it('survives a fully nulled store and still reads the rest', async () => {
    localStorage.setItem(KEY, '[null,null]');
    localStorage.setItem('lance:store:clients', JSON.stringify([null, { id: 'c1', name: 'Real' }]));
    expect(await tauriInvoke('get_proposals')).toEqual([]);
    expect(await tauriInvoke<Array<{ id: string }>>('get_clients')).toEqual([
      { id: 'c1', name: 'Real' },
    ]);
  });

  it('sanitises record-shaped stores (follow_up_logs)', async () => {
    localStorage.setItem(
      'lance:store:follow_up_logs',
      JSON.stringify({ 'invoice:i1': [null, { id: 'l1' }], 'invoice:i2': 'not-a-list' }),
    );
    const logs = await tauriInvoke<Array<{ id: string }>>('get_all_follow_up_logs');
    expect(logs).toEqual([{ id: 'l1' }]);
  });
});
