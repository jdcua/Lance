/**
 * Feature Prioritization · Product Manager feature.
 * Priority matrix display reading roadmap_items, with quick priority change.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';

type RoadmapItem = {
  id: string;
  project_id: string;
  title: string;
  quarter?: string;
  status: string;
  priority: string;
  effort?: string;
  notes?: string;
  sort_order: number;
};

const PRIORITY_OPTIONS = ['P0', 'P1', 'P2', 'P3'] as const;

const priorityColors: Record<string, string> = {
  P0: 'border-l-[#DC2626]',
  P1: 'border-l-[#D97706]',
  P2: 'border-l-[#2563EB]',
  P3: 'border-l-[var(--border-color)]',
};

const priorityBadge: Record<string, string> = {
  P0: 'bg-[#DC2626]/15 text-[#DC2626]',
  P1: 'bg-[#D97706]/15 text-[#D97706]',
  P2: 'bg-[#2563EB]/15 text-[#2563EB]',
  P3: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
};

export default function FeaturePrioritization({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(RoadmapItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, title, quarter, status, priority, effort, notes, sort_order FROM roadmap_items WHERE project_id = ? ORDER BY CASE priority WHEN \'P0\' THEN 0 WHEN \'P1\' THEN 1 WHEN \'P2\' THEN 2 WHEN \'P3\' THEN 3 END, sort_order ASC',
        [projectId]
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          title: r.title as string,
          quarter: r.quarter as string | undefined,
          status: r.status as string,
          priority: r.priority as string,
          effort: r.effort as string | undefined,
          notes: r.notes as string | undefined,
          sort_order: r.sort_order as number,
        }))
      );
    } catch (e) {
      console.error('[FeaturePrioritization] loadItems failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadItems();
  }, [projectId, loadItems]);

  const handlePriorityChange = async (id: string, newPriority: string) => {
    setSaving(id);
    try {
      const db = await getDb();
      await db.execute('UPDATE roadmap_items SET priority = ? WHERE id = ?', [newPriority, id]);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, priority: newPriority } : i)).sort((a, b) => {
        const order: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      }));
    } catch (e) {
      console.error('[FeaturePrioritization] handlePriorityChange failed:', e);
    }
    setSaving(null);
  };

  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Priority Matrix</h4>
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
          Priority Matrix ({items.length})
        </h4>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No roadmap items. Add items in Roadmap View first.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs border-l-2 ${priorityColors[item.priority] || 'border-l-[var(--border-color)]'}`}
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)] truncate">{item.title}</span>
                {item.quarter && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">{item.quarter}</span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityBadge[item.priority] || priorityBadge.P2}`}>
                  {item.priority}
                </span>
                {item.effort && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">{item.effort}</span>
                )}
              </div>
              <select
                value={item.priority}
                onChange={(e) => handlePriorityChange(item.id, e.target.value)}
                className={selectClass + ' w-16 ml-2'}
                disabled={saving === item.id}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
