/**
 * SLA Tracker · DevOps feature.
 * Track service-level agreements with metric name, target, actual, and status indicator.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Target, TrendingUp } from 'lucide-react';

type SLA = {
  id: string;
  project_id: string;
  metric_name: string;
  target?: string;
  actual?: string;
  period?: string;
};

export default function SLATracker({ projectId }: { projectId: string }) {
  const [slas, setSlas] = useState<SLA[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ metric_name: '', target: '', actual: '', period: '' });
  const [saving, setSaving] = useState(false);

  const loadSLAs = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(SLA & Record<string, unknown>)[]>(
        'SELECT id, project_id, metric_name, target, actual, period FROM slas WHERE project_id = ? ORDER BY metric_name ASC',
        [projectId]
      );
      setSlas(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        metric_name: r.metric_name as string,
        target: r.target as string | undefined,
        actual: r.actual as string | undefined,
        period: r.period as string | undefined,
      })));
    } catch (e) { console.error('[SLATracker] loadSLAs failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadSLAs(); }, [projectId, loadSLAs]);

  const handleAdd = async () => {
    if (!form.metric_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO slas (id, project_id, metric_name, target, actual, period) VALUES (?, ?, ?, ?, ?, ?)',
        [id, projectId, form.metric_name.trim(), form.target || null, form.actual || null, form.period || null]
      );
      const sla: SLA = { id, project_id: projectId, metric_name: form.metric_name.trim(), target: form.target || undefined, actual: form.actual || undefined, period: form.period || undefined };
      setSlas(prev => [...prev, sla].sort((a, b) => a.metric_name.localeCompare(b.metric_name)));
      setForm({ metric_name: '', target: '', actual: '', period: '' });
      setShowForm(false);
    } catch (e) { console.error('[SLATracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM slas WHERE id = ?', [id]);
      setSlas(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error('[SLATracker] delete failed:', e); }
  };

  const metCount = slas.filter(s => s.actual && s.target && parseFloat(s.actual) >= parseFloat(s.target)).length;
  const totalCount = slas.length;

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">SLA Tracking</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">SLA Tracking ({totalCount})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Metric
        </Button>
      </div>

      {totalCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-[var(--bg-secondary)] text-xs">
          <TrendingUp size={10} className="text-[var(--accent)]" />
          <span className="text-[var(--text-primary)]">{metCount}/{totalCount} metrics meeting target</span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Metric name" value={form.metric_name} onChange={(e) => setForm({ ...form, metric_name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Target value" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Actual value" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Period (e.g. monthly)" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.metric_name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {slas.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No SLA metrics tracked yet.</p>
      ) : (
        <div className="space-y-1">
          {slas.map((sla) => {
            const isMet = sla.actual && sla.target && parseFloat(sla.actual) >= parseFloat(sla.target);
            return (
              <div key={sla.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isMet ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
                  <span className="font-medium text-[var(--text-primary)] truncate">{sla.metric_name}</span>
                  {sla.target && (
                    <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5 flex-shrink-0">
                      <Target size={9} />
                      Target: {sla.target}
                    </span>
                  )}
                  {sla.actual && (
                    <span className={`text-[10px] ${isMet ? 'text-[#16A34A]' : 'text-[#DC2626]'} font-medium flex-shrink-0`}>
                      Actual: {sla.actual}
                    </span>
                  )}
                  {sla.period && (
                    <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{sla.period}</span>
                  )}
                </div>
                <button onClick={() => handleDelete(sla.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
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
