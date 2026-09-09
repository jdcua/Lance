/**
 * Satisfaction Trend Widget · displays average rating from feedback_aggregations and recent ratings list.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import { Star } from 'lucide-react';

type FeedbackEntry = {
  id: string;
  source?: string;
  rating: number;
  comment?: string;
  date?: string;
};

export default function SatisfactionTrendWidget({ clientId }: { clientId?: string }) {
  const [items, setItems] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      let query = 'SELECT id, source, rating, comment, date FROM feedback_aggregations';
      let params: string[] = [];
      if (clientId) {
        query += ' WHERE client_id = ?';
        params = [clientId];
      }
      query += ' ORDER BY date DESC, id DESC LIMIT 20';
      const rows = await db.select<(FeedbackEntry & Record<string, unknown>)[]>(query, params);
      setItems(rows.map(r => ({
        id: r.id as string,
        source: r.source as string | undefined,
        rating: (r.rating as number) || 0,
        comment: r.comment as string | undefined,
        date: r.date as string | undefined,
      })));
    } catch (e) { console.error('[SatisfactionTrendWidget] load failed:', e); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadItems(); }, [clientId, loadItems]);

  const avgRating = items.length > 0
    ? items.reduce((sum, i) => sum + i.rating, 0) / items.length
    : 0;

  if (loading) {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Satisfaction</h4>
        <div className="space-y-2">
          <div className="h-16 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Satisfaction</h4>

      <div className="flex items-center gap-3 px-3 py-3 bg-[var(--bg-secondary)] rounded-[8px]">
        <div className="text-2xl font-bold text-[var(--text-primary)]">{avgRating.toFixed(1)}</div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} size={14} className={n <= Math.round(avgRating) ? 'text-[#F1C40F] fill-[#F1C40F]' : 'text-[var(--border-color)]'} />
            ))}
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)]">{items.length} rating{items.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No feedback ratings yet.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={9} className={n <= item.rating ? 'text-[#F1C40F] fill-[#F1C40F]' : 'text-[var(--border-color)]'} />
                  ))}
                </div>
                {item.comment && <span className="text-[var(--text-primary)] truncate">{item.comment}</span>}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-2">
                {item.source && <span className="px-1 py-0.5 rounded-full bg-[var(--border-color)]">{item.source}</span>}
                {item.date && <span>{item.date}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
