/**
 * Cancellation Monitor · Wellness feature.
 * Track session cancellations with reason, refund amount, and summary stats.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, XCircle, DollarSign, Calendar } from 'lucide-react';

type Cancellation = {
  id: string;
  client_id: string;
  session_date: string;
  reason?: string;
  refund_amount?: number;
};

export default function CancellationMonitor({ clientId }: { clientId: string }) {
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ session_date: '', reason: '', refund_amount: '' });
  const [saving, setSaving] = useState(false);

  const loadCancellations = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Cancellation & Record<string, unknown>)[]>(
        'SELECT id, client_id, session_date, reason, refund_amount FROM cancellations WHERE client_id = ? ORDER BY session_date DESC',
        [clientId]
      );
      setCancellations(rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        session_date: r.session_date as string,
        reason: r.reason as string | undefined,
        refund_amount: r.refund_amount as number | undefined,
      })));
    } catch (e) { console.error('[CancellationMonitor] loadCancellations failed:', e); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadCancellations(); }, [clientId, loadCancellations]);

  const handleAdd = async () => {
    if (!form.session_date) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO cancellations (id, client_id, session_date, reason, refund_amount) VALUES (?, ?, ?, ?, ?)',
        [id, clientId, form.session_date, form.reason || null, form.refund_amount ? parseFloat(form.refund_amount) : null]
      );
      const item: Cancellation = { id, client_id: clientId, session_date: form.session_date, reason: form.reason || undefined, refund_amount: form.refund_amount ? parseFloat(form.refund_amount) : undefined };
      setCancellations(prev => {
        const next = [item, ...prev];
        next.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
        return next;
      });
      setForm({ session_date: '', reason: '', refund_amount: '' });
      setShowForm(false);
    } catch (e) { console.error('[CancellationMonitor] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM cancellations WHERE id = ?', [id]);
      setCancellations(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error('[CancellationMonitor] delete failed:', e); }
  };

  const totalCancellations = cancellations.length;
  const totalRefunded = cancellations.reduce((sum, c) => sum + (c.refund_amount || 0), 0);

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
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Cancellations</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Cancellations ({totalCancellations})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Cancellation
        </Button>
      </div>

      {totalCancellations > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xs bg-[var(--bg-secondary)] text-xs">
          <span className="flex items-center gap-1 text-[var(--text-primary)]">
            <XCircle size={10} className="text-[var(--text-tertiary)]" />
            <span className="font-semibold">{totalCancellations}</span> total
          </span>
          <span className="flex items-center gap-1 text-[var(--text-primary)]">
            <DollarSign size={10} className="text-[#DC2626]" />
            <span className="font-semibold">${totalRefunded.toFixed(2)}</span> refunded
          </span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} className={inputClass} autoFocus />
            <input type="number" step="0.01" placeholder="Refund amount ($)" value={form.refund_amount} onChange={(e) => setForm({ ...form, refund_amount: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Reason for cancellation" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.session_date}>Add</Button>
          </div>
        </div>
      )}

      {cancellations.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No cancellations recorded yet.</p>
      ) : (
        <div className="space-y-1">
          {cancellations.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <XCircle size={10} className="text-[#DC2626] flex-shrink-0" />
                <span className="font-medium text-[var(--text-primary)] flex items-center gap-1">
                  <Calendar size={10} />
                  {formatDate(c.session_date)}
                </span>
                {c.reason && (
                  <span className="text-[var(--text-tertiary)] truncate">{c.reason}</span>
                )}
                {c.refund_amount != null && (
                  <span className="text-[#DC2626] flex-shrink-0">${c.refund_amount.toFixed(2)}</span>
                )}
              </div>
              <button
                aria-label="Delete cancellation monitor"
                onClick={() => handleDelete(c.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
