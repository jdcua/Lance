/**
 * Lookbook · Fashion Designer feature.
 * Visual grid of lookbook entries with asset thumbnails from store.allAttachments.
 */
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Image, ChevronDown, ChevronUp } from 'lucide-react';

type LookbookEntry = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  asset_ids: string;
  created_at: string;
};

function getAssetIds(raw: unknown): string[] {
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return raw ? [raw] : []; }
  }
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

export default function Lookbook({ clientId }: { clientId: string }) {
  const { allAttachments, loadAllAttachments } = useStore();
  const [entries, setEntries] = useState<LookbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', asset_ids: '' });
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      await loadAllAttachments();
      const db = await getDb();
      const rows = await db.select<(LookbookEntry & Record<string, unknown>)[]>(
        'SELECT * FROM lookbooks WHERE client_id = ? ORDER BY created_at DESC',
        [clientId]
      );
      setEntries(rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        title: r.title as string,
        description: r.description as string,
        asset_ids: r.asset_ids as string,
        created_at: r.created_at as string,
      })));
    } catch (e) { console.error('[Lookbook] loadEntries failed:', e); }
    setLoading(false);
  }, [clientId, loadAllAttachments]);

  useEffect(() => { loadEntries(); }, [clientId, loadEntries]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const assetIds = form.asset_ids.trim() || null;
      await db.execute(
        'INSERT INTO lookbooks (id, client_id, title, description, asset_ids, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, clientId, form.title.trim(), form.description.trim() || null, assetIds, new Date().toISOString()]
      );
      const entry: LookbookEntry = {
        id, client_id: clientId, title: form.title.trim(),
        description: form.description.trim() || '', asset_ids: assetIds || '',
        created_at: new Date().toISOString(),
      };
      setEntries(prev => [entry, ...prev]);
      setForm({ title: '', description: '', asset_ids: '' });
      setShowForm(false);
    } catch (e) { console.error('[Lookbook] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM lookbooks WHERE id = ?', [id]);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error('[Lookbook] delete failed:', e); }
  };

  const getAttachmentsForAssetIds = (assetIdsStr: string) => {
    const ids = getAssetIds(assetIdsStr);
    return allAttachments.filter(a => ids.includes(a.id));
  };

  const handleSelectAsset = (assetId: string) => {
    const currentIds = getAssetIds(form.asset_ids);
    const updated = currentIds.includes(assetId)
      ? currentIds.filter(id => id !== assetId)
      : [...currentIds, assetId];
    setForm({ ...form, asset_ids: JSON.stringify(updated) });
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Lookbook</h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-20 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Lookbook ({entries.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Entry
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Lookbook title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} autoFocus />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          {allAttachments.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">Select Assets</p>
              <div className="max-h-32 overflow-y-auto space-y-1 bg-[var(--bg-card)] rounded-[6px] p-2">
                {allAttachments.slice(0, 20).map((asset) => {
                  const selected = getAssetIds(form.asset_ids).includes(asset.id);
                  return (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectAsset(asset.id)}
                      className={`flex items-center gap-2 px-2 py-1 rounded-[4px] text-xs cursor-pointer ${
                        selected ? 'bg-[var(--accent)]/10 text-[var(--accent-ink,var(--accent))]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <Image size={10} />
                      <span className="truncate">{asset.filename}</span>
                      {selected && <span className="ml-auto text-[10px]">&#10003;</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>Save</Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No lookbook entries yet. Create your first look.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const entryAssets = getAttachmentsForAssetIds(entry.asset_ids);
            const isExpanded = expanded === entry.id;
            return (
              <div key={entry.id} className="bg-[var(--bg-secondary)] rounded-[8px] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : entry.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs text-[var(--text-primary)] truncate">{entry.title}</div>
                    {entry.description && <div className="text-[10px] text-[var(--text-tertiary)] truncate">{entry.description}</div>}
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className="text-[10px] text-[var(--text-tertiary)]">{entryAssets.length} assets</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                      <Trash2 size={12} />
                    </button>
                    {isExpanded ? <ChevronUp size={12} className="text-[var(--text-tertiary)]" /> : <ChevronDown size={12} className="text-[var(--text-tertiary)]" />}
                  </div>
                </div>
                {isExpanded && entryAssets.length > 0 && (
                  <div className="px-3 pb-2">
                    <div className="grid grid-cols-4 gap-2">
                      {entryAssets.map((asset) => (
                        <div key={asset.id} className="bg-[var(--bg-card)] rounded-[6px] p-2 text-center">
                          <Image size={16} className="mx-auto mb-1 text-[var(--text-tertiary)]" />
                          <p className="text-[10px] text-[var(--text-primary)] truncate">{asset.filename}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isExpanded && entryAssets.length === 0 && (
                  <div className="px-3 pb-2">
                    <p className="text-[10px] text-[var(--text-tertiary)] italic">No assets attached.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
