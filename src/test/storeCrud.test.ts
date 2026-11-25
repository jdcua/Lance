/**
 * Characterization tests for the single store's entity CRUD path in browser
 * mode (store action -> tauri shim -> localStorage). Written before touching
 * the store or the shim so their current behavior stays pinned.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

describe('store entity CRUD (browser mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ clients: [], invoices: [] } as never);
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
});
