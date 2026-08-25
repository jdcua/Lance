/**
 * Sourcing Log -- Fashion Designer feature.
 * Track material sourcing with supplier, cost, MOQ, lead time, and status.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Package } from 'lucide-react';

type SourcingItem = {
  id: string;
  project_id: string;
  material: string;
  supplier: string;
  cost: number;
  moq: number;
  lead_time_days: number;
  status: string;
};

const STATUS_OPTIONS = ['researching', 'requested', 'ordered', 'received', 'approved'] as const;

const statusBadgeClasses: Record<string, string> = {
  researching: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  requested: 'bg-[#7C3AED]/15 text-[#7C3AED]',
  ordered: 'bg-[#2563EB]/15 text-[#2563EB]',
  received: 'bg-[#D97706]/15 text-[#D97706]',
  approved: 'bg-[#16A34A]/15 text-[#16A34A]',
};

export default function SourcingLog({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<SourcingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ material: '', supplier: '', cost: '', moq: '', lead_time_days: '', status: 'researching' });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(SourcingItem & Record<string, unknown>)[]>(
        'SELECT * FROM sourcing_logs WHERE project_id = ? ORDER BY material, supplier',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        material: r.material as string,
        supplier: r.supplier as string,
        cost: r.cost as number,
        moq: r.moq as number,
        lead_time_days: r.lead_time_days as number,
        status: r.status as string,
      })));
    } catch (e) { console.error('[SourcingLog] loadItems failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.material.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const cost = parseFloat(form.cost) || 0;
      const moq = parseInt(form.moq) || null;
      const leadTime = parseInt(form.lead_time_days) || null;
      await db.execute(
        'INSERT INTO sourcing_logs (id, project_id, material, supplier, cost, moq, lead_time_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.material.trim(), form.supplier.trim() || null, cost, moq, leadTime, form.status]
      );
      const item: SourcingItem = {
        id, project_id: projectId, material: form.material.trim(),
        supplier: form.supplier.trim() || '', cost, moq: moq || 0,
        lead_time_days: leadTime || 0, status: form.status,
      };
      setItems(prev => [...prev, item].sort((a, b) => a.material.localeCompare(b.material)));
      setForm({ material: '', supplier: '', cost: '', moq: '', lead_time_days: '', status: 'researching' });
      setShowForm(false);
    } catch (e) { console.error('[SourcingLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM sourcing_logs WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[SourcingLog] delete failed:', e); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE sourcing_logs SET status = ? WHERE id = ?', [status, id]);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    } catch (e) { console.error('[SourcingLog] status update failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Sourcing</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Sourcing ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Source
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Material name" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className={inputClass} autoFocus />
            <input type="text" placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Cost ($)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className={inputClass} step="0.01" />
            <input type="number" placeholder="MOQ" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Lead time (days)" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} className={inputClass} />
          </div>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.material.trim()}>Add</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No sourcing entries yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Material</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Supplier</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Cost</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">MOQ</th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Lead</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)]">
                  <td className="py-1.5 px-2 font-medium text-[var(--text-primary)]">{item.material}</td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)]">{item.supplier || '--'}</td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">${(item.cost || 0).toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">{item.moq || '--'}</td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-tertiary)]">{item.lead_time_days ? `${item.lead_time_days}d` : '--'}</td>
                  <td className="py-1.5 px-2">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border-none cursor-pointer ${statusBadgeClasses[item.status] || ''}`}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
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
