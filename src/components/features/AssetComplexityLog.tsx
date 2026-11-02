/**
 * Asset Complexity Log · 3D Artist feature.
 * Single-record complexity tracker per project with in-place editing.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Edit3, Save, X } from 'lucide-react';

type Complexity = {
  id: string;
  project_id: string;
  poly_count?: string;
  texture_count?: number;
  rig_complexity?: string;
  software?: string;
  notes?: string;
};

const RIG_OPTIONS = ['none', 'simple', 'medium', 'complex', 'hero'] as const;

export default function AssetComplexityLog({ projectId }: { projectId: string }) {
  const [record, setRecord] = useState<Complexity | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    poly_count: '',
    texture_count: '',
    rig_complexity: 'none',
    software: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadRecord = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Complexity & Record<string, unknown>)[]>(
        'SELECT id, project_id, poly_count, texture_count, rig_complexity, software, notes FROM project_complexity WHERE project_id = ? LIMIT 1',
        [projectId],
      );
      if (rows.length > 0) {
        const r = rows[0];
        const comp: Complexity = {
          id: r.id as string,
          project_id: r.project_id as string,
          poly_count: r.poly_count as string | undefined,
          texture_count: r.texture_count as number | undefined,
          rig_complexity: r.rig_complexity as string | undefined,
          software: r.software as string | undefined,
          notes: r.notes as string | undefined,
        };
        setRecord(comp);
        setForm({
          poly_count: comp.poly_count || '',
          texture_count: comp.texture_count != null ? String(comp.texture_count) : '',
          rig_complexity: comp.rig_complexity || 'none',
          software: comp.software || '',
          notes: comp.notes || '',
        });
      }
    } catch (e) {
      console.error('[AssetComplexityLog] loadRecord failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadRecord();
  }, [projectId, loadRecord]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getDb();
      if (record) {
        await db.execute(
          'UPDATE project_complexity SET poly_count = ?, texture_count = ?, rig_complexity = ?, software = ?, notes = ? WHERE id = ?',
          [
            form.poly_count || null,
            form.texture_count ? parseInt(form.texture_count) : null,
            form.rig_complexity,
            form.software || null,
            form.notes || null,
            record.id,
          ],
        );
        setRecord({
          ...record,
          poly_count: form.poly_count || undefined,
          texture_count: form.texture_count ? parseInt(form.texture_count) : undefined,
          rig_complexity: form.rig_complexity,
          software: form.software || undefined,
          notes: form.notes || undefined,
        });
      } else {
        const id = crypto.randomUUID();
        await db.execute(
          'INSERT INTO project_complexity (id, project_id, poly_count, texture_count, rig_complexity, software, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            id,
            projectId,
            form.poly_count || null,
            form.texture_count ? parseInt(form.texture_count) : null,
            form.rig_complexity,
            form.software || null,
            form.notes || null,
          ],
        );
        setRecord({
          id,
          project_id: projectId,
          poly_count: form.poly_count || undefined,
          texture_count: form.texture_count ? parseInt(form.texture_count) : undefined,
          rig_complexity: form.rig_complexity,
          software: form.software || undefined,
          notes: form.notes || undefined,
        });
      }
      setEditing(false);
    } catch (e) {
      console.error('[AssetComplexityLog] save failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!record) return;
    try {
      const db = await getDb();
      await db.execute('DELETE FROM project_complexity WHERE id = ?', [record.id]);
      setRecord(null);
      setForm({
        poly_count: '',
        texture_count: '',
        rig_complexity: 'none',
        software: '',
        notes: '',
      });
    } catch (e) {
      console.error('[AssetComplexityLog] delete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';
  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Asset Complexity
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
          Asset Complexity
        </h4>
        {record && !editing && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Edit3 size={12} /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="hover:text-[#A32D2D]"
            >
              <X size={12} />
            </Button>
          </div>
        )}
      </div>

      {editing || !record ? (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Poly count"
              value={form.poly_count}
              onChange={(e) => setForm({ ...form, poly_count: e.target.value })}
              className={inputClass}
              autoFocus
            />
            <input
              type="number"
              placeholder="Texture count"
              value={form.texture_count}
              onChange={(e) => setForm({ ...form, texture_count: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Rig Complexity"
              value={form.rig_complexity}
              onChange={(e) => setForm({ ...form, rig_complexity: e.target.value })}
              className={selectClass}
            >
              {RIG_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Software"
              value={form.software}
              onChange={(e) => setForm({ ...form, software: e.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            {record && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    poly_count: record.poly_count || '',
                    texture_count: record.texture_count != null ? String(record.texture_count) : '',
                    rig_complexity: record.rig_complexity || 'none',
                    software: record.software || '',
                    notes: record.notes || '',
                  });
                }}
              >
                Cancel
              </Button>
            )}
            <Button size="sm" onClick={handleSave} loading={saving}>
              <Save size={12} /> {record ? 'Save' : 'Add'}
            </Button>
          </div>
        </div>
      ) : record ? (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[var(--text-tertiary)]">Poly count:</span>
              <span className="ml-1 text-[var(--text-primary)] font-medium">
                {record.poly_count || '--'}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)]">Texture count:</span>
              <span className="ml-1 text-[var(--text-primary)] font-medium">
                {record.texture_count != null ? record.texture_count : '--'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[var(--text-tertiary)]">Rig complexity:</span>
              <span className="ml-1 text-[var(--text-primary)] font-medium capitalize">
                {record.rig_complexity || 'none'}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)]">Software:</span>
              <span className="ml-1 text-[var(--text-primary)] font-medium">
                {record.software || '--'}
              </span>
            </div>
          </div>
          {record.notes && (
            <div>
              <span className="text-[var(--text-tertiary)]">Notes:</span>
              <p className="text-[var(--text-primary)] mt-0.5">{record.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No complexity record yet. Click the edit icon above or use the form to add one.
        </p>
      )}
    </div>
  );
}
