/**
 * Rate Benchmarking · Writer feature.
 * Computes per-word rate trends from time_entry_words + time_entries + invoices.
 */
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';

type WordInvoicePair = {
  word_count: number;
  invoice_amount: number;
  invoice_date: string;
  per_word_rate: number;
};

export default function RateBenchmarking() {
  const { timeEntries, loadTimeEntries, invoices, loadInvoices } = useStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    latest: number | null;
    threeMonthAvg: number | null;
    highest: number | null;
    lowest: number | null;
    allPairs: WordInvoicePair[];
    trend: 'up' | 'down' | 'flat';
  }>({
    latest: null,
    threeMonthAvg: null,
    highest: null,
    lowest: null,
    allPairs: [],
    trend: 'flat',
  });

  const computeRates = useCallback(async () => {
    try {
      const db = await getDb();

      const wordRows = await db.select<(Record<string, unknown>)[]>(
        `SELECT tew.time_entry_id, tew.word_count, te.project_id, te.client_id
         FROM time_entry_words tew
         JOIN time_entries te ON te.id = tew.time_entry_id`
      );

      const wordMap = new Map<string, { word_count: number; project_id: string; client_id: string }>();
      for (const r of wordRows) {
        const teId = r.time_entry_id as string;
        wordMap.set(teId, {
          word_count: r.word_count as number,
          project_id: r.project_id as string,
          client_id: r.client_id as string,
        });
      }

      const pairs: WordInvoicePair[] = [];

      for (const inv of invoices) {
        if (inv.status === 'draft') continue;
        if (inv.total <= 0) continue;

        const date = inv.paid_at || inv.created_at;
        if (!date) continue;

        const relevantEntries = timeEntries.filter(
          (te) =>
            (te.project_id && inv.project_id && te.project_id === inv.project_id) ||
            (te.client_id === inv.client_id)
        );

        let totalWords = 0;
        for (const te of relevantEntries) {
          const w = wordMap.get(te.id);
          if (w) totalWords += w.word_count;
        }

        if (totalWords > 0) {
          const rate = inv.total / totalWords;
          pairs.push({
            word_count: totalWords,
            invoice_amount: inv.total,
            invoice_date: date,
            per_word_rate: rate,
          });
        }
      }

      pairs.sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());

      if (pairs.length > 0) {
        const latest = pairs[pairs.length - 1].per_word_rate;
        const rates = pairs.map((p) => p.per_word_rate);
        const highest = Math.max(...rates);
        const lowest = Math.min(...rates);

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const recentPairs = pairs.filter(
          (p) => new Date(p.invoice_date).getTime() >= threeMonthsAgo.getTime()
        );
        const threeMonthAvg =
          recentPairs.length > 0
            ? recentPairs.reduce((s, p) => s + p.per_word_rate, 0) / recentPairs.length
            : null;

        const trend =
          pairs.length >= 2
            ? pairs[pairs.length - 1].per_word_rate > pairs[0].per_word_rate
              ? 'up'
              : pairs[pairs.length - 1].per_word_rate < pairs[0].per_word_rate
              ? 'down'
              : 'flat'
            : 'flat';

        setStats({ latest, threeMonthAvg, highest, lowest, allPairs: pairs, trend });
      }
    } catch (e) {
      console.error('[RateBenchmarking] computeRates failed:', e);
    }
  }, [invoices, timeEntries]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadTimeEntries();
      await loadInvoices();
      await computeRates();
      setLoading(false);
    };
    load();
  }, [computeRates, loadInvoices, loadTimeEntries]);

  const formatRate = (rate: number) => {
    return `$${rate.toFixed(2)}`;
  };

  const trendIcon = (trend: string) => {
    if (trend === 'up')
      return <TrendingUp size={12} className="text-[#16A34A]" />;
    if (trend === 'down')
      return <TrendingDown size={12} className="text-[#DC2626]" />;
    return <Minus size={12} className="text-[var(--text-tertiary)]" />;
  };

  const trendColor = (trend: string) => {
    if (trend === 'up') return 'text-[#16A34A]';
    if (trend === 'down') return 'text-[#DC2626]';
    return 'text-[var(--text-tertiary)]';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Rate Benchmarking
          </h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Per-Word Rate
        </h4>
      </div>

      {stats.latest == null ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No rate data yet. Log word counts on time entries and mark invoices as paid to populate.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2.5 bg-[var(--bg-secondary)] rounded-[6px]">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">Latest</div>
              <div className="flex items-center gap-1 mt-1">
                <DollarSign size={14} className="text-[var(--text-primary)]" />
                <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                  {formatRate(stats.latest)}
                </span>
              </div>
            </div>
            <div className="px-3 py-2.5 bg-[var(--bg-secondary)] rounded-[6px]">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">Trend</div>
              <div className="flex items-center gap-1.5 mt-1">
                {trendIcon(stats.trend)}
                <span className={`text-sm font-bold tabular-nums ${trendColor(stats.trend)}`}>
                  {stats.trend === 'up' ? 'Rising' : stats.trend === 'down' ? 'Falling' : 'Stable'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px]">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">
                3-Month Avg
              </div>
              <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                {stats.threeMonthAvg != null ? formatRate(stats.threeMonthAvg) : '--'}
              </div>
            </div>
            <div className="px-3 py-2 bg-[#16A34A]/10 rounded-[6px]">
              <div className="text-[10px] text-[#16A34A]/70 uppercase tracking-wide">Highest</div>
              <div className="text-sm font-bold text-[#16A34A] tabular-nums mt-0.5">
                {stats.highest != null ? formatRate(stats.highest) : '--'}
              </div>
            </div>
            <div className="px-3 py-2 bg-[#DC2626]/10 rounded-[6px]">
              <div className="text-[10px] text-[#DC2626]/70 uppercase tracking-wide">Lowest</div>
              <div className="text-sm font-bold text-[#DC2626] tabular-nums mt-0.5">
                {stats.lowest != null ? formatRate(stats.lowest) : '--'}
              </div>
            </div>
          </div>

          <div className="pt-1">
            <h5 className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
              History ({stats.allPairs.length})
            </h5>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {stats.allPairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-secondary)] rounded-[4px] text-xs"
                >
                  <span className="text-[var(--text-secondary)]">
                    {new Date(pair.invoice_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit',
                    })}
                  </span>
                  <span className="text-[var(--text-tertiary)] tabular-nums">
                    {pair.word_count.toLocaleString()} words · ${pair.invoice_amount.toLocaleString()}
                  </span>
                  <span className="text-[var(--text-primary)] font-medium tabular-nums">
                    {formatRate(pair.per_word_rate)}/word
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
