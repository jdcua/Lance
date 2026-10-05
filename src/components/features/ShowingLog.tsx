/**
 * Showing Log · Real Estate feature.
 * Timeline-style list of property showings with attendee info and follow-up.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Calendar } from 'lucide-react';

type Showing = {
  id: string;
  project_id: string;
  date: string;
  attendee_name: string;
  attendee_contact: string;
  feedback: string;
  follow_up_date: string;
};

export default function ShowingLog({ projectId }: { projectId: string }) {
  const [showings, setShowings] = useState<Showing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], attendee_name: '', attendee_contact: '', feedback: '', follow_up_date: '' });
  const [saving, setSaving] = useState(false);

  const loadShowings = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Showing & Record<string, unknown>)[]>(
        'SELECT * FROM showings WHERE project_id = ? ORDER BY date DESC',
        [projectId]
      );
      setShowings(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        date: r.date as string,
        attendee_name: r.attendee_name as string,
        attendee_contact: r.attendee_contact as string,
        feedback: r.feedback as string,
        follow_up_date: r.follow_up_date as string,
      })));
    } catch (e) { console.error('[ShowingLog] loadShowings failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadShowings(); }, [projectId, loadShowings]);

  const handleAdd = async () => {
    if (!form.attendee_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO showings (id, project_id, date, attendee_name, attendee_contact, feedback, follow_up_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.date || null, form.attendee_name.trim(), form.attendee_contact.trim() || null, form.feedback.trim() || null, form.follow_up_date || null]
      );
      const item: Showing = {
        id, project_id: projectId, date: form.date || '',
        attendee_name: form.attendee_name.trim(), attendee_contact: form.attendee_contact.trim() || '',
        feedback: form.feedback.trim() || '', follow_up_date: form.follow_up_date || '',
      };
      setShowings(prev => [item, ...prev]);
      setForm({ date: new Date().toISOString().split('T')[0], attendee_name: '', attendee_contact: '', feedback: '', follow_up_date: '' });
      setShowForm(false);
    } catch (e) { console.error('[ShowingLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM showings WHERE id = ?', [id]);
      setShowings(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error('[ShowingLog] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Showings</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Showings ({showings.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Showing
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Attendee name" value={form.attendee_name} onChange={(e) => setForm({ ...form, attendee_name: e.target.value })} className={inputClass} autoFocus />
            <input type="text" placeholder="Contact (email/phone)" value={form.attendee_contact} onChange={(e) => setForm({ ...form, attendee_contact: e.target.value })} className={inputClass} />
          </div>
          <textarea placeholder="Feedback from showing" value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} className={inputClass} placeholder="Follow-up date" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.attendee_name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {showings.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No showings logged yet.</p>
      ) : (
        <div className="space-y-1">
          {showings.map((showing) => (
            <div key={showing.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Calendar size={10} className="text-[var(--accent-ink,var(--accent))] flex-shrink-0" />
                  <button
                    onClick={() => setExpanded(expanded === showing.id ? null : showing.id)}
                    className="font-medium text-[var(--text-primary)] truncate hover:underline text-left"
                  >
                    {showing.attendee_name}
                  </button>
                  {showing.attendee_contact && <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{showing.attendee_contact}</span>}
                  {showing.date && <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{showing.date}</span>}
                  {showing.follow_up_date && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent-ink,var(--accent))] flex-shrink-0">
                      follow-up: {showing.follow_up_date}
                    </span>
                  )}
                </div>
                <button
                  aria-label="Delete showing log"
                  onClick={() => handleDelete(showing.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
              {expanded === showing.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-[6px] text-xs space-y-1">
                  {showing.feedback && <p className="text-[var(--text-secondary)]">{showing.feedback}</p>}
                  {showing.follow_up_date && <p className="text-[var(--text-tertiary)]">Follow-up scheduled: {showing.follow_up_date}</p>}
                  {!showing.feedback && !showing.follow_up_date && <p className="text-[var(--text-tertiary)] italic">No feedback or follow-up noted.</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
