/**
 * Progress Reports · Tutor feature.
 * Timeline list of progress reports with date, summary, next steps, and score.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, FileText, Calendar } from 'lucide-react';

type ProgressReport = {
  id: string;
  project_id: string;
  date: string;
  summary?: string;
  next_steps?: string;
  score?: number;
};

export default function ProgressReports({ projectId }: { projectId: string }) {
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], summary: '', next_steps: '', score: '' });
  const [saving, setSaving] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ProgressReport & Record<string, unknown>)[]>(
        'SELECT id, project_id, date, summary, next_steps, score FROM progress_reports WHERE project_id = ? ORDER BY date DESC',
        [projectId]
      );
      setReports(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        date: r.date as string,
        summary: r.summary as string | undefined,
        next_steps: r.next_steps as string | undefined,
        score: r.score as number | undefined,
      })));
    } catch (e) { console.error('[ProgressReports] loadReports failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadReports(); }, [projectId, loadReports]);

  const handleAdd = async () => {
    if (!form.date) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const scoreVal = form.score ? Math.min(100, Math.max(0, parseInt(form.score) || 0)) : null;
      await db.execute(
        'INSERT INTO progress_reports (id, project_id, date, summary, next_steps, score) VALUES (?, ?, ?, ?, ?, ?)',
        [id, projectId, form.date, form.summary || null, form.next_steps || null, scoreVal]
      );
      const report: ProgressReport = { id, project_id: projectId, date: form.date, summary: form.summary || undefined, next_steps: form.next_steps || undefined, score: scoreVal ?? undefined };
      setReports(prev => {
        const next = [report, ...prev];
        next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return next;
      });
      setForm({ date: new Date().toISOString().split('T')[0], summary: '', next_steps: '', score: '' });
      setShowForm(false);
    } catch (e) { console.error('[ProgressReports] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM progress_reports WHERE id = ?', [id]);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (e) { console.error('[ProgressReports] delete failed:', e); }
  };

  const getScoreBadge = (score?: number) => {
    if (score == null) return null;
    let colorClass = 'bg-[#16A34A]/15 text-[#16A34A]';
    if (score < 50) colorClass = 'bg-[#DC2626]/15 text-[#DC2626]';
    else if (score <= 75) colorClass = 'bg-[#D97706]/15 text-[#D97706]';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${colorClass}`}>{score}/100</span>;
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
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Progress Reports</h4>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Progress Reports ({reports.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> New Report
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
            <input type="number" min="0" max="100" placeholder="Score (0-100)" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className={inputClass} />
          </div>
          <textarea placeholder="Summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} className={inputClass + ' resize-none'} autoFocus />
          <textarea placeholder="Next steps" value={form.next_steps} onChange={(e) => setForm({ ...form, next_steps: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.date}>Save</Button>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No progress reports yet. Write your first report.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div key={report.id} className="flex items-start gap-3 px-3 py-2.5 bg-[var(--bg-secondary)] rounded-xs text-xs border-l-[3px] border-[var(--accent)]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                    <Calendar size={10} />
                    {formatDate(report.date)}
                  </span>
                  {getScoreBadge(report.score)}
                </div>
                {report.summary && (
                  <p className="text-[var(--text-primary)] leading-relaxed mb-1 whitespace-pre-wrap">{report.summary}</p>
                )}
                {report.next_steps && (
                  <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                    <FileText size={9} />
                    <span className="whitespace-pre-wrap">Next: {report.next_steps}</span>
                  </p>
                )}
              </div>
              <button
                aria-label="Delete progress reports"
                onClick={() => handleDelete(report.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] flex-shrink-0 mt-0.5">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
