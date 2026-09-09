/**
 * QA Log · Game Developer feature.
 * Table logging QA sessions with summary stats (hours, avg bugs, fix rate).
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Bug, ShieldCheck, Clock, BarChart3 } from 'lucide-react';

type QASession = {
  id: string;
  project_id: string;
  date?: string;
  build_version?: string;
  bugs_found?: number;
  bugs_fixed?: number;
  hours?: number;
  notes?: string;
};

export default function QALog({ projectId }: { projectId: string }) {
  const [sessions, setSessions] = useState<QASession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', build_version: '', bugs_found: '', bugs_fixed: '', hours: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(QASession & Record<string, unknown>)[]>(
        'SELECT id, project_id, date, build_version, bugs_found, bugs_fixed, hours, notes FROM qa_sessions WHERE project_id = ? ORDER BY date DESC',
        [projectId]
      );
      setSessions(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        date: r.date as string | undefined,
        build_version: r.build_version as string | undefined,
        bugs_found: r.bugs_found as number | undefined,
        bugs_fixed: r.bugs_fixed as number | undefined,
        hours: r.hours as number | undefined,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[QALog] loadSessions failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadSessions(); }, [projectId, loadSessions]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO qa_sessions (id, project_id, date, build_version, bugs_found, bugs_fixed, hours, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.date || null, form.build_version || null, form.bugs_found ? parseInt(form.bugs_found) : null, form.bugs_fixed ? parseInt(form.bugs_fixed) : null, form.hours ? parseFloat(form.hours) : null, form.notes || null]
      );
      const session: QASession = {
        id,
        project_id: projectId,
        date: form.date || undefined,
        build_version: form.build_version || undefined,
        bugs_found: form.bugs_found ? parseInt(form.bugs_found) : undefined,
        bugs_fixed: form.bugs_fixed ? parseInt(form.bugs_fixed) : undefined,
        hours: form.hours ? parseFloat(form.hours) : undefined,
        notes: form.notes || undefined,
      };
      setSessions(prev => [session, ...prev].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      setForm({ date: '', build_version: '', bugs_found: '', bugs_fixed: '', hours: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[QALog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM qa_sessions WHERE id = ?', [id]);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error('[QALog] delete failed:', e); }
  };

  const totalHours = sessions.reduce((sum, s) => sum + (s.hours || 0), 0);
  const totalBugsFound = sessions.reduce((sum, s) => sum + (s.bugs_found || 0), 0);
  const totalBugsFixed = sessions.reduce((sum, s) => sum + (s.bugs_fixed || 0), 0);
  const avgBugsPerSession = sessions.length > 0 ? totalBugsFound / sessions.length : 0;
  const fixRate = totalBugsFound > 0 ? (totalBugsFixed / totalBugsFound) * 100 : 0;

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">QA Sessions</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">QA Sessions ({sessions.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Session
        </Button>
      </div>

      {sessions.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <span className="text-[var(--text-tertiary)] flex items-center gap-1">
              <Clock size={10} /> Total QA hours
            </span>
            <span className="font-medium text-[var(--text-primary)]">{totalHours.toFixed(1)}h</span>
          </div>
          <div className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <span className="text-[var(--text-tertiary)] flex items-center gap-1">
              <Bug size={10} /> Avg bugs/session
            </span>
            <span className="font-medium text-[var(--text-primary)]">{avgBugsPerSession.toFixed(1)}</span>
          </div>
          <div className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <span className="text-[var(--text-tertiary)] flex items-center gap-1">
              <BarChart3 size={10} /> Fix rate
            </span>
            <span className="font-medium text-[var(--text-primary)]">{fixRate.toFixed(0)}%</span>
          </div>
          <div className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <span className="text-[var(--text-tertiary)] flex items-center gap-1">
              <ShieldCheck size={10} /> Total bugs fixed
            </span>
            <span className="font-medium text-[var(--text-primary)]">{totalBugsFixed}</span>
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Build version" value={form.build_version} onChange={(e) => setForm({ ...form, build_version: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Bugs found" value={form.bugs_found} onChange={(e) => setForm({ ...form, bugs_found: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Bugs fixed" value={form.bugs_fixed} onChange={(e) => setForm({ ...form, bugs_fixed: e.target.value })} className={inputClass} />
            <input type="number" step="0.5" placeholder="Hours" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>Add</Button>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No QA sessions logged yet. Add your first session.</p>
      ) : (
        <div className="space-y-1">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">{session.date || '--'}</span>
                {session.build_version && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">{session.build_version}</span>
                )}
                {session.bugs_found != null && (
                  <span className="text-[var(--text-tertiary)] flex items-center gap-0.5">
                    <Bug size={9} /> {session.bugs_found}
                  </span>
                )}
                {session.bugs_fixed != null && (
                  <span className="text-[var(--text-tertiary)] flex items-center gap-0.5">
                    <ShieldCheck size={9} /> {session.bugs_fixed}
                  </span>
                )}
                {session.hours != null && (
                  <span className="text-[var(--text-tertiary)] flex items-center gap-0.5">
                    <Clock size={9} /> {session.hours}h
                  </span>
                )}
              </div>
              <button onClick={() => handleDelete(session.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
