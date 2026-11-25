/**
 * Lance · Tauri runtime detection & browser-mode persistence layer.
 *
 * In browser mode (no __TAURI_INTERNALS__), all Tauri commands are
 * intercepted and backed by localStorage so the app remains fully
 * functional · profile, clients, projects, invoices, etc. all persist
 * across navigation and page refreshes.
 *
 * IMPORTANT: This is an in-memory + localStorage shim. Data survives
 * page reloads but will be lost if localStorage is cleared.
 */

// ── localStorage helpers ──────────────────────────────────────────

const LS_PREFIX = 'lance:store:';

/**
 * A schemaless row in the browser-mode store (parsed JSON).
 * Property reads yield `unknown`, so access sites cast at the point of use.
 */
type StoreRow = Record<string, unknown>;

function lsGet<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return [];
    const val: unknown = JSON.parse(raw);
    // Hand-edited or version-skewed values can be valid JSON of the wrong
    // shape (an object where a list belongs). Return [] instead of letting
    // .find/.filter throw ten frames later.
    if (!Array.isArray(val)) return [];
    // Rows are objects by construction. A null/primitive entry — from a
    // hand-edited store, a partial restore, or a truncated write — used to
    // reach every caller and detonate on the first `.status` read, blanking
    // the whole app (the Dashboard and the follow-up engine both died on a
    // single bad row). Drop the junk at the boundary so no caller has to
    // defend itself, and so one bad row costs you that row, not the session.
    return val.filter((r) => r !== null && typeof r === 'object') as T[];
  } catch {
    return [];
  }
}

/** Object-shaped reads (follow_up_logs): {} instead of [] on wrong shapes. */
function lsGetRecord(key: string): Record<string, StoreRow[]> {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return {};
    const val: unknown = JSON.parse(raw);
    if (!val || typeof val !== 'object' || Array.isArray(val)) return {};
    // Same boundary rule as lsGet: a corrupt key's value must be a list of
    // objects, or the callers iterating it throw.
    const out: Record<string, StoreRow[]> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        out[k] = v.filter((r) => r !== null && typeof r === 'object') as StoreRow[];
      }
    }
    return out;
  } catch {
    return {};
  }
}

function lsSet<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(data));
  } catch {
    /* quota exceeded or private mode */
  }
}

function lsGetSingle<T>(key: string): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : ({} as T);
  } catch {
    return {} as T;
  }
}

function lsSetSingle<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota exceeded or private mode */
  }
}

/** Parse a tags JSON string (or array) safely for browser-mode search. */
function parseTagsBrowser(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags !== 'string') return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  user_profile: { listKey: 'lance:profile', isSingleton: true },
  client: { listKey: 'clients' },
  project: { listKey: 'projects' },
  milestone: { listKey: 'milestones' },
  proposal: { listKey: 'proposals' },
  contract: { listKey: 'contracts' },
  time_entry: { listKey: 'time_entries' },
  invoice: { listKey: 'invoices' },
  invoice_payment: { listKey: 'invoice_payments' },
  expense: { listKey: 'expenses' },
  recurring_invoice: { listKey: 'recurring_invoices' },
  communication: { listKey: 'communications' },
  import_log: { listKey: 'import_logs' },
  attachment: { listKey: 'attachments' },
  metric_definition: { listKey: 'metric_definitions' },
  metric_value: { listKey: 'metric_values' },
  headline_metric: { listKey: 'headline_metrics' },
  metric_template: { listKey: 'metric_templates' },
  follow_up_log: { listKey: 'follow_up_logs' },
  render_log: { listKey: 'render_logs' },
  session: { listKey: 'sessions' },
  shoot: { listKey: 'shoots' },
  revision: { listKey: 'revisions' },
  build: { listKey: 'builds' },
  keyword: { listKey: 'keywords' },
  dataset: { listKey: 'datasets' },
  contract_template: { listKey: 'contract_templates' },
  project_template: { listKey: 'project_templates' },
  export_template: { listKey: 'export_templates' },
  auto_backup_state: { listKey: 'auto_backup_state', isSingleton: true },
  share_token: { listKey: 'share_tokens' },
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
  if (
    entity.endsWith('s') ||
    entity.endsWith('x') ||
    entity.endsWith('ch') ||
    entity.endsWith('sh')
  )
    return entity + 'es';
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
    console.debug(`[tauri] listen('${event}') skipped · not in Tauri context`);
    return () => {};
  }
  const { listen } = await import('@tauri-apps/api/event');
  return listen<T>(event, (evt) => {
    handler(evt.payload);
  });
}

// ── Safe invoke with localStorage persistence ──

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    console.debug(`[tauri] invoke('${cmd}') · using localStorage persistence`);
    return handleBrowserMode<T>(cmd, args);
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

// ── Browser-mode persistence engine ──

function handleGetUserProfile<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  // ── Profile (singleton) ──
  if (cmd === 'get_user_profile') {
    return lsGetSingle<T>('lance:profile');
  }
  return undefined;
}

function handleUpsertUserProfile<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'upsert_user_profile') {
    if (args?.payload) {
      lsSetSingle('lance:profile', args.payload);
    }
    return {} as unknown as T;
  }

  // ── Directory / path commands ──
  return undefined;
}

function handleDirectoryCommands<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'get_imports_dir' || cmd === 'get_assets_dir') {
    return '' as unknown as T;
  }

  // ── update_follow_up_status (persist status into follow_up_logs) ──
  return undefined;
}

function handleUpdateFollowUpStatus<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'update_follow_up_status') {
    const payload = (args?.payload || {}) as Record<string, unknown>;
    if (payload?.id) {
      // follow_up_logs is stored as an object keyed by `entityType:entityId`,
      // each value being an array of logs (lsGet returns the raw parsed value).
      const all = lsGetRecord('follow_up_logs');
      let updated = false;
      for (const key of Object.keys(all || {})) {
        const list: StoreRow[] = all[key];
        if (!Array.isArray(list)) continue;
        const idx = list.findIndex((l: StoreRow) => l && l.id === payload.id);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            status: payload.status ?? list[idx].status,
            action: payload.action ?? list[idx].action,
            actioned_at: payload.actioned_at ?? new Date().toISOString(),
          };
          updated = true;
        }
      }
      if (updated) lsSet('follow_up_logs', all as unknown as StoreRow[]);
      // Also remove from the pending list so it doesn't reappear on reload
      if (updated) {
        const pending = lsGet<StoreRow>('pending_follow_ups');
        const nextPending = pending.filter((l: StoreRow) => !l || l.id !== payload.id);
        lsSet('pending_follow_ups', nextPending);
      }
    }
    return {} as unknown as T;
  }

  // ── get_all_follow_up_logs (bulk: all statuses) ──
  return undefined;
}

function handleGetAllFollowUpLogs<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'get_all_follow_up_logs') {
    // lsGetRecord, not lsGet: follow_up_logs is keyed `type:id`, not a list.
    // lsGet returns [] for a non-array, so this read always produced an empty
    // history in browser mode — the follow-up log rendered blank even after
    // drafts were logged. The cast to Record never made that [] into a record.
    const all = lsGetRecord('follow_up_logs');
    const flat: StoreRow[] = [];
    for (const key of Object.keys(all || {})) {
      const list: StoreRow[] = all[key];
      if (Array.isArray(list)) flat.push(...list);
    }
    return flat as unknown as T;
  }

  // ── get_asset_stats ──
  return undefined;
}

function handleGetAssetStats<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'get_asset_stats') {
    // Browser mode has no asset server, but the rows (with real sizes)
    // are right here — count them instead of returning null.
    const items = lsGet<StoreRow>('attachments');
    let totalSize = 0;
    for (const item of items) {
      const size = Number(item.size_bytes);
      if (Number.isFinite(size) && size > 0) totalSize += size;
    }
    return { total_files: items.length, total_size_bytes: totalSize } as unknown as T;
  }

  // ── Share token / portal commands (browser mode: simulated portal) ──
  return undefined;
}

function handleGetShareServerPort<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'get_share_server_port') {
    // In the packaged Tauri app the share server listens on port 1421.
    // In browser mode there is no separate share server, so report the app's
    // own origin so generated share links point at the running Lance instance.
    if (!isTauri()) {
      const port = window.location.port || '1420';
      return Number(port) as unknown as T;
    }
    return 1421 as unknown as T;
  }
  return undefined;
}

function handleGetAllShareTokens<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'get_all_share_tokens') {
    return lsGet<StoreRow>('share_tokens') as unknown as T;
  }
  return undefined;
}

function handleGetShareTokenForEntity<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'get_share_token_for_entity') {
    const { entityType, entityId } = (args || {}) as { entityType?: string; entityId?: string };
    const tokens = lsGet<StoreRow>('share_tokens');
    const found = tokens.find(
      (t: StoreRow) => t.entity_type === entityType && t.entity_id === entityId && !t.revoked,
    );
    return (found || null) as unknown as T;
  }
  return undefined;
}

function handleCreateShareToken<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'create_share_token') {
    const payload = (args?.payload || {}) as Record<string, unknown>;
    const tokens = lsGet<StoreRow>('share_tokens');
    const token: Record<string, unknown> = {
      id: crypto.randomUUID(),
      token: crypto.randomUUID().replace(/-/g, ''),
      entity_type: payload.entity_type || 'proposal',
      entity_id: payload.entity_id || '',
      expires_at: payload.expires_at || null,
      revoked: false,
      view_count: 0,
      created_at: new Date().toISOString(),
    };
    tokens.push(token);
    lsSet('share_tokens', tokens);
    return token as unknown as T;
  }
  return undefined;
}

function handleRevokeShareToken<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'revoke_share_token') {
    const { token } = (args || {}) as { token?: string };
    const tokens = lsGet<StoreRow>('share_tokens');
    const idx = tokens.findIndex((t: StoreRow) => t.token === token);
    if (idx !== -1) {
      tokens[idx] = { ...tokens[idx], revoked: true };
      lsSet('share_tokens', tokens);
    }
    return {} as unknown as T;
  }
  return undefined;
}

function handleGetShareToken<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'get_share_token') {
    const { token } = (args || {}) as { token?: string };
    const tokens = lsGet<StoreRow>('share_tokens');
    const found = tokens.find((t: StoreRow) => t.token === token && !t.revoked);
    return (found || null) as unknown as T;
  }
  return undefined;
}

function handleRecordShareView<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'record_share_view') {
    const { token } = (args || {}) as { token?: string };
    const tokens = lsGet<StoreRow>('share_tokens');
    const idx = tokens.findIndex((t: StoreRow) => t.token === token && !t.revoked);
    if (idx !== -1) {
      const now = new Date().toISOString();
      tokens[idx] = {
        ...tokens[idx],
        view_count: ((tokens[idx].view_count as number) || 0) + 1,
        viewed_at: tokens[idx].viewed_at || now,
      };
      lsSet('share_tokens', tokens);
    }
    return {} as unknown as T;
  }
  return undefined;
}

function applyContractShareResponse(
  tokens: StoreRow[],
  idx: number,
  t: StoreRow,
  now: string,
  safeSig: string,
): void {
  tokens[idx] = {
    ...t,
    client_response: 'accepted',
    client_response_at: now,
    client_signature: safeSig,
    client_signed_at: now,
  };
  const contracts = lsGet<StoreRow>('contracts');
  const cIdx = contracts.findIndex((c: StoreRow) => c.id === t.entity_id);
  if (cIdx !== -1) {
    contracts[cIdx] = { ...contracts[cIdx], signed_at: now };
    lsSet('contracts', contracts);
  }
}

function applyProposalShareResponse(
  tokens: StoreRow[],
  idx: number,
  t: StoreRow,
  now: string,
  safeName: string,
  response?: string,
): void {
  tokens[idx] = {
    ...t,
    client_response: response === 'declined' ? 'declined' : 'accepted',
    client_response_at: now,
    client_name: safeName,
  };
  if (response === 'accepted') {
    const proposals = lsGet<StoreRow>('proposals');
    const pIdx = proposals.findIndex((p: StoreRow) => p.id === t.entity_id);
    if (pIdx !== -1) {
      proposals[pIdx] = { ...proposals[pIdx], status: 'accepted' };
      lsSet('proposals', proposals);
    }
  }
}

function handleRespondShareToken<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  _verb: string,
): T | undefined {
  if (cmd === 'respond_share_token') {
    const payload = (args || {}) as Record<string, string | undefined>;
    const tokens = lsGet<StoreRow>('share_tokens');
    const idx = tokens.findIndex((t: StoreRow) => t.token === payload.token && !t.revoked);
    if (idx === -1) throw new Error('Share link not found.');
    const t = tokens[idx];
    if (t.client_response) throw new Error('You have already responded to this.');
    if (t.expires_at && (t.expires_at as string) < new Date().toISOString())
      throw new Error('This share link has expired.');
    const now = new Date().toISOString();
    const safeName =
      String(payload.client_name || '')
        .trim()
        .slice(0, 200) || 'Client';
    const safeSig =
      String(payload.client_signature || '')
        .trim()
        .slice(0, 200) || 'Unknown';
    if (t.entity_type === 'contract') {
      applyContractShareResponse(tokens, idx, t, now, safeSig);
    } else {
      applyProposalShareResponse(tokens, idx, t, now, safeName, payload.response);
    }
    lsSet('share_tokens', tokens);
    return (tokens[idx] || {}) as unknown as T;
  }
  return undefined;
}

function handleGetSessions<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'get_sessions') {
    const all = lsGet<StoreRow>('sessions');
    if (args?.clientId || args?.projectId) {
      const filtered = all.filter((s: StoreRow) => {
        if (args?.clientId && s.client_id !== args.clientId) return false;
        if (args?.projectId && s.project_id !== args.projectId) return false;
        return true;
      });
      return filtered as unknown as T;
    }
    return all as unknown as T;
  }

  // ── get_all_headline_metrics (derived: JOIN metric_definitions + metric_values) ──
  return undefined;
}

function handleGetHeadlineMetrics<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'get_all_headline_metrics') {
    const defs = lsGet<StoreRow>('metric_definitions');
    const values = lsGet<StoreRow>('metric_values');
    const clients = lsGet<StoreRow>('clients');
    const headlineDefs = defs.filter((d: StoreRow) => d.is_headline);
    const result: StoreRow[] = headlineDefs.map((d: StoreRow) => {
      const client = clients.find((c: StoreRow) => c.id === d.client_id);
      const metricValues = values
        .filter((v: StoreRow) => v.definition_id === d.id)
        .sort(
          (a: StoreRow, b: StoreRow) =>
            new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime(),
        )
        .slice(0, 2);
      return {
        client_id: d.client_id,
        client_name: client?.name || 'Unknown',
        definition_id: d.id,
        metric_name: d.name,
        metric_type: d.metric_type,
        unit_label: d.unit_label || null,
        latest_value: metricValues[0]?.value ?? null,
        previous_value: metricValues[1]?.value ?? null,
        values: metricValues,
      };
    });
    return result as unknown as T;
  }

  // ── List commands (get_*) ──
  return undefined;
}

function handleListCommands<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (verb === 'get') {
    const entity = cmdEntity(cmd);
    if (entity && ENTITIES[entity] && !ENTITIES[entity]!.isSingleton) {
      const key = ENTITIES[entity]!.listKey || listKeyFor(entity);
      // Singular (get_<entity> with { id }): single row or null. Lets public
      // surfaces like ShareView fetch one record instead of whole tables.
      if (cmd === `get_${entity}` && args?.id !== undefined) {
        const row = lsGet<StoreRow>(key).find((r: StoreRow) => r.id === args.id);
        return (row || null) as unknown as T;
      }
      return lsGet<StoreRow>(key) as unknown as T;
    }
    // Commands like get_milestones, get_invoice_payments (scoped)
    // get_all_invoice_payments, get_all_pending_follow_ups
    // get_communications, get_attachments, get_follow_up_log
    // These are scoped by entityId etc. · return from localStore
    if (entity) {
      const key = ENTITIES[entity]?.listKey || listKeyFor(entity);
      return lsGet<StoreRow>(key) as unknown as T;
    }
    // Unknown get command · return empty array/null
    return [] as unknown as T;
  }

  // ── Create commands ──
  return undefined;
}

function handleCreateCommands<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (verb === 'create') {
    const entity = cmdEntity(cmd);
    if (entity && args?.payload) {
      const key = ENTITIES[entity]?.listKey || listKeyFor(entity);
      const payload = args.payload as Record<string, unknown>;
      // Generate id if missing
      if (!payload.id) {
        payload.id = crypto.randomUUID();
      }
      if (!payload.created_at) {
        payload.created_at = new Date().toISOString();
      }
      const items = lsGet<StoreRow>(key);
      items.push(payload);
      lsSet(key, items);
      return payload as unknown as T;
    }
    return {} as unknown as T;
  }

  // ── update_attachment_meta (must run BEFORE the generic 'update' handler:
  //    'attachment_meta' does not map to a known list key, so the generic path
  //    would silently drop the update) ──
  return undefined;
}

function handleUpdateAttachmentMeta<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'update_attachment_meta') {
    const payload = args?.payload as Record<string, unknown> | undefined;
    if (payload?.id) {
      const items = lsGet<StoreRow>('attachments');
      const idx = items.findIndex((a: StoreRow) => a.id === payload.id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...payload };
        lsSet('attachments', items);
        return items[idx] as unknown as T;
      }
    }
    return {} as unknown as T;
  }

  // ── update_keyword (top-level args, mirrors Rust: only provided fields update) ──
  return undefined;
}

function handleUpdateKeyword<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'update_keyword') {
    const { id, positionCurrent, targetPosition } = (args || {}) as {
      id?: string;
      positionCurrent?: number | null;
      targetPosition?: number | null;
    };
    if (id) {
      const items = lsGet<StoreRow>('keywords');
      const idx = items.findIndex((i: StoreRow) => i.id === id);
      if (idx !== -1) {
        const row: StoreRow = { ...items[idx] };
        if (positionCurrent != null) row.position_current = positionCurrent;
        if (targetPosition != null) row.target_position = targetPosition;
        items[idx] = row;
        lsSet('keywords', items);
      }
    }
    return {} as unknown as T;
  }

  // ── Generic update commands ──
  return undefined;
}

function handleGenericUpdates<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (verb === 'update') {
    const entity = cmdEntity(cmd);
    if (entity && args?.payload) {
      const def = ENTITIES[entity];
      const key = def?.listKey || listKeyFor(entity);
      const payload = args.payload as Record<string, unknown>;

      // Handle singleton entities (stored as single objects, not arrays)
      if (def?.isSingleton) {
        const current = lsGetSingle<StoreRow>(key) || {};
        const updated = { ...current, ...payload };
        lsSetSingle(key, updated);
        return updated as unknown as T;
      }

      // Regular array entities
      const items = lsGet<StoreRow>(key);
      const idx = items.findIndex((i: StoreRow) => i.id === payload.id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...payload };
        lsSet(key, items);
      }
    }
    return {} as unknown as T;
  }

  // ── Delete commands ──
  return undefined;
}

function cascadeClientMetrics(id: string): void {
  // Metric definitions + their values
  const defs = lsGet<StoreRow>('metric_definitions').filter((d: StoreRow) => d.client_id !== id);
  const defIds = new Set(
    lsGet<StoreRow>('metric_definitions')
      .filter((d: StoreRow) => d.client_id === id)
      .map((d: StoreRow) => d.id),
  );
  lsSet('metric_definitions', defs);
  lsSet(
    'metric_values',
    lsGet<StoreRow>('metric_values').filter(
      (v: StoreRow) => !defIds.has(v.definition_id) && v.client_id !== id,
    ),
  );
}

function removeRowsWithClientId(id: string): void {
  // Client-scoped rows by exact 'client_id' field
  const clientScopedKeys = Object.keys(localStorage)
    .filter((k) => k.startsWith(LS_PREFIX))
    .map((k) => k.slice(LS_PREFIX.length));
  for (const key of clientScopedKeys) {
    if (key === 'clients' || key === 'metric_definitions' || key === 'metric_values') continue;
    let rows: StoreRow[] = [];
    try {
      rows = JSON.parse(localStorage.getItem(LS_PREFIX + key) || '[]');
    } catch {
      continue;
    }
    if (!Array.isArray(rows)) continue;
    const hasClientId = rows.some((r: StoreRow) => r && typeof r === 'object' && 'client_id' in r);
    if (!hasClientId) continue;
    lsSet(
      key,
      rows.filter((r: StoreRow) => r?.client_id !== id),
    );
  }
}

function cascadeClientDelete(id: string): void {
  cascadeClientMetrics(id);
  removeRowsWithClientId(id);
  // Projects belonging to this client: remove them AND their
  // project-scoped children (same logic as delete_project).
  const clientProjects = lsGet<StoreRow>('projects').filter((p: StoreRow) => p.client_id === id);
  const projectIds = new Set(clientProjects.map((p: StoreRow) => p.id));
  if (projectIds.size > 0) {
    lsSet(
      'projects',
      lsGet<StoreRow>('projects').filter((p: StoreRow) => p.client_id !== id),
    );
    const projectScopedKeys = Object.keys(localStorage)
      .filter((k) => k.startsWith(LS_PREFIX))
      .map((k) => k.slice(LS_PREFIX.length));
    for (const key of projectScopedKeys) {
      if (key === 'projects' || key === 'clients') continue;
      let rows: StoreRow[] = [];
      try {
        rows = JSON.parse(localStorage.getItem(LS_PREFIX + key) || '[]');
      } catch {
        continue;
      }
      if (!Array.isArray(rows)) continue;
      const hasProjectId = rows.some(
        (r: StoreRow) => r && typeof r === 'object' && 'project_id' in r,
      );
      if (!hasProjectId) continue;
      lsSet(
        key,
        rows.filter((r: StoreRow) => r?.project_id && !projectIds.has(r.project_id)),
      );
    }
  }

  // Invoices belonging to this client: remove their payments too.
  const clientInvoices = lsGet<StoreRow>('invoices').filter((i: StoreRow) => i.client_id === id);
  const invoiceIds = new Set(clientInvoices.map((i: StoreRow) => i.id));
  if (invoiceIds.size > 0) {
    lsSet(
      'invoice_payments',
      lsGet<StoreRow>('invoice_payments').filter((p: StoreRow) => !invoiceIds.has(p.invoice_id)),
    );
  }
}

function cascadeInvoiceDelete(id: string): void {
  lsSet(
    'invoice_payments',
    lsGet<StoreRow>('invoice_payments').filter((p: StoreRow) => p.invoice_id !== id),
  );
}

function cascadeProjectDelete(id: string): void {
  const projectScopedKeys = Object.keys(localStorage)
    .filter((k) => k.startsWith(LS_PREFIX))
    .map((k) => k.slice(LS_PREFIX.length));
  for (const key of projectScopedKeys) {
    if (key === 'projects') continue;
    let rows: StoreRow[] = [];
    try {
      rows = JSON.parse(localStorage.getItem(LS_PREFIX + key) || '[]');
    } catch {
      continue;
    }
    if (!Array.isArray(rows)) continue;
    const hasProjectId = rows.some(
      (r: StoreRow) => r && typeof r === 'object' && 'project_id' in r,
    );
    if (!hasProjectId) continue;
    lsSet(
      key,
      rows.filter((r: StoreRow) => r?.project_id !== id),
    );
  }
}

function handleDeleteCommands<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (verb === 'delete') {
    const entity = cmdEntity(cmd);
    if (entity) {
      const key = ENTITIES[entity]?.listKey || listKeyFor(entity);
      const id = args?.id as string;
      if (id) {
        const items = lsGet<StoreRow>(key);
        lsSet(
          key,
          items.filter((i: StoreRow) => i.id !== id),
        );
        // Cascade: deleting a client must remove every client-scoped child
        // record (communications, metrics, recurring invoices, projects,
        // proposals, contracts, time entries, invoices + payments, follow-up
        // logs, attachments) so no orphaned rows reference a nonexistent
        // client. This mirrors the foreign-key integrity of the real SQLite
        // backend.
        if (cmd === 'delete_client') cascadeClientDelete(id);
        // Cascade: deleting an invoice must remove its payment records.
        if (cmd === 'delete_invoice') cascadeInvoiceDelete(id);
        // Cascade: deleting a project must remove its project-scoped child
        // records (milestones, sprint tasks, stack, bugs, archetype tables,
        // etc.) so no orphaned rows reference a nonexistent project. This
        // mirrors the foreign-key integrity of the real SQLite backend.
        if (cmd === 'delete_project') cascadeProjectDelete(id);
      }
    }
    return {} as unknown as T;
  }

  // ── log_follow_up (must run BEFORE the generic 'log' handler, which maps
  //    'follow_up' → 'follow_ups' and would drop status/drafted_at, making
  //    follow-ups invisible and the pending guard useless → duplicates) ──
  return undefined;
}

function handleLogFollowUp<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'log_follow_up') {
    const payload = (args?.payload || {}) as Record<string, unknown>;
    const id = payload.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const log: Record<string, unknown> = {
      id,
      entity_type: payload.entity_type || '',
      entity_id: payload.entity_id || '',
      stage: payload.stage ?? 1,
      status: 'pending',
      action: null,
      created_at: now,
      drafted_at: now,
    };
    const key = `${log.entity_type as string}:${log.entity_id as string}`;
    // lsGetRecord guarantees a plain object (never null/array/garbage).
    const all = lsGetRecord('follow_up_logs');
    all[key] = [...(all[key] || []), log];
    lsSet('follow_up_logs', all as unknown as StoreRow[]);
    // Register in the pending list so get_all_pending_follow_ups returns it
    const pending = lsGet<StoreRow>('pending_follow_ups');
    if (!pending.some((l: StoreRow) => l && l.id === id)) {
      pending.push(log);
      lsSet('pending_follow_ups', pending);
    }
    return log as unknown as T;
  }

  // ── log_* commands (log_follow_up, log_import, etc.) ──
  return undefined;
}

function handleLogCommands<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (verb === 'log') {
    const entity = cmdEntity(cmd);
    if (entity && args?.payload) {
      const key = ENTITIES[entity]?.listKey || listKeyFor(entity);
      const payload = args.payload as Record<string, unknown>;
      if (!payload.id) payload.id = crypto.randomUUID();
      if (payload.logged_at === undefined && payload.created_at === undefined) {
        payload.created_at = new Date().toISOString();
      }
      const items = lsGet<StoreRow>(key);
      items.unshift(payload);
      lsSet(key, items);
      return payload as unknown as T;
    }
    return {} as unknown as T;
  }

  // ── save_metric_template (must run BEFORE the generic 'save' handler,
  //    which returns {} for any unknown save_* command) ──
  return undefined;
}

function handleSaveMetricTemplate<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'save_metric_template') {
    const payload = args?.payload as Record<string, unknown> | undefined;
    if (payload) {
      const id = payload.id || crypto.randomUUID();
      const items = lsGet<StoreRow>('metric_templates');
      const existing = items.findIndex((t: StoreRow) => t.name === payload.name);
      if (existing !== -1) {
        items[existing] = { ...items[existing], ...payload, id: items[existing].id || id };
        lsSet('metric_templates', items);
        return items[existing] as unknown as T;
      }
      const template = { ...payload, id, created_at: new Date().toISOString() };
      items.push(template);
      lsSet('metric_templates', items);
      return template as unknown as T;
    }
    return {} as unknown as T;
  }

  // ── save_* commands ──
  return undefined;
}

function handleSaveCommands<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (verb === 'save') {
    // save_import_file, save_asset_file · handled by just returning a mock path
    if (cmd === 'save_import_file' || cmd === 'save_asset_file') {
      return `/mock/${args?.filename || 'file'}` as unknown as T;
    }
    return {} as unknown as T;
  }

  // ── rename/move attachment ──
  return undefined;
}

function handleRenameAttachment<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'rename_attachment') {
    // Mirror the Rust command: new_filename is sanitized and written to the
    // `filename` field (payload.new_filename is NOT stored as-is).
    const payload = args?.payload as Record<string, unknown> | undefined;
    if (payload?.id && payload.new_filename) {
      const items = lsGet<StoreRow>('attachments');
      const idx = items.findIndex((a: StoreRow) => a.id === payload.id);
      if (idx !== -1) {
        const safeName = String(payload.new_filename).replace(/[/\\:*?"<>|]/g, '_');
        items[idx] = { ...items[idx], filename: safeName };
        lsSet('attachments', items);
        return items[idx] as unknown as T;
      }
    }
    return {} as unknown as T;
  }
  return undefined;
}

function handleMoveAttachment<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'move_attachment') {
    const payload = args?.payload as Record<string, unknown> | undefined;
    if (payload?.id) {
      const items = lsGet<StoreRow>('attachments');
      const idx = items.findIndex((a: StoreRow) => a.id === payload.id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...payload };
        lsSet('attachments', items);
        return items[idx] as unknown as T;
      }
    }
    return {} as unknown as T;
  }

  // ── search_assets (browser shim: filter by filename or tag) ──
  return undefined;
}

function handleSearchAssets<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'search_assets') {
    const query = ((args?.query as string) || '').toLowerCase();
    if (!query) return [] as unknown as T;
    const items = lsGet<StoreRow>('attachments');
    const results = items.filter((a: StoreRow) => {
      const filename = ((a.filename as string) || '').toLowerCase();
      const tags = parseTagsBrowser(a.tags);
      return filename.includes(query) || tags.some((t: string) => t.toLowerCase().includes(query));
    });
    return results as unknown as T;
  }

  // ── expire_sent_proposals ──
  return undefined;
}

function handleExpireSentProposals<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'expire_sent_proposals') {
    // Mirror the Rust engine: sent proposals past expires_at become expired.
    // Date-only expiries compare as ISO prefixes, same as rfc3339 in Rust.
    const now = new Date().toISOString();
    const proposals = lsGet<StoreRow>('proposals');
    const expired: StoreRow[] = [];
    for (const p of proposals) {
      if (
        p.status === 'sent' &&
        typeof p.expires_at === 'string' &&
        (p.expires_at as string) < now
      ) {
        p.status = 'expired';
        expired.push(p);
      }
    }
    if (expired.length > 0) lsSet('proposals', proposals);
    return expired.map((p) => ({
      id: p.id,
      client_id: p.client_id,
      title: p.title,
    })) as unknown as T;
  }

  // ── get_portal_activity: the portal server is Tauri-only, so browser
  // mode has no external views to report. Return [] explicitly — falling
  // through to the {} catch-all made every 30s poll throw inside
  // snapshotOpens (caught silently, but noisy and fragile).
  return undefined;
}

function handleGetPortalActivity<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  verb: string,
): T | undefined {
  if (cmd === 'get_portal_activity') {
    return [] as unknown as T;
  }

  return undefined;
}

function handleBrowserMode<T>(cmd: string, args?: Record<string, unknown>): T {
  const verb = cmd.split('_')[0];
  const handlers: Array<
    (cmd: string, args: Record<string, unknown> | undefined, verb: string) => T | undefined
  > = [
    handleGetUserProfile,
    handleUpsertUserProfile,
    handleDirectoryCommands,
    handleUpdateFollowUpStatus,
    handleGetAllFollowUpLogs,
    handleGetAssetStats,
    handleGetShareServerPort,
    handleGetAllShareTokens,
    handleGetShareTokenForEntity,
    handleCreateShareToken,
    handleRevokeShareToken,
    handleGetShareToken,
    handleRecordShareView,
    handleRespondShareToken,
    handleGetSessions,
    handleGetHeadlineMetrics,
    handleListCommands,
    handleCreateCommands,
    handleUpdateAttachmentMeta,
    handleUpdateKeyword,
    handleGenericUpdates,
    handleDeleteCommands,
    handleLogFollowUp,
    handleLogCommands,
    handleSaveMetricTemplate,
    handleSaveCommands,
    handleRenameAttachment,
    handleMoveAttachment,
    handleSearchAssets,
    handleExpireSentProposals,
    handleGetPortalActivity,
  ];
  for (const handler of handlers) {
    const result = handler(cmd, args, verb);
    if (result !== undefined) return result;
  }
  // ── Catch-all: return safe default ──
  console.debug(`[tauri] handleBrowserMode: unhandled command "${cmd}"`);
  return {} as unknown as T;
}
