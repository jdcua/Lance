/**
 * Booking Tracker · Voice Actor feature.
 * Track bookings with revenue summary at top.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, DollarSign } from 'lucide-react';

type Booking = {
  id: string;
  client_id: string;
  project_title: string;
  role?: string;
  session_date?: string;
  rate?: number;
  status: string;
  notes?: string;
};

const STATUS_OPTIONS = ['confirmed', 'completed', 'cancelled'] as const;

const statusBadge: Record<string, string> = {
  confirmed: 'bg-[#2563EB]/15 text-[#2563EB]',
  completed: 'bg-[#16A34A]/15 text-[#16A34A]',
  cancelled: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
};

export default function BookingTracker({ clientId }: { clientId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    project_title: '',
    role: '',
    session_date: '',
    rate: '',
    status: 'confirmed',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadBookings = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Booking & Record<string, unknown>)[]>(
        'SELECT id, client_id, project_title, role, session_date, rate, status, notes FROM bookings WHERE client_id = ? ORDER BY session_date DESC, project_title ASC',
        [clientId]
      );
      setBookings(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          project_title: r.project_title as string,
          role: r.role as string | undefined,
          session_date: r.session_date as string | undefined,
          rate: r.rate as number | undefined,
          status: r.status as string,
          notes: r.notes as string | undefined,
        }))
      );
    } catch (e) {
      console.error('[BookingTracker] loadBookings failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadBookings();
  }, [clientId, loadBookings]);

  const totalRevenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.rate || 0), 0);

  const handleSave = async () => {
    if (!form.project_title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO bookings (id, client_id, project_title, role, session_date, rate, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, clientId, form.project_title.trim(), form.role || null, form.session_date || null, form.rate ? parseFloat(form.rate) : null, form.status, form.notes || null]
      );
      const booking: Booking = {
        id,
        client_id: clientId,
        project_title: form.project_title.trim(),
        role: form.role || undefined,
        session_date: form.session_date || undefined,
        rate: form.rate ? parseFloat(form.rate) : undefined,
        status: form.status,
        notes: form.notes || undefined,
      };
      setBookings((prev) =>
        [...prev, booking].sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''))
      );
      setForm({ project_title: '', role: '', session_date: '', rate: '', status: 'confirmed', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[BookingTracker] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM bookings WHERE id = ?', [id]);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      console.error('[BookingTracker] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Bookings</h4>
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
          Bookings ({bookings.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Booking
        </Button>
      </div>

      {totalRevenue > 0 && (
        <div className="px-3 py-2 bg-[#16A34A]/10 rounded-[6px] text-xs flex items-center gap-2">
          <DollarSign size={12} className="text-[#16A34A]" />
          <span className="font-semibold text-[#16A34A]">
            Total Revenue: ${totalRevenue.toLocaleString()}
          </span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Project title"
            value={form.project_title}
            onChange={(e) => setForm({ ...form, project_title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={form.session_date}
              onChange={(e) => setForm({ ...form, session_date: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Rate ($)"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              className={inputClass}
            />
          </div>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.project_title.trim()}>Save</Button>
          </div>
        </div>
      )}

      {bookings.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No bookings yet.</p>
      ) : (
        <div className="space-y-1">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)] truncate">{b.project_title}</span>
                {b.role && <span className="text-[var(--text-tertiary)]">{b.role}</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusBadge[b.status] || statusBadge.confirmed}`}>
                  {b.status}
                </span>
                {b.session_date && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {new Date(b.session_date).toLocaleDateString()}
                  </span>
                )}
                {b.rate != null && (
                  <span className="text-[10px] text-[#16A34A] font-medium">
                    ${b.rate.toLocaleString()}
                  </span>
                )}
                {b.notes && <span className="text-[10px] text-[var(--text-tertiary)] truncate">{b.notes}</span>}
              </div>
              <button
                aria-label="Delete booking tracker"
                onClick={() => handleDelete(b.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
