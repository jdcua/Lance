/**
 * Equipment Inventory · Voice Actor feature.
 * Track equipment with total value at top.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, DollarSign } from 'lucide-react';

type EquipmentItem = {
  id: string;
  client_id?: string;
  name: string;
  equipment_type?: string;
  serial_number?: string;
  purchase_date?: string;
  value?: number;
  notes?: string;
};

const EQUIPMENT_TYPES = ['mic', 'preamp', 'interface', 'monitor', 'other'] as const;

export default function EquipmentInventory({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    equipment_type: 'mic',
    serial_number: '',
    purchase_date: '',
    value: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(EquipmentItem & Record<string, unknown>)[]>(
        'SELECT id, client_id, name, equipment_type, serial_number, purchase_date, value, notes FROM equipment_inventory WHERE client_id = ? ORDER BY equipment_type ASC, name ASC',
        [clientId],
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string | undefined,
          name: r.name as string,
          equipment_type: r.equipment_type as string | undefined,
          serial_number: r.serial_number as string | undefined,
          purchase_date: r.purchase_date as string | undefined,
          value: r.value as number | undefined,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[EquipmentInventory] loadItems failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadItems();
  }, [clientId, loadItems]);

  const totalValue = items.reduce((sum, i) => sum + (i.value || 0), 0);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO equipment_inventory (id, client_id, name, equipment_type, serial_number, purchase_date, value, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.name.trim(),
          form.equipment_type,
          form.serial_number || null,
          form.purchase_date || null,
          form.value ? parseFloat(form.value) : null,
          form.notes || null,
        ],
      );
      const item: EquipmentItem = {
        id,
        client_id: clientId,
        name: form.name.trim(),
        equipment_type: form.equipment_type,
        serial_number: form.serial_number || undefined,
        purchase_date: form.purchase_date || undefined,
        value: form.value ? parseFloat(form.value) : undefined,
        notes: form.notes || undefined,
      };
      setItems((prev) =>
        [...prev, item].sort(
          (a, b) =>
            (a.equipment_type || '').localeCompare(b.equipment_type || '') ||
            a.name.localeCompare(b.name),
        ),
      );
      setForm({
        name: '',
        equipment_type: 'mic',
        serial_number: '',
        purchase_date: '',
        value: '',
        notes: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[EquipmentInventory] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM equipment_inventory WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[EquipmentInventory] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Equipment
          </h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Equipment ({items.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Item
        </Button>
      </div>

      {totalValue > 0 && (
        <div className="px-3 py-2 bg-[#16A34A]/10 rounded-xs text-xs flex items-center gap-2">
          <DollarSign size={12} className="text-[#16A34A]" />
          <span className="font-semibold text-[#16A34A]">
            Total Value: ${totalValue.toLocaleString()}
          </span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Equipment name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Equipment Type"
              value={form.equipment_type}
              onChange={(e) => setForm({ ...form, equipment_type: e.target.value })}
              className={inputClass}
            >
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Serial number"
              value={form.serial_number}
              onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Value ($)"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
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
        <p className="text-xs text-[var(--text-tertiary)] py-2">No equipment items yet.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                {item.equipment_type && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-secondary)]">
                    {item.equipment_type}
                  </span>
                )}
                {item.serial_number && (
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                    {item.serial_number}
                  </span>
                )}
                {item.purchase_date && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {item.purchase_date?.split('T')[0]}
                  </span>
                )}
                {item.value != null && (
                  <span className="text-[10px] text-[#16A34A] font-medium">
                    ${item.value.toLocaleString()}
                  </span>
                )}
                {item.notes && (
                  <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                    {item.notes}
                  </span>
                )}
              </div>
              <button
                aria-label="Delete equipment inventory"
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
