/**
 * Deliverable Tracker · SEO Specialist feature.
 * Tracks SEO deliverables grouped by period with completion bars.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Check, Circle } from 'lucide-react';

type Deliverable = {
  id: string;
  client_id: string;
  period: string;
  title: string;
  type?: string;
  completed: boolean;
  due_date?: string;
};

const TYPES = ['audit', 'blog', 'link-build', 'technical-fix', 'report', 'other'];

export default function DeliverableTracker({ clientId }: { clientId: string }) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    period: new Date().toISOString().slice(0, 7),
    title: '',
    type: TYPES[0],
    due_date: '',
  });
  const [saving, setSaving] = useState(false);

  const loadDeliverables = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Deliverable & Record<string, unknown>)[]>(
        'SELECT id, client_id, period, title, type, completed, due_date FROM seo_deliverables WHERE client_id = ? ORDER BY period DESC, id DESC',
        [clientId],
      );
      setDeliverables(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          period: r.period as string,
          title: r.title as string,
          type: r.type as string | undefined,
          completed: !!r.completed,
          due_date: r.due_date as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[DeliverableTracker] loadDeliverables failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadDeliverables();
  }, [clientId, loadDeliverables]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.period.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO seo_deliverables (id, client_id, period, title, type, completed, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, clientId, form.period.trim(), form.title.trim(), form.type, 0, form.due_date || null],
      );
      const item: Deliverable = {
        id,
        client_id: clientId,
        period: form.period.trim(),
        title: form.title.trim(),
        type: form.type,
        completed: false,
        due_date: form.due_date || undefined,
      };
      setDeliverables((prev) => [item, ...prev]);
      setForm({
        period: new Date().toISOString().slice(0, 7),
        title: '',
        type: TYPES[0],
        due_date: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[DeliverableTracker] addDeliverable failed:', e);
    }
    setSaving(false);
  };

  const handleToggle = async (d: Deliverable) => {
    try {
      const next = d.completed ? 0 : 1;
      const db = await getDb();
      await db.execute('UPDATE seo_deliverables SET completed = ? WHERE id = ?', [next, d.id]);
      setDeliverables((prev) =>
        prev.map((dd) => (dd.id === d.id ? { ...dd, completed: !dd.completed } : dd)),
      );
    } catch (e) {
      console.error('[DeliverableTracker] toggle failed:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM seo_deliverables WHERE id = ?', [id]);
      setDeliverables((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error('[DeliverableTracker] delete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  const groupedByPeriod = deliverables.reduce<Record<string, Deliverable[]>>(
    (acc, d: Deliverable) => {
      const key = d.period || 'Uncategorized';
      if (!acc[key]) acc[key] = [];
      acc[key].push(d);
      return acc;
    },
    {},
  );

  const sortedPeriods = Object.keys(groupedByPeriod).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Deliverables</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Deliverables ({deliverables.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Deliverable
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Period (e.g. 2026-06)"
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <select
            aria-label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className={inputClass}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.title.trim() || !form.period.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {deliverables.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No deliverables yet. Add your first deliverable.
        </p>
      ) : (
        <div className="space-y-3">
          {sortedPeriods.map((period) => {
            const items = groupedByPeriod[period];
            const completed = items.filter((d: Deliverable) => d.completed).length;
            const total = items.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const barColor =
              pct === 100
                ? 'bg-[#2ECC71]'
                : pct >= 50
                  ? 'bg-[#F1C40F]'
                  : 'bg-[var(--border-color)]';

            return (
              <div key={period} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                    {period}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {completed}/{total} complete
                  </span>
                  <div className="flex-1 h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-colors ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  {items.map((d: Deliverable) => (
                    <div
                      key={d.id}
                      className={`flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs ${d.completed ? 'opacity-60' : ''}`}
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <button onClick={() => handleToggle(d)} className="flex-shrink-0">
                          {d.completed ? (
                            <Check size={14} className="text-[#2ECC71]" />
                          ) : (
                            <Circle size={14} className="text-[var(--text-tertiary)]" />
                          )}
                        </button>
                        <span
                          className={`font-medium ${d.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}
                        >
                          {d.title}
                        </span>
                        {d.type && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)] flex-shrink-0">
                            {d.type}
                          </span>
                        )}
                        {d.due_date && (
                          <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                            {d.due_date}
                          </span>
                        )}
                      </div>
                      <button
                        aria-label="Delete deliverable tracker"
                        onClick={() => handleDelete(d.id)}
                        className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
