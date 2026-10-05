/**
 * Retainer Manager · Consultant feature.
 * Per-client retainer tracking with progress bar for monthly hours.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Trash2, Calendar, DollarSign } from 'lucide-react';

type Retainer = {
  id: string;
  client_id: string;
  monthly_hours: number;
  rate: number;
  renewal_date?: string;
  active: boolean;
};

export default function RetainerManager({ clientId }: { clientId: string }) {
  const { timeEntries, loadTimeEntries } = useStore();
  const [retainer, setRetainer] = useState<Retainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    monthly_hours: '',
    rate: '',
    renewal_date: '',
    active: true,
  });

  const loadRetainer = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Retainer & Record<string, unknown>)[]>(
        'SELECT id, client_id, monthly_hours, rate, renewal_date, active FROM retainers WHERE client_id = ?',
        [clientId]
      );
      if (rows.length > 0) {
        const r: Retainer = {
          id: rows[0].id as string,
          client_id: rows[0].client_id as string,
          monthly_hours: rows[0].monthly_hours as number,
          rate: rows[0].rate as number,
          renewal_date: rows[0].renewal_date as string | undefined,
          active: !!(rows[0].active),
        };
        setRetainer(r);
        setForm({
          monthly_hours: String(r.monthly_hours),
          rate: String(r.rate),
          renewal_date: r.renewal_date?.slice(0, 10) || '',
          active: r.active,
        });
      } else {
        setRetainer(null);
        setForm({ monthly_hours: '', rate: '', renewal_date: '', active: true });
      }
    } catch (e) {
      console.error('[RetainerManager] loadRetainer failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadRetainer();
    loadTimeEntries();
  }, [clientId, loadRetainer, loadTimeEntries]);

  const getHoursUsedThisMonth = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    return timeEntries
      .filter((te) => {
        if (te.client_id !== clientId) return false;
        if (!te.duration_minutes) return false;
        const startTime = te.start_time;
        return startTime >= monthStart && startTime <= monthEnd;
      })
      .reduce((sum, te) => sum + (te.duration_minutes || 0), 0) / 60;
  };

  const handleSave = async () => {
    const hours = parseFloat(form.monthly_hours);
    const rateVal = parseFloat(form.rate);
    if (isNaN(hours) || isNaN(rateVal) || hours <= 0 || rateVal <= 0) return;
    setSaving(true);
    try {
      const db = await getDb();
      if (retainer) {
        await db.execute(
          'UPDATE retainers SET monthly_hours = ?, rate = ?, renewal_date = ?, active = ? WHERE id = ?',
          [hours, rateVal, form.renewal_date || null, form.active ? 1 : 0, retainer.id]
        );
        setRetainer({
          ...retainer,
          monthly_hours: hours,
          rate: rateVal,
          renewal_date: form.renewal_date || undefined,
          active: form.active,
        });
      } else {
        const id = crypto.randomUUID();
        await db.execute(
          'INSERT INTO retainers (id, client_id, monthly_hours, rate, renewal_date, active) VALUES (?, ?, ?, ?, ?, ?)',
          [id, clientId, hours, rateVal, form.renewal_date || null, form.active ? 1 : 0]
        );
        setRetainer({
          id,
          client_id: clientId,
          monthly_hours: hours,
          rate: rateVal,
          renewal_date: form.renewal_date || undefined,
          active: form.active,
        });
      }
      setShowForm(false);
    } catch (e) {
      console.error('[RetainerManager] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!retainer) return;
    try {
      const db = await getDb();
      await db.execute('DELETE FROM retainers WHERE id = ?', [retainer.id]);
      setRetainer(null);
      setForm({ monthly_hours: '', rate: '', renewal_date: '', active: true });
    } catch (e) {
      console.error('[RetainerManager] handleDelete failed:', e);
    }
  };

  const hoursUsed = getHoursUsedThisMonth();
  const monthlyHours = retainer?.monthly_hours || 0;
  const percentUsed = monthlyHours > 0 ? (hoursUsed / monthlyHours) * 100 : 0;
  const isOver = percentUsed > 100;
  const isWarning = percentUsed >= 80 && percentUsed <= 100;

  const barColor = isOver
    ? 'bg-[#DC2626]'
    : isWarning
    ? 'bg-[#D97706]'
    : 'bg-[#16A34A]';
  const textColor = isOver
    ? 'text-[#DC2626]'
    : isWarning
    ? 'text-[#D97706]'
    : 'text-[#16A34A]';
  const bgColor = isOver
    ? 'bg-[#DC2626]/10'
    : isWarning
    ? 'bg-[#D97706]/10'
    : 'bg-[#16A34A]/10';

  const monthlyValue = retainer ? retainer.monthly_hours * retainer.rate : 0;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Retainer
          </h4>
        </div>
        <div className="h-20 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Retainer
        </h4>
        <div className="flex items-center gap-1">
          {retainer && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
                Edit
              </Button>
              <button
                aria-label="Delete retainer manager"
                onClick={handleDelete} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] p-1">
                <Trash2 size={12} />
              </button>
            </>
          )}
          {!retainer && (
            <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
              Set Up Retainer
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--text-tertiary)] mb-0.5 block">Monthly Hours</label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 20"
                value={form.monthly_hours}
                onChange={(e) => setForm({ ...form, monthly_hours: e.target.value })}
                className={inputClass}
                min={0}
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-tertiary)] mb-0.5 block">Hourly Rate</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 150"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                className={inputClass}
                min={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--text-tertiary)] mb-0.5 block">Renewal Date</label>
              <input
                type="date"
                value={form.renewal_date}
                onChange={(e) => setForm({ ...form, renewal_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="accent-[var(--accent)]"
                />
                Active
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.monthly_hours || !form.rate}>
              Save
            </Button>
          </div>
        </div>
      )}

      {retainer ? (
        <div className="space-y-2">
          <div className={`px-3 py-3 rounded-[8px] ${bgColor}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {hoursUsed.toFixed(1)} / {monthlyHours} hours
              </span>
              <span className={`text-xs font-semibold ${textColor}`}>
                {percentUsed.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
            <div className="text-[10px] mt-1 text-[var(--text-tertiary)]">
              {isOver
                ? 'Over hours · consider billing overage'
                : isWarning
                ? 'Approaching limit'
                : 'Under budget'}
            </div>
          </div>

          <div className="flex items-center gap-4 px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <div className="flex items-center gap-1.5">
              <DollarSign size={10} className="text-[var(--text-tertiary)]" />
              <span className="text-[var(--text-primary)] font-medium">
                ${monthlyValue.toLocaleString()} / month
              </span>
            </div>
            {retainer.renewal_date && (
              <div className="flex items-center gap-1.5">
                <Calendar size={10} className="text-[var(--text-tertiary)]" />
                <span className="text-[var(--text-secondary)]">
                  Renews {new Date(retainer.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${retainer.active ? 'bg-[#16A34A]/15 text-[#16A34A]' : 'bg-[var(--border-color)] text-[var(--text-tertiary)]'}`}
            >
              {retainer.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No retainer set up yet.</p>
      )}
    </div>
  );
}
