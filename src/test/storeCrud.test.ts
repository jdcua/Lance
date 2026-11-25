/**
 * Characterization tests for the single store's entity CRUD path in browser
 * mode (store action -> tauri shim -> localStorage). Written before touching
 * the store or the shim so their current behavior stays pinned.
 *
 * Covers the groups later extracted into src/store/factories/: simple CRUD
 * (milestones, expenses) and archetype logs (sessions, keywords).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

const RESET_LISTS = {
  clients: [],
  invoices: [],
  milestones: [],
  expenses: [],
  payments: [],
  sessions: [],
  shoots: [],
  keywords: [],
};

describe('store entity CRUD (browser mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(RESET_LISTS as never);
  });

  it('creates, updates, reloads and deletes a client', async () => {
    const created = await useStore.getState().createClient({
      name: 'Acme',
      email: 'acme@example.com',
    });
    expect(created.name).toBe('Acme');

    await useStore.getState().loadClients();
    expect(useStore.getState().clients.some((c) => c.id === created.id)).toBe(true);

    await useStore.getState().updateClient({ ...created, name: 'Acme Studio' });
    await useStore.getState().loadClients();
    expect(useStore.getState().clients.find((c) => c.id === created.id)?.name).toBe('Acme Studio');

    await useStore.getState().deleteClient(created.id);
    await useStore.getState().loadClients();
    expect(useStore.getState().clients.some((c) => c.id === created.id)).toBe(false);
  });

  it('keeps two clients distinct after a reload', async () => {
    const a = await useStore.getState().createClient({ name: 'A' });
    const b = await useStore.getState().createClient({ name: 'B' });
    await useStore.getState().loadClients();
    const ids = useStore.getState().clients.map((c) => c.id);
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('creates, updates, reloads and deletes a milestone', async () => {
    const created = await useStore.getState().createMilestone({
      project_id: 'p1',
      title: 'Kickoff',
      completed: false,
      invoice_on_completion: false,
    });
    expect(created.title).toBe('Kickoff');

    await useStore.getState().loadMilestones();
    expect(useStore.getState().milestones.some((m) => m.id === created.id)).toBe(true);

    await useStore.getState().updateMilestone({ ...created, title: 'Discovery', completed: true });
    await useStore.getState().loadMilestones();
    const reloaded = useStore.getState().milestones.find((m) => m.id === created.id);
    expect(reloaded?.title).toBe('Discovery');
    expect(reloaded?.completed).toBe(true);

    await useStore.getState().deleteMilestone(created.id);
    await useStore.getState().loadMilestones();
    expect(useStore.getState().milestones.some((m) => m.id === created.id)).toBe(false);
  });

  it('creates, updates, reloads and deletes an expense', async () => {
    const created = await useStore.getState().createExpense({
      category: 'Software',
      description: 'Editor',
      amount: 12,
      date: '2026-01-10',
    });
    expect(created.amount).toBe(12);

    await useStore.getState().loadExpenses();
    expect(useStore.getState().expenses.some((e) => e.id === created.id)).toBe(true);

    await useStore.getState().updateExpense({ ...created, amount: 24 });
    await useStore.getState().loadExpenses();
    expect(useStore.getState().expenses.find((e) => e.id === created.id)?.amount).toBe(24);

    await useStore.getState().deleteExpense(created.id);
    await useStore.getState().loadExpenses();
    expect(useStore.getState().expenses.some((e) => e.id === created.id)).toBe(false);
  });

  it('creates and deletes an archetype session', async () => {
    const created = await useStore.getState().createSession({
      client_id: 'c1',
      session_type: 'Discovery',
    });
    expect(created.session_type).toBe('Discovery');

    await useStore.getState().loadSessions();
    expect(useStore.getState().sessions.some((s) => s.id === created.id)).toBe(true);

    await useStore.getState().deleteSession(created.id);
    await useStore.getState().loadSessions();
    expect(useStore.getState().sessions.some((s) => s.id === created.id)).toBe(false);
  });

  it('creates, updates, reloads and deletes an archetype keyword', async () => {
    const created = await useStore.getState().createKeyword({
      client_id: 'c1',
      keyword: 'lance',
      position_start: 20,
    });
    expect(created.keyword).toBe('lance');

    await useStore.getState().loadKeywords();
    expect(useStore.getState().keywords.some((k) => k.id === created.id)).toBe(true);

    await useStore.getState().updateKeyword(created.id, 'c1', 8, 3);
    await useStore.getState().loadKeywords();
    const reloaded = useStore.getState().keywords.find((k) => k.id === created.id);
    expect(reloaded?.position_current).toBe(8);
    expect(reloaded?.target_position).toBe(3);

    await useStore.getState().deleteKeyword(created.id, 'c1');
    await useStore.getState().loadKeywords();
    expect(useStore.getState().keywords.some((k) => k.id === created.id)).toBe(false);
  });
});
