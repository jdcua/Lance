import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

/**
 * Mock database used when running in browser mode without Tauri.
 *
 * Implements a minimal SQL subset backed by localStorage so writes are NOT
 * silently dropped: SELECT (cols, WHERE col = ?, ORDER BY, LIMIT),
 * INSERT INTO ... VALUES, UPDATE ... SET, DELETE FROM ... WHERE.
 * Non-data statements (PRAGMA, CREATE TABLE, BEGIN/COMMIT/ROLLBACK) are no-ops.
 *
 * IMPORTANT: table rows are stored under the SAME `lance:store:*` keys the
 * browser-mode Tauri shim uses (see src/utils/tauri.ts), so metrics queries
 * (archetype queries) see the same data as the UI. `user_profile` is a
 * singleton stored at `lance:profile` and is special-cased.
 */
const MOCK_PREFIX = 'lance:store:';
// Tables stored as a single object instead of an array. For these, a WHERE
// condition on a column the row lacks (e.g. `id = 1` against a singleton
// profile object with no id) is treated as a match: there is only one row and
// callers are selecting "the" profile.
const SINGLETON_TABLES = new Set(['user_profile']);

// Map real SQLite table names to their frontend store keys. The frontend
// archetype tables live under a short store key (e.g. `archetype_sessions`
// in the DB schema is stored under `lance:store:sessions`).
const STORE_ALIAS: Record<string, string> = {
  archetype_sessions: 'sessions',
  archetype_shoots: 'shoots',
  archetype_revisions: 'revisions',
  archetype_builds: 'builds',
  archetype_keywords: 'keywords',
  archetype_datasets: 'datasets',
  contract_templates: 'contract_templates',
  project_templates: 'project_templates',
  export_templates: 'export_templates',
  share_tokens: 'share_tokens',
};

function mockTableRows(table: string): Record<string, any>[] {
  try {
    if (table === 'user_profile') {
      const raw = localStorage.getItem('lance:profile');
      return raw ? [JSON.parse(raw)] : [];
    }
    // Map real SQLite table names to their frontend store keys.
    // Frontend archetype tables live under their short store key (e.g. archetype_sessions -> sessions).
    const storeKey = STORE_ALIAS[table] ?? table;
    const raw = localStorage.getItem(MOCK_PREFIX + storeKey);
    const val = raw ? JSON.parse(raw) : [];
    return Array.isArray(val) ? val : [];
  } catch { return []; }
}

function mockWriteTable(table: string, rows: Record<string, any>[]): void {
  try {
    if (table === 'user_profile') {
      localStorage.setItem('lance:profile', JSON.stringify(rows[0] ?? {}));
      return;
    }
    const storeKey = STORE_ALIAS[table] ?? table;
    localStorage.setItem(MOCK_PREFIX + storeKey, JSON.stringify(rows));
  } catch { /* quota exceeded or private mode */ }
}

/** Normalize $1/$2 style params into a positional array in placeholder order. */
function normalizeParams(sql: string, params?: unknown[]): unknown[] {
  if (!params) return [];
  if (!sql.includes('$')) return params;
  // $N placeholders · build array indexed by N
  const map = new Map<number, unknown>();
  const re = /\$(\d+)/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(sql))) {
    const n = parseInt(m[1], 10);
    if (!map.has(n)) map.set(n, params[idx++] ?? null);
  }
  return Array.from({ length: Math.max(0, ...map.keys()) + 1 }, (_, i) => map.get(i) ?? null).slice(1);
}

class MockDatabase {
  private table(sql: string): string | null {
    const m = sql.match(/\b(?:FROM|INTO|UPDATE)\s+([A-Za-z_][A-Za-z0-9_]*)/i) || sql.match(/\bDELETE\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)/i);
    return m ? m[1] : null;
  }

  private matchesValue(a: any, b: any): boolean {
    const numA = typeof a === 'number' ? a : Number(a);
    const numB = typeof b === 'number' ? b : Number(b);
    if (a === b) return true;
    if (!isNaN(numA) && !isNaN(numB) && numA === numB) return true;
    return String(a ?? '') === String(b ?? '');
  }

  /** Compare a row value against a literal/param value with an operator. */
  private compareValue(colVal: any, op: string, val: any): boolean {
    // SQLite compares TEXT columns lexicographically (ISO-8601 dates work).
    // Number(dateString) → NaN, so fall back to string comparison for
    // ordering operators whenever either side is not numeric.
    const orderCompare = (a: any, b: any): number => {
      const na = typeof a === 'number' ? a : Number(a);
      const nb = typeof b === 'number' ? b : Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a ?? '').localeCompare(String(b ?? ''));
    };
    switch (op) {
      case '=': return this.matchesValue(colVal, val);
      case '!=': case '<>': return !this.matchesValue(colVal, val);
      case '>': return orderCompare(colVal, val) > 0;
      case '<': return orderCompare(colVal, val) < 0;
      case '>=': return orderCompare(colVal, val) >= 0;
      case '<=': return orderCompare(colVal, val) <= 0;
      case 'LIKE': {
        const pattern = String(val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
        return new RegExp('^' + pattern + '$', 'i').test(String(colVal ?? ''));
      }
      case 'NOT LIKE': {
        const pattern = String(val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
        return !new RegExp('^' + pattern + '$', 'i').test(String(colVal ?? ''));
      }
      case 'IS NULL': return colVal === null || colVal === undefined;
      case 'IS NOT NULL': return colVal !== null && colVal !== undefined;
      case 'IN': return Array.isArray(val) && val.some((v) => this.matchesValue(colVal, v));
      case 'NOT IN': return !(Array.isArray(val) && val.some((v) => this.matchesValue(colVal, v)));
      default: return false;
    }
  }

  /**
   * Parse a WHERE clause into predicates: {col, op, value}. Supports =, !=,
   * <>, >, <, >=, <=, LIKE, NOT LIKE, IS [NOT] NULL, IN (...), AND, OR.
   * Placeholders are ? and $N; string literals '...' and numbers are supported.
   */
  private parseWhere(sql: string, params: unknown[]): Array<{ col: string; op: string; value: unknown }> {
    let clause: string;
    if (/\bWHERE\s+/i.test(sql)) {
      const whereMatch = sql.match(/\bWHERE\s+(.+?)(?:\s+GROUP\s+BY\s+|\s+ORDER\s+BY\s+|\s+LIMIT\s+|$)/i);
      clause = whereMatch ? whereMatch[1] : '';
    } else {
      clause = sql;
    }
    if (!clause) return [];
    // Handle OR by splitting on top-level OR (rare in app code; each side
    // must be a full predicate chain).
    const ors = this.splitTopLevel(clause, 'OR');
    if (ors.length > 1) {
      return [{
        col: '',
        op: '__OR__',
        value: ors.map((side) => this.parseAnd(side, params)),
      }];
    }
    return this.parseAnd(clause, params);
  }

  private splitTopLevel(s: string, token: string): string[] {
    const parts: string[] = [];
    let depth = 0; let cur = '';
    const up = token.toUpperCase();
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth === 0 && s.slice(i, i + up.length).toUpperCase() === up &&
          (i === 0 || !/[A-Za-z0-9_]/.test(s[i-1])) && (i + up.length >= s.length || !/[A-Za-z0-9_]/.test(s[i+up.length]))) {
        parts.push(cur); cur = '';
        i += up.length; continue;
      }
      cur += ch; i++;
    }
    if (cur.trim()) parts.push(cur);
    return parts;
  }

  /** Split a VALUES list on top-level commas (no word-boundary checks). */
  private splitTopLevelComma(s: string): string[] {
    const parts: string[] = [];
    let depth = 0; let cur = ''; let inStr = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "'") inStr = !inStr;
      else if (!inStr && ch === '(') depth++;
      else if (!inStr && ch === ')') depth--;
      if (!inStr && depth === 0 && ch === ',') { parts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    return parts;
  }

  private parseAnd(clause: string, params: unknown[]): Array<{ col: string; op: string; value: unknown }> {
    const parts = this.splitTopLevel(clause, 'AND');
    const out: Array<{ col: string; op: string; value: unknown }> = [];
    let pi = 0;
    for (const part of parts) {
      const t = part.trim();
      if (!t) continue;
      const m = t.match(/^([A-Za-z_][A-Za-z0-9_.]*)\s*(=|!=|<>|>=|<=|>|<|LIKE|NOT\s+LIKE|IS\s+NOT\s+NULL|IS\s+NULL|IN|NOT\s+IN)\s*(.+)?$/i);
      if (!m) continue;
      const col = m[1].split('.').pop()!.toLowerCase();
      const op = m[2].replace(/\s+/g, ' ').toUpperCase();
      const rhs = m[3] ? m[3].trim() : '';
      if (op === 'IS NULL' || op === 'IS NOT NULL') {
        out.push({ col, op, value: null });
        continue;
      }
      // IN (a, b, c) · may contain params or literals. rhs is either `IN (...)` or `(...)` (NOT IN).
      const inM = rhs.match(/^(?:NOT\s+)?IN\s*\((.+)\)$/i) || (op === 'IN' || op === 'NOT IN' ? rhs.match(/^\((.+)\)$/) : null);
      if (inM) {
        const items = this.splitTopLevel(inM[1], ',').map((x) => x.trim());
        const vals = items.map((it) => this.literalValue(it, params, () => pi++));
        out.push({ col, op: op === 'NOT IN' ? 'NOT IN' : 'IN', value: vals });
        continue;
      }
      out.push({ col, op, value: this.literalValue(rhs, params, () => pi++) });
    }
    return out;
  }

  private literalValue(tok: string, params: unknown[], nextParam: () => number): unknown {
    if (tok === '?') return params[nextParam()] ?? null;
    const dollar = tok.match(/^\$(\d+)$/);
    if (dollar) return params[parseInt(dollar[1], 10) - 1] ?? null;
    if (/^'[^']*'$/.test(tok)) return tok.slice(1, -1);
    if (/^-?\d+(\.\d+)?$/.test(tok)) return Number(tok);
    if (/^(TRUE|FALSE)$/i.test(tok)) return /^TRUE$/i.test(tok) ? 1 : 0;
    if (/^NULL$/i.test(tok)) return null;
    return tok; // bare token · treat as string
  }

  /** Evaluate parsed predicates against a row. */
  private matches(row: Record<string, any>, conds: Array<{ col: string; op: string; value: unknown }>, singleton = false): boolean {
    return conds.every((cond) => {
      if (cond.op === '__OR__') {
        return (cond.value as Array<Array<{ col: string; op: string; value: unknown }>>).some((side) => this.matches(row, side, singleton));
      }
      if (singleton && !(cond.col in row)) return true;
      const colVal = row[cond.col];
      if (cond.op === 'IN' && Array.isArray(cond.value) && cond.value.length === 0) return false;
      return this.compareValue(colVal, cond.op, cond.value);
    });
  }

  private parseOrderBy(sql: string): [string, 'asc' | 'desc'][] {
    const m = sql.match(/\bORDER\s+BY\s+(.+?)(?:\s+LIMIT\s+|$)/i);
    if (!m) return [];
    return m[1].split(',').map((part) => {
      const t = part.trim();
      const desc = /\bDESC\b/i.test(t);
      const col = t.replace(/\s+(ASC|DESC)\s*$/i, '').trim().split('.').pop()!.toLowerCase();
      return [col, desc ? 'desc' : 'asc'] as [string, 'asc' | 'desc'];
    });
  }

  private parseLimit(sql: string): number | null {
    const m = sql.match(/\bLIMIT\s+(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  async select<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const table = await this.table(sql);
    if (!table) return [];
    const p = normalizeParams(sql, params);
    let rows = mockTableRows(table);

    const conds = this.parseWhere(sql, p);
    const singleton = SINGLETON_TABLES.has(table);
    if (conds.length) {
      rows = rows.filter((r) => this.matches(r, conds, singleton));
    }

    const orderBy = this.parseOrderBy(sql);
    if (orderBy.length) {
      rows = [...rows].sort((a, b) => {
        for (const [col, dir] of orderBy) {
          const av = a[col];
          const bv = b[col];
          let cmp = 0;
          const na = Number(av); const nb = Number(bv);
          if (!isNaN(na) && !isNaN(nb)) cmp = na - nb;
          else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
          if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    }

    const limit = this.parseLimit(sql);
    if (limit !== null) rows = rows.slice(0, limit);

    // Project columns if explicitly listed (not *)
    const selectMatch = sql.match(/^SELECT\s+(.+?)\s+FROM/i);
    if (selectMatch) {
      const cols = this.splitTopLevelComma(selectMatch[1]).map((c) => c.trim());
      const star = cols.length === 1 && cols[0] === '*';
      // COUNT(*) / SUM / AVG / MIN / MAX with optional alias
      const aggRows = this.projectAggregates(cols, rows);
      if (aggRows) return aggRows as unknown as T[];
      if (!star) {
        rows = rows.map((r) => {
          const out: Record<string, any> = {};
          for (const c of cols) {
            const alias = c.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
            if (alias) out[alias[2].toLowerCase()] = r[alias[1].split('.').pop()!];
            else out[c.split('.').pop()!.toLowerCase()] = r[c.split('.').pop()!];
          }
          return out;
        });
      }
    }
    return rows as unknown as T[];
  }

  /** Handle aggregate projections: COUNT(*), COUNT(col), SUM(col), AVG(col), MIN(col), MAX(col), with optional AS alias. */
  private projectAggregates(cols: string[], rows: Record<string, any>[]): Record<string, any>[] | null {
    const out: Record<string, any> = {};
    let anyAgg = false;
    for (const c of cols) {
      const aliasM = c.match(/^(.+?)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
      const expr = aliasM ? aliasM[1].trim() : c.trim();
      const alias = (aliasM ? aliasM[2] : expr).toLowerCase();
      // Match COUNT(*), COUNT(col), SUM(col), AVG(col), MIN(col), MAX(col),
      // optionally wrapped in COALESCE(<agg>, default).
      const m = expr.match(/^(?:COALESCE\s*\(\s*)?(COUNT|SUM|AVG|MIN|MAX)\s*\((\*|[A-Za-z_][A-Za-z0-9_.]*)\)(?:\s*,\s*[^)]*)?\)?$/i);
      if (!m) continue;
      const fn = m[1].toUpperCase();
      const arg = m[2];
      anyAgg = true;
      const col = arg === '*' ? null : arg.split('.').pop()!.toLowerCase();
      if (fn === 'COUNT') {
        out[alias] = col ? rows.filter((r) => r[col] !== null && r[col] !== undefined).length : rows.length;
      } else if (fn === 'SUM') {
        out[alias] = rows.reduce((s, r) => s + (col && r[col] ? Number(r[col]) || 0 : 0), 0);
      } else if (fn === 'AVG') {
        const vals = col ? rows.map((r) => Number(r[col]) || 0).filter((v) => !isNaN(v)) : [];
        out[alias] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      } else if (fn === 'MIN') {
        const vals = col ? rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined) : [];
        out[alias] = vals.length ? Math.min(...vals.map((v) => Number(v))) : null;
      } else if (fn === 'MAX') {
        const vals = col ? rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined) : [];
        out[alias] = vals.length ? Math.max(...vals.map((v) => Number(v))) : null;
      }
    }
    if (!anyAgg) return null;
    return [out];
  }

  async execute(sql: string, params?: unknown[]): Promise<unknown> {
    const p = normalizeParams(sql, params);
    const trimmed = sql.trim();

    if (/^BEGIN|^COMMIT|^ROLLBACK|^PRAGMA|^CREATE\s+TABLE/i.test(trimmed)) {
      return { rowsAffected: 0, lastInsertId: 0 };
    }

    // INSERT INTO table (cols) VALUES (?, ?, ...) [ON CONFLICT(id) DO UPDATE ...]
    const ins = sql.match(/^INSERT\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)\s*VALUES\s*\((.+?)\)(?:\s+ON\s+CONFLICT\s*\(([^)]*)\)\s+DO\s+UPDATE\s+SET\s+(.+))?\s*$/i);
    if (ins) {
      const table = ins[1];
      const cols = ins[2].split(',').map((c) => c.trim().toLowerCase());
      // Split VALUES into per-column tokens so literal values (e.g. `1` in
      // `VALUES (1, ?, ?, ?)`) don't consume placeholders · params must bind
      // ONLY to `?`/`$N` tokens, in order.
      const valueParts = this.splitTopLevelComma(ins[3]).map((v) => v.trim());
      const row: Record<string, any> = {};
      let pi = 0;
      for (let i = 0; i < cols.length; i++) {
        if (i < valueParts.length) {
          row[cols[i]] = this.literalValue(valueParts[i], p, () => pi++);
        } else {
          row[cols[i]] = null;
        }
      }
      const rows = mockTableRows(table);
      const conflictCols = ins[4] ? ins[4].split(',').map((c) => c.trim().toLowerCase()) : [];
      let upserted = -1;
      if (conflictCols.length) {
        upserted = rows.findIndex((r) => conflictCols.every((c) => this.matchesValue(r[c], row[c])));
      }
      if (upserted !== -1) {
        rows[upserted] = { ...rows[upserted], ...row };
        mockWriteTable(table, rows);
        return { rowsAffected: 1, lastInsertId: upserted + 1 };
      }
      rows.push(row);
      mockWriteTable(table, rows);
      return { rowsAffected: 1, lastInsertId: rows.length };
    }

    // UPDATE table SET col = ?, ... WHERE ...
    const upd = sql.match(/^UPDATE\s+([A-Za-z_][A-Za-z0-9_]*)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (upd) {
      const table = upd[1];
      const sets: [string, unknown][] = [];
      const setRe = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\?|\$\d+|NULL|'[^']*'|\d+(?:\.\d+)?)/g;
      let sm: RegExpExecArray | null;
      // SET placeholders consume params from index 0; WHERE params continue after.
      let si = 0;
      while ((sm = setRe.exec(upd[2]))) {
        let val: unknown;
        if (sm[2] === '?') val = p[si++];
        else if (/^\d/.test(sm[2])) val = Number(sm[2]);
        else if (sm[2] === 'NULL') val = null;
        else val = sm[2].slice(1, -1);
        sets.push([sm[1].toLowerCase(), val]);
      }
      const conds = upd[3] ? this.parseWhere(upd[3], p.slice(si)) : [];
      const rows = mockTableRows(table);
      let affected = 0;
      for (const r of rows) {
        if (this.matches(r, conds)) {
          for (const [col, val] of sets) r[col] = val;
          affected++;
        }
      }
      mockWriteTable(table, rows);
      return { rowsAffected: affected, lastInsertId: 0 };
    }

    // DELETE FROM table WHERE ...
    const del = sql.match(/^DELETE\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+WHERE\s+(.+))?$/i);
    if (del) {
      const table = del[1];
      const conds = del[2] ? this.parseWhere(del[2], p) : [];
      let rows = mockTableRows(table);
      if (conds.length) rows = rows.filter((r) => !this.matches(r, conds));
      else rows = [];
      mockWriteTable(table, rows);
      return { rowsAffected: 1, lastInsertId: 0 };
    }

    // Unsupported statement · no-op without throwing
    return { rowsAffected: 0, lastInsertId: 0 };
  }

  async close(): Promise<void> {}
}

export async function getDb(): Promise<Database> {
  if (db) return db;

  // In browser mode, return a localStorage-backed mock so callers don't crash.
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
    return new MockDatabase() as unknown as Database;
  }

  db = await Database.load('sqlite:lance.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: Database): Promise<void> {
  await database.execute('PRAGMA journal_mode=WAL');
  await database.execute('PRAGMA foreign_keys=ON');

  // ─── Alter columns for backward compatibility ───
  const newColumns = [
    'ALTER TABLE user_profile ADD COLUMN tax_rate REAL DEFAULT 0',
    'ALTER TABLE user_profile ADD COLUMN payment_terms INTEGER DEFAULT 14',
    'ALTER TABLE user_profile ADD COLUMN tagline TEXT',
    'ALTER TABLE user_profile ADD COLUMN always_include TEXT',
    'ALTER TABLE user_profile ADD COLUMN writing_style TEXT DEFAULT \'professional\'',
    'ALTER TABLE user_profile ADD COLUMN theme TEXT DEFAULT \'light\'',
    'ALTER TABLE user_profile ADD COLUMN license_key TEXT',
    'ALTER TABLE user_profile ADD COLUMN licensed_at TEXT',
    'ALTER TABLE user_profile ADD COLUMN profession TEXT',
    'ALTER TABLE user_profile ADD COLUMN custom_archetype_config TEXT',
    'ALTER TABLE user_profile ADD COLUMN density TEXT DEFAULT \'comfortable\'',
    'ALTER TABLE user_profile ADD COLUMN accent_color TEXT',
    'ALTER TABLE user_profile ADD COLUMN ai_enabled INTEGER DEFAULT 0',
    'ALTER TABLE expenses ADD COLUMN recurring INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE expenses ADD COLUMN frequency TEXT DEFAULT \'monthly\'',
    'ALTER TABLE clients ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE projects ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE proposals ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE contracts ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE time_entries ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE invoices ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE recurring_invoices ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE expenses ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE project_templates ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE proposals ADD COLUMN expires_at TEXT',
    'ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT NULL',
    'ALTER TABLE clients ADD COLUMN preferred_currency TEXT DEFAULT NULL',
    'ALTER TABLE user_profile ADD COLUMN proposal_expiry_days INTEGER',
    'ALTER TABLE user_profile ADD COLUMN income_target REAL',
    'ALTER TABLE user_profile ADD COLUMN license_tier TEXT',
    'ALTER TABLE user_profile ADD COLUMN license_expires_at TEXT',
    'ALTER TABLE user_profile ADD COLUMN license_validated_at TEXT',
    'ALTER TABLE user_profile ADD COLUMN license_grace_until TEXT',
    'ALTER TABLE user_profile ADD COLUMN trial_started_at TEXT',
    'ALTER TABLE user_profile ADD COLUMN payment_instructions TEXT',
    'ALTER TABLE recurring_invoices ADD COLUMN last_catch_up_warning TEXT',
    'ALTER TABLE projects ADD COLUMN color TEXT',
    'ALTER TABLE user_profile ADD COLUMN profession TEXT',
    'ALTER TABLE user_profile ADD COLUMN custom_archetype_config TEXT',
  ];
  for (const sql of newColumns) {
    try { await database.execute(sql); } catch { /* column already exists */ }
  }

  // v2 user_id columns for row-level security
  const user_id_columns = [
    'ALTER TABLE clients ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE projects ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE milestones ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE proposals ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE contracts ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE time_entries ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE invoices ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE expenses ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1',
  ];
  for (const sql of user_id_columns) {
    try { await database.execute(sql); } catch { /* column already exists */ }
  }

  // ─── Frontend-only archetype tables (not in Rust backend) ───

  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_phases (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, phase_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', color TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS deliverables (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, file_name TEXT, format TEXT, resolution TEXT,
      delivery_date TEXT, client_approved INTEGER NOT NULL DEFAULT 0, notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS sprint_tasks (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog', priority TEXT NOT NULL DEFAULT 'medium',
      hours_estimated REAL, hours_actual REAL, sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_stack (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, technology TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS bugs (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, title TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'open',
      hours_spent REAL, created_at TEXT NOT NULL, resolved_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS mood_board_items (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, asset_id TEXT, url TEXT, notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_feedback (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, project_id TEXT, date TEXT NOT NULL,
      medium TEXT NOT NULL, summary TEXT NOT NULL, actioned INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS culling_sessions (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, shoot_id TEXT, date TEXT,
      shoot_hours REAL, culling_hours REAL, editing_hours REAL, notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_deliveries (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, selects_count INTEGER, delivered_count INTEGER,
      gallery_link TEXT, delivery_date TEXT, notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS equipment_usage (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, shoot_id TEXT, equipment_name TEXT NOT NULL,
      equipment_type TEXT NOT NULL DEFAULT 'other', notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS storage_log (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, raw_gb REAL, exported_gb REAL, logged_date TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS time_entry_words (
      id TEXT PRIMARY KEY, time_entry_id TEXT NOT NULL, word_count INTEGER NOT NULL
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS publications (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, outlet_name TEXT, url TEXT, publish_date TEXT,
      byline TEXT, notes TEXT, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_style_guides (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, tone TEXT, formatting_rules TEXT, banned_words TEXT,
      style_guide_ref TEXT, notes TEXT, FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS retainers (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, monthly_hours REAL NOT NULL DEFAULT 0,
      rate REAL NOT NULL DEFAULT 0, renewal_date TEXT, active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS action_items (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, session_id TEXT, title TEXT NOT NULL,
      owner TEXT NOT NULL DEFAULT 'consultant', due_date TEXT,
      completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS outcomes (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, before_state TEXT, after_state TEXT,
      metrics_improved TEXT, testimonial_draft TEXT, created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS shots (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, scene TEXT, description TEXT,
      status TEXT NOT NULL DEFAULT 'planned', sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS cuts (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, cut_name TEXT, duration_seconds INTEGER,
      format TEXT, client_approved INTEGER NOT NULL DEFAULT 0,
      delivery_date TEXT, notes TEXT, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS deliverable_specs (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, format TEXT, resolution TEXT, aspect_ratio TEXT,
      audio_spec TEXT, delivery_method TEXT, notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS commissions (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, title TEXT NOT NULL, brief TEXT, deadline TEXT,
      payment_status TEXT NOT NULL DEFAULT 'unpaid', sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'queued', FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_style_tags (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, tag TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS asset_licenses (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      asset_id TEXT NOT NULL, license_type TEXT NOT NULL, licensee TEXT,
      term TEXT, fee REAL, currency TEXT DEFAULT 'CAD', created_at TEXT NOT NULL
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_complexity (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, poly_count TEXT, texture_count INTEGER,
      rig_complexity TEXT, software TEXT, notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS format_deliverables (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, format TEXT, poly_spec TEXT, texture_spec TEXT,
      delivered INTEGER NOT NULL DEFAULT 0, delivery_date TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS game_features (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, title TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'should',
      status TEXT NOT NULL DEFAULT 'backlog', hours_estimated REAL, hours_actual REAL,
      sort_order INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_platforms (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, engine TEXT, target_platform TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS qa_sessions (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, date TEXT, build_version TEXT,
      bugs_found INTEGER, bugs_fixed INTEGER, hours REAL, notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS build_deliveries (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, version TEXT, date TEXT, platform TEXT,
      notes TEXT, created_at TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS research_activities (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, type TEXT NOT NULL, date TEXT, participants INTEGER,
      key_findings TEXT, created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS prototypes (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, tool TEXT, fidelity TEXT,
      iteration INTEGER NOT NULL DEFAULT 1, link TEXT, feedback TEXT,
      created_at TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS usability_tests (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, date TEXT, participants INTEGER,
      tasks_tested TEXT, issues_found TEXT, severity TEXT NOT NULL DEFAULT 'medium',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS handoff_items (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, item TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS component_counts (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, component_name TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, name TEXT NOT NULL, channel TEXT,
      start_date TEXT, end_date TEXT, budget REAL, kpi_target TEXT, kpi_result TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_report_cadence (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, frequency TEXT NOT NULL DEFAULT 'monthly',
      last_report_date TEXT, next_due TEXT, FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_channels (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, channel TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS content_posts (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, date TEXT, platform TEXT NOT NULL,
      content_type TEXT, status TEXT NOT NULL DEFAULT 'planned', notes TEXT,
      created_at TEXT NOT NULL, FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_platforms (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, platform TEXT NOT NULL, handle TEXT,
      active INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS stems (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, name TEXT NOT NULL, format TEXT,
      delivered INTEGER NOT NULL DEFAULT 0, delivery_date TEXT, notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS sync_licenses (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT, track_name TEXT NOT NULL, licensee TEXT, use_type TEXT,
      territory TEXT, term TEXT, fee REAL, royalty INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS credits (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, artist TEXT, role TEXT, release_link TEXT,
      release_date TEXT, notes TEXT, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS arch_phases (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, phase_name TEXT NOT NULL,
      completion_percent INTEGER NOT NULL DEFAULT 0,
      invoice_trigger INTEGER NOT NULL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS arch_consultants (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, name TEXT NOT NULL, discipline TEXT,
      fee REAL, fee_type TEXT, status TEXT NOT NULL DEFAULT 'contracted',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, type TEXT NOT NULL, submitted_date TEXT,
      response_date TEXT, status TEXT NOT NULL DEFAULT 'submitted',
      resubmit INTEGER NOT NULL DEFAULT 0, notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS revision_sets (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, set_number INTEGER NOT NULL, date TEXT,
      changes_summary TEXT, distributed_to TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS site_visits (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, date TEXT, phase TEXT, observations TEXT,
      photo_asset_ids TEXT, created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS va_tasks (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, title TEXT NOT NULL, duration_minutes INTEGER,
      category TEXT NOT NULL DEFAULT 'other', completed_date TEXT, created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS sops (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, title TEXT NOT NULL, content TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS translation_counts (
      id TEXT PRIMARY KEY, time_entry_id TEXT NOT NULL,
      source_words INTEGER, target_words INTEGER, characters INTEGER
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_language_pairs (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, source_lang TEXT NOT NULL, target_lang TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_quality (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, quality_tier TEXT NOT NULL, notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS glossary_terms (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, term TEXT NOT NULL, approved_translation TEXT,
      notes TEXT, created_at TEXT NOT NULL, FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS seo_deliverables (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, period TEXT NOT NULL, title TEXT NOT NULL,
      type TEXT, completed INTEGER NOT NULL DEFAULT 0, due_date TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_reports (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, date TEXT NOT NULL, traffic_notes TEXT,
      ranking_notes TEXT, conversion_notes TEXT, summary TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS analysis_deliverables (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, title TEXT NOT NULL, type TEXT, version TEXT,
      delivery_date TEXT, notes TEXT, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_analysis_complexity (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, complexity_tier TEXT NOT NULL, notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, title TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open', resolved_at TEXT, notes TEXT,
      created_at TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS automations (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'script',
      frequency TEXT, last_run TEXT, status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS infrastructure (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, service_name TEXT NOT NULL, provider TEXT,
      cost_monthly REAL, status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS slas (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, metric_name TEXT NOT NULL, target TEXT,
      actual TEXT, period TEXT, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'model',
      status TEXT NOT NULL DEFAULT 'planned', metrics TEXT, notes TEXT,
      created_at TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, name TEXT NOT NULL, framework TEXT,
      version TEXT, status TEXT NOT NULL DEFAULT 'development', metrics TEXT,
      created_at TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS compute_costs (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, provider TEXT, instance_type TEXT,
      hours REAL, cost REAL, date TEXT, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS dataset_versions (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, dataset_id TEXT NOT NULL, version TEXT NOT NULL,
      description TEXT, created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, grade_level TEXT, subject TEXT,
      hourly_rate REAL, status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS curriculum_items (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, title TEXT NOT NULL, item_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'planned', notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS progress_reports (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, date TEXT NOT NULL, summary TEXT,
      next_steps TEXT, score INTEGER, FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS cancellations (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, session_date TEXT NOT NULL, reason TEXT,
      refund_amount REAL, FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS intake_forms (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, form_data TEXT, created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS progress_notes (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, date TEXT NOT NULL, mood_score INTEGER,
      notes TEXT, goals TEXT, FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, name TEXT NOT NULL, duration_weeks INTEGER,
      sessions_per_week INTEGER, notes TEXT, FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, date TEXT NOT NULL, metrics TEXT, notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_progress (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, date TEXT NOT NULL, measurements TEXT, notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS commission_tos (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      description TEXT, amount REAL, entry_type TEXT, date TEXT, category TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS reconciliations (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      account_name TEXT, expected REAL, actual REAL, date TEXT, status TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS tax_deadlines (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT, due_date TEXT, tax_type TEXT, amount REAL, filed INTEGER
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_financials (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      statement_type TEXT, period TEXT, revenue REAL, expenses REAL, profit REAL, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS smart_contracts (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT, network TEXT, address TEXT, status TEXT, audit_date TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS audit_findings (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT, severity TEXT, contract_id TEXT, description TEXT,
      resolved INTEGER, created_at TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS gas_tracker (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      network TEXT, gas_used REAL, cost_native REAL, cost_usd REAL, date TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS chain_logs (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      chain_name TEXT, event_type TEXT, tx_hash TEXT, block_number TEXT, notes TEXT, created_at TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      case_number TEXT, title TEXT, status TEXT, filed_date TEXT, court TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS filing_deadlines (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, case_id TEXT, user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT, due_date TEXT, filed INTEGER, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      doc_name TEXT, version TEXT, date TEXT, file_ref TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS conflict_checks (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      party_name TEXT, check_date TEXT, result TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS campaign_budgets (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, name TEXT NOT NULL, budget REAL, spent REAL,
      start_date TEXT, end_date TEXT, status TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS creative_rotations (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, creative_name TEXT NOT NULL, platform TEXT,
      impressions INTEGER, clicks INTEGER, ctr REAL, start_date TEXT, end_date TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS spend_pacing (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, period TEXT, budget REAL, actual REAL, variance REAL
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS performance_snapshots (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, date TEXT, channel TEXT, impressions INTEGER,
      clicks INTEGER, conversions INTEGER, spend REAL, revenue REAL, roas REAL
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS journey_maps (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, stage TEXT, touchpoint TEXT, pain_point TEXT,
      opportunity TEXT, priority TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS feedback_aggregations (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      client_id TEXT NOT NULL, source TEXT, rating INTEGER, comment TEXT,
      date TEXT, actioned INTEGER
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS service_blueprints (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, component TEXT, frontstage TEXT, backstage TEXT,
      support_process TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS impact_measurements (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, metric_name TEXT, baseline REAL, target REAL,
      actual REAL, date TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, name TEXT, service TEXT, contact TEXT,
      cost REAL, status TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS run_of_show (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, time_slot TEXT, activity TEXT, owner TEXT,
      duration_min INTEGER, notes TEXT, sort_order INTEGER
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, name TEXT, rsvp TEXT, table_assignment TEXT,
      dietary TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS budget_vs_actual (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, category TEXT, budgeted REAL, actual REAL, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS funnels (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, name TEXT, stage TEXT, entries INTEGER,
      conversions INTEGER, rate REAL, date TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS metric_snapshots (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, metric TEXT, value REAL, target REAL, date TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS hypotheses (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL DEFAULT 1,
      project_id TEXT NOT NULL, hypothesis TEXT, test_design TEXT,
      result TEXT, status TEXT, created_at TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS vulnerability_log (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT, severity TEXT, cve TEXT, description TEXT, remediation TEXT,
      status TEXT, discovered_date TEXT, resolved_date TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS remediation_tracker (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT, vulnerability_id TEXT, action TEXT, assigned_to TEXT,
      due_date TEXT, completed INTEGER
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS compliance_frameworks (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      framework_name TEXT, control_id TEXT, description TEXT, status TEXT,
      evidence TEXT, last_review TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS boms (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      part_name TEXT, part_number TEXT, quantity INTEGER, supplier TEXT,
      cost REAL, lead_time_days INTEGER
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS fabrication_tracker (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      item_name TEXT, status TEXT, start_date TEXT, completed_date TEXT,
      fab_house TEXT, cost REAL
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS component_inventory (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      component_name TEXT, footprint TEXT, quantity INTEGER, supplier TEXT,
      unit_cost REAL, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT, season TEXT, status TEXT, pieces_count INTEGER, launch_date TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS sourcing_logs (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      material TEXT, supplier TEXT, cost REAL, moq INTEGER, lead_time_days INTEGER, status TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS fittings (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      garment TEXT, fit_model TEXT, date TEXT, adjustments TEXT, status TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS lookbooks (
      id TEXT PRIMARY KEY, client_id TEXT, user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT, description TEXT, asset_ids TEXT, created_at TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      address TEXT, property_type TEXT, list_price REAL, status TEXT,
      list_date TEXT, close_date TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS showings (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      date TEXT, attendee_name TEXT, attendee_contact TEXT, feedback TEXT, follow_up_date TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS comparables (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      address TEXT, sale_price REAL, sale_date TEXT, sqft INTEGER, beds REAL, baths REAL, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY, client_id TEXT, user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT, role TEXT, status TEXT, source TEXT, contact TEXT, notes TEXT, created_at TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS placements (
      id TEXT PRIMARY KEY, client_id TEXT, user_id INTEGER NOT NULL DEFAULT 1,
      candidate_name TEXT, role TEXT, company TEXT, start_date TEXT, fee REAL, status TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS client_searches (
      id TEXT PRIMARY KEY, client_id TEXT, user_id INTEGER NOT NULL DEFAULT 1,
      search_name TEXT, role TEXT, requirements TEXT, status TEXT, created_at TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS roadmap_items (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL, quarter TEXT, status TEXT, priority TEXT, effort TEXT,
      notes TEXT, sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS product_specs (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL, problem TEXT, solution TEXT, success_metrics TEXT,
      status TEXT, created_at TEXT NOT NULL
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS stakeholder_logs (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT, role TEXT, contact TEXT, influence TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS ctas (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL, type TEXT, conversion_rate REAL, impressions INTEGER,
      clicks INTEGER, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS ab_variants (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      test_name TEXT, variant_name TEXT, is_control INTEGER, results TEXT, status TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS content_types (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL, category TEXT, template TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS brand_voices (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT, attributes TEXT, examples TEXT, dos_donts TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT, days INTEGER, calories_per_day INTEGER, plan_data TEXT, created_at TEXT NOT NULL
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS biomarkers (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT, value REAL, unit TEXT, date TEXT, reference_range TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS dietary_assessments (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      date TEXT, food_log TEXT, analysis TEXT, recommendations TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS food_diaries (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      date TEXT, meal TEXT, foods TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS auditions (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      project_title TEXT, role TEXT, callback_date TEXT, status TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 1,
      project_title TEXT, role TEXT, session_date TEXT, rate REAL, status TEXT, notes TEXT
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS session_recordings (
      id TEXT PRIMARY KEY, client_id TEXT, project_id TEXT, user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT, duration_min INTEGER, file_path TEXT, notes TEXT, created_at TEXT NOT NULL
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS equipment_inventory (
      id TEXT PRIMARY KEY, client_id TEXT, user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT, equipment_type TEXT, serial_number TEXT, purchase_date TEXT,
      value REAL, notes TEXT
    )
  `);

  // ─── Kanban tables ───
  await database.execute(`
    CREATE TABLE IF NOT EXISTS kanban_boards (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Main Board', created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS kanban_columns (
      id TEXT PRIMARY KEY, board_id TEXT NOT NULL,
      name TEXT NOT NULL, color TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
      wip_limit INTEGER, created_at TEXT NOT NULL,
      FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
    )
  `);
  await database.execute(`
    CREATE TABLE IF NOT EXISTS kanban_cards (
      id TEXT PRIMARY KEY, column_id TEXT NOT NULL, project_id TEXT NOT NULL,
      title TEXT NOT NULL, description TEXT, priority TEXT NOT NULL DEFAULT 'medium',
      hours_estimated REAL, hours_actual REAL, due_date TEXT,
      labels TEXT NOT NULL DEFAULT '[]', assignee TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
      FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // ─── Frontend-only indexes ───
  const archetypeIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_kanban_boards_project ON kanban_boards(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_kanban_columns_board ON kanban_columns(board_id)',
    'CREATE INDEX IF NOT EXISTS idx_kanban_columns_order ON kanban_columns(sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_kanban_cards_column ON kanban_cards(column_id)',
    'CREATE INDEX IF NOT EXISTS idx_kanban_cards_project ON kanban_cards(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_kanban_cards_order ON kanban_cards(sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_deliverables_project ON deliverables(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_sprint_tasks_project ON sprint_tasks(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_sprint_tasks_status ON sprint_tasks(status)',
    'CREATE INDEX IF NOT EXISTS idx_project_stack_project ON project_stack(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_bugs_project ON bugs(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status)',
    'CREATE INDEX IF NOT EXISTS idx_mood_board_project ON mood_board_items(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_feedback_client ON client_feedback(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_culling_sessions_project ON culling_sessions(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_deliveries_project ON project_deliveries(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_usage_project ON equipment_usage(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_storage_log_project ON storage_log(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_publications_project ON publications(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_style_guides_client ON client_style_guides(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_retainers_client ON retainers(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_action_items_client ON action_items(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_outcomes_project ON outcomes(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_shots_project ON shots(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_cuts_project ON cuts(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_deliverable_specs_project ON deliverable_specs(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_commissions_client ON commissions(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_style_tags_project ON project_style_tags(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_asset_licenses_asset ON asset_licenses(asset_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_complexity_project ON project_complexity(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_format_deliverables_project ON format_deliverables(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_game_features_project ON game_features(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_platforms_project ON project_platforms(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_qa_sessions_project ON qa_sessions(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_build_deliveries_project ON build_deliveries(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_research_activities_project ON research_activities(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_prototypes_project ON prototypes(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_usability_tests_project ON usability_tests(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_handoff_items_project ON handoff_items(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_component_counts_project ON component_counts(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_campaigns_project ON campaigns(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_report_cadence_client ON client_report_cadence(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_channels_project ON project_channels(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_content_posts_client ON content_posts(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_platforms_client ON client_platforms(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_stems_project ON stems(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_sync_licenses_project ON sync_licenses(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_credits_project ON credits(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_arch_phases_project ON arch_phases(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_arch_consultants_project ON arch_consultants(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_revision_sets_project ON revision_sets(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_site_visits_project ON site_visits(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_va_tasks_client ON va_tasks(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_sops_client ON sops(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_language_pairs_project ON project_language_pairs(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_quality_project ON project_quality(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_glossary_terms_client ON glossary_terms(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_seo_deliverables_client ON seo_deliverables(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_reports_client ON client_reports(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_analysis_deliverables_project ON analysis_deliverables(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_analysis_complexity_project ON project_analysis_complexity(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_incidents_project ON incidents(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_automations_project ON automations(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_infrastructure_project ON infrastructure(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_slas_project ON slas(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_experiments_project ON experiments(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_models_project ON models(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_compute_costs_project ON compute_costs(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_dataset_versions_project ON dataset_versions(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_students_client ON students(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_curriculum_items_project ON curriculum_items(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_progress_reports_project ON progress_reports(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_cancellations_client ON cancellations(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_intake_forms_client ON intake_forms(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_progress_notes_client ON progress_notes(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_programs_client ON programs(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_assessments_client ON assessments(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_progress_client ON client_progress(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_ledger_entries_project ON ledger_entries(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_reconciliations_project ON reconciliations(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_tax_deadlines_client ON tax_deadlines(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_financials_client ON client_financials(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_smart_contracts_project ON smart_contracts(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_findings_project ON audit_findings(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_gas_tracker_project ON gas_tracker(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_chain_logs_project ON chain_logs(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_cases_client ON cases(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_filing_deadlines_client ON filing_deadlines(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_versions_client ON document_versions(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_conflict_checks_client ON conflict_checks(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_campaign_budgets_project ON campaign_budgets(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_creative_rotations_project ON creative_rotations(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_spend_pacing_project ON spend_pacing(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_performance_snapshots_project ON performance_snapshots(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_journey_maps_project ON journey_maps(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_feedback_aggregations_client ON feedback_aggregations(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_service_blueprints_project ON service_blueprints(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_impact_measurements_project ON impact_measurements(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_project ON vendors(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_run_of_show_project ON run_of_show(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_guests_project ON guests(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_budget_vs_actual_project ON budget_vs_actual(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_funnels_project ON funnels(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_metric_snapshots_project ON metric_snapshots(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_hypotheses_project ON hypotheses(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_vulnerability_log_project ON vulnerability_log(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_vulnerability_log_status ON vulnerability_log(status)',
    'CREATE INDEX IF NOT EXISTS idx_remediation_tracker_project ON remediation_tracker(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_project ON compliance_frameworks(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_boms_project ON boms(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_fabrication_tracker_project ON fabrication_tracker(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_component_inventory_project ON component_inventory(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_collections_project ON collections(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_sourcing_logs_project ON sourcing_logs(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_fittings_project ON fittings(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_lookbooks_client ON lookbooks(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_listings_project ON listings(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status)',
    'CREATE INDEX IF NOT EXISTS idx_showings_project ON showings(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_comparables_project ON comparables(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_candidates_client ON candidates(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status)',
    'CREATE INDEX IF NOT EXISTS idx_placements_client ON placements(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_searches_client ON client_searches(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_roadmap_items_project ON roadmap_items(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_product_specs_project ON product_specs(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_stakeholder_logs_project ON stakeholder_logs(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_ctas_project ON ctas(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_ab_variants_project ON ab_variants(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_content_types_client ON content_types(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_brand_voices_client ON brand_voices(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_meal_plans_client ON meal_plans(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_biomarkers_client ON biomarkers(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_dietary_assessments_client ON dietary_assessments(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_food_diaries_client ON food_diaries(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_auditions_client ON auditions(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_session_recordings_project ON session_recordings(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_inventory_client ON equipment_inventory(client_id)',
  ];
  for (const sql of archetypeIndexes) {
    try { await database.execute(sql); } catch { /* already exists */ }
  }

  try {
    await database.execute(`CREATE TABLE IF NOT EXISTS auto_backup_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'weekly',
      backup_path TEXT,
      last_backup_at TEXT,
      last_backup_error TEXT
    )`);
  } catch { /* table may already exist from backend */ }

  const row = await database.select<{ cnt: number }[]>('SELECT COUNT(*) as cnt FROM schema_version');
  if (!row || row.length === 0 || row[0].cnt === 0) {
    await database.execute('INSERT INTO schema_version (version) VALUES (?)', [getCurrentSchemaVersion()]);
  }
}

export function getCurrentSchemaVersion(): number {
  return 2;
}

export async function getSchemaVersionFromDb(): Promise<number> {
  const { getDb } = await import('./index');
  const db = await getDb();
  const rows = await db.select<{ version: number }[]>('SELECT version FROM schema_version LIMIT 1');
  return rows && rows.length > 0 ? rows[0].version : getCurrentSchemaVersion();
}
