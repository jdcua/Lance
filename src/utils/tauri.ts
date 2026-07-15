/**
 * Lance — Tauri runtime detection & browser-mode persistence layer.
 *
 * In browser mode (no __TAURI_INTERNALS__), all Tauri commands are
 * intercepted and backed by localStorage so the app remains fully
 * functional — profile, clients, projects, invoices, etc. all persist
 * across navigation and page refreshes.
 *
 * IMPORTANT: This is an in-memory + localStorage shim. Data survives
 * page reloads but will be lost if localStorage is cleared.
 */

// ── localStorage helpers ──────────────────────────────────────────

const LS_PREFIX = 'lance:store:';

function lsGet<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function lsSet<T>(key: string, data: T[]): void {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(data)); }
  catch { /* quota exceeded or private mode */ }
}

function lsGetSingle<T>(key: string): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : ({} as T);
  } catch { return {} as T; }
}

function lsSetSingle<T>(key: string, data: T): void {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch { /* quota exceeded or private mode */ }
}

// ── Entity registry ───────────────────────────────────────────────

interface EntityDef {
  /** localStorage key for the array of items (undefined for profile). */
  listKey?: string;
  /** If true, the entity is stored as a single object (e.g. profile). */
  isSingleton?: boolean;
  /** local ID field (default 'id'). */
  idField?: string;
}

const ENTITIES: Record<string, EntityDef> = {
  user_profile:    { listKey: 'lance:profile', isSingleton: true },
  client:          { listKey: 'clients' },
  project:         { listKey: 'projects' },
  milestone:       { listKey: 'milestones' },
  proposal:        { listKey: 'proposals' },
  contract:        { listKey: 'contracts' },
  time_entry:      { listKey: 'time_entries' },
  invoice:         { listKey: 'invoices' },
  invoice_payment: { listKey: 'invoice_payments' },
  expense:         { listKey: 'expenses' },
  recurring_invoice: { listKey: 'recurring_invoices' },
  communication:   { listKey: 'communications' },
  import_log:      { listKey: 'import_logs' },
  attachment:      { listKey: 'attachments' },
  metric_definition:     { listKey: 'metric_definitions' },
  metric_value:          { listKey: 'metric_values' },
  headline_metric:       { listKey: 'headline_metrics' },
  metric_template:       { listKey: 'metric_templates' },
  follow_up_log:         { listKey: 'follow_up_logs' },
  render_log:            { listKey: 'render_logs' },
  session:               { listKey: 'sessions' },
  shoot:                 { listKey: 'shoots' },
  revision:              { listKey: 'revisions' },
  build:                 { listKey: 'builds' },
  keyword:               { listKey: 'keywords' },
  dataset:               { listKey: 'datasets' },
  contract_template:     { listKey: 'contract_templates' },
  project_template:      { listKey: 'project_templates' },
  export_template:       { listKey: 'export_templates' },
};

/** Extract entity name from a Tauri command, e.g. "create_client" → "client". */
function cmdEntity(cmd: string): string | null {
  // Pattern: verb_entity (e.g. get_clients, create_client, update_client, delete_client)
  const parts = cmd.split('_');
  // Commands like `get_all_invoice_payments` or `get_all_pending_follow_ups`
  if (parts[0] === 'get' && parts[1] === 'all') {
    // get_all_invoice_payments -> invoice_payments
    const rest = parts.slice(2).join('_');
    // Remove trailing 's' to get entity name
    const entity = rest.endsWith('s') ? rest.slice(0, -1) : rest;
    return entity;
  }
  // get_user_profile -> user_profile
  // create_client -> client
  if (parts.length >= 2) {
    const entity = parts.slice(1).join('_');
    // Remove trailing 's' for list names (get_clients -> clients -> client)
    const singular = entity.endsWith('s') && !entity.endsWith('ss') ? entity.slice(0, -1) : entity;
    return singular;
  }
  return null;
}

/** Map an entity name back to its list-key (plural). */
function listKeyFor(entity: string): string {
  const def = ENTITIES[entity];
  if (def?.isSingleton) return def.listKey!;
  if (def?.listKey) return def.listKey;
  // Fallback: pluralise
  if (entity.endsWith('y')) return entity.slice(0, -1) + 'ies';
  if (entity.endsWith('s') || entity.endsWith('x') || entity.endsWith('ch') || entity.endsWith('sh')) return entity + 'es';
  return entity + 's';
}

// ── Check if running in Tauri webview ──

export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ === 'object'
  );
}

export function isTauriSqlAvailable(): boolean {
  return isTauri();
}

// ── Safe event listener ──

export async function tauriListen<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  if (!isTauri()) {
    console.debug(`[tauri] listen('${event}') skipped — not in Tauri context`);
    return () => {};
  }
  const { listen } = await import('@tauri-apps/api/event');
  return listen<T>(event, (evt) => {
    handler(evt.payload);
  });
}

// ── Safe invoke with localStorage persistence ──

export async function tauriInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauri()) {
    console.debug(`[tauri] invoke('${cmd}') — using localStorage persistence`);
    return handleBrowserMode<T>(cmd, args);
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

// ── Browser-mode persistence engine ──

function handleBrowserMode<T>(cmd: string, args?: Record<string, unknown>): T {
  const verb = cmd.split('_')[0];

  // ── Profile (singleton) ──
  if (cmd === 'get_user_profile') {
    return lsGetSingle<T>('lance:profile');
  }
  if (cmd === 'upsert_user_profile') {
    if (args?.payload) {
      lsSetSingle('lance:profile', args.payload);
    }
    return {} as unknown as T;
  }

  // ── Directory / path commands ──
  if (cmd === 'get_imports_dir' || cmd === 'get_assets_dir') {
    return '' as unknown as T;
  }

  // ── get_asset_stats ──
  if (cmd === 'get_asset_stats') {
    return null as unknown as T;
  }

  // ── get_sessions (special: has optional filters) ──
  if (cmd === 'get_sessions') {
    const all = lsGet<any>('sessions');
    if (args?.clientId || args?.projectId) {
      const filtered = all.filter((s: any) => {
        if (args?.clientId && s.client_id !== args.clientId) return false;
        if (args?.projectId && s.project_id !== args.projectId) return false;
        return true;
      });
      return filtered as unknown as T;
    }
    return all as unknown as T;
  }

  // ── List commands (get_*) ──
  if (verb === 'get') {
    const entity = cmdEntity(cmd);
    if (entity && ENTITIES[entity] && !ENTITIES[entity]!.isSingleton) {
      const key = ENTITIES[entity]!.listKey || listKeyFor(entity);
      return lsGet<any>(key) as unknown as T;
    }
    // Commands like get_milestones, get_invoice_payments (scoped)
    // get_all_invoice_payments, get_all_pending_follow_ups
    // get_communications, get_attachments, get_follow_up_log
    // These are scoped by entityId etc. — return from localStore
    if (entity) {
      const key = ENTITIES[entity]?.listKey || listKeyFor(entity);
      return lsGet<any>(key) as unknown as T;
    }
    // Unknown get command — return empty array/null
    return [] as unknown as T;
  }

  // ── Create commands ──
  if (verb === 'create') {
    const entity = cmdEntity(cmd);
    if (entity && args?.payload) {
      const key = ENTITIES[entity]?.listKey || listKeyFor(entity);
      const payload = args.payload as Record<string, any>;
      // Generate id if missing
      if (!payload.id) {
        payload.id = crypto.randomUUID();
      }
      if (!payload.created_at) {
        payload.created_at = new Date().toISOString();
      }
      const items = lsGet<any>(key);
      items.push(payload);
      lsSet(key, items);
      return payload as unknown as T;
    }
    return {} as unknown as T;
  }

  // ── Update commands ──
  if (verb === 'update') {
    const entity = cmdEntity(cmd);
    if (entity && args?.payload) {
      const key = ENTITIES[entity]?.listKey || listKeyFor(entity);
      const payload = args.payload as Record<string, any>;
      const items = lsGet<any>(key);
      const idx = items.findIndex((i: any) => i.id === payload.id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...payload };
        lsSet(key, items);
      }
    }
    return {} as unknown as T;
  }

  // ── Delete commands ──
  if (verb === 'delete') {
    const entity = cmdEntity(cmd);
    if (entity) {
      const key = ENTITIES[entity]?.listKey || listKeyFor(entity);
      const id = args?.id as string;
      if (id) {
        const items = lsGet<any>(key);
        lsSet(key, items.filter((i: any) => i.id !== id));
      }
    }
    return {} as unknown as T;
  }

  // ── log_* commands (log_follow_up, log_import, etc.) ──
  if (verb === 'log') {
    const entity = cmdEntity(cmd);
    if (entity && args?.payload) {
      const key = ENTITIES[entity]?.listKey || listKeyFor(entity);
      const payload = args.payload as Record<string, any>;
      if (!payload.id) payload.id = crypto.randomUUID();
      if (payload.logged_at === undefined && payload.created_at === undefined) {
        payload.created_at = new Date().toISOString();
      }
      const items = lsGet<any>(key);
      items.unshift(payload);
      lsSet(key, items);
      return payload as unknown as T;
    }
    return {} as unknown as T;
  }

  // ── save_* commands ──
  if (verb === 'save') {
    // save_import_file, save_asset_file — handled by just returning a mock path
    if (cmd === 'save_import_file' || cmd === 'save_asset_file') {
      return `/mock/${args?.filename || 'file'}` as unknown as T;
    }
    return {} as unknown as T;
  }

  // ── rename/move attachment ──
  if (cmd === 'rename_attachment' || cmd === 'move_attachment') {
    const payload = args?.payload as Record<string, any> | undefined;
    if (payload?.id) {
      const items = lsGet<any>('attachments');
      const idx = items.findIndex((a: any) => a.id === payload.id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...payload };
        lsSet('attachments', items);
        return items[idx] as unknown as T;
      }
    }
    return {} as unknown as T;
  }

  if (cmd === 'update_attachment_meta') {
    const payload = args?.payload as Record<string, any> | undefined;
    if (payload?.id) {
      const items = lsGet<any>('attachments');
      const idx = items.findIndex((a: any) => a.id === payload.id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...payload };
        lsSet('attachments', items);
        return items[idx] as unknown as T;
      }
    }
    return {} as unknown as T;
  }

  // ── save_metric_template ──
  if (cmd === 'save_metric_template') {
    const payload = args?.payload as Record<string, any> | undefined;
    if (payload) {
      const id = payload.id || crypto.randomUUID();
      const items = lsGet<any>('metric_templates');
      const existing = items.findIndex((t: any) => t.name === payload.name);
      if (existing !== -1) {
        items[existing] = { ...items[existing], ...payload, id };
      } else {
        items.push({ id, ...payload, created_at: new Date().toISOString() });
      }
      lsSet('metric_templates', items);
    }
    return {} as unknown as T;
  }

  // ── expire_sent_proposals ──
  if (cmd === 'expire_sent_proposals') {
    // In browser mode, no automatic expiry
    return [] as unknown as T;
  }

  // ── Catch-all: return safe default ──
  console.debug(`[tauri] handleBrowserMode: unhandled command "${cmd}"`);
  return {} as unknown as T;
}
