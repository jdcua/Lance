/**
 * Analysis Deliverable Log · Data Analyst feature.
 * Track deliverables with title, type, version, delivery date, and notes.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, FileText, Calendar, GitBranch } from 'lucide-react';

type Deliverable = {
  id: string;
  project_id: string;
  title: string;
  type?: string;
  version?: string;
  delivery_date?: string;
  notes?: string;
};

const TYPE_OPTIONS = ['dashboard', 'report', 'model', 'presentation', 'dataset', 'API', 'other'] as const;

const typeBadgeClasses: Record<string, string> = {
  dashboard: 'bg-[#2563EB]/15 text-[#2563EB]',
  report: 'bg-[#16A34A]/15 text-[#16A34A]',
  model: 'bg-[#7C3AED]/15 text-[#7C3AED]',
  presentation: 'bg-[#D97706]/15 text-[#D97706]',
  dataset: 'bg-[#059669]/15 text-[#059669]',
  API: 'bg-[#DC2626]/15 text-[#DC2626]',
  other: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
};

export default function AnalysisDeliverableLog({ projectId }: { projectId: string }) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'report', version: '', delivery_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadDeliverables = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Deliverable & Record<string, unknown>)[]>(
        'SELECT id, project_id, title, type, version, delivery_date, notes FROM analysis_deliverables WHERE project_id = ? ORDER BY delivery_date DESC, title ASC',
        [projectId]
      );
      setDeliverables(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        title: r.title as string,
        type: r.type as string | undefined,
        version: r.version as string | undefined,
        delivery_date: r.delivery_date as string | undefined,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[AnalysisDeliverableLog] loadDeliverables failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadDeliverables(); }, [projectId, loadDeliverables]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO analysis_deliverables (id, project_id, title, type, version, delivery_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.title.trim(), form.type || null, form.version || null, form.delivery_date || null, form.notes || null]
      );
      const item: Deliverable = { id, project_id: projectId, title: form.title.trim(), type: form.type || undefined, version: form.version || undefined, delivery_date: form.delivery_date || undefined, notes: form.notes || undefined };
      setDeliverables(prev => {
        const next = [item, ...prev];
        next.sort((a, b) => new Date(b.delivery_date || '').getTime() - new Date(a.delivery_date || '').getTime() || a.title.localeCompare(b.title));
        return next;
      });
      setForm({ title: '', type: 'report', version: '', delivery_date: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[AnalysisDeliverableLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM analysis_deliverables WHERE id = ?', [id]);
      setDeliverables(prev => prev.filter(d => d.id !== id));
    } catch (e) { console.error('[AnalysisDeliverableLog] delete failed:', e); }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Analysis Deliverables</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Analysis Deliverables ({deliverables.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Deliverable
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Deliverable title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={selectClass}>
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" placeholder="Version (e.g. v1.0)" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>Add</Button>
          </div>
        </div>
      )}

      {deliverables.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No analysis deliverables yet. Add your first deliverable.</p>
      ) : (
        <div className="space-y-1">
          {deliverables.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="font-medium text-[var(--text-primary)] truncate">{d.title}</span>
                {d.type && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${typeBadgeClasses[d.type] || typeBadgeClasses.other}`}>
                    {d.type}
                  </span>
                )}
                {d.version && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5 flex-shrink-0">
                    <GitBranch size={9} />
                    {d.version}
                  </span>
                )}
                {d.delivery_date && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5 flex-shrink-0">
                    <Calendar size={9} />
                    {formatDate(d.delivery_date)}
                  </span>
                )}
              </div>
              <button
                aria-label="Delete analysis deliverable log"
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
