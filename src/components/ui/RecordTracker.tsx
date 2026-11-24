/**
 * Generic RecordTracker · replaces the ~187 copy-paste feature trackers
 * (BiomarkerTracker, BugLog, BuildLog, ShootLog, …).
 *
 * Every tracker had the same shape: a list, a create form, per-row delete,
 * and load/create/update/delete against a data source. Instead of copying
 * that structure 187 times, one component here is configured per entity.
 *
 * Two data-source shapes are supported:
 *  - Store: pass `useStore()` slice actions (load, create, update, delete)
 *  - DB:    pass load/create/update/delete functions that call getDb()
 *
 * Usage:
 *   <RecordTracker
 *     entity="build"
 *     title="Builds"
 *     icon={Box}
 *     list={builds}
 *     load={loadBuilds}
 *     create={addBuild}
 *     update={updateBuild}
 *     remove={removeBuild}
 *     fields={[{ key: 'version', label: 'Version', type: 'text' }, …]}
 *     columns={[{ key: 'version', label: 'Version' }, …]}
 *     rowValue={(b, key) => b[key]}
 *   />
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from './Button';
import type { LucideIcon } from 'lucide-react';

type FieldType = 'text' | 'number' | 'date' | 'select';

type FieldConfig = {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  placeholder?: string;
};

type ColumnConfig = {
  key: string;
  label: string;
};

type RecordTrackerProps<T extends Record<string, unknown>> = {
  entity: string; // 'build' | 'session' | …
  title: string;
  icon: LucideIcon;
  list: T[];
  load: () => Promise<void>;
  create: (data: Partial<T>) => Promise<T>;
  update?: (id: string, data: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  fields: FieldConfig[];
  columns: ColumnConfig[];
  rowValue?: (row: T, key: string) => string | number;
  idOf?: (row: T) => string;
  emptyMessage?: string;
  filterBy?: (row: T) => boolean;
};

export default function RecordTracker<T extends Record<string, unknown>>({
  entity,
  title,
  icon: Icon,
  list,
  load,
  create,
  update,
  remove,
  fields,
  columns,
  rowValue = (row, key) => String((row as any)[key] ?? ''),
  idOf = (row) => String((row as any).id ?? (row as any)[Object.keys(row)[0]]),
  emptyMessage = `No ${entity}s logged yet.`,
  filterBy,
}: RecordTrackerProps<T>) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const visible = filterBy ? list.filter(filterBy) : list;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await load();
    } catch {
      /* load errors are surfaced by the data source */
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Partial<T> = {};
      for (const f of fields) {
        const v = form[f.key];
        (data as Record<string, unknown>)[f.key as string] = f.type === 'number' ? (v ? Number(v) : undefined) : v || undefined;
      }
      await create(data);
      setForm({});
      setShowForm(false);
    } catch {
      /* create errors surfaced by data source */
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, key: string, value: string) => {
    await update?.(id, { [key]: value } as Partial<T>);
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm(`Delete this ${entity}?`)) return;
    await remove(id);
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
          <Icon size={14} className="text-[var(--text-tertiary)]" />
          {title}
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log {title}
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-[10px] font-medium text-[var(--text-secondary)] block">
                {f.label}
              </label>
              {f.type === 'select' && f.options ? (
                <select
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === 'date' ? 'date' : 'text'}
                  placeholder={f.placeholder}
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={inputClass}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">{emptyMessage}</p>
      ) : (
        <div className="space-y-1">
          {visible.map((row) => {
            const id = idOf(row);
            return (
              <div key={id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {columns.map((col) => (
                    <span key={col.key} className="truncate">
                      {rowValue(row, col.key)}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {update && (
                    <button
                      onClick={() => {
                        const col = columns[0];
                        const current = rowValue(row, col.key);
                        const next = window.prompt(`Edit ${col.label}:`, current == null ? '' : String(current));
                        if (next !== null) handleUpdate(id, col.key, next);
                      }}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-xs"
                      title="Edit"
                    >
                      ✎
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(id)}
                    className="text-[#DC2626] hover:text-[#B91C1C] text-xs"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
