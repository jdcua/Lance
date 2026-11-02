/**
 * Deliverable Log · Animator feature.
 * Tracks project deliverables with format, resolution, approval status.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Check, Film } from 'lucide-react';

type Deliverable = {
  id: string;
  project_id: string;
  file_name?: string;
  format?: string;
  resolution?: string;
  delivery_date?: string;
  client_approved: boolean;
  notes?: string;
};

const FORMATS = ['MP4', 'MOV', 'GIF', 'PNG-seq', 'AEP', 'C4D', 'Other'];

export default function DeliverableLog({ projectId }: { projectId: string }) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    file_name: '',
    format: FORMATS[0],
    resolution: '',
    delivery_date: '',
    client_approved: false,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadDeliverables = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Deliverable & Record<string, unknown>)[]>(
        'SELECT id, project_id, file_name, format, resolution, delivery_date, client_approved, notes FROM deliverables WHERE project_id = ? ORDER BY id DESC',
        [projectId],
      );
      setDeliverables(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          file_name: r.file_name as string | undefined,
          format: r.format as string | undefined,
          resolution: r.resolution as string | undefined,
          delivery_date: r.delivery_date as string | undefined,
          client_approved: !!r.client_approved,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[DeliverableLog] loadDeliverables failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadDeliverables();
  }, [projectId, loadDeliverables]);

  const handleSave = async () => {
    if (!form.file_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO deliverables (id, project_id, file_name, format, resolution, delivery_date, client_approved, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.file_name.trim(),
          form.format,
          form.resolution || null,
          form.delivery_date || null,
          form.client_approved ? 1 : 0,
          form.notes || null,
        ],
      );
      const item: Deliverable = {
        id,
        project_id: projectId,
        file_name: form.file_name.trim(),
        format: form.format,
        resolution: form.resolution || undefined,
        delivery_date: form.delivery_date || undefined,
        client_approved: form.client_approved,
        notes: form.notes || undefined,
      };
      setDeliverables((prev) => [item, ...prev]);
      setForm({
        file_name: '',
        format: FORMATS[0],
        resolution: '',
        delivery_date: '',
        client_approved: false,
        notes: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[DeliverableLog] addDeliverable failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM deliverables WHERE id = ?', [id]);
      setDeliverables((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error('[DeliverableLog] deleteDeliverable failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Deliverables
          </h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Deliverables ({deliverables.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Deliverable
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="File name"
            value={form.file_name}
            onChange={(e) => setForm({ ...form, file_name: e.target.value })}
            className={inputClass}
            autoFocus
          />
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
              placeholder="Resolution (e.g. 1920x1080)"
              value={form.resolution}
              onChange={(e) => setForm({ ...form, resolution: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <input
              type="date"
              value={form.delivery_date}
              onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
              className={inputClass}
            />
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={form.client_approved}
                onChange={(e) => setForm({ ...form, client_approved: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              Client approved
            </label>
          </div>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.file_name.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {deliverables.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No deliverables yet. Add your first deliverable.
        </p>
      ) : (
        <div className="space-y-1">
          {deliverables.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Film size={10} className="text-[var(--text-tertiary)]" />
                <span className="font-medium text-[var(--text-primary)]">
                  {d.file_name || '--'}
                </span>
                {d.format && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">
                    {d.format}
                  </span>
                )}
                {d.client_approved && (
                  <Check
                    size={12}
                    className="text-[var(--accent-ink,var(--accent))] flex-shrink-0"
                  />
                )}
              </div>
              <button
                aria-label="Delete deliverable log"
                onClick={() => handleDelete(d.id)}
                className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
