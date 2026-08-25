/**
 * Deliverable Specs -- Filmmaker feature.
 * Single-record-per-project deliverable specification form.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';

type Spec = { id: string; project_id: string; format?: string; resolution?: string; aspect_ratio?: string; audio_spec?: string; delivery_method?: string; notes?: string };

const FIELDS: { key: keyof Spec; label: string }[] = [
  { key: 'format', label: 'Format' },
  { key: 'resolution', label: 'Resolution' },
  { key: 'aspect_ratio', label: 'Aspect Ratio' },
  { key: 'audio_spec', label: 'Audio Spec' },
  { key: 'delivery_method', label: 'Delivery Method' },
  { key: 'notes', label: 'Notes' },
];

export default function DeliverableSpecs({ projectId }: { projectId: string }) {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadSpec = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Spec & Record<string, unknown>)[]>('SELECT id, project_id, format, resolution, aspect_ratio, audio_spec, delivery_method, notes FROM deliverable_specs WHERE project_id = ? LIMIT 1', [projectId]);
      if (rows.length > 0) {
        const r = rows[0];
        const loaded: Spec = {
          id: r.id as string,
          project_id: r.project_id as string,
          format: r.format as string | undefined,
          resolution: r.resolution as string | undefined,
          aspect_ratio: r.aspect_ratio as string | undefined,
          audio_spec: r.audio_spec as string | undefined,
          delivery_method: r.delivery_method as string | undefined,
          notes: r.notes as string | undefined,
        };
        setSpec(loaded);
        setForm({
          format: loaded.format || '',
          resolution: loaded.resolution || '',
          aspect_ratio: loaded.aspect_ratio || '',
          audio_spec: loaded.audio_spec || '',
          delivery_method: loaded.delivery_method || '',
          notes: loaded.notes || '',
        });
      }
    } catch (e) { console.error('[DeliverableSpecs] loadSpec failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadSpec(); }, [projectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getDb();
      if (spec) {
        await db.execute(
          'UPDATE deliverable_specs SET format = ?, resolution = ?, aspect_ratio = ?, audio_spec = ?, delivery_method = ?, notes = ? WHERE id = ?',
          [form.format || null, form.resolution || null, form.aspect_ratio || null, form.audio_spec || null, form.delivery_method || null, form.notes || null, spec.id]
        );
        const updated: Spec = {
          ...spec,
          format: form.format || undefined,
          resolution: form.resolution || undefined,
          aspect_ratio: form.aspect_ratio || undefined,
          audio_spec: form.audio_spec || undefined,
          delivery_method: form.delivery_method || undefined,
          notes: form.notes || undefined,
        };
        setSpec(updated);
      } else {
        const id = crypto.randomUUID();
        await db.execute(
          'INSERT INTO deliverable_specs (id, project_id, format, resolution, aspect_ratio, audio_spec, delivery_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, projectId, form.format || null, form.resolution || null, form.aspect_ratio || null, form.audio_spec || null, form.delivery_method || null, form.notes || null]
        );
        const created: Spec = {
          id,
          project_id: projectId,
          format: form.format || undefined,
          resolution: form.resolution || undefined,
          aspect_ratio: form.aspect_ratio || undefined,
          audio_spec: form.audio_spec || undefined,
          delivery_method: form.delivery_method || undefined,
          notes: form.notes || undefined,
        };
        setSpec(created);
      }
      setEditing(false);
    } catch (e) { console.error('[DeliverableSpecs] save failed:', e); }
    setSaving(false);
  };

  const startEdit = () => {
    setForm({
      format: spec?.format || '',
      resolution: spec?.resolution || '',
      aspect_ratio: spec?.aspect_ratio || '',
      audio_spec: spec?.audio_spec || '',
      delivery_method: spec?.delivery_method || '',
      notes: spec?.notes || '',
    });
    setEditing(true);
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  const hasAnyValue = spec && FIELDS.some(f => spec[f.key]);

  if (loading) {
    return <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Deliverable Specs</h4>
      </div>
      <div className="space-y-1">
        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Deliverable Specs</h4>
        {editing ? (
          <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={startEdit}>
            {spec ? 'Edit' : 'Add Specs'}
          </Button>
        )}
      </div>

      {!editing && !hasAnyValue ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No deliverable specs set. Add your delivery specifications.</p>
      ) : editing ? (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-[10px] text-[var(--text-tertiary)] block mb-0.5">{f.label}</label>
              {f.key === 'notes' ? (
                <textarea
                  placeholder={f.label}
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  rows={2}
                  className={inputClass + ' resize-none'}
                />
              ) : (
                <input
                  type="text"
                  placeholder={f.label}
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={inputClass}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {spec && FIELDS.map(f => (
            <div key={f.key} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <span className="text-[var(--text-tertiary)]">{f.label}</span>
              <span className="font-medium text-[var(--text-primary)]">{spec[f.key] || '--'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
