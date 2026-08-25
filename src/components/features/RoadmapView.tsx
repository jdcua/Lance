/**
 * Roadmap View -- Product Manager feature.
 * Roadmap items grouped by quarter with reordering.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';

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

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
const STATUS_OPTIONS = ['planned', 'in_progress', 'done'] as const;
const PRIORITY_OPTIONS = ['P0', 'P1', 'P2', 'P3'] as const;
const EFFORT_OPTIONS = ['S', 'M', 'L', 'XL'] as const;

const statusBadge: Record<string, string> = {
  planned: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB]',
  done: 'bg-[#16A34A]/15 text-[#16A34A]',
};

const priorityBadge: Record<string, string> = {
  P0: 'bg-[#DC2626]/15 text-[#DC2626]',
  P1: 'bg-[#D97706]/15 text-[#D97706]',
  P2: 'bg-[#2563EB]/15 text-[#2563EB]',
  P3: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
};

const effortBadge: Record<string, string> = {
  S: 'bg-[#16A34A]/15 text-[#16A34A]',
  M: 'bg-[#D97706]/15 text-[#D97706]',
  L: 'bg-[#DC2626]/15 text-[#DC2626]',
  XL: 'bg-[#991B1B]/15 text-[#991B1B]',
};

export default function RoadmapView({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    quarter: 'Q1',
    status: 'planned',
    priority: 'P2',
    effort: 'M',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(RoadmapItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, title, quarter, status, priority, effort, notes, sort_order FROM roadmap_items WHERE project_id = ? ORDER BY quarter ASC, sort_order ASC, id ASC',
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
      console.error('[RoadmapView] loadItems failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, [projectId]);

  const sorted = [...items];
  const maxSort = sorted.length > 0 ? Math.max(...sorted.map((i) => i.sort_order)) : 0;

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const sortOrder = maxSort + 1;
      const db = await getDb();
      await db.execute(
        'INSERT INTO roadmap_items (id, project_id, title, quarter, status, priority, effort, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.title.trim(), form.quarter, form.status, form.priority, form.effort || null, form.notes || null, sortOrder]
      );
      const item: RoadmapItem = {
        id,
        project_id: projectId,
        title: form.title.trim(),
        quarter: form.quarter,
        status: form.status,
        priority: form.priority,
        effort: form.effort || undefined,
        notes: form.notes || undefined,
        sort_order: sortOrder,
      };
      setItems((prev) => {
        const next = [...prev, item];
        next.sort((a, b) => (a.quarter || '').localeCompare(b.quarter || '') || a.sort_order - b.sort_order);
        return next;
      });
      setForm({ title: '', quarter: 'Q1', status: 'planned', priority: 'P2', effort: 'M', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[RoadmapView] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM roadmap_items WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[RoadmapView] handleDelete failed:', e);
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const a = sorted[index];
    const b = sorted[targetIndex];
    try {
      const db = await getDb();
      await db.execute('UPDATE roadmap_items SET sort_order = ? WHERE id = ?', [b.sort_order, a.id]);
      await db.execute('UPDATE roadmap_items SET sort_order = ? WHERE id = ?', [a.sort_order, b.id]);
      setItems((prev) => {
        const next = prev.map((c) => {
          if (c.id === a.id) return { ...c, sort_order: b.sort_order };
          if (c.id === b.id) return { ...c, sort_order: a.sort_order };
          return c;
        });
        next.sort((x, y) => (x.quarter || '').localeCompare(y.quarter || '') || x.sort_order - y.sort_order);
        return next;
      });
    } catch (e) {
      console.error('[RoadmapView] handleReorder failed:', e);
    }
  };

  const grouped = QUARTERS.map((q) => ({
    quarter: q,
    items: sorted.filter((i) => i.quarter === q),
  }));

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Roadmap</h4>
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
          Roadmap ({sorted.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Item
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Roadmap item title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-4 gap-2">
            <select value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })} className={inputClass}>
              {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={form.effort} onChange={(e) => setForm({ ...form, effort: e.target.value })} className={inputClass}>
              {EFFORT_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.title.trim()}>Save</Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No roadmap items yet.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.quarter} className="space-y-1">
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase px-1">
                  {group.quarter} ({group.items.length})
                </div>
                {group.items.map((item, i) => {
                  const globalIndex = sorted.indexOf(item);
                  return (
                    <div key={item.id}>
                      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <button
                            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                          >
                            <ChevronRight size={10} className={`transition-transform ${expanded === item.id ? 'rotate-90' : ''}`} />
                          </button>
                          <span className="font-medium text-[var(--text-primary)] truncate">{item.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusBadge[item.status] || statusBadge.planned}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityBadge[item.priority] || priorityBadge.P2}`}>
                            {item.priority}
                          </span>
                          {item.effort && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${effortBadge[item.effort] || ''}`}>
                              {item.effort}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 ml-2">
                          <button
                            onClick={() => handleReorder(globalIndex, 'up')}
                            disabled={globalIndex === 0}
                            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={() => handleReorder(globalIndex, 'down')}
                            disabled={globalIndex === sorted.length - 1}
                            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                          >
                            <ChevronDown size={12} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-1">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {expanded === item.id && (
                        <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-[6px] text-xs space-y-1">
                          {item.notes ? <p className="text-[var(--text-secondary)]">{item.notes}</p> : <p className="text-[var(--text-tertiary)] italic">No notes.</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
