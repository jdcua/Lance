/**
 * Component Inventory · Embedded feature.
 * Inventory list with component name, footprint, quantity, supplier, and unit cost.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Database } from 'lucide-react';

type InventoryItem = {
  id: string;
  project_id: string;
  component_name: string;
  footprint: string;
  quantity: number;
  supplier: string;
  unit_cost: number;
  notes: string;
};

export default function ComponentInventory({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ component_name: '', footprint: '', quantity: '1', supplier: '', unit_cost: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(InventoryItem & Record<string, unknown>)[]>(
        'SELECT * FROM component_inventory WHERE project_id = ? ORDER BY component_name',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        component_name: r.component_name as string,
        footprint: r.footprint as string,
        quantity: r.quantity as number,
        supplier: r.supplier as string,
        unit_cost: r.unit_cost as number,
        notes: r.notes as string,
      })));
    } catch (e) { console.error('[ComponentInventory] loadItems failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const handleAdd = async () => {
    if (!form.component_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const quantity = parseInt(form.quantity) || 1;
      const unitCost = parseFloat(form.unit_cost) || 0;
      await db.execute(
        'INSERT INTO component_inventory (id, project_id, component_name, footprint, quantity, supplier, unit_cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.component_name.trim(), form.footprint.trim() || null, quantity, form.supplier.trim() || null, unitCost, form.notes.trim() || null]
      );
      const item: InventoryItem = {
        id, project_id: projectId, component_name: form.component_name.trim(),
        footprint: form.footprint.trim() || '', quantity,
        supplier: form.supplier.trim() || '', unit_cost: unitCost,
        notes: form.notes.trim() || '',
      };
      setItems(prev => [...prev, item].sort((a, b) => a.component_name.localeCompare(b.component_name)));
      setForm({ component_name: '', footprint: '', quantity: '1', supplier: '', unit_cost: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[ComponentInventory] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM component_inventory WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[ComponentInventory] delete failed:', e); }
  };

  const totalValue = items.reduce((sum, i) => sum + (i.unit_cost || 0) * (i.quantity || 0), 0);
  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Inventory</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Inventory ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Component
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[6px] text-xs">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Database size={12} className="text-[var(--accent)]" />
            <span>{items.length} types · {totalQty} units</span>
          </div>
          <div className="h-4 w-px bg-[var(--border-color)]" />
          <span className="font-semibold text-[var(--text-primary)]">${totalValue.toFixed(2)} total value</span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Component name" value={form.component_name} onChange={(e) => setForm({ ...form, component_name: e.target.value })} className={inputClass} autoFocus />
            <input type="text" placeholder="Footprint (e.g. 0603, SOIC-8)" value={form.footprint} onChange={(e) => setForm({ ...form, footprint: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Unit cost ($)" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} className={inputClass} step="0.01" />
            <input type="text" placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={inputClass} />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.component_name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No components in inventory yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Component</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Footprint</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Qty</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Supplier</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Unit $</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Total</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)]">
                  <td className="py-1.5 px-2 font-medium text-[var(--text-primary)]">{item.component_name}</td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)] font-mono text-[10px]">{item.footprint || '--'}</td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">{item.quantity}</td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)]">{item.supplier || '--'}</td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">${(item.unit_cost || 0).toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-primary)] font-medium">${((item.unit_cost || 0) * (item.quantity || 0)).toFixed(2)}</td>
                  <td className="py-1.5 px-2">
                    <button onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
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
