/**
 * Cut Tracker · Filmmaker feature.
 * Tracks project cuts with duration, format, approval, and summary stats.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Check } from 'lucide-react';

type Cut = { id: string; project_id: string; cut_name?: string; duration_seconds?: number; format?: string; client_approved: boolean; delivery_date?: string; notes?: string };

function secondsToMmss(seconds: number | undefined): string {
  if (seconds == null || seconds < 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function mmssToSeconds(mmss: string): number | undefined {
  const parts = mmss.split(':');
  if (parts.length !== 2) return undefined;
  const m = parseInt(parts[0], 10);
  const s = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(s) || s >= 60) return undefined;
  return m * 60 + s;
}

export default function CutTracker({ projectId }: { projectId: string }) {
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ cut_name: '', duration_mmss: '', format: '', delivery_date: '', client_approved: false, notes: '' });
  const [saving, setSaving] = useState(false);

  const loadCuts = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Cut & Record<string, unknown>)[]>('SELECT id, project_id, cut_name, duration_seconds, format, client_approved, delivery_date, notes FROM cuts WHERE project_id = ? ORDER BY id DESC', [projectId]);
      setCuts(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        cut_name: r.cut_name as string | undefined,
        duration_seconds: r.duration_seconds as number | undefined,
        format: r.format as string | undefined,
        client_approved: !!(r.client_approved),
        delivery_date: r.delivery_date as string | undefined,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[CutTracker] loadCuts failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadCuts(); }, [projectId]);

  const handleSave = async () => {
    if (!form.cut_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const durationSeconds = form.duration_mmss ? mmssToSeconds(form.duration_mmss) : undefined;
      await db.execute(
        'INSERT INTO cuts (id, project_id, cut_name, duration_seconds, format, client_approved, delivery_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.cut_name.trim(), durationSeconds ?? null, form.format || null, form.client_approved ? 1 : 0, form.delivery_date || null, form.notes || null]
      );
      const item: Cut = { id, project_id: projectId, cut_name: form.cut_name.trim(), duration_seconds: durationSeconds, format: form.format || undefined, client_approved: form.client_approved, delivery_date: form.delivery_date || undefined, notes: form.notes || undefined };
      setCuts(prev => [item, ...prev]);
      setForm({ cut_name: '', duration_mmss: '', format: '', delivery_date: '', client_approved: false, notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[CutTracker] addCut failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM cuts WHERE id = ?', [id]);
      setCuts(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error('[CutTracker] deleteCut failed:', e); }
  };

  const totalCount = cuts.length;
  const approvedCount = cuts.filter(c => c.client_approved).length;
  const totalSeconds = cuts.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Cuts</h4>
      </div>
      <div className="space-y-1">
        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Cuts ({totalCount})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Cut
        </Button>
      </div>

      {cuts.length > 0 && (
        <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
          <span>{approvedCount} / {totalCount} approved</span>
          <span>Total runtime: {secondsToMmss(totalSeconds)}</span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Cut name (e.g. Rough Cut v1)" value={form.cut_name} onChange={(e) => setForm({ ...form, cut_name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Duration (mm:ss)" value={form.duration_mmss} onChange={(e) => setForm({ ...form, duration_mmss: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Format (e.g. ProRes 422)" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className={inputClass} />
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" checked={form.client_approved} onChange={(e) => setForm({ ...form, client_approved: e.target.checked })} className="accent-[var(--accent)]" />
              Client approved
            </label>
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.cut_name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {cuts.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No cuts yet. Add your first cut.</p>
      ) : (
        <div className="space-y-1">
          {cuts.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">{c.cut_name || '--'}</span>
                <span className="text-[var(--text-tertiary)] tabular-nums">{secondsToMmss(c.duration_seconds)}</span>
                {c.format && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">{c.format}</span>}
                {c.client_approved && <Check size={12} className="text-[var(--accent)] flex-shrink-0" />}
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
