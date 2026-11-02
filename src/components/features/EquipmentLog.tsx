import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Tag } from 'lucide-react';

type EquipmentUsage = {
  id: string;
  project_id: string;
  shoot_id?: string;
  equipment_name: string;
  equipment_type: string;
  notes?: string;
};

const EQUIPMENT_TYPES = ['camera', 'lens', 'lighting', 'audio', 'stabilizer', 'other'] as const;

export default function EquipmentLog({ projectId }: { projectId: string }) {
  const { shoots, loadShoots } = useStore();
  const [items, setItems] = useState<EquipmentUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    equipment_name: '',
    equipment_type: 'other',
    shoot_id: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<EquipmentUsage[]>(
        'SELECT * FROM equipment_usage WHERE project_id = $1 ORDER BY equipment_name',
        [projectId],
      );
      setItems(rows);
    } catch {
      /* handled */
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadShoots();
    loadItems();
  }, [projectId, loadItems, loadShoots]);

  const projectShoots = shoots.filter((s) => s.project_id === projectId);

  const handleSave = async () => {
    if (!form.equipment_name.trim()) return;
    setSaving(true);
    try {
      const db = await getDb();
      const id = crypto.randomUUID();
      await db.execute(
        'INSERT INTO equipment_usage (id, project_id, equipment_name, equipment_type, shoot_id, notes) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          id,
          projectId,
          form.equipment_name,
          form.equipment_type,
          form.shoot_id || null,
          form.notes || null,
        ],
      );
      setItems([
        ...items,
        {
          id,
          project_id: projectId,
          equipment_name: form.equipment_name,
          equipment_type: form.equipment_type,
          shoot_id: form.shoot_id || undefined,
          notes: form.notes || undefined,
        },
      ]);
      setForm({ equipment_name: '', equipment_type: 'other', shoot_id: '', notes: '' });
      setShowForm(false);
    } catch {
      /* handled */
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM equipment_usage WHERE id = $1', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      /* handled */
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) return <p className="text-xs text-[var(--text-tertiary)] py-2">Loading...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Equipment
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Equipment
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Equipment name"
            value={form.equipment_name}
            onChange={(e) => setForm({ ...form, equipment_name: e.target.value })}
            className={inputClass}
          />
          <select
            aria-label="Equipment Type"
            value={form.equipment_type}
            onChange={(e) => setForm({ ...form, equipment_type: e.target.value })}
            className={inputClass}
          >
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <select
            aria-label="Shoot"
            value={form.shoot_id}
            onChange={(e) => setForm({ ...form, shoot_id: e.target.value })}
            className={inputClass}
          >
            <option value="">Shoot (optional)...</option>
            {projectShoots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shoot_date?.split('T')[0] || s.id} · {s.location || ''}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No equipment logged yet.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-[var(--text-primary)]">
                  {item.equipment_name}
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ml-2 bg-[var(--bg-card)] text-[var(--text-tertiary)]">
                  <Tag size={9} /> {item.equipment_type}
                </span>
                {item.notes && (
                  <span className="text-[var(--text-tertiary)] ml-2">-- {item.notes}</span>
                )}
              </div>
              <button
                aria-label="Delete equipment log"
                onClick={() => handleDelete(item.id)}
                className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
