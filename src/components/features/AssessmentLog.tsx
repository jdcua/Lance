/**
 * Assessment Log · Trainer feature.
 * Timeline list of assessments with date, metrics, and notes.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ClipboardCheck, Calendar } from 'lucide-react';

type Assessment = {
  id: string;
  client_id: string;
  date: string;
  metrics?: string;
  notes?: string;
};

export default function AssessmentLog({ clientId }: { clientId: string }) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], metrics: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadAssessments = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Assessment & Record<string, unknown>)[]>(
        'SELECT id, client_id, date, metrics, notes FROM assessments WHERE client_id = ? ORDER BY date DESC',
        [clientId]
      );
      setAssessments(rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        date: r.date as string,
        metrics: r.metrics as string | undefined,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[AssessmentLog] loadAssessments failed:', e); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadAssessments(); }, [clientId, loadAssessments]);

  const handleAdd = async () => {
    if (!form.date) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO assessments (id, client_id, date, metrics, notes) VALUES (?, ?, ?, ?, ?)',
        [id, clientId, form.date, form.metrics || null, form.notes || null]
      );
      const assessment: Assessment = { id, client_id: clientId, date: form.date, metrics: form.metrics || undefined, notes: form.notes || undefined };
      setAssessments(prev => {
        const next = [assessment, ...prev];
        next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return next;
      });
      setForm({ date: new Date().toISOString().split('T')[0], metrics: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[AssessmentLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM assessments WHERE id = ?', [id]);
      setAssessments(prev => prev.filter(a => a.id !== id));
    } catch (e) { console.error('[AssessmentLog] delete failed:', e); }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Assessments</h4>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Assessments ({assessments.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Assessment
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} autoFocus />
          <input type="text" placeholder="Metrics (e.g. weight, BF%, 1RM)" value={form.metrics} onChange={(e) => setForm({ ...form, metrics: e.target.value })} className={inputClass} />
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.date}>Save</Button>
          </div>
        </div>
      )}

      {assessments.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No assessments recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {assessments.map((a) => (
            <div key={a.id} className="flex items-start justify-between px-3 py-2.5 bg-[var(--bg-secondary)] rounded-xs text-xs border-l-[3px] border-[var(--accent)]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                    <Calendar size={10} />
                    {formatDate(a.date)}
                  </span>
                </div>
                {a.metrics && (
                  <p className="text-[var(--text-primary)] leading-relaxed mb-1">
                    <ClipboardCheck size={10} className="inline mr-1 text-[var(--text-tertiary)]" />
                    {a.metrics}
                  </p>
                )}
                {a.notes && (
                  <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{a.notes}</p>
                )}
              </div>
              <button
                aria-label="Delete assessment log"
                onClick={() => handleDelete(a.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] flex-shrink-0 mt-0.5 ml-2">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
