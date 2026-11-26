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

  it('marks a proposal accepted and records a client response', async () => {
    localStorage.setItem('lance:store:proposals', JSON.stringify([{ id: 'p1', status: 'sent' }]));
    const token = await tauriInvoke<{ token: string }>('create_share_token', {
      payload: { entity_type: 'proposal', entity_id: 'p1' },
    });
    await tauriInvoke('respond_share_token', {
      token: token.token,
      response: 'accepted',
      client_name: 'A Client',
    });
    expect(await tauriInvoke('get_proposals')).toEqual([{ id: 'p1', status: 'accepted' }]);
    const tokens =
      await tauriInvoke<Array<{ client_response: string; client_name: string }>>(
        'get_all_share_tokens',
      );
    expect(tokens[0]).toMatchObject({ client_response: 'accepted', client_name: 'A Client' });
  });

  it('signs a contract through a share response', async () => {
    localStorage.setItem('lance:store:contracts', JSON.stringify([{ id: 'c1' }]));
    const token = await tauriInvoke<{ token: string }>('create_share_token', {
      payload: { entity_type: 'contract', entity_id: 'c1' },
    });
    await tauriInvoke('respond_share_token', {
      token: token.token,
      client_signature: 'Signed',
    });
    const contracts = await tauriInvoke<Array<{ signed_at?: string }>>('get_contracts');
    expect(contracts[0].signed_at).toBeTruthy();
  });

  it('cascades a client delete to client- and project-scoped rows', async () => {
    localStorage.setItem('lance:store:clients', JSON.stringify([{ id: 'c1' }, { id: 'c2' }]));
    localStorage.setItem('lance:store:projects', JSON.stringify([{ id: 'pr1', client_id: 'c1' }]));
    localStorage.setItem(
      'lance:store:proposals',
      JSON.stringify([
        { id: 'p1', client_id: 'c1' },
        { id: 'p2', client_id: 'c2' },
      ]),
    );
    await tauriInvoke('delete_client', { id: 'c1' });
    expect(await tauriInvoke('get_clients')).toEqual([{ id: 'c2' }]);
    expect(await tauriInvoke('get_proposals')).toEqual([{ id: 'p2', client_id: 'c2' }]);
    expect(await tauriInvoke('get_projects')).toEqual([]);
  });
});
