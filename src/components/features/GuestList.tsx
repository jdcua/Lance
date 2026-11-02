/**
 * Guest List · guest management with RSVP status badges, table assignment, and dietary tracking.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type Guest = {
  id: string;
  project_id: string;
  name?: string;
  rsvp?: string;
  table_assignment?: string;
  dietary?: string;
  notes?: string;
};

const RSVP_OPTIONS = ['confirmed', 'pending', 'declined'];
const RSVP_COLORS: Record<string, string> = {
  confirmed: 'bg-[#2ECC71]/20 text-[#2ECC71]',
  pending: 'bg-[#E67E22]/20 text-[#E67E22]',
  declined: 'bg-[#E74C3C]/20 text-[#E74C3C]',
};

export default function GuestList({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    rsvp: 'pending',
    table_assignment: '',
    dietary: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Guest & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, rsvp, table_assignment, dietary, notes FROM guests WHERE project_id = ? ORDER BY name ASC',
        [projectId],
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          name: r.name as string | undefined,
          rsvp: r.rsvp as string | undefined,
          table_assignment: r.table_assignment as string | undefined,
          dietary: r.dietary as string | undefined,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[GuestList] load failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadItems();
  }, [projectId, loadItems]);

  const confirmed = items.filter((i) => i.rsvp === 'confirmed').length;
  const pending = items.filter((i) => i.rsvp === 'pending').length;
  const declined = items.filter((i) => i.rsvp === 'declined').length;

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO guests (id, project_id, name, rsvp, table_assignment, dietary, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.name.trim(),
          form.rsvp,
          form.table_assignment.trim() || null,
          form.dietary.trim() || null,
          form.notes.trim() || null,
        ],
      );
      const item: Guest = {
        id,
        project_id: projectId,
        name: form.name.trim(),
        rsvp: form.rsvp,
        table_assignment: form.table_assignment.trim() || undefined,
        dietary: form.dietary.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      setItems((prev) => [...prev, item]);
      setForm({ name: '', rsvp: 'pending', table_assignment: '', dietary: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[GuestList] save failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM guests WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[GuestList] delete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Guest List
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
          Guest List ({items.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Guest
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#2ECC71]" />
            {confirmed} confirmed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#E67E22]" />
            {pending} pending
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#E74C3C]" />
            {declined} declined
          </span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Guest name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Rsvp"
              value={form.rsvp}
              onChange={(e) => setForm({ ...form, rsvp: e.target.value })}
              className={inputClass}
            >
              {RSVP_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Table assignment"
              value={form.table_assignment}
              onChange={(e) => setForm({ ...form, table_assignment: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Dietary requirements"
              value={form.dietary}
              onChange={(e) => setForm({ ...form, dietary: e.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.name.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No guests yet. Add your first guest.
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                  {item.rsvp && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${RSVP_COLORS[item.rsvp] || ''}`}
                    >
                      {item.rsvp}
                    </span>
                  )}
                </div>
                <button
                  aria-label="Delete guest list"
                  onClick={() => handleDelete(item.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                {item.table_assignment && <span>Table: {item.table_assignment}</span>}
                {item.dietary && <span>Dietary: {item.dietary}</span>}
              </div>
              {item.notes && (
                <div className="text-[10px] text-[var(--text-tertiary)] italic">{item.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
