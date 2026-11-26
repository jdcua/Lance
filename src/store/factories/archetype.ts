/**
 * Archetype domain actions. Six log tables (sessions, shoots, revisions,
 * builds, keywords, datasets) share the same load/create/delete bodies, so
 * one small factory generates them; render logs keep their sanitizing create
 * and keywords keep their bespoke update.
 *
 * Every action reads peers through get() at call time — no captured state.
 */
import type { ArchetypeRenderLog } from '../../types';
import { sanitizeInput } from '../../utils/sanitize';
import { startLoad, endLoad, setError } from '../slices/base';
import type { UnifiedStore } from '../types';
import { invoke, type StoreSet, type StoreGet } from './shared';

export type ArchetypeActions = Pick<
  UnifiedStore,
  | 'loadRenderLogs'
  | 'createRenderLog'
  | 'deleteRenderLog'
  | 'loadSessions'
  | 'createSession'
  | 'deleteSession'
  | 'loadShoots'
  | 'createShoot'
  | 'deleteShoot'
  | 'loadRevisions'
  | 'createRevision'
  | 'deleteRevision'
  | 'loadBuilds'
  | 'createBuild'
  | 'deleteBuild'
  | 'loadKeywords'
  | 'createKeyword'
  | 'updateKeyword'
  | 'deleteKeyword'
  | 'loadDatasets'
  | 'createDataset'
  | 'deleteDataset'
>;

type LogListKey = 'sessions' | 'shoots' | 'revisions' | 'builds' | 'keywords' | 'datasets';
type Item<K extends LogListKey> = UnifiedStore[K][number];

interface LogConfig<K extends LogListKey> {
  key: K;
  loadCommand: string;
  createCommand: string;
  deleteCommand: string;
  /** Only sessions filter their load; the rest call the command with no args. */
  loadArgs?: (clientId?: string, projectId?: string) => Record<string, unknown> | undefined;
}

interface LogCrud<K extends LogListKey> {
  load: (clientId?: string, projectId?: string) => Promise<void>;
  create: (data: Omit<Item<K>, 'id' | 'created_at'>) => Promise<Item<K>>;
  remove: (id: string) => Promise<void>;
}

function createLogCrud<K extends LogListKey>(
  set: StoreSet,
  get: StoreGet,
  config: LogConfig<K>,
): LogCrud<K> {
  const key = config.key;
  const label = `load${key.charAt(0).toUpperCase()}${key.slice(1)} failed:`;
  const list = () => get()[key] as Item<K>[];

  return {
    load: async (clientId, projectId) => {
      startLoad(set, get, key);
      try {
        const rows = await invoke<Item<K>[]>(
          config.loadCommand,
          config.loadArgs?.(clientId, projectId),
        );
        set({ [key]: rows } as Partial<UnifiedStore>);
      } catch (e) {
        console.error(`[store] ${label}`, e);
        setError(set, get, key, String(e));
      } finally {
        endLoad(set, get, key);
      }
    },
    create: async (data) => {
      const item = await invoke<Item<K>>(config.createCommand, { payload: data });
      set({ [key]: [item, ...list()] } as Partial<UnifiedStore>);
      return item;
    },
    remove: async (id) => {
      await invoke(config.deleteCommand, { id });
      set({ [key]: list().filter((x) => x.id !== id) } as Partial<UnifiedStore>);
    },
  };
}

export function createArchetypeActions(set: StoreSet, get: StoreGet): ArchetypeActions {
  const sessions = createLogCrud(set, get, {
    key: 'sessions',
    loadCommand: 'get_sessions',
    createCommand: 'create_session',
    deleteCommand: 'delete_session',
    loadArgs: (clientId, projectId) => ({
      clientId: clientId ?? null,
      projectId: projectId ?? null,
    }),
  });
  const shoots = createLogCrud(set, get, {
    key: 'shoots',
    loadCommand: 'get_all_shoots',
    createCommand: 'create_shoot',
    deleteCommand: 'delete_shoot',
  });
  const revisions = createLogCrud(set, get, {
    key: 'revisions',
    loadCommand: 'get_all_revisions',
    createCommand: 'create_revision',
    deleteCommand: 'delete_revision',
  });
  const builds = createLogCrud(set, get, {
    key: 'builds',
    loadCommand: 'get_all_builds',
    createCommand: 'create_build',
    deleteCommand: 'delete_build',
  });
  const keywords = createLogCrud(set, get, {
    key: 'keywords',
    loadCommand: 'get_all_keywords',
    createCommand: 'create_keyword',
    deleteCommand: 'delete_keyword',
  });
  const datasets = createLogCrud(set, get, {
    key: 'datasets',
    loadCommand: 'get_all_datasets',
    createCommand: 'create_dataset',
    deleteCommand: 'delete_dataset',
  });

  return {
    // Render logs validate at the store boundary (single choke point:
    // addRenderLog delegates here), so their create stays bespoke.
    loadRenderLogs: async () => {
      startLoad(set, get, 'renderLogs');
      try {
        set({ renderLogs: await invoke<ArchetypeRenderLog[]>('get_all_render_logs') });
      } catch (e) {
        console.error('[store] loadRenderLogs failed:', e);
        setError(set, get, 'renderLogs', String(e));
      } finally {
        endLoad(set, get, 'renderLogs');
      }
    },
    createRenderLog: async (data) => {
      const MAX_RENDER_MINUTES = 525600; // 1 year; renders take hours, not eons
      const rawDuration = data.duration_minutes;
      const duration =
        typeof rawDuration === 'number' &&
        isFinite(rawDuration) &&
        rawDuration >= 0 &&
        rawDuration <= MAX_RENDER_MINUTES
          ? Math.floor(rawDuration)
          : undefined;
      const clean = {
        ...data,
        pass_name: data.pass_name ? sanitizeInput(data.pass_name).trim() || undefined : undefined,
        duration_minutes: duration,
        software: data.software ? sanitizeInput(data.software).trim() || undefined : undefined,
        frame_range: data.frame_range
          ? sanitizeInput(data.frame_range).trim() || undefined
          : undefined,
        notes: data.notes ? sanitizeInput(data.notes).trim() || undefined : undefined,
      };
      const log = await invoke<ArchetypeRenderLog>('create_render_log', { payload: clean });
      set({ renderLogs: [log, ...get().renderLogs] });
      return log;
    },
    deleteRenderLog: async (id) => {
      await invoke('delete_render_log', { id });
      set({ renderLogs: get().renderLogs.filter((l) => l.id !== id) });
    },

    loadSessions: sessions.load,
    createSession: sessions.create,
    deleteSession: sessions.remove,

    loadShoots: shoots.load,
    createShoot: shoots.create,
    deleteShoot: shoots.remove,

    loadRevisions: revisions.load,
    createRevision: revisions.create,
    deleteRevision: revisions.remove,

    loadBuilds: builds.load,
    createBuild: builds.create,
    deleteBuild: builds.remove,

    loadKeywords: keywords.load,
    createKeyword: keywords.create,
    updateKeyword: async (id, _clientId, positionCurrent, targetPosition) => {
      await invoke('update_keyword', {
        id,
        positionCurrent: positionCurrent ?? null,
        targetPosition: targetPosition ?? null,
      });
      set({
        keywords: get().keywords.map((k) =>
          k.id === id
            ? {
                ...k,
                position_current: positionCurrent ?? k.position_current,
                target_position: targetPosition ?? k.target_position,
              }
            : k,
        ),
      });
    },
    deleteKeyword: keywords.remove,

    loadDatasets: datasets.load,
    createDataset: datasets.create,
    deleteDataset: datasets.remove,
  };
}
