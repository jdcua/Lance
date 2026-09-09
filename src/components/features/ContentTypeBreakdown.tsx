/**
 * Content Type Breakdown · Social Media feature.
 * Reads content_posts table. Shows a simple count breakdown by content_type as labeled bars.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';

const CONTENT_TYPES = ['Reel', 'Carousel', 'Static', 'Story', 'Long-form', 'Thread', 'other'];

const TYPE_COLORS: Record<string, string> = {
  Reel: '#E1306C',
  Carousel: '#F1C40F',
  Static: '#2ECC71',
  Story: '#3498DB',
  'Long-form': '#9B59B6',
  Thread: '#1DA1F2',
  other: '#888888',
};

type CountRow = { content_type: string; count: number };

export default function ContentTypeBreakdown({ clientId }: { clientId?: string }) {
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const db = await getDb();
        let query = "SELECT content_type, COUNT(*) as count FROM content_posts WHERE content_type IS NOT NULL";
        const params: string[] = [];
        if (clientId) {
          query += " AND client_id = ?";
          params.push(clientId);
        }
        query += " GROUP BY content_type ORDER BY count DESC";
        const rows = await db.select<(CountRow & Record<string, unknown>)[]>(query, params);
        setCounts(rows.map(r => ({ content_type: r.content_type as string, count: r.count as number })));
      } catch (e) { console.error('[ContentTypeBreakdown] load failed:', e); }
      setLoading(false);
    };
    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Content Types</h4>
        {[1, 2, 3].map(i => <div key={i} className="h-6 bg-[var(--bg-secondary)] rounded-[4px] animate-pulse" />)}
      </div>
    );
  }

  const max = Math.max(...counts.map(c => c.count), 1);

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Content Types</h4>
      {counts.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)]">No content posts yet.</p>
      ) : (
        <div className="space-y-2">
          {CONTENT_TYPES.filter(ct => counts.some(c => c.content_type === ct)).map(ct => {
            const row = counts.find(c => c.content_type === ct)!;
            const pct = Math.round((row.count / max) * 100);
            return (
              <div key={ct} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-secondary)] w-20 flex-shrink-0">{ct}</span>
                <div className="flex-1 h-4 bg-[var(--bg-secondary)] rounded-[4px] overflow-hidden">
                  <div
                    className="h-full rounded-[4px] transition-all"
                    style={{ width: `${pct}%`, backgroundColor: TYPE_COLORS[ct] || '#888' }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)] w-6 text-right">{row.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
