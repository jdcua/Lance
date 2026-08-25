/**
 * Mood Board -- Designer feature.
 * Visual grid of references: assets from library and external URLs.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Link, Image, ChevronUp, ChevronDown, Search, X, ArrowUpRight } from 'lucide-react';

type MoodItem = {
  id: string;
  project_id: string;
  asset_id?: string;
  url?: string;
  notes?: string;
  sort_order: number;
};

function getTags(arr: unknown): string[] {
  if (Array.isArray(arr)) return arr.map(String);
  if (typeof arr === 'string') {
    try { const parsed = JSON.parse(arr); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
  }
  return [];
}

export default function MoodBoard({ projectId }: { projectId: string }) {
  const { allAttachments, loadAllAttachments } = useStore();
  const [items, setItems] = useState<MoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addMode, setAddMode] = useState<'asset' | 'url'>('asset');
  const [searchQuery, setSearchQuery] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const loadItems = async () => {
    try {
      await loadAllAttachments();
      const db = await getDb();
      const rows = await db.select<(MoodItem & Record<string, unknown>)[]>('SELECT id, project_id, asset_id, url, notes, sort_order FROM mood_board_items WHERE project_id = ? ORDER BY sort_order ASC, id ASC', [projectId]);
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        asset_id: r.asset_id as string | undefined,
        url: r.url as string | undefined,
        notes: r.notes as string | undefined,
        sort_order: r.sort_order as number,
      })));
    } catch (e) { console.error('[MoodBoard] loadItems failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [projectId]);

  const maxSort = items.reduce((max, i) => Math.max(max, i.sort_order), 0);

  const handleAddAsset = async (assetId: string) => {
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const sortOrder = maxSort + 1;
      await db.execute('INSERT INTO mood_board_items (id, project_id, asset_id, sort_order) VALUES (?, ?, ?, ?)', [id, projectId, assetId, sortOrder]);
      setItems(prev => [...prev, { id, project_id: projectId, asset_id: assetId, sort_order: sortOrder }]);
      setShowPicker(false);
    } catch (e) { console.error('[MoodBoard] addAsset failed:', e); }
    setSaving(false);
  };

  const handleAddUrl = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const sortOrder = maxSort + 1;
      await db.execute('INSERT INTO mood_board_items (id, project_id, url, notes, sort_order) VALUES (?, ?, ?, ?, ?)', [id, projectId, url.trim(), notes || null, sortOrder]);
      setItems(prev => [...prev, { id, project_id: projectId, url: url.trim(), notes: notes || undefined, sort_order: sortOrder }]);
      setUrl('');
      setNotes('');
      setShowForm(false);
    } catch (e) { console.error('[MoodBoard] addUrl failed:', e); }
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM mood_board_items WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[MoodBoard] remove failed:', e); }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const a = items[idx];
    const b = items[swapIdx];
    try {
      const db = await getDb();
      await db.execute('UPDATE mood_board_items SET sort_order = ? WHERE id = ?', [b.sort_order, a.id]);
      await db.execute('UPDATE mood_board_items SET sort_order = ? WHERE id = ?', [a.sort_order, b.id]);
      const updated = [...items];
      updated[idx] = { ...a, sort_order: b.sort_order };
      updated[swapIdx] = { ...b, sort_order: a.sort_order };
      updated.sort((x, y) => x.sort_order - y.sort_order);
      setItems(updated);
    } catch (e) { console.error('[MoodBoard] move failed:', e); }
  };

  const handleSaveNotes = async (id: string, value: string) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE mood_board_items SET notes = ? WHERE id = ?', [value, id]);
      setItems(prev => prev.map(i => i.id === id ? { ...i, notes: value } : i));
    } catch (e) { console.error('[MoodBoard] saveNotes failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  // Filter assets that are images
  const availableAssets = allAttachments.filter(a => {
    if (!searchQuery.trim()) return true;
    return a.filename.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Mood Board</h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Mood Board ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => { setShowForm(!showForm); setAddMode('url'); }}>
          <Plus size={12} /> Add Item
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => setAddMode('url')}
              className={`flex-1 px-2 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${addMode === 'url' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}
            >
              <Link size={10} className="inline mr-1" /> Add URL
            </button>
            <button
              onClick={() => { setAddMode('asset'); setShowPicker(true); }}
              className={`flex-1 px-2 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${addMode === 'asset' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}
            >
              <Image size={10} className="inline mr-1" /> From Library
            </button>
          </div>

          {addMode === 'url' && (
            <>
              <input type="text" placeholder="Paste URL..." value={url} onChange={(e) => setUrl(e.target.value)} className={inputClass} autoFocus />
              <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass + ' resize-none'} />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setShowForm(false); setUrl(''); setNotes(''); }}>Cancel</Button>
                <Button size="sm" onClick={handleAddUrl} loading={saving} disabled={!url.trim()}>Add</Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Asset picker modal */}
      {showPicker && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Select Asset</span>
            <button onClick={() => setShowPicker(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><X size={14} /></button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input type="text" placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={inputClass + ' pl-7'} autoFocus />
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {availableAssets.length === 0 ? (
              <p className="text-[10px] text-[var(--text-tertiary)] py-2 text-center">No assets found.</p>
            ) : (
              availableAssets.map(asset => (
                <button
                  key={asset.id}
                  onClick={() => handleAddAsset(asset.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] hover:bg-[var(--bg-card)] text-xs text-left"
                >
                  <Image size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                  <span className="text-[var(--text-primary)] truncate flex-1">{asset.filename}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{(asset.size_bytes / 1024).toFixed(0)} KB</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No items yet. Add URLs or assets from your library.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, idx) => {
            const asset = item.asset_id ? allAttachments.find(a => a.id === item.asset_id) : null;
            return (
              <div key={item.id} className="group relative bg-[var(--bg-secondary)] rounded-[6px] overflow-hidden">
                {/* Preview area */}
                {asset ? (
                  <div className="h-16 bg-[var(--bg-card)] flex items-center justify-center">
                    <Image size={18} className="text-[var(--text-tertiary)]" />
                  </div>
                ) : item.url ? (
                  <div className="h-16 bg-[var(--bg-card)] flex flex-col items-center justify-center px-2">
                    <Link size={14} className="text-[var(--accent)] mb-0.5" />
                    <p className="text-[10px] text-[var(--text-tertiary)] truncate w-full text-center">{item.url}</p>
                  </div>
                ) : null}

                {/* Info bar */}
                <div className="p-1.5">
                  <p className="text-[10px] font-medium text-[var(--text-primary)] truncate">
                    {asset ? asset.filename : item.url ? new URL(item.url).hostname : '--'}
                  </p>
                  {/* Notes on hover */}
                  {item.notes && (
                    <div className="absolute inset-0 bg-[var(--bg-card)]/95 p-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <textarea
                        className="w-full h-full text-[10px] bg-transparent border-none resize-none text-[var(--text-primary)] pointer-events-auto"
                        value={item.notes}
                        onChange={(e) => handleSaveNotes(item.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMove(item.id, 'up')}
                    disabled={idx === 0}
                    className="p-0.5 rounded-[4px] bg-[var(--bg-card)]/80 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    <ChevronUp size={10} />
                  </button>
                  <button
                    onClick={() => handleMove(item.id, 'down')}
                    disabled={idx === items.length - 1}
                    className="p-0.5 rounded-[4px] bg-[var(--bg-card)]/80 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    <ChevronDown size={10} />
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-0.5 rounded-[4px] bg-[var(--bg-card)]/80 text-[var(--text-tertiary)] hover:text-[#A32D2D]"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>

                {/* External link indicator */}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="absolute bottom-1.5 right-1.5 p-0.5 rounded-[4px] bg-[var(--bg-card)]/60 text-[var(--text-tertiary)] hover:text-[var(--accent)]">
                    <ArrowUpRight size={10} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
