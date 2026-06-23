/**
 * Reference Board — Illustrator feature.
 * Visual grid of reference images and URLs using the mood_board_items table.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ExternalLink, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';

type ReferenceItem = {
  id: string;
  project_id: string;
  asset_id?: string;
  url?: string;
  notes?: string;
  sort_order: number;
};

export default function ReferenceBoard({ projectId }: { projectId: string }) {
  const { allAttachments, loadAllAttachments } = useStore();
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'asset' | 'url'>('url');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ReferenceItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, asset_id, url, notes, sort_order FROM mood_board_items WHERE project_id = ? ORDER BY sort_order ASC, id ASC',
        [projectId]
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          asset_id: r.asset_id as string | undefined,
          url: r.url as string | undefined,
          notes: r.notes as string | undefined,
          sort_order: r.sort_order as number,
        }))
      );
    } catch (e) {
      console.error('[ReferenceBoard] loadItems failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
    loadAllAttachments();
  }, [projectId]);

  const imageAssets = allAttachments.filter(
    (a) => a.mime_type && (a.mime_type.startsWith('image/') || a.mime_type === 'application/pdf')
  );

  const maxSort = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0;

  const handleSave = async () => {
    if (tab === 'url' && !url.trim()) return;
    if (tab === 'asset' && !selectedAssetId) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO mood_board_items (id, project_id, asset_id, url, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          tab === 'asset' ? selectedAssetId : null,
          tab === 'url' ? url.trim() || null : null,
          null,
          maxSort + 1,
        ]
      );
      const item: ReferenceItem = {
        id,
        project_id: projectId,
        asset_id: tab === 'asset' ? selectedAssetId : undefined,
        url: tab === 'url' ? url.trim() || undefined : undefined,
        sort_order: maxSort + 1,
      };
      setItems((prev) => [...prev, item]);
      setUrl('');
      setSelectedAssetId('');
      setShowForm(false);
    } catch (e) {
      console.error('[ReferenceBoard] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM mood_board_items WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[ReferenceBoard] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Reference Board
          </h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square bg-[var(--bg-secondary)] rounded-[8px] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          References ({items.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Reference
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setTab('url')}
              className={`flex-1 text-[10px] py-1 rounded-[4px] font-medium transition-colors ${
                tab === 'url'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--border-color)] text-[var(--text-tertiary)]'
              }`}
            >
              Paste URL
            </button>
            <button
              onClick={() => setTab('asset')}
              className={`flex-1 text-[10px] py-1 rounded-[4px] font-medium transition-colors ${
                tab === 'asset'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--border-color)] text-[var(--text-tertiary)]'
              }`}
            >
              From Assets
            </button>
          </div>
          {tab === 'url' ? (
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClass}
              autoFocus
            />
          ) : (
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className={inputClass}
              autoFocus
            >
              <option value="">Select an asset...</option>
              {imageAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.filename}
                </option>
              ))}
            </select>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={tab === 'url' ? !url.trim() : !selectedAssetId}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No references yet. Paste a URL or add an asset.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => {
            const asset = item.asset_id
              ? allAttachments.find((a) => a.id === item.asset_id)
              : null;

            return (
              <div
                key={item.id}
                className="relative group bg-[var(--bg-secondary)] rounded-[8px] overflow-hidden"
              >
                {asset && asset.mime_type.startsWith('image/') ? (
                  <div className="aspect-square">
                    <img
                      src={`asset://${asset.file_path}`}
                      alt={asset.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1 aspect-square p-2 text-center hover:bg-[var(--border-color)]/30 transition-colors"
                  >
                    <LinkIcon size={20} className="text-[var(--text-tertiary)]" />
                    <span className="text-[10px] text-[var(--accent)] underline break-all line-clamp-3">
                      {item.url}
                    </span>
                    <ExternalLink size={10} className="text-[var(--text-tertiary)]" />
                  </a>
                ) : asset ? (
                  <div className="flex flex-col items-center justify-center gap-1 aspect-square p-2 text-center">
                    <ImageIcon size={20} className="text-[var(--text-tertiary)]" />
                    <span className="text-[10px] text-[var(--text-secondary)] break-all line-clamp-3">
                      {asset.filename}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 aspect-square p-2">
                    <ImageIcon size={20} className="text-[var(--text-tertiary)]" />
                    <span className="text-[10px] text-[var(--text-tertiary)] italic">
                      Missing reference
                    </span>
                  </div>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#A32D2D]/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
