/**
 * Post Volume Log · Social Media feature.
 * Reads content_posts where status='posted'. Shows count by month as simple bars.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';

type MonthCount = { month: string; count: number };

export default function PostVolumeLog({ clientId }: { clientId?: string }) {
  const [data, setData] = useState<MonthCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const db = await getDb();
        let query = "SELECT strftime('%Y-%m', date) as month, COUNT(*) as count FROM content_posts WHERE status = 'posted' AND date IS NOT NULL";
        const params: string[] = [];
        if (clientId) {
          query += " AND client_id = ?";
          params.push(clientId);
        }
        query += " GROUP BY month ORDER BY month DESC LIMIT 12";
        const rows = await db.select<(MonthCount & Record<string, unknown>)[]>(query, params);
        setData(rows.map(r => ({ month: r.month as string, count: r.count as number })).reverse());
      } catch (e) { console.error('[PostVolumeLog] load failed:', e); }
      setLoading(false);
    };
    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Post Volume</h4>
        {[1, 2, 3].map(i => <div key={i} className="h-6 bg-[var(--bg-secondary)] rounded-[4px] animate-pulse" />)}
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Post Volume by Month</h4>
      {data.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)]">No posted content yet.</p>
      ) : (
        <div className="space-y-2">
          {data.map(d => {
            const pct = Math.round((d.count / max) * 100);
            return (
              <div key={d.month} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-secondary)] w-16 flex-shrink-0">{d.month}</span>
                <div className="flex-1 h-4 bg-[var(--bg-secondary)] rounded-[4px] overflow-hidden">
                  <div
                    className="h-full rounded-[4px] bg-[var(--accent)] transition-colors"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)] w-6 text-right">{d.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
