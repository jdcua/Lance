/**
 * Research Log -- UX Designer feature.
 * Timeline of research activities with type, date, participants, and key findings.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Search, Users, Calendar } from 'lucide-react';

type ResearchActivity = {
  id: string;
  project_id: string;
  type: string;
  date: string;
  participants: number;
  key_findings: string;
  created_at: string;
};

const RESEARCH_TYPES = [
  'user-interview',
  'survey',
  'competitive-analysis',
  'heuristic',
  'usability-test',
  'other',
] as const;

const typeLabel: Record<string, string> = {
  'user-interview': 'User Interview',
  'survey': 'Survey',
  'competitive-analysis': 'Competitive Analysis',
  'heuristic': 'Heuristic Evaluation',
  'usability-test': 'Usability Test',
  'other': 'Other',
};

const typeColors: Record<string, string> = {
  'user-interview': 'bg-[#7C3AED]/10 text-[#7C3AED]',
  'survey': 'bg-[#2563EB]/10 text-[#2563EB]',
  'competitive-analysis': 'bg-[#D97706]/10 text-[#D97706]',
  'heuristic': 'bg-[#059669]/10 text-[#059669]',
  'usability-test': 'bg-[#DC2626]/10 text-[#DC2626]',
  'other': 'bg-[var(--bg-card)] text-[var(--text-secondary)]',
};

export default function ResearchLog({ projectId }: { projectId: string }) {
  const [activities, setActivities] = useState<ResearchActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'user-interview', date: new Date().toISOString().split('T')[0], participants: '', key_findings: '' });
  const [saving, setSaving] = useState(false);

  const loadActivities = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ResearchActivity & Record<string, unknown>)[]>(
        'SELECT id, project_id, type, date, participants, key_findings, created_at FROM research_activities WHERE project_id = ? ORDER BY date DESC, created_at DESC',
        [projectId]
      );
      setActivities(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        type: r.type as string,
        date: r.date as string,
        participants: (r.participants as number) || 0,
        key_findings: r.key_findings as string,
        created_at: r.created_at as string,
      })));
    } catch (e) { console.error('[ResearchLog] loadActivities failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadActivities(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.key_findings.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const participants = parseInt(form.participants, 10) || 0;
      const db = await getDb();
      await db.execute(
        'INSERT INTO research_activities (id, project_id, type, date, participants, key_findings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.type, form.date, participants, form.key_findings.trim(), new Date().toISOString()]
      );
      const item: ResearchActivity = {
        id, project_id: projectId, type: form.type, date: form.date,
        participants, key_findings: form.key_findings.trim(),
        created_at: new Date().toISOString(),
      };
      setActivities(prev => {
        const next = [item, ...prev];
        next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.created_at.localeCompare(a.created_at));
        return next;
      });
      setForm({ type: 'user-interview', date: new Date().toISOString().split('T')[0], participants: '', key_findings: '' });
      setShowForm(false);
    } catch (e) { console.error('[ResearchLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM research_activities WHERE id = ?', [id]);
      setActivities(prev => prev.filter(a => a.id !== id));
    } catch (e) { console.error('[ResearchLog] delete failed:', e); }
  };

  const totalSessions = activities.length;
  const totalParticipants = activities.reduce((sum, a) => sum + (a.participants || 0), 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Research</h4>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Research ({totalSessions})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Activity
        </Button>
      </div>

      {/* Summary */}
      {totalSessions > 0 && (
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <Search size={11} className="text-[var(--text-tertiary)]" />
            <span className="font-medium">{totalSessions}</span> sessions
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} className="text-[var(--text-tertiary)]" />
            <span className="font-medium">{totalParticipants}</span> total participants
          </span>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
              {RESEARCH_TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
            </select>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </div>
          <input type="number" placeholder="Number of participants" value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} className={inputClass} min="0" />
          <textarea
            placeholder="Key findings..."
            value={form.key_findings}
            onChange={(e) => setForm({ ...form, key_findings: e.target.value })}
            rows={3}
            className={inputClass + ' resize-none'}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.key_findings.trim()}>Save</Button>
          </div>
        </div>
      )}

      {/* Timeline list */}
      {activities.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No research activities yet. Log your first session.</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-3 py-2.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs border-l-[3px] border-[var(--accent)]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeColors[a.type] || typeColors.other}`}>
                    {typeLabel[a.type] || a.type}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                    <Calendar size={10} />
                    {formatDate(a.date)}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                    <Users size={10} />
                    {a.participants || 0}
                  </span>
                </div>
                <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{a.key_findings}</p>
              </div>
              <button onClick={() => handleDelete(a.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] flex-shrink-0 mt-0.5">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
