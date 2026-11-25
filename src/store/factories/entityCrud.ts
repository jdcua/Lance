/**
 * Generic CRUD factory for the invoke-backed entities whose load,
 * create, update and delete bodies are identical apart from names.
 *
 * Only milestones and expenses qualify today. Entities with delete guards,
 * line-item parsing or follow-up side effects keep their bespoke actions in
 * the store rather than being squeezed into a config full of one-off flags.
 */
import type { UnifiedStore } from '../types';
import { startLoad, endLoad, setError } from '../slices/base';
import { invoke, snapshotForTrash, type StoreSet, type StoreGet } from './shared';

type SimpleListKey = 'milestones' | 'expenses';
type Item<K extends SimpleListKey> = UnifiedStore[K][number];

interface CrudConfig<K extends SimpleListKey> {
  key: K;
  table: string;
  commands: { load: string; create: string; update: string; delete: string };
}

export interface EntityCrud<K extends SimpleListKey> {
  load: () => Promise<void>;
  create: (data: Omit<Item<K>, 'id'>) => Promise<Item<K>>;
  update: (data: Item<K>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function createEntityCrud<K extends SimpleListKey>(
  set: StoreSet,
  get: StoreGet,
  config: CrudConfig<K>,
): EntityCrud<K> {
  const { key, table, commands } = config;
  const label = `load${key.charAt(0).toUpperCase()}${key.slice(1)} failed:`;
  const list = () => get()[key] as Item<K>[];

  return {
    load: async () => {
      startLoad(set, get, key);
      try {
        set({ [key]: await invoke<Item<K>[]>(commands.load) } as Partial<UnifiedStore>);
      } catch (e) {
        console.error(`[store] ${label}`, e);
        setError(set, get, key, String(e));
      } finally {
        endLoad(set, get, key);
      }
    },
    create: async (data) => {
      const item = await invoke<Item<K>>(commands.create, { payload: data });
      set({ [key]: [...list(), item] } as Partial<UnifiedStore>);
      return item;
    },
    update: async (data) => {
      await invoke(commands.update, { payload: data });
      set({ [key]: list().map((x) => (x.id === data.id ? data : x)) } as Partial<UnifiedStore>);
    },
    remove: async (id) => {
      snapshotForTrash(
        table,
        id,
        list().find((x) => x.id === id),
      );
      await invoke(commands.delete, { id });
      set({ [key]: list().filter((x) => x.id !== id) } as Partial<UnifiedStore>);
    },
  };
}
