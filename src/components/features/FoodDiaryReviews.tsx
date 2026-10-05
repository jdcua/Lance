/**
 * Food Diary Reviews · Nutritionist feature.
 * Food diary entries grouped by date.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type FoodDiary = {
  id: string;
  client_id: string;
  date: string;
  meal?: string;
  foods?: string;
  notes?: string;
};

const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function FoodDiaryReviews({ clientId }: { clientId: string }) {
  const [entries, setEntries] = useState<FoodDiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    meal: 'breakfast',
    foods: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(FoodDiary & Record<string, unknown>)[]>(
        'SELECT id, client_id, date, meal, foods, notes FROM food_diaries WHERE client_id = ? ORDER BY date DESC, meal ASC',
        [clientId]
      );
      setEntries(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          date: r.date as string,
          meal: r.meal as string | undefined,
          foods: r.foods as string | undefined,
          notes: r.notes as string | undefined,
        }))
      );
    } catch (e) {
      console.error('[FoodDiaryReviews] loadEntries failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadEntries();
  }, [clientId, loadEntries]);

  const groupedByDate = entries.reduce<Record<string, FoodDiary[]>>((acc, e) => {
    const d = e.date?.split('T')[0] || e.date || 'Unknown';
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  const handleSave = async () => {
    if (!form.date) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO food_diaries (id, client_id, date, meal, foods, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [id, clientId, form.date, form.meal, form.foods || null, form.notes || null]
      );
      const entry: FoodDiary = {
        id,
        client_id: clientId,
        date: form.date,
        meal: form.meal,
        foods: form.foods || undefined,
        notes: form.notes || undefined,
      };
      setEntries((prev) => [...prev, entry].sort((a, b) => b.date.localeCompare(a.date) || (a.meal || '').localeCompare(b.meal || '')));
      setForm({ date: new Date().toISOString().split('T')[0], meal: 'breakfast', foods: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[FoodDiaryReviews] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM food_diaries WHERE id = ?', [id]);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      console.error('[FoodDiaryReviews] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Food Diary</h4>
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
          Food Diary ({entries.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Entry
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
              autoFocus
            />
            <select value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })} className={inputClass}>
              {MEAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <textarea
            placeholder="Foods eaten"
            value={form.foods}
            onChange={(e) => setForm({ ...form, foods: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.date}>Save</Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No food diary entries yet.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedByDate).map(([date, dayEntries]) => (
            <div key={date} className="space-y-1">
              <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase px-1">
                {date} ({dayEntries.length})
              </div>
              {dayEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-secondary)] capitalize">
                      {e.meal || 'meal'}
                    </span>
                    <span className="text-[var(--text-primary)] truncate">{e.foods || '--'}</span>
                    {e.notes && <span className="text-[10px] text-[var(--text-tertiary)] truncate">{e.notes}</span>}
                  </div>
                  <button
                    aria-label="Delete food diary reviews"
                    onClick={() => handleDelete(e.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
