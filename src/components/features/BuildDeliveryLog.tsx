/**
 * Build Delivery Log · Game Developer feature.
 * Changelog-style list of build deliveries, most recent first.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Package, Calendar, Monitor } from 'lucide-react';

type BuildDelivery = {
  id: string;
  project_id: string;
  version?: string;
  date?: string;
  platform?: string;
  notes?: string;
  created_at: string;
};

export default function BuildDeliveryLog({ projectId }: { projectId: string }) {
  const [deliveries, setDeliveries] = useState<BuildDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ version: '', date: '', platform: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadDeliveries = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(BuildDelivery & Record<string, unknown>)[]>(
        'SELECT id, project_id, version, date, platform, notes, created_at FROM build_deliveries WHERE project_id = ? ORDER BY created_at DESC, date DESC',
        [projectId]
      );
      setDeliveries(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        version: r.version as string | undefined,
        date: r.date as string | undefined,
        platform: r.platform as string | undefined,
        notes: r.notes as string | undefined,
        created_at: r.created_at as string,
      })));
    } catch (e) { console.error('[BuildDeliveryLog] loadDeliveries failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadDeliveries(); }, [projectId, loadDeliveries]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const db = await getDb();
      await db.execute(
        'INSERT INTO build_deliveries (id, project_id, version, date, platform, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.version || null, form.date || null, form.platform || null, form.notes || null, createdAt]
      );
      const delivery: BuildDelivery = {
        id,
        project_id: projectId,
        version: form.version || undefined,
        date: form.date || undefined,
        platform: form.platform || undefined,
        notes: form.notes || undefined,
        created_at: createdAt,
      };
      setDeliveries(prev => [delivery, ...prev]);
      setForm({ version: '', date: '', platform: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[BuildDeliveryLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM build_deliveries WHERE id = ?', [id]);
      setDeliveries(prev => prev.filter(d => d.id !== id));
    } catch (e) { console.error('[BuildDeliveryLog] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Build Deliveries</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Build Deliveries ({deliveries.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Delivery
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Version (e.g. v0.1.0)"
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
              className={inputClass}
              autoFocus
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
            />
          </div>
          <input
            type="text"
            placeholder="Platform (e.g. PC, iOS, Android)"
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>Add</Button>
          </div>
        </div>
      )}

      {deliveries.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No build deliveries yet. Log your first build.</p>
      ) : (
        <div className="space-y-1">
          {deliveries.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Package size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                {d.version ? (
                  <span className="font-medium text-[var(--text-primary)]">{d.version}</span>
                ) : (
                  <span className="text-[var(--text-tertiary)]">--</span>
                )}
                {d.platform && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)] flex items-center gap-0.5">
                    <Monitor size={9} /> {d.platform}
                  </span>
                )}
                {d.date && (
                  <span className="text-[var(--text-tertiary)] flex items-center gap-0.5">
                    <Calendar size={9} /> {d.date}
                  </span>
                )}
                {d.notes && (
                  <span className="text-[var(--text-tertiary)] truncate">{d.notes}</span>
                )}
              </div>
              <button
                aria-label="Delete build delivery log"
                onClick={() => handleDelete(d.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
