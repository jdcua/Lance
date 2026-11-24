/**
 * BOM Tracker · Embedded feature.
 * Bill of materials list with total cost summary.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, DollarSign, Package } from 'lucide-react';

type BOMItem = {
  id: string;
  project_id: string;
  part_name: string;
  part_number: string;
  quantity: number;
  supplier: string;
  cost: number;
  lead_time_days: number;
};

export default function BOMTracker({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ part_name: '', part_number: '', quantity: '1', supplier: '', cost: '', lead_time_days: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(BOMItem & Record<string, unknown>)[]>(
        'SELECT * FROM boms WHERE project_id = ? ORDER BY part_name',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        part_name: r.part_name as string,
        part_number: r.part_number as string,
        quantity: r.quantity as number,
        supplier: r.supplier as string,
        cost: r.cost as number,
        lead_time_days: r.lead_time_days as number,
      })));
    } catch (e) { console.error('[BOMTracker] loadItems failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const handleAdd = async () => {
    if (!form.part_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const quantity = parseInt(form.quantity) || 1;
      const cost = parseFloat(form.cost) || 0;
      const leadTime = parseInt(form.lead_time_days) || null;
      await db.execute(
        'INSERT INTO boms (id, project_id, part_name, part_number, quantity, supplier, cost, lead_time_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.part_name.trim(), form.part_number.trim() || null, quantity, form.supplier.trim() || null, cost, leadTime]
      );
      const item: BOMItem = {
        id, project_id: projectId, part_name: form.part_name.trim(),
        part_number: form.part_number.trim() || '', quantity,
        supplier: form.supplier.trim() || '', cost, lead_time_days: leadTime || 0,
      };
      setItems(prev => [...prev, item].sort((a, b) => a.part_name.localeCompare(b.part_name)));
      setForm({ part_name: '', part_number: '', quantity: '1', supplier: '', cost: '', lead_time_days: '' });
      setShowForm(false);
    } catch (e) { console.error('[BOMTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM boms WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[BOMTracker] delete failed:', e); }
  };

  const totalCost = items.reduce((sum, i) => sum + (i.cost || 0) * (i.quantity || 0), 0);
  const totalParts = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Bill of Materials</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Bill of Materials ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Part
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 glass border border-[var(--border-color)] rounded-xs text-xs">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Package size={12} className="text-[var(--accent-ink,var(--accent))]" />
            <span>{items.length} types · {totalParts} total parts</span>
          </div>
          <div className="h-4 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
            <DollarSign size={12} className="text-[#16A34A]" />
            <span>${totalCost.toFixed(2)} total cost</span>
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Part name" value={form.part_name} onChange={(e) => setForm({ ...form, part_name: e.target.value })} className={inputClass} autoFocus />
            <input type="text" placeholder="Part number" value={form.part_number} onChange={(e) => setForm({ ...form, part_number: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Unit cost ($)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className={inputClass} step="0.01" />
            <input type="number" placeholder="Lead time (days)" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.part_name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No parts added yet. Add your first BOM item.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Part</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Part #</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Qty</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Supplier</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Cost</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Total</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Lead</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)]">
                  <td className="py-1.5 px-2 font-medium text-[var(--text-primary)]">{item.part_name}</td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)] font-mono text-[10px]">{item.part_number || '--'}</td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">{item.quantity}</td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)]">{item.supplier || '--'}</td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">${(item.cost || 0).toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-primary)] font-medium">${((item.cost || 0) * (item.quantity || 0)).toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-tertiary)]">{item.lead_time_days ? `${item.lead_time_days}d` : '--'}</td>
                  <td className="py-1.5 px-2">
                    <button
                      aria-label="Delete bom tracker"
                      onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
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
