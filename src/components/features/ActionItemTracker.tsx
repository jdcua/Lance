/**
 * Action Item Tracker · Consultant feature.
 * Checklist of action items per client with owner, due date, and completion toggle.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Check, Circle, AlertCircle, User, Users } from 'lucide-react';
import { parseDateString } from '../../utils/format';

type ActionItem = {
  id: string;
  client_id: string;
  session_id?: string;
  title: string;
  owner: string;
  due_date?: string;
  completed: boolean;
  created_at: string;
};

type FilterTab = 'mine' | 'client' | 'all';

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: 'mine', label: 'Mine', icon: <User size={10} /> },
  { key: 'client', label: "Client's", icon: <Users size={10} /> },
  { key: 'all', label: 'All', icon: null },
];

export default function ActionItemTracker({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [form, setForm] = useState({
    title: '',
    owner: 'consultant',
    due_date: '',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ActionItem & Record<string, unknown>)[]>(
        'SELECT id, client_id, session_id, title, owner, due_date, completed, created_at FROM action_items WHERE client_id = ? ORDER BY completed ASC, due_date ASC NULLS LAST, created_at DESC',
        [clientId]
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          session_id: r.session_id as string | undefined,
          title: r.title as string,
          owner: r.owner as string,
          due_date: r.due_date as string | undefined,
          completed: !!(r.completed),
          created_at: r.created_at as string,
        }))
      );
    } catch (e) {
      console.error('[ActionItemTracker] loadItems failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadItems();
  }, [clientId, loadItems]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const db = await getDb();
      await db.execute(
        'INSERT INTO action_items (id, client_id, title, owner, due_date, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.title.trim(),
          form.owner,
          form.due_date || null,
          0,
          now,
        ]
      );
      const item: ActionItem = {
        id,
        client_id: clientId,
        title: form.title.trim(),
        owner: form.owner,
        due_date: form.due_date || undefined,
        completed: false,
        created_at: now,
      };
      setItems((prev) => [...prev, item]);
      setForm({ title: '', owner: 'consultant', due_date: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[ActionItemTracker] add failed:', e);
    }
    setSaving(false);
  };

  const handleToggle = async (item: ActionItem) => {
    try {
      const db = await getDb();
      const newCompleted = item.completed ? 0 : 1;
      await db.execute('UPDATE action_items SET completed = ? WHERE id = ?', [newCompleted, item.id]);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, completed: !i.completed } : i))
      );
    } catch (e) {
      console.error('[ActionItemTracker] toggle failed:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM action_items WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[ActionItemTracker] delete failed:', e);
    }
  };

  const isOverdue = (item: ActionItem) => {
    if (item.completed) return false;
    if (!item.due_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = parseDateString(item.due_date);
    due.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'mine') return item.owner === 'consultant';
    if (filter === 'client') return item.owner === 'client';
    return true;
  });

  const openCount = items.filter((i) => !i.completed).length;
  const overdueCount = items.filter((i) => isOverdue(i)).length;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';
  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Action Items
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Action Items ({items.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Item
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Action item title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Owner"
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
              className={selectClass}
            >
              <option value="consultant">Consultant</option>
              <option value="client">Client</option>
            </select>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-[6px] p-0.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-[4px] transition-colors ${
              filter === tab.key
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No action items yet. Add your first item.</p>
      ) : (
        <div className="space-y-1">
          {filteredItems.map((item) => {
            const overdue = isOverdue(item);
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between px-3 py-2 rounded-[6px] text-xs ${
                  overdue ? 'bg-[#DC2626]/10 border-l-2 border-[#DC2626]' : 'bg-[var(--bg-secondary)]'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button onClick={() => handleToggle(item)} className="flex-shrink-0">
                    {item.completed ? (
                      <Check size={14} className="text-[var(--accent-ink,var(--accent))]" />
                    ) : (
                      <Circle size={14} className="text-[var(--text-tertiary)]" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`font-medium ${item.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'} block truncate`}
                    >
                      {item.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                      <span className={`px-1 py-0.5 rounded-full ${
                        item.owner === 'consultant'
                          ? 'bg-[#2563EB]/15 text-[#2563EB]'
                          : 'bg-[#9B59B6]/15 text-[#9B59B6]'
                      }`}>
                        {item.owner}
                      </span>
                      {item.due_date && (
                        <span className={overdue ? 'text-[#DC2626] font-medium' : ''}>
                          {overdue ? (
                            <span className="flex items-center gap-0.5">
                              <AlertCircle size={9} />
                              Overdue{' '}
                              {parseDateString(item.due_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          ) : (
                            <>
                              Due{' '}
                              {new Date(item.due_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button aria-label="Delete action item tracker"
                  onClick={() => handleDelete(item.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}

          <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] text-[var(--text-tertiary)]">
            <span>{openCount} open</span>
            {overdueCount > 0 && <span className="text-[#DC2626]">{overdueCount} overdue</span>}
          </div>
        </div>
      )}
    </div>
  );
}
