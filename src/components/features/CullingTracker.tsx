import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Clock, Scissors, Edit3 } from 'lucide-react';

type CullingSession = {
  id: string;
  project_id: string;
  shoot_id?: string;
  date?: string;
  shoot_hours?: number;
  culling_hours?: number;
  editing_hours?: number;
  notes?: string;
};

export default function CullingTracker({ projectId }: { projectId: string }) {
  const { shoots, loadShoots } = useStore();
  const [sessions, setSessions] = useState<CullingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ shoot_id: '', date: '', shoot_hours: '', culling_hours: '', editing_hours: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<CullingSession[]>('SELECT * FROM culling_sessions WHERE project_id = $1 ORDER BY date DESC', [projectId]);
      setSessions(rows);
    } catch { /* handled */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadShoots();
    loadSessions();
  }, [projectId, loadSessions, loadShoots]);

  const projectShoots = shoots.filter(s => s.project_id === projectId);

  const handleSave = async () => {
    if (!form.date.trim()) return;
    setSaving(true);
    try {
      const db = await getDb();
      const id = crypto.randomUUID();
      await db.execute(
        'INSERT INTO culling_sessions (id, project_id, shoot_id, date, shoot_hours, culling_hours, editing_hours, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, projectId, form.shoot_id || null, form.date || null, form.shoot_hours ? parseFloat(form.shoot_hours) : null, form.culling_hours ? parseFloat(form.culling_hours) : null, form.editing_hours ? parseFloat(form.editing_hours) : null, form.notes || null]
      );
      setSessions([{ id, project_id: projectId, shoot_id: form.shoot_id || undefined, date: form.date, shoot_hours: form.shoot_hours ? parseFloat(form.shoot_hours) : undefined, culling_hours: form.culling_hours ? parseFloat(form.culling_hours) : undefined, editing_hours: form.editing_hours ? parseFloat(form.editing_hours) : undefined, notes: form.notes || undefined }, ...sessions]);
      setForm({ shoot_id: '', date: '', shoot_hours: '', culling_hours: '', editing_hours: '', notes: '' });
      setShowForm(false);
    } catch { /* handled */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM culling_sessions WHERE id = $1', [id]);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch { /* handled */ }
  };

  const totalCulling = sessions.reduce((sum, s) => sum + (s.culling_hours || 0), 0);
  const totalShoot = sessions.reduce((sum, s) => sum + (s.shoot_hours || 0), 0);
  const totalEditing = sessions.reduce((sum, s) => sum + (s.editing_hours || 0), 0);
  const editingRatio = totalShoot > 0 ? (totalEditing / totalShoot) : 0;

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) return <p className="text-xs text-[var(--text-tertiary)] py-2">Loading...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Culling</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Session
        </Button>
      </div>

      {(totalShoot > 0 || totalCulling > 0 || totalEditing > 0) && (
        <div className="flex items-center gap-4 px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
          <span className="text-[var(--text-tertiary)]">Total culling: <span className="text-[var(--text-primary)] font-medium">{totalCulling}h</span></span>
          <span className="text-[var(--text-tertiary)]">Ratio: <span className="text-[var(--text-primary)] font-medium">{editingRatio.toFixed(1)}h editing per 1h shoot</span></span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <select value={form.shoot_id} onChange={(e) => setForm({ ...form, shoot_id: e.target.value })} className={inputClass}>
            <option value="">Select shoot...</option>
            {projectShoots.map((s) => (
              <option key={s.id} value={s.id}>{s.shoot_date?.split('T')[0] || s.id} · {s.location || ''}</option>
            ))}
          </select>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Shoot hours" step="0.5" value={form.shoot_hours} onChange={(e) => setForm({ ...form, shoot_hours: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Culling hours" step="0.5" value={form.culling_hours} onChange={(e) => setForm({ ...form, culling_hours: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Editing hours" step="0.5" value={form.editing_hours} onChange={(e) => setForm({ ...form, editing_hours: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No culling sessions logged yet.</p>
      ) : (
        <div className="space-y-1">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-[var(--text-primary)]">{s.date?.split('T')[0] || '--'}</span>
                <span className="text-[var(--text-tertiary)] ml-2">
                  {s.shoot_hours != null && <><Clock size={10} className="inline mr-0.5" />{s.shoot_hours}h shoot </>}
                  {s.culling_hours != null && <><Scissors size={10} className="inline mr-0.5 ml-1" />{s.culling_hours}h cull </>}
                  {s.editing_hours != null && <><Edit3 size={10} className="inline mr-0.5 ml-1" />{s.editing_hours}h edit</>}
                </span>
              </div>
              <button
                aria-label="Delete culling tracker"
                onClick={() => handleDelete(s.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
