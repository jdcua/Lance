/**
 * Scope Alert -- Virtual Assistant feature.
 * Reads retainers + va_tasks. Shows an alert banner if va_tasks hours exceed 90% of retainer monthly_hours.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import { AlertTriangle, CheckCircle } from 'lucide-react';

type RetainerRecord = {
  id: string;
  client_id: string;
  monthly_hours: number;
  active: boolean;
};

type TaskRecord = {
  id: string;
  duration_minutes?: number;
};

export default function ScopeAlert({ clientId }: { clientId?: string }) {
  const [usagePct, setUsagePct] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!clientId) {
        setLoading(false);
        return;
      }
      try {
        const db = await getDb();

        const retainers = await db.select<(RetainerRecord & Record<string, unknown>)[]>(
          'SELECT id, client_id, monthly_hours, active FROM retainers WHERE client_id = ? AND active = 1',
          [clientId]
        );
        const totalMonthlyHours = retainers.reduce((sum, r) => sum + ((r.monthly_hours as number) || 0), 0);

        if (totalMonthlyHours === 0) {
          setUsagePct(0);
          setLoading(false);
          return;
        }

        const tasks = await db.select<(TaskRecord & Record<string, unknown>)[]>(
          'SELECT id, duration_minutes FROM va_tasks WHERE client_id = ?',
          [clientId]
        );
        const totalMinutes = tasks.reduce((sum, t) => sum + ((t.duration_minutes as number) || 0), 0);
        const totalHours = totalMinutes / 60;

        setUsagePct(Math.round((totalHours / totalMonthlyHours) * 100));
      } catch (e) { console.error('[ScopeAlert] load failed:', e); }
      setLoading(false);
    };
    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="h-12 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
    );
  }

  if (!clientId) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs text-[var(--text-tertiary)]">
        <CheckCircle size={14} className="text-[var(--text-tertiary)]" />
        Select a client to check scope.
      </div>
    );
  }

  if (usagePct === null) {
    return null;
  }

  if (usagePct >= 90) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-[6px] text-xs">
        <AlertTriangle size={14} className="text-[#DC2626] flex-shrink-0" />
        <span className="text-[#DC2626] font-medium">Scope Alert:</span>
        <span className="text-[var(--text-primary)]">Task hours at <strong>{usagePct}%</strong> of monthly retainer. Review scope.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#2ECC71]/10 border border-[#2ECC71]/30 rounded-[6px] text-xs">
      <CheckCircle size={14} className="text-[#2ECC71] flex-shrink-0" />
      <span className="text-[var(--text-primary)]">Hours within scope ({usagePct}% of retainer).</span>
    </div>
  );
}
