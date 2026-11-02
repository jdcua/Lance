/**
 * Report Cadence · Marketing / SEO feature.
 * Manages reporting frequency, last report date, and overdue status.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Send, AlertTriangle } from 'lucide-react';

type Cadence = {
  id: string;
  client_id: string;
  frequency: string;
  last_report_date?: string;
  next_due?: string;
};

const FREQUENCIES = ['weekly', 'monthly', 'quarterly'];

function addDays(dateStr: string, frequency: string): string {
  const d = new Date(dateStr);
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
  }
  return d.toISOString().split('T')[0];
}

function isOverdue(nextDue?: string): boolean {
  if (!nextDue) return false;
  return new Date(nextDue) < new Date(new Date().toISOString().split('T')[0]);
}

export default function ReportCadence({ clientId }: { clientId: string }) {
  const [cadence, setCadence] = useState<Cadence | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ frequency: 'monthly' });
  const [saving, setSaving] = useState(false);

  const loadCadence = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Cadence & Record<string, unknown>)[]>(
        'SELECT id, client_id, frequency, last_report_date, next_due FROM client_report_cadence WHERE client_id = ? LIMIT 1',
        [clientId]
      );
      if (rows.length > 0) {
        const r = rows[0];
        setCadence({ id: r.id as string, client_id: r.client_id as string, frequency: r.frequency as string, last_report_date: r.last_report_date as string | undefined, next_due: r.next_due as string | undefined });
        setForm({ frequency: (r.frequency as string) || 'monthly' });
      }
    } catch (e) { console.error('[ReportCadence] loadCadence failed:', e); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadCadence(); }, [clientId, loadCadence]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextDue = cadence?.last_report_date ? addDays(cadence.last_report_date, form.frequency) : addDays(today, form.frequency);
      const db = await getDb();
      if (cadence) {
        await db.execute(
          'UPDATE client_report_cadence SET frequency = ?, next_due = ? WHERE id = ?',
          [form.frequency, nextDue, cadence.id]
        );
        setCadence({ ...cadence, frequency: form.frequency, next_due: nextDue });
      } else {
        const id = crypto.randomUUID();
        await db.execute(
          'INSERT INTO client_report_cadence (id, client_id, frequency, last_report_date, next_due) VALUES (?, ?, ?, ?, ?)',
          [id, clientId, form.frequency, null, nextDue]
        );
        setCadence({ id, client_id: clientId, frequency: form.frequency, last_report_date: undefined, next_due: nextDue });
      }
    } catch (e) { console.error('[ReportCadence] save failed:', e); }
    setSaving(false);
  };

  const handleSendReport = async () => {
    if (!cadence) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextDue = addDays(today, cadence.frequency);
      const db = await getDb();
      await db.execute(
        'UPDATE client_report_cadence SET last_report_date = ?, next_due = ? WHERE id = ?',
        [today, nextDue, cadence.id]
      );
      setCadence({ ...cadence, last_report_date: today, next_due: nextDue });
    } catch (e) { console.error('[ReportCadence] sendReport failed:', e); }
    setSaving(false);
  };


  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Report Cadence</h4>
        </div>
        <div className="h-16 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Report Cadence</h4>
      </div>

      <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)]">Frequency:</span>
          <div className="flex gap-1">
            {FREQUENCIES.map(f => (
              <label key={f} className={`px-2 py-1 rounded-[6px] text-[11px] cursor-pointer transition-colors ${form.frequency === f ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'}`}>
                <input type="radio" name="frequency" value={f} checked={form.frequency === f} onChange={() => setForm({ frequency: f })} className="hidden" />
                {f}
              </label>
            ))}
          </div>
        </div>

        {cadence && (
          <div className="text-xs text-[var(--text-tertiary)] space-y-1">
            <div>Last report: <span className="text-[var(--text-primary)]">{cadence.last_report_date || 'Never'}</span></div>
            <div className="flex items-center gap-1.5">
              Next due:
              <span className={`font-medium ${isOverdue(cadence.next_due) ? 'text-[#E74C3C]' : 'text-[var(--text-primary)]'}`}>
                {cadence.next_due || '--'}
              </span>
              {isOverdue(cadence.next_due) && <AlertTriangle size={12} className="text-[#E74C3C]" />}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} loading={saving}>
            {cadence ? 'Update' : 'Save'}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleSendReport} loading={saving} disabled={!cadence}>
            <Send size={12} /> Report Sent Today
          </Button>
        </div>
      </div>
    </div>
  );
}
