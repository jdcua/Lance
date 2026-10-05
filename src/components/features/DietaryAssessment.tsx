/**
 * Dietary Assessment · Nutritionist feature.
 * Timeline of dietary assessments with food log, analysis, recommendations.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronRight } from 'lucide-react';

type DietaryAssessment = {
  id: string;
  client_id: string;
  date: string;
  food_log?: string;
  analysis?: string;
  recommendations?: string;
};

export default function DietaryAssessment({ clientId }: { clientId: string }) {
  const [assessments, setAssessments] = useState<DietaryAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: '',
    food_log: '',
    analysis: '',
    recommendations: '',
  });
  const [saving, setSaving] = useState(false);

  const loadAssessments = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(DietaryAssessment & Record<string, unknown>)[]>(
        'SELECT id, client_id, date, food_log, analysis, recommendations FROM dietary_assessments WHERE client_id = ? ORDER BY date DESC',
        [clientId]
      );
      setAssessments(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          date: r.date as string,
          food_log: r.food_log as string | undefined,
          analysis: r.analysis as string | undefined,
          recommendations: r.recommendations as string | undefined,
        }))
      );
    } catch (e) {
      console.error('[DietaryAssessment] loadAssessments failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadAssessments();
  }, [clientId, loadAssessments]);

  const handleSave = async () => {
    if (!form.date) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO dietary_assessments (id, client_id, date, food_log, analysis, recommendations) VALUES (?, ?, ?, ?, ?, ?)',
        [id, clientId, form.date, form.food_log || null, form.analysis || null, form.recommendations || null]
      );
      const assessment: DietaryAssessment = {
        id,
        client_id: clientId,
        date: form.date,
        food_log: form.food_log || undefined,
        analysis: form.analysis || undefined,
        recommendations: form.recommendations || undefined,
      };
      setAssessments((prev) => [...prev, assessment].sort((a, b) => b.date.localeCompare(a.date)));
      setForm({ date: '', food_log: '', analysis: '', recommendations: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[DietaryAssessment] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM dietary_assessments WHERE id = ?', [id]);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error('[DietaryAssessment] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Dietary Assessments</h4>
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
          Dietary Assessments ({assessments.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> New Assessment
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <textarea
            placeholder="Food log"
            value={form.food_log}
            onChange={(e) => setForm({ ...form, food_log: e.target.value })}
            rows={3}
            className={inputClass + ' resize-none'}
          />
          <textarea
            placeholder="Analysis"
            value={form.analysis}
            onChange={(e) => setForm({ ...form, analysis: e.target.value })}
            rows={3}
            className={inputClass + ' resize-none'}
          />
          <textarea
            placeholder="Recommendations"
            value={form.recommendations}
            onChange={(e) => setForm({ ...form, recommendations: e.target.value })}
            rows={3}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.date}>Save</Button>
          </div>
        </div>
      )}

      {assessments.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No dietary assessments yet.</p>
      ) : (
        <div className="space-y-1">
          {assessments.map((a) => (
            <div key={a.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <button aria-label="Next"
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronRight size={10} className={`transition-transform ${expanded === a.id ? 'rotate-90' : ''}`} />
                  </button>
                  <span className="font-medium text-[var(--text-primary)]">
                    {new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {a.analysis && (
                    <span className="text-[10px] text-[var(--text-tertiary)] truncate">{a.analysis.split('\n')[0]}</span>
                  )}
                </div>
                <button
                  aria-label="Delete dietary assessment"
                  onClick={() => handleDelete(a.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                  <Trash2 size={12} />
                </button>
              </div>
              {expanded === a.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-[6px] text-xs space-y-2">
                  {a.food_log && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Food Log</p>
                      <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{a.food_log}</p>
                    </div>
                  )}
                  {a.analysis && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Analysis</p>
                      <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{a.analysis}</p>
                    </div>
                  )}
                  {a.recommendations && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">Recommendations</p>
                      <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{a.recommendations}</p>
                    </div>
                  )}
                  {!a.food_log && !a.analysis && !a.recommendations && (
                    <p className="text-[var(--text-tertiary)] italic">No details.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
