/**
 * CTA Library · Copywriter feature.
 * CTA performance tracking with conversion rate and CTR.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type CTA = {
  id: string;
  project_id: string;
  name: string;
  type?: string;
  conversion_rate?: number;
  impressions?: number;
  clicks?: number;
  notes?: string;
};

export default function CTALibrary({ projectId }: { projectId: string }) {
  const [ctas, setCtas] = useState<CTA[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: '',
    conversion_rate: '',
    impressions: '',
    clicks: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadCtas = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(CTA & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, type, conversion_rate, impressions, clicks, notes FROM ctas WHERE project_id = ? ORDER BY name ASC',
        [projectId]
      );
      setCtas(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          name: r.name as string,
          type: r.type as string | undefined,
          conversion_rate: r.conversion_rate as number | undefined,
          impressions: r.impressions as number | undefined,
          clicks: r.clicks as number | undefined,
          notes: r.notes as string | undefined,
        }))
      );
    } catch (e) {
      console.error('[CTALibrary] loadCtas failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadCtas();
  }, [projectId, loadCtas]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO ctas (id, project_id, name, type, conversion_rate, impressions, clicks, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.name.trim(),
          form.type || null,
          form.conversion_rate ? parseFloat(form.conversion_rate) : null,
          form.impressions ? parseInt(form.impressions) : null,
          form.clicks ? parseInt(form.clicks) : null,
          form.notes || null,
        ]
      );
      const cta: CTA = {
        id,
        project_id: projectId,
        name: form.name.trim(),
        type: form.type || undefined,
        conversion_rate: form.conversion_rate ? parseFloat(form.conversion_rate) : undefined,
        impressions: form.impressions ? parseInt(form.impressions) : undefined,
        clicks: form.clicks ? parseInt(form.clicks) : undefined,
        notes: form.notes || undefined,
      };
      setCtas((prev) => [...prev, cta].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', type: '', conversion_rate: '', impressions: '', clicks: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[CTALibrary] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM ctas WHERE id = ?', [id]);
      setCtas((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('[CTALibrary] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">CTA Library</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          CTA Library ({ctas.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add CTA
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="CTA name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <input
            type="text"
            placeholder="Type (e.g. button, text link)"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className={inputClass}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Conv. rate"
              value={form.conversion_rate}
              onChange={(e) => setForm({ ...form, conversion_rate: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Impressions"
              value={form.impressions}
              onChange={(e) => setForm({ ...form, impressions: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Clicks"
              value={form.clicks}
              onChange={(e) => setForm({ ...form, clicks: e.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {ctas.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No CTAs yet.</p>
      ) : (
        <div className="space-y-1">
          {ctas.map((cta) => {
            const ctr = cta.impressions && cta.clicks ? ((cta.clicks / cta.impressions) * 100) : null;
            return (
              <div key={cta.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)] truncate">{cta.name}</span>
                  {cta.type && <span className="text-[10px] text-[var(--text-tertiary)]">{cta.type}</span>}
                  {cta.conversion_rate != null && (
                    <span className="text-[10px] text-[#16A34A] font-medium">
                      {cta.conversion_rate.toFixed(1)}% conv
                    </span>
                  )}
                  {ctr != null && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">{ctr.toFixed(2)}% CTR</span>
                  )}
                  {cta.impressions != null && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">{cta.impressions.toLocaleString()} imp</span>
                  )}
                  {cta.clicks != null && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">{cta.clicks.toLocaleString()} clicks</span>
                  )}
                  {cta.notes && <span className="text-[10px] text-[var(--text-tertiary)] truncate">{cta.notes}</span>}
                </div>
                <button
                  aria-label="Delete cta library"
                  onClick={() => handleDelete(cta.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
