/**
 * Deliverable Format Log · 3D Artist feature.
 * Logs format deliverables with poly/texture specs and delivery status.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Check, CheckCircle2, Box } from 'lucide-react';

type FormatDeliverable = {
  id: string;
  project_id: string;
  format?: string;
  poly_spec?: string;
  texture_spec?: string;
  delivered: number;
  delivery_date?: string;
};

const FORMATS = ['FBX', 'OBJ', 'GLB', 'USDZ', 'BLEND', 'MAX', 'MA', 'other'];

export default function DeliverableFormatLog({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<FormatDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    format: FORMATS[0],
    poly_spec: '',
    texture_spec: '',
    delivery_date: '',
    delivered: false,
  });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(FormatDeliverable & Record<string, unknown>)[]>(
        'SELECT id, project_id, format, poly_spec, texture_spec, delivered, delivery_date FROM format_deliverables WHERE project_id = ? ORDER BY id DESC',
        [projectId],
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          format: r.format as string | undefined,
          poly_spec: r.poly_spec as string | undefined,
          texture_spec: r.texture_spec as string | undefined,
          delivered: r.delivered as number,
          delivery_date: r.delivery_date as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[DeliverableFormatLog] loadItems failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadItems();
  }, [projectId, loadItems]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO format_deliverables (id, project_id, format, poly_spec, texture_spec, delivered, delivery_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.format,
          form.poly_spec || null,
          form.texture_spec || null,
          form.delivered ? 1 : 0,
          form.delivery_date || null,
        ],
      );
      const item: FormatDeliverable = {
        id,
        project_id: projectId,
        format: form.format,
        poly_spec: form.poly_spec || undefined,
        texture_spec: form.texture_spec || undefined,
        delivered: form.delivered ? 1 : 0,
        delivery_date: form.delivery_date || undefined,
      };
      setItems((prev) => [item, ...prev]);
      setForm({
        format: FORMATS[0],
        poly_spec: '',
        texture_spec: '',
        delivery_date: '',
        delivered: false,
      });
      setShowForm(false);
    } catch (e) {
      console.error('[DeliverableFormatLog] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM format_deliverables WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[DeliverableFormatLog] delete failed:', e);
    }
  };

  const handleToggleDelivered = async (item: FormatDeliverable) => {
    const nextVal = item.delivered ? 0 : 1;
    try {
      const db = await getDb();
      await db.execute('UPDATE format_deliverables SET delivered = ? WHERE id = ?', [
        nextVal,
        item.id,
      ]);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, delivered: nextVal } : i)));
    } catch (e) {
      console.error('[DeliverableFormatLog] toggle failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  const deliveredCount = items.filter((i) => i.delivered).length;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Format Deliverables
          </h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Format Deliverables ({items.length})
          {deliveredCount > 0 && (
            <span className="ml-1 text-[var(--accent-ink,var(--accent))]">
              {deliveredCount} delivered
            </span>
          )}
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Format
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Format"
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className={inputClass}
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Poly spec"
              value={form.poly_spec}
              onChange={(e) => setForm({ ...form, poly_spec: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Texture spec"
              value={form.texture_spec}
              onChange={(e) => setForm({ ...form, texture_spec: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={form.delivery_date}
              onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.delivered}
              onChange={(e) => setForm({ ...form, delivered: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            Delivered
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>
              Add
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No format deliverables yet. Add your first one.
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Box size={10} className="text-[var(--text-tertiary)]" />
                <span
                  className={`font-medium ${item.delivered ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}
                >
                  {item.format || '--'}
                </span>
                {item.poly_spec && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">
                    {item.poly_spec}
                  </span>
                )}
                {item.texture_spec && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">
                    {item.texture_spec}
                  </span>
                )}
                {item.delivery_date && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {item.delivery_date}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                <button
                  onClick={() => handleToggleDelivered(item)}
                  className={
                    item.delivered
                      ? 'text-[var(--accent-ink,var(--accent))]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--accent-ink,var(--accent))]'
                  }
                  title={item.delivered ? 'Mark undelivered' : 'Mark delivered'}
                >
                  {item.delivered ? <CheckCircle2 size={12} /> : <Check size={12} />}
                </button>
                <button
                  aria-label="Delete deliverable format log"
                  onClick={() => handleDelete(item.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D]"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
