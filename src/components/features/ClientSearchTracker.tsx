/**
 * Client Search Tracker · Recruiter feature.
 * Simple list of client searches with search name, role, requirements, and status.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Search } from 'lucide-react';

type ClientSearch = {
  id: string;
  client_id: string;
  search_name: string;
  role: string;
  requirements: string;
  status: string;
  created_at: string;
};

const STATUS_OPTIONS = ['open', 'in_progress', 'filled'] as const;

const statusBadgeClasses: Record<string, string> = {
  open: 'bg-[#16A34A]/15 text-[#16A34A]',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB]',
  filled: 'bg-[#7C3AED]/15 text-[#7C3AED]',
};

export default function ClientSearchTracker({ clientId }: { clientId: string }) {
  const [searches, setSearches] = useState<ClientSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ search_name: '', role: '', requirements: '', status: 'open' });
  const [saving, setSaving] = useState(false);

  const loadSearches = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ClientSearch & Record<string, unknown>)[]>(
        'SELECT * FROM client_searches WHERE client_id = ? ORDER BY created_at DESC',
        [clientId]
      );
      setSearches(rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        search_name: r.search_name as string,
        role: r.role as string,
        requirements: r.requirements as string,
        status: r.status as string,
        created_at: r.created_at as string,
      })));
    } catch (e) { console.error('[ClientSearchTracker] loadSearches failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadSearches(); }, [clientId]);

  const handleAdd = async () => {
    if (!form.search_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO client_searches (id, client_id, search_name, role, requirements, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, clientId, form.search_name.trim(), form.role.trim() || null, form.requirements.trim() || null, form.status, new Date().toISOString()]
      );
      const item: ClientSearch = {
        id, client_id: clientId, search_name: form.search_name.trim(),
        role: form.role.trim() || '', requirements: form.requirements.trim() || '',
        status: form.status, created_at: new Date().toISOString(),
      };
      setSearches(prev => [item, ...prev]);
      setForm({ search_name: '', role: '', requirements: '', status: 'open' });
      setShowForm(false);
    } catch (e) { console.error('[ClientSearchTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM client_searches WHERE id = ?', [id]);
      setSearches(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error('[ClientSearchTracker] delete failed:', e); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE client_searches SET status = ? WHERE id = ?', [status, id]);
      setSearches(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    } catch (e) { console.error('[ClientSearchTracker] status update failed:', e); }
  };

  const openCount = searches.filter(s => s.status === 'open').length;

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Client Searches</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Searches ({searches.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> New Search
        </Button>
      </div>

      {searches.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
          <Search size={12} className="text-[var(--accent)]" />
          <span>{openCount} open searches</span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Search name / title" value={form.search_name} onChange={(e) => setForm({ ...form, search_name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Role (e.g. Senior Dev)" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <textarea placeholder="Requirements / notes" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.search_name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {searches.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No client searches tracked yet.</p>
      ) : (
        <div className="space-y-1">
          {searches.map((search) => (
            <div key={search.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Search size={10} className="text-[var(--accent)] flex-shrink-0" />
                  <button
                    onClick={() => setExpanded(expanded === search.id ? null : search.id)}
                    className="font-medium text-[var(--text-primary)] truncate hover:underline text-left"
                  >
                    {search.search_name}
                  </button>
                  {search.role && <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{search.role}</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[search.status] || ''}`}>
                    {search.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  <select
                    value={search.status}
                    onChange={(e) => handleStatusChange(search.id, e.target.value)}
                    className="text-[10px] bg-transparent border-none text-[var(--text-tertiary)] cursor-pointer"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  <button onClick={() => handleDelete(search.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {expanded === search.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-[6px] text-xs space-y-1">
                  {search.requirements && <p className="text-[var(--text-secondary)]">{search.requirements}</p>}
                  {!search.requirements && <p className="text-[var(--text-tertiary)] italic">No requirements specified.</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
