/**
 * Vendor Directory · searchable vendor list with service, contact, cost, and status.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Search } from 'lucide-react';

type Vendor = {
  id: string;
  project_id: string;
  name?: string;
  service?: string;
  contact?: string;
  cost: number;
  status?: string;
  notes?: string;
};

const STATUSES = ['active', 'pending', 'contracted', 'completed', 'cancelled'];
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#2ECC71]/20 text-[#2ECC71]',
  pending: 'bg-[#E67E22]/20 text-[#E67E22]',
  contracted: 'bg-[#3498DB]/20 text-[#3498DB]',
  completed: 'bg-[#9B59B6]/20 text-[#9B59B6]',
  cancelled: 'bg-[#E74C3C]/20 text-[#E74C3C]',
};

export default function VendorDirectory({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', service: '', contact: '', cost: '', status: 'active', notes: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Vendor & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, service, contact, cost, status, notes FROM vendors WHERE project_id = ? ORDER BY name ASC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        name: r.name as string | undefined,
        service: r.service as string | undefined,
        contact: r.contact as string | undefined,
        cost: (r.cost as number) || 0,
        status: r.status as string | undefined,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[VendorDirectory] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const filtered = search.trim()
    ? items.filter(v =>
        (v.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.service || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.contact || '').toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO vendors (id, project_id, name, service, contact, cost, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.name.trim(), form.service.trim() || null, form.contact.trim() || null, form.cost ? parseFloat(form.cost) : 0, form.status, form.notes.trim() || null]
      );
      const item: Vendor = { id, project_id: projectId, name: form.name.trim(), service: form.service.trim() || undefined, contact: form.contact.trim() || undefined, cost: form.cost ? parseFloat(form.cost) : 0, status: form.status, notes: form.notes.trim() || undefined };
      setItems(prev => [...prev, item]);
      setForm({ name: '', service: '', contact: '', cost: '', status: 'active', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[VendorDirectory] save failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM vendors WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[VendorDirectory] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Vendors</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Vendors ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Vendor
        </Button>
      </div>

      {items.length > 0 && (
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + ' pl-7'}
          />
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Vendor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Service" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Contact info" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Cost ($)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className={inputClass} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          {search.trim() ? 'No vendors match your search.' : 'No vendors yet. Add your first vendor.'}
        </p>
      ) : (
        <div className="space-y-1">
          {filtered.map((item) => (
            <div key={item.id} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                  {item.status && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || ''}`}>{item.status}</span>
                  )}
                </div>
                <button
                  aria-label="Delete vendor directory"
                  onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                {item.service && <span>{item.service}</span>}
                {item.contact && <span>{item.contact}</span>}
                {item.cost > 0 && <span className="font-medium">${item.cost.toLocaleString()}</span>}
              </div>
              {item.notes && <div className="text-[10px] text-[var(--text-tertiary)] italic">{item.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
