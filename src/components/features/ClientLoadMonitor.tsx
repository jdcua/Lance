/**
 * Client Load Monitor · Dashboard widget.
 * Shows all retainer clients as horizontal bars: hours_used / monthly_hours.
 * Color: green (< 80%), amber (80-100%), red (> 100%).
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import { useStore } from '../../store';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';

type RetainerRecord = {
  id: string;
  client_id: string;
  monthly_hours: number;
  rate: number;
  renewal_date?: string;
  active: boolean;
};

type ClientRecord = {
  id: string;
  name: string;
};

type VASummary = {
  client_id: string;
  total_minutes: number;
};

export default function ClientLoadMonitor() {
  const { loadClients } = useStore();
  const [retainers, setRetainers] = useState<RetainerRecord[]>([]);
  const [vaSummaries, setVaSummaries] = useState<VASummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      await loadClients();
      const db = await getDb();

      const retainerRows = await db.select<(RetainerRecord & Record<string, unknown>)[]>(
        'SELECT id, client_id, monthly_hours, rate, renewal_date, active FROM retainers WHERE active = 1'
      );
      const activeRetainers: RetainerRecord[] = retainerRows.map((r) => ({
        id: r.id as string,
        client_id: r.client_id as string,
        monthly_hours: r.monthly_hours as number,
        rate: r.rate as number,
        renewal_date: r.renewal_date as string | undefined,
        active: !!(r.active),
      }));
      setRetainers(activeRetainers);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const vaRows = await db.select<(VASummary & Record<string, unknown>)[]>(
        'SELECT client_id, COALESCE(SUM(duration_minutes), 0) as total_minutes FROM va_tasks WHERE completed_date >= ? AND completed_date <= ? GROUP BY client_id',
        [monthStart, monthEnd + 'T23:59:59']
      );
      setVaSummaries(
        vaRows.map((r) => ({
          client_id: r.client_id as string,
          total_minutes: r.total_minutes as number,
        }))
      );

      const clientRows = await db.select<(ClientRecord & Record<string, unknown>)[]>(
        'SELECT id, name FROM clients'
      );
      const nameMap: Record<string, string> = {};
      for (const c of clientRows) {
        nameMap[c.id as string] = c.name as string;
      }
      setClientNames(nameMap);
    } catch (e) {
      console.error('[ClientLoadMonitor] loadData failed:', e);
    }
    setLoading(false);
  }, [loadClients]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const data = retainers.map((r) => {
    const minutes = vaSummaries.find((v) => v.client_id === r.client_id)?.total_minutes || 0;
    const hoursUsed = minutes / 60;
    const percent = r.monthly_hours > 0 ? (hoursUsed / r.monthly_hours) * 100 : 0;
    return {
      ...r,
      hoursUsed,
      percent,
      name: clientNames[r.client_id] || 'Unknown Client',
    };
  });

  const sorted = [...data].sort((a, b) => b.percent - a.percent);

  const getBarColor = (pct: number) => {
    if (pct > 100) return 'bg-[#DC2626]';
    if (pct >= 80) return 'bg-[#D97706]';
    return 'bg-[#16A34A]';
  };

  const getTextColor = (pct: number) => {
    if (pct > 100) return 'text-[#DC2626]';
    if (pct >= 80) return 'text-[#D97706]';
    return 'text-[#16A34A]';
  };

  const getBgColor = (pct: number) => {
    if (pct > 100) return 'bg-[#DC2626]/10';
    if (pct >= 80) return 'bg-[#D97706]/10';
    return 'bg-[#16A34A]/10';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Client Load</h4>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Client Load</h4>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] py-2">No active retainers found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Client Load</h4>
        <span className="text-[10px] text-[var(--text-tertiary)]">{sorted.length} retainer{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-2">
        {sorted.map((item) => (
          <div key={item.id} className={`px-3 py-2 rounded-[6px] ${getBgColor(item.percent)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]">{item.name}</span>
              <span className={`text-[11px] font-semibold ${getTextColor(item.percent)}`}>
                {item.percent.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden mb-1">
              <div
                className={`h-full rounded-full transition-colors ${getBarColor(item.percent)}`}
                style={{ width: `${Math.min(item.percent, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-secondary)]">
                {item.hoursUsed.toFixed(1)} / {item.monthly_hours} hours
              </span>
              <span className="text-[var(--text-tertiary)]">
                {item.percent > 100 ? (
                  <span className="flex items-center gap-0.5 text-[#DC2626]">
                    <AlertCircle size={10} /> Over
                  </span>
                ) : item.percent >= 80 ? (
                  <span className="flex items-center gap-0.5 text-[#D97706]">
                    <AlertTriangle size={10} /> Approaching
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[var(--text-tertiary)]">
                    <Clock size={10} /> On track
                  </span>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
