/**
 * Feedback Aggregator · client feedback with rating, source, actioned toggle, and average rating.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Star, Check, Circle } from 'lucide-react';

type FeedbackEntry = {
  id: string;
  client_id: string;
  source?: string;
  rating: number;
  comment?: string;
  date?: string;
  actioned: boolean;
};

const SOURCES = ['survey', 'interview', 'review', 'support', 'social', 'email', 'other'];

export default function FeedbackAggregator({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ source: SOURCES[0], rating: '3', comment: '', date: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(FeedbackEntry & Record<string, unknown>)[]>(
        'SELECT id, client_id, source, rating, comment, date, actioned FROM feedback_aggregations WHERE client_id = ? ORDER BY date DESC, id DESC',
        [clientId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        source: r.source as string | undefined,
        rating: (r.rating as number) || 0,
        comment: r.comment as string | undefined,
        date: r.date as string | undefined,
        actioned: !!(r.actioned),
      })));
    } catch (e) { console.error('[FeedbackAggregator] load failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [clientId]);

  const avgRating = items.length > 0
    ? items.reduce((sum, i) => sum + i.rating, 0) / items.length
    : 0;

  const handleSave = async () => {
    if (!form.comment.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO feedback_aggregations (id, client_id, source, rating, comment, date, actioned) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, clientId, form.source, parseInt(form.rating), form.comment.trim(), form.date || null, 0]
      );
      const item: FeedbackEntry = { id, client_id: clientId, source: form.source, rating: parseInt(form.rating), comment: form.comment.trim(), date: form.date || undefined, actioned: false };
      setItems(prev => [item, ...prev]);
      setForm({ source: SOURCES[0], rating: '3', comment: '', date: '' });
      setShowForm(false);
    } catch (e) { console.error('[FeedbackAggregator] save failed:', e); }
    setSaving(false);
  };

  const handleToggleActioned = async (id: string, current: boolean) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE feedback_aggregations SET actioned = ? WHERE id = ?', [current ? 0 : 1, id]);
      setItems(prev => prev.map(i => i.id === id ? { ...i, actioned: !current } : i));
    } catch (e) { console.error('[FeedbackAggregator] toggle failed:', e); }
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM feedback_aggregations WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[FeedbackAggregator] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Feedback</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Feedback ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Feedback
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-tertiary)]">Avg Rating:</span>
          <span className="font-medium text-[var(--text-primary)]">{avgRating.toFixed(1)}</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} size={10} className={n <= Math.round(avgRating) ? 'text-[#F1C40F] fill-[#F1C40F]' : 'text-[var(--border-color)]'} />
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={inputClass}>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className={inputClass}>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <textarea placeholder="Feedback comment" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={2} className={inputClass + ' resize-none'} autoFocus />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.comment.trim()}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No feedback yet. Add your first entry.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className={`flex items-start gap-2 px-3 py-2 rounded-[6px] text-xs border-l-[3px] ${item.actioned ? 'border-[var(--accent)]/30 bg-[var(--bg-secondary)]' : 'border-[var(--accent)] bg-[var(--bg-secondary)]'}`}>
              <button
                onClick={() => handleToggleActioned(item.id, item.actioned)}
                className={`mt-0.5 flex-shrink-0 p-0.5 rounded-full ${item.actioned ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'}`}
              >
                {item.actioned ? <Check size={14} /> : <Circle size={14} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {item.source && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">{item.source}</span>}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={9} className={n <= item.rating ? 'text-[#F1C40F] fill-[#F1C40F]' : 'text-[var(--border-color)]'} />
                    ))}
                  </div>
                  {item.date && <span className="text-[10px] text-[var(--text-tertiary)]">{item.date}</span>}
                </div>
                <p className={`text-[var(--text-primary)] leading-relaxed ${item.actioned ? 'opacity-60' : ''}`}>{item.comment}</p>
              </div>
              <button onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] flex-shrink-0 mt-0.5">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
