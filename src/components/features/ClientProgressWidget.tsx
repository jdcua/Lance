/**
 * Client Progress Widget · Trainer feature.
 * Simple timeline list with most recent measurement prominently displayed.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, TrendingUp, Calendar } from 'lucide-react';

type ClientProgress = {
  id: string;
  client_id: string;
  date: string;
  measurements?: string;
  notes?: string;
};

export default function ClientProgressWidget({ clientId }: { clientId: string }) {
  const [progress, setProgress] = useState<ClientProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    measurements: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadProgress = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ClientProgress & Record<string, unknown>)[]>(
        'SELECT id, client_id, date, measurements, notes FROM client_progress WHERE client_id = ? ORDER BY date DESC',
        [clientId],
      );
      setProgress(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          date: r.date as string,
          measurements: r.measurements as string | undefined,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[ClientProgressWidget] loadProgress failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadProgress();
  }, [clientId, loadProgress]);

  const handleAdd = async () => {
    if (!form.date) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO client_progress (id, client_id, date, measurements, notes) VALUES (?, ?, ?, ?, ?)',
        [id, clientId, form.date, form.measurements || null, form.notes || null],
      );
      const entry: ClientProgress = {
        id,
        client_id: clientId,
        date: form.date,
        measurements: form.measurements || undefined,
        notes: form.notes || undefined,
      };
      setProgress((prev) => {
        const next = [entry, ...prev];
        next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return next;
      });
      setForm({ date: new Date().toISOString().split('T')[0], measurements: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[ClientProgressWidget] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM client_progress WHERE id = ?', [id]);
      setProgress((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('[ClientProgressWidget] delete failed:', e);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Progress</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const latest = progress[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Progress ({progress.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Progress
        </Button>
      </div>

      {latest && (
        <div className="p-3 glass border border-[var(--accent)]/30 rounded-sm space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp size={14} className="text-[var(--accent-ink,var(--accent))]" />
            <span className="font-semibold text-[var(--text-primary)]">Most Recent</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              <Calendar size={10} className="inline mr-0.5" />
              {formatDate(latest.date)}
            </span>
          </div>
          {latest.measurements && (
            <p className="text-xs text-[var(--text-primary)] font-medium">{latest.measurements}</p>
          )}
          {latest.notes && (
            <p className="text-[10px] text-[var(--text-secondary)]">{latest.notes}</p>
          )}
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <input
            type="text"
            placeholder="Measurements (e.g. weight: 180lbs, BF%: 15)"
            value={form.measurements}
            onChange={(e) => setForm({ ...form, measurements: e.target.value })}
            className={inputClass}
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.date}>
              Save
            </Button>
          </div>
        </div>
      )}

      {progress.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No progress logged yet.</p>
      ) : (
        <div className="space-y-1">
          {progress.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Calendar size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="font-medium text-[var(--text-primary)]">{formatDate(p.date)}</span>
                {p.measurements && (
                  <span className="text-[var(--text-secondary)] truncate">{p.measurements}</span>
                )}
                {p.notes && <span className="text-[var(--text-tertiary)] truncate">{p.notes}</span>}
              </div>
              <button
                aria-label="Delete client progress widget"
                onClick={() => handleDelete(p.id)}
                className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
