/**
 * Fabrication Tracker · Embedded feature.
 * Track fabrication status for items with fab house and cost.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Factory } from 'lucide-react';

type FabItem = {
  id: string;
  project_id: string;
  item_name: string;
  status: string;
  start_date: string;
  completed_date: string;
  fab_house: string;
  cost: number;
};

const STATUS_OPTIONS = ['planned', 'in_progress', 'fabricated', 'shipped', 'received'] as const;

const statusBadgeClasses: Record<string, string> = {
  planned: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB]',
  fabricated: 'bg-[#D97706]/15 text-[#D97706]',
  shipped: 'bg-[#7C3AED]/15 text-[#7C3AED]',
  received: 'bg-[#16A34A]/15 text-[#16A34A]',
};

export default function FabricationTracker({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<FabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    item_name: '',
    status: 'planned',
    start_date: '',
    completed_date: '',
    fab_house: '',
    cost: '',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(FabItem & Record<string, unknown>)[]>(
        'SELECT * FROM fabrication_tracker WHERE project_id = ? ORDER BY start_date DESC',
        [projectId],
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          item_name: r.item_name as string,
          status: r.status as string,
          start_date: r.start_date as string,
          completed_date: r.completed_date as string,
          fab_house: r.fab_house as string,
          cost: r.cost as number,
        })),
      );
    } catch (e) {
      console.error('[FabricationTracker] loadItems failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadItems();
  }, [projectId, loadItems]);

  const handleAdd = async () => {
    if (!form.item_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const cost = parseFloat(form.cost) || 0;
      await db.execute(
        'INSERT INTO fabrication_tracker (id, project_id, item_name, status, start_date, completed_date, fab_house, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.item_name.trim(),
          form.status,
          form.start_date || null,
          form.completed_date || null,
          form.fab_house.trim() || null,
          cost,
        ],
      );
      const item: FabItem = {
        id,
        project_id: projectId,
        item_name: form.item_name.trim(),
        status: form.status,
        start_date: form.start_date || '',
        completed_date: form.completed_date || '',
        fab_house: form.fab_house.trim() || '',
        cost,
      };
      setItems((prev) => [item, ...prev]);
      setForm({
        item_name: '',
        status: 'planned',
        start_date: '',
        completed_date: '',
        fab_house: '',
        cost: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[FabricationTracker] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM fabrication_tracker WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[FabricationTracker] delete failed:', e);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const db = await getDb();
      const completedDate = status === 'received' ? new Date().toISOString().split('T')[0] : null;
      if (completedDate) {
        await db.execute(
          'UPDATE fabrication_tracker SET status = ?, completed_date = ? WHERE id = ?',
          [status, completedDate, id],
        );
        setItems((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, status, completed_date: completedDate || i.completed_date } : i,
          ),
        );
      } else {
        await db.execute('UPDATE fabrication_tracker SET status = ? WHERE id = ?', [status, id]);
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      }
    } catch (e) {
      console.error('[FabricationTracker] status update failed:', e);
    }
  };

  const totalCost = items.reduce((sum, i) => sum + (i.cost || 0), 0);

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';
  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Fabrication
          </h4>
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
          Fabrication ({items.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Item
        </Button>
      </div>

      {items.length > 0 && totalCost > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
          <Factory size={12} className="text-[var(--accent-ink,var(--accent))]" />
          <span>
            Total fab cost:{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              ${totalCost.toFixed(2)}
            </span>
          </span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Item name"
            value={form.item_name}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={selectClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Cost ($)"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              className={inputClass}
              step="0.01"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={form.completed_date}
              onChange={(e) => setForm({ ...form, completed_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <input
            type="text"
            placeholder="Fab house"
            value={form.fab_house}
            onChange={(e) => setForm({ ...form, fab_house: e.target.value })}
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              loading={saving}
              disabled={!form.item_name.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No fabrication items tracked yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Item
                </th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Start
                </th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Done
                </th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Fab House
                </th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Cost
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)]"
                >
                  <td className="py-1.5 px-2 font-medium text-[var(--text-primary)]">
                    {item.item_name}
                  </td>
                  <td className="py-1.5 px-2">
                    <select aria-label="Item.status"
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border-none cursor-pointer ${statusBadgeClasses[item.status] || ''}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-2 text-[var(--text-tertiary)]">
                    {item.start_date || '--'}
                  </td>
                  <td className="py-1.5 px-2 text-[var(--text-tertiary)]">
                    {item.completed_date || '--'}
                  </td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)]">
                    {item.fab_house || '--'}
                  </td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">
                    ${(item.cost || 0).toFixed(2)}
                  </td>
                  <td className="py-1.5 px-2">
                    <button
                      aria-label="Delete fabrication tracker"
                      onClick={() => handleDelete(item.id)}
                      className="text-[var(--text-tertiary)] hover:text-[#A32D2D]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
