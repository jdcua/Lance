/**
 * Progress Tracker · Wellness feature.
 * Timeline list of progress notes with mood score, notes, and goals.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Smile, Frown, Meh, Calendar, Target } from 'lucide-react';

type ProgressNote = {
  id: string;
  client_id: string;
  date: string;
  mood_score?: number;
  notes?: string;
  goals?: string;
};

export default function ProgressTracker({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], mood_score: '', notes: '', goals: '' });
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ProgressNote & Record<string, unknown>)[]>(
        'SELECT id, client_id, date, mood_score, notes, goals FROM progress_notes WHERE client_id = ? ORDER BY date DESC',
        [clientId]
      );
      setNotes(rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        date: r.date as string,
        mood_score: r.mood_score as number | undefined,
        notes: r.notes as string | undefined,
        goals: r.goals as string | undefined,
      })));
    } catch (e) { console.error('[ProgressTracker] loadNotes failed:', e); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadNotes(); }, [clientId, loadNotes]);

  const handleAdd = async () => {
    if (!form.date) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const mood = form.mood_score ? Math.min(10, Math.max(1, parseInt(form.mood_score) || 5)) : null;
      await db.execute(
        'INSERT INTO progress_notes (id, client_id, date, mood_score, notes, goals) VALUES (?, ?, ?, ?, ?, ?)',
        [id, clientId, form.date, mood, form.notes || null, form.goals || null]
      );
      const note: ProgressNote = { id, client_id: clientId, date: form.date, mood_score: mood ?? undefined, notes: form.notes || undefined, goals: form.goals || undefined };
      setNotes(prev => {
        const next = [note, ...prev];
        next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return next;
      });
      setForm({ date: new Date().toISOString().split('T')[0], mood_score: '', notes: '', goals: '' });
      setShowForm(false);
    } catch (e) { console.error('[ProgressTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM progress_notes WHERE id = ?', [id]);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (e) { console.error('[ProgressTracker] delete failed:', e); }
  };

  const getMoodIndicator = (score?: number) => {
    if (score == null) return null;
    if (score >= 8) return <Smile size={14} className="text-[#16A34A]" />;
    if (score >= 5) return <Meh size={14} className="text-[#D97706]" />;
    return <Frown size={14} className="text-[#DC2626]" />;
  };

  const getMoodBg = (score?: number) => {
    if (score == null) return '';
    if (score >= 8) return 'bg-[#16A34A]/10 text-[#16A34A]';
    if (score >= 5) return 'bg-[#D97706]/10 text-[#D97706]';
    return 'bg-[#DC2626]/10 text-[#DC2626]';
  };

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
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Progress Notes</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Progress Notes ({notes.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Note
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
            <input type="number" min="1" max="10" placeholder="Mood (1-10)" value={form.mood_score} onChange={(e) => setForm({ ...form, mood_score: e.target.value })} className={inputClass} />
          </div>
          <textarea placeholder="Session notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass + ' resize-none'} autoFocus />
          <textarea placeholder="Goals" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.date}>Save</Button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No progress notes yet. Log your first session.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start gap-3 px-3 py-2.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs border-l-[3px] border-[var(--accent)]">
              <div className="flex-shrink-0 mt-0.5">
                {getMoodIndicator(note.mood_score)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                    <Calendar size={10} />
                    {formatDate(note.date)}
                  </span>
                  {note.mood_score != null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getMoodBg(note.mood_score)}`}>
                      Mood: {note.mood_score}/10
                    </span>
                  )}
                </div>
                {note.notes && (
                  <p className="text-[var(--text-primary)] leading-relaxed mb-1 whitespace-pre-wrap">{note.notes}</p>
                )}
                {note.goals && (
                  <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                    <Target size={9} />
                    <span className="whitespace-pre-wrap">Goals: {note.goals}</span>
                  </p>
                )}
              </div>
              <button
                aria-label="Delete progress tracker"
                onClick={() => handleDelete(note.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] flex-shrink-0 mt-0.5">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
