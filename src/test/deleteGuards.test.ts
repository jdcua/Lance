import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

const P = 'lance:store:';
const set = (key: string, rows: unknown[]) => localStorage.setItem(P + key, JSON.stringify(rows));

function seedBase() {
  localStorage.clear();
  useStore.setState({
    clients: [{ id: 'c1', name: 'Acme', created_at: '2026-01-01' }],
    projects: [],
    invoices: [],
    proposals: [],
    contracts: [],
    milestones: [],
    timeEntries: [],
    payments: [],
  } as never);
  set('clients', [{ id: 'c1', name: 'Acme', created_at: '2026-01-01' }]);
  set('projects', []);
  set('invoices', []);
  set('proposals', []);
  set('contracts', []);
  set('milestones', []);
  set('time_entries', []);
  set('invoice_payments', []);
}

describe('delete guards', () => {
  beforeEach(seedBase);

  it('deletes a client with no dependents', async () => {
    await useStore.getState().deleteClient('c1');
    expect(useStore.getState().clients).toHaveLength(0);
  });

  it('blocks client delete with linked records and names them', async () => {
    set('projects', [{ id: 'p1', client_id: 'c1', title: 'Site', created_at: '2026-01-02' }]);
    set('invoices', [
      { id: 'i1', client_id: 'c1', invoice_number: 'INV-1', created_at: '2026-01-03' },
      { id: 'i2', client_id: 'c1', invoice_number: 'INV-2', created_at: '2026-01-04' },
    ]);
    await expect(useStore.getState().deleteClient('c1')).rejects.toThrow(/1 project, 2 invoices/);
    // row untouched
    expect(JSON.parse(localStorage.getItem(P + 'clients') || '[]')).toHaveLength(1);
  });

  it('blocks project delete with milestones or time', async () => {
    set('projects', [{ id: 'p1', client_id: 'c1', title: 'Site', created_at: '2026-01-02' }]);
    set('milestones', [{ id: 'm1', project_id: 'p1', title: 'Kickoff' }]);
    await expect(useStore.getState().deleteProject('p1')).rejects.toThrow(/1 milestone/);
    set('milestones', []);
    set('time_entries', [{ id: 't1', project_id: 'p1', start_time: '2026-01-05' }]);
    await expect(useStore.getState().deleteProject('p1')).rejects.toThrow(/1 time entry/);
  });

  it('blocks invoice delete while payments exist, allows after', async () => {
    set('invoices', [
      { id: 'i1', client_id: 'c1', invoice_number: 'INV-1', created_at: '2026-01-03' },
    ]);
    set('invoice_payments', [{ id: 'pay1', invoice_id: 'i1', amount: 50 }]);
    await expect(useStore.getState().deleteInvoice('i1')).rejects.toThrow(/1 payment/);
    set('invoice_payments', []);
    await useStore.getState().deleteInvoice('i1');
    expect(JSON.parse(localStorage.getItem(P + 'invoices') || '[]')).toHaveLength(0);
  });

  it('blocks deletes when recurring templates point at the record', async () => {
    set('recurring_invoices', [
      {
        id: 'r1',
        client_id: 'c1',
        project_id: 'p1',
        title: 'Retainer',
        frequency: 'monthly',
        active: true,
        next_due: '2026-01-01',
        created_at: '2026-01-01',
      },
    ]);
    await expect(useStore.getState().deleteClient('c1')).rejects.toThrow(/1 recurring invoice/);
    set('projects', [{ id: 'p1', client_id: 'c1', title: 'Site', created_at: '2026-01-02' }]);
    await expect(useStore.getState().deleteProject('p1')).rejects.toThrow(/1 recurring invoice/);
  });

  it('revokes share links when their proposal is deleted', async () => {
    set('proposals', [{ id: 'p9', client_id: 'c1', title: 'Deck', created_at: '2026-01-02' }]);
    set('share_tokens', [
      {
        id: 't1',
        token: 'tok-abc',
        entity_type: 'proposal',
        entity_id: 'p9',
        revoked: false,
        view_count: 0,
        created_at: '2026-01-02',
      },
    ]);
    await useStore.getState().deleteProposal('p9');
    const toks = JSON.parse(localStorage.getItem(P + 'share_tokens') || '[]');
    expect(toks[0].revoked).toBe(true);
  });

  it('retires pending nudges when an invoice is paid', async () => {
    set('invoices', [
      {
        id: 'i1',
        client_id: 'c1',
        invoice_number: 'INV-1',
        status: 'sent',
        total: 100,
        line_items: [],
        created_at: '2026-01-03',
      },
    ]);
    const log = {
      id: 'f1',
      entity_type: 'invoice',
      entity_id: 'i1',
      stage: 2,
      status: 'pending',
      drafted_at: '2026-01-04',
    };
    localStorage.setItem('follow_up_logs', JSON.stringify({ 'invoice:i1': [log] }));
    useStore.setState({
      invoices: [
        {
          id: 'i1',
          client_id: 'c1',
          invoice_number: 'INV-1',
          status: 'sent',
          total: 100,
          line_items: [],
          created_at: '2026-01-03',
        },
      ],
      pendingFollowUps: [log],
      followUpLogs: { 'invoice:i1': [log] },
    } as never);
    await useStore.getState().updateInvoice({
      id: 'i1',
      client_id: 'c1',
      invoice_number: 'INV-1',
      status: 'paid',
      total: 100,
      line_items: [],
      created_at: '2026-01-03',
    } as never);
    expect(useStore.getState().pendingFollowUps).toHaveLength(0);
    expect(useStore.getState().followUpLogs['invoice:i1'][0].status).toBe('paid');
  });

  it('retires pending nudges when a proposal is accepted or deleted', async () => {
    const log = {
      id: 'f2',
      entity_type: 'proposal',
      entity_id: 'p9',
      stage: 1,
      status: 'pending',
      drafted_at: '2026-01-04',
    };
    localStorage.setItem('follow_up_logs', JSON.stringify({ 'proposal:p9': [log] }));
    useStore.setState({
      proposals: [
        { id: 'p9', client_id: 'c1', title: 'Deck', status: 'sent', created_at: '2026-01-02' },
      ],
      pendingFollowUps: [log],
      followUpLogs: { 'proposal:p9': [log] },
    } as never);
    await useStore.getState().updateProposal({
      id: 'p9',
      client_id: 'c1',
      title: 'Deck',
      status: 'accepted',
      created_at: '2026-01-02',
    } as never);
    expect(useStore.getState().pendingFollowUps).toHaveLength(0);
    expect(useStore.getState().followUpLogs['proposal:p9'][0].status).toBe('responded');
  });
});

describe('billed time protection', () => {
  it('blocks deleting time billed on a live invoice, names it', async () => {
    localStorage.setItem(
      'lance:store:invoices',
      JSON.stringify([
        {
          id: 'i9',
          client_id: 'c1',
          invoice_number: 'INV-9',
          status: 'sent',
          total: 100,
          line_items: [
            {
              id: 'l1',
              description: 'W',
              quantity: 1,
              unit_price: 100,
              total: 100,
              time_entry_ids: ['te9'],
            },
          ],
          created_at: '2026-01-01',
        },
      ]),
    );
    localStorage.setItem(
      'lance:store:time_entries',
      JSON.stringify([
        {
          id: 'te9',
          project_id: 'p1',
          start_time: '2026-01-01',
          duration_minutes: 60,
          billable: true,
          invoiced: true,
        },
      ]),
    );
    await expect(useStore.getState().deleteTimeEntry('te9')).rejects.toThrow(/INV-9/);
  });

  it('allows deleting legacy flagged entries with no live link', async () => {
    localStorage.setItem('lance:store:invoices', JSON.stringify([]));
    localStorage.setItem(
      'lance:store:time_entries',
      JSON.stringify([
        {
          id: 'te-old',
          project_id: 'p1',
          start_time: '2026-01-01',
          duration_minutes: 60,
          billable: true,
          invoiced: true,
        },
      ]),
    );
    await useStore.getState().deleteTimeEntry('te-old');
    expect(JSON.parse(localStorage.getItem('lance:store:time_entries') || '[]')).toHaveLength(0);
  });
});
