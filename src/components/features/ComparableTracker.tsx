/**
 * Comparable Tracker · Real Estate feature.
 * Track comparable sales with address, price, date, sqft, beds, baths.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Building2 } from 'lucide-react';

type Comparable = {
  id: string;
  project_id: string;
  address: string;
  sale_price: number;
  sale_date: string;
  sqft: number;
  beds: number;
  baths: number;
  notes: string;
};

export default function ComparableTracker({ projectId }: { projectId: string }) {
  const [comps, setComps] = useState<Comparable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ address: '', sale_price: '', sale_date: '', sqft: '', beds: '', baths: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadComps = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Comparable & Record<string, unknown>)[]>(
        'SELECT * FROM comparables WHERE project_id = ? ORDER BY sale_date DESC',
        [projectId]
      );
      setComps(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        address: r.address as string,
        sale_price: r.sale_price as number,
        sale_date: r.sale_date as string,
        sqft: r.sqft as number,
        beds: r.beds as number,
        baths: r.baths as number,
        notes: r.notes as string,
      })));
    } catch (e) { console.error('[ComparableTracker] loadComps failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadComps(); }, [projectId, loadComps]);

  const handleAdd = async () => {
    if (!form.address.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const salePrice = parseFloat(form.sale_price) || 0;
      const sqft = parseInt(form.sqft) || null;
      const beds = parseFloat(form.beds) || null;
      const baths = parseFloat(form.baths) || null;
      await db.execute(
        'INSERT INTO comparables (id, project_id, address, sale_price, sale_date, sqft, beds, baths, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.address.trim(), salePrice, form.sale_date || null, sqft, beds, baths, form.notes.trim() || null]
      );
      const item: Comparable = {
        id, project_id: projectId, address: form.address.trim(), sale_price: salePrice,
        sale_date: form.sale_date || '', sqft: sqft || 0, beds: beds || 0, baths: baths || 0,
        notes: form.notes.trim() || '',
      };
      setComps(prev => [item, ...prev]);
      setForm({ address: '', sale_price: '', sale_date: '', sqft: '', beds: '', baths: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[ComparableTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM comparables WHERE id = ?', [id]);
      setComps(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error('[ComparableTracker] delete failed:', e); }
  };

  const avgPrice = comps.length > 0 ? comps.reduce((sum, c) => sum + (c.sale_price || 0), 0) / comps.length : 0;
  const avgPricePerSqft = comps.length > 0 ? comps.filter(c => c.sqft > 0).reduce((sum, c) => sum + (c.sale_price || 0) / (c.sqft || 1), 0) / comps.filter(c => c.sqft > 0).length : 0;

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Comparables</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Comparables ({comps.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Comp
        </Button>
      </div>

      {comps.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[6px] text-xs">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Building2 size={12} className="text-[var(--accent-ink,var(--accent))]" />
            <span>{comps.length} comps</span>
          </div>
          <div className="h-4 w-px bg-[var(--border-color)]" />
          <span className="text-[var(--text-primary)]">Avg ${avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          {avgPricePerSqft > 0 && (
            <>
              <div className="h-4 w-px bg-[var(--border-color)]" />
              <span className="text-[var(--text-primary)]">${avgPricePerSqft.toFixed(0)}/sqft</span>
            </>
          )}
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Property address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Sale price ($)" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className={inputClass} step="0.01" />
            <input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Sq Ft" value={form.sqft} onChange={(e) => setForm({ ...form, sqft: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Beds" value={form.beds} onChange={(e) => setForm({ ...form, beds: e.target.value })} className={inputClass} step="0.5" />
            <input type="number" placeholder="Baths" value={form.baths} onChange={(e) => setForm({ ...form, baths: e.target.value })} className={inputClass} step="0.5" />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.address.trim()}>Add</Button>
          </div>
        </div>
      )}

      {comps.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No comparable properties added yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Address</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Price</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Sold</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Sq Ft</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">$/SqFt</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Beds</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Baths</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {comps.map((comp) => {
                const pricePerSqft = comp.sqft > 0 ? (comp.sale_price || 0) / comp.sqft : 0;
                return (
                  <tr key={comp.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)]">
                    <td className="py-1.5 px-2 font-medium text-[var(--text-primary)]">{comp.address}</td>
                    <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">${(comp.sale_price || 0).toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-[var(--text-tertiary)]">{comp.sale_date || '--'}</td>
                    <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">{comp.sqft ? comp.sqft.toLocaleString() : '--'}</td>
                    <td className="py-1.5 px-2 text-right text-[var(--text-secondary)]">{pricePerSqft > 0 ? `$${pricePerSqft.toFixed(0)}` : '--'}</td>
                    <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">{comp.beds || '--'}</td>
                    <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">{comp.baths || '--'}</td>
                    <td className="py-1.5 px-2">
                      <button
                        aria-label="Delete comparable tracker"
                        onClick={() => handleDelete(comp.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
