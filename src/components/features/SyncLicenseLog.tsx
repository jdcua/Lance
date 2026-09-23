import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, DollarSign } from 'lucide-react';

type SyncLicense = {
  id: string;
  project_id?: string;
  track_name: string;
  licensee?: string;
  use_type?: string;
  territory?: string;
  term?: string;
  fee?: number;
  royalty: boolean;
  created_at: string;
};

const USE_TYPES = ['film', 'tv', 'ad', 'game', 'podcast', 'other'];

export default function SyncLicenseLog({ projectId }: { projectId?: string }) {
  const [licenses, setLicenses] = useState<SyncLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ track_name: '', licensee: '', use_type: USE_TYPES[0], territory: '', term: '', fee: '', royalty: false });
  const [saving, setSaving] = useState(false);

  const loadLicenses = useCallback(async () => {
    try {
      const db = await getDb();
      let sql = 'SELECT id, project_id, track_name, licensee, use_type, territory, term, fee, royalty, created_at FROM sync_licenses';
      const params: string[] = [];
      if (projectId) {
        sql += ' WHERE project_id = ?';
        params.push(projectId);
      }
      sql += ' ORDER BY created_at DESC';
      const rows = await db.select<(SyncLicense & Record<string, unknown>)[]>(sql, params);
      setLicenses(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string | undefined,
        track_name: r.track_name as string,
        licensee: r.licensee as string | undefined,
        use_type: r.use_type as string | undefined,
        territory: r.territory as string | undefined,
        term: r.term as string | undefined,
        fee: r.fee as number | undefined,
        royalty: !!(r.royalty),
        created_at: r.created_at as string,
      })));
    } catch (e) { console.error('[SyncLicenseLog] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadLicenses(); }, [projectId, loadLicenses]);

  const handleAdd = async () => {
    if (!form.track_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const db = await getDb();
      await db.execute(
        'INSERT INTO sync_licenses (id, project_id, track_name, licensee, use_type, territory, term, fee, royalty, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId || null, form.track_name.trim(), form.licensee.trim() || null, form.use_type, form.territory.trim() || null, form.term.trim() || null, form.fee ? parseFloat(form.fee) : null, form.royalty ? 1 : 0, now]
      );
      const license: SyncLicense = {
        id, project_id: projectId, track_name: form.track_name.trim(), licensee: form.licensee.trim() || undefined,
        use_type: form.use_type, territory: form.territory.trim() || undefined, term: form.term.trim() || undefined,
        fee: form.fee ? parseFloat(form.fee) : undefined, royalty: form.royalty, created_at: now,
      };
      setLicenses(prev => [license, ...prev]);
      setForm({ track_name: '', licensee: '', use_type: USE_TYPES[0], territory: '', term: '', fee: '', royalty: false });
      setShowForm(false);
    } catch (e) { console.error('[SyncLicenseLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM sync_licenses WHERE id = ?', [id]);
      setLicenses(prev => prev.filter(l => l.id !== id));
    } catch (e) { console.error('[SyncLicenseLog] delete failed:', e); }
  };

  const totalRevenue = licenses.reduce((sum, l) => sum + (l.fee || 0), 0);

  const grouped = licenses.reduce<Record<string, SyncLicense[]>>((acc, l) => {
    const key = l.use_type || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  const sortedGroups = Object.keys(grouped).sort();

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Sync Licenses</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Sync Licenses ({licenses.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add License
        </Button>
      </div>

      {licenses.length > 0 && (
        <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[8px] text-xs">
          <span className="text-[var(--text-tertiary)]">
            <DollarSign size={10} className="inline mr-0.5" />
            Total licensing revenue: <span className="font-medium text-[var(--accent-ink,var(--accent))]">${totalRevenue.toFixed(2)}</span>
          </span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Track name" value={form.track_name} onChange={(e) => setForm({ ...form, track_name: e.target.value })} className={inputClass} autoFocus />
          <input type="text" placeholder="Licensee" value={form.licensee} onChange={(e) => setForm({ ...form, licensee: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.use_type} onChange={(e) => setForm({ ...form, use_type: e.target.value })} className={inputClass}>
              {USE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" placeholder="Territory" value={form.territory} onChange={(e) => setForm({ ...form, territory: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Term (e.g. 2 years)" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Fee" step="0.01" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
            <input type="checkbox" checked={form.royalty} onChange={(e) => setForm({ ...form, royalty: e.target.checked })} className="accent-[var(--accent)]" />
            Royalty deal
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.track_name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {licenses.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No sync licenses yet. Add your first license.</p>
      ) : (
        <div className="space-y-2">
          {sortedGroups.map(group => (
            <div key={group} className="space-y-1">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">{group}</span>
              {grouped[group].map(l => (
                <div key={l.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{l.track_name}</span>
                    {l.licensee && <span className="text-[var(--text-tertiary)]">{l.licensee}</span>}
                    {l.territory && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">{l.territory}</span>}
                    {l.term && <span className="text-[10px] text-[var(--text-tertiary)]">{l.term}</span>}
                    {l.fee != null && <span className="text-[var(--accent-ink,var(--accent))] font-medium">${l.fee.toFixed(2)}</span>}
                    {l.royalty && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent-ink,var(--accent))]">royalty</span>}
                  </div>
                  <button onClick={() => handleDelete(l.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
