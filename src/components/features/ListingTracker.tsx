/**
 * Listing Tracker -- Real Estate feature.
 * Track property listings with address, type, price, status badges, and dates.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Home } from 'lucide-react';

type Listing = {
  id: string;
  project_id: string;
  address: string;
  property_type: string;
  list_price: number;
  status: string;
  list_date: string;
  close_date: string;
  notes: string;
};

const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Commercial'] as const;
const STATUS_OPTIONS = ['active', 'pending', 'under_contract', 'sold', 'withdrawn', 'expired'] as const;

const statusBadgeClasses: Record<string, string> = {
  active: 'bg-[#16A34A]/15 text-[#16A34A]',
  pending: 'bg-[#D97706]/15 text-[#D97706]',
  under_contract: 'bg-[#2563EB]/15 text-[#2563EB]',
  sold: 'bg-[#7C3AED]/15 text-[#7C3AED]',
  withdrawn: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  expired: 'bg-[#DC2626]/15 text-[#DC2626]',
};

export default function ListingTracker({ projectId }: { projectId: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ address: '', property_type: 'Single Family', list_price: '', status: 'active', list_date: new Date().toISOString().split('T')[0], close_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadListings = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Listing & Record<string, unknown>)[]>(
        'SELECT * FROM listings WHERE project_id = ? ORDER BY list_date DESC',
        [projectId]
      );
      setListings(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        address: r.address as string,
        property_type: r.property_type as string,
        list_price: r.list_price as number,
        status: r.status as string,
        list_date: r.list_date as string,
        close_date: r.close_date as string,
        notes: r.notes as string,
      })));
    } catch (e) { console.error('[ListingTracker] loadListings failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadListings(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.address.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const listPrice = parseFloat(form.list_price) || 0;
      await db.execute(
        'INSERT INTO listings (id, project_id, address, property_type, list_price, status, list_date, close_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.address.trim(), form.property_type, listPrice, form.status, form.list_date || null, form.close_date || null, form.notes.trim() || null]
      );
      const item: Listing = {
        id, project_id: projectId, address: form.address.trim(), property_type: form.property_type,
        list_price: listPrice, status: form.status, list_date: form.list_date || '',
        close_date: form.close_date || '', notes: form.notes.trim() || '',
      };
      setListings(prev => [item, ...prev]);
      setForm({ address: '', property_type: 'Single Family', list_price: '', status: 'active', list_date: new Date().toISOString().split('T')[0], close_date: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[ListingTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM listings WHERE id = ?', [id]);
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (e) { console.error('[ListingTracker] delete failed:', e); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const db = await getDb();
      const closeDate = status === 'sold' ? new Date().toISOString().split('T')[0] : null;
      if (closeDate) {
        await db.execute('UPDATE listings SET status = ?, close_date = ? WHERE id = ?', [status, closeDate, id]);
        setListings(prev => prev.map(l => l.id === id ? { ...l, status, close_date: closeDate } : l));
      } else {
        await db.execute('UPDATE listings SET status = ? WHERE id = ?', [status, id]);
        setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      }
    } catch (e) { console.error('[ListingTracker] status update failed:', e); }
  };

  const activeCount = listings.filter(l => l.status === 'active').length;
  const totalValue = listings.reduce((sum, l) => sum + (l.list_price || 0), 0);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Listings</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Listings ({listings.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Listing
        </Button>
      </div>

      {listings.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[6px] text-xs">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Home size={12} className="text-[var(--accent)]" />
            <span>{activeCount} active</span>
          </div>
          <div className="h-4 w-px bg-[var(--border-color)]" />
          <span className="text-[var(--text-primary)]">${totalValue.toLocaleString()} total value</span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Property address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })} className={selectClass}>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" placeholder="List price ($)" value={form.list_price} onChange={(e) => setForm({ ...form, list_price: e.target.value })} className={inputClass} step="0.01" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.list_date} onChange={(e) => setForm({ ...form, list_date: e.target.value })} className={inputClass} />
              <input type="date" value={form.close_date} onChange={(e) => setForm({ ...form, close_date: e.target.value })} className={inputClass} />
            </div>
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.address.trim()}>Add</Button>
          </div>
        </div>
      )}

      {listings.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No listings added yet.</p>
      ) : (
        <div className="space-y-1">
          {listings.map((listing) => (
            <div key={listing.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Home size={10} className="text-[var(--accent)] flex-shrink-0" />
                  <button
                    onClick={() => setExpanded(expanded === listing.id ? null : listing.id)}
                    className="font-medium text-[var(--text-primary)] truncate hover:underline text-left"
                  >
                    {listing.address}
                  </button>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{listing.property_type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[listing.status] || ''}`}>
                    {listing.status.replace('_', ' ')}
                  </span>
                  {listing.list_price > 0 && <span className="text-[10px] font-medium text-[var(--text-primary)] flex-shrink-0">${listing.list_price.toLocaleString()}</span>}
                  {listing.list_date && <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{listing.list_date}</span>}
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  <select
                    value={listing.status}
                    onChange={(e) => handleStatusChange(listing.id, e.target.value)}
                    className="text-[10px] bg-transparent border-none text-[var(--text-tertiary)] cursor-pointer"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  <button onClick={() => handleDelete(listing.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {expanded === listing.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-[6px] text-xs space-y-1">
                  {listing.notes && <p className="text-[var(--text-secondary)]">{listing.notes}</p>}
                  {listing.close_date && <p className="text-[var(--text-tertiary)]">Closed: {listing.close_date}</p>}
                  {!listing.notes && !listing.close_date && <p className="text-[var(--text-tertiary)] italic">No additional details.</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
