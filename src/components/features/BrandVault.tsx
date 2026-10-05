/**
 * Brand Vault · Global brand asset library.
 * Filters attachments by tags containing 'brand-asset', grouped by subcategory.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Trash2, Image, FileText, Palette, FileCheck, Upload } from 'lucide-react';

const SUBCATEGORIES = ['Logo Files', 'Typography', 'Color Palettes', 'Guidelines', 'Final Exports'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUBCATEGORY_ICONS: Record<string, any> = {
  'Logo Files': Image,
  'Typography': FileText,
  'Color Palettes': Palette,
  'Guidelines': FileCheck,
  'Final Exports': FileCheck,
};

function getTags(arr: unknown): string[] {
  if (Array.isArray(arr)) return arr.map(String);
  if (typeof arr === 'string') {
    try { const parsed = JSON.parse(arr); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
  }
  return [];
}

export default function BrandVault() {
  const { allAttachments, loadAllAttachments, addAttachment, saveAssetFile, removeAttachment } = useStore();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Logo Files');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const load = async () => { await loadAllAttachments(); setLoading(false); };
    load();
  }, [loadAllAttachments]);

  const brandAssets = allAttachments.filter((a) => {
    const tags = getTags(a.tags);
    return tags.includes('brand-asset');
  });

  const filtered = brandAssets.filter((a) => {
    const tags = getTags(a.tags);
    return tags.includes(activeCategory);
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const filePath = await saveAssetFile(file);
      await addAttachment({
        entity_type: 'library',
        entity_id: 'brand-vault',
        filename: file.name,
        file_path: filePath,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        tags: JSON.stringify(['brand-asset', activeCategory]),
        notes: '',
      });
      setFile(null);
      setShowUpload(false);
    } catch (e) { console.error('[BrandVault] upload failed:', e); }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await removeAttachment(id, 'library', 'brand-vault');
    } catch (e) { console.error('[BrandVault] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Brand Vault</h4>
        </div>
        <div className="flex gap-1.5">
          {SUBCATEGORIES.map((cat) => <div key={cat} className="h-6 w-20 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-20 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Brand Vault ({brandAssets.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => { setShowUpload(!showUpload); setActiveCategory('Logo Files'); }}>
          <Upload size={12} /> Upload Asset
        </Button>
      </div>

      {/* Subcategory filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {SUBCATEGORIES.map((cat) => {
          const count = brandAssets.filter((a) => getTags(a.tags).includes(cat)).length;
          const Icon = SUBCATEGORY_ICONS[cat] || FileText;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-[var(--accent)] text-[var(--accent-on)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              <Icon size={10} />
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setShowUpload(false); setFile(null); }}>Cancel</Button>
            <Button size="sm" onClick={handleUpload} loading={uploading} disabled={!file}>Upload</Button>
          </div>
        </div>
      )}

      {/* Grid of assets */}
      {filtered.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No {activeCategory.toLowerCase()} assets yet. Upload your first asset.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map((asset) => {
            const isImage = asset.mime_type?.startsWith('image/');
            return (
              <div key={asset.id} className="group relative bg-[var(--bg-secondary)] rounded-[6px] overflow-hidden">
                {isImage ? (
                  <div className="h-16 bg-[var(--bg-card)] flex items-center justify-center">
                    <Image size={18} className="text-[var(--text-tertiary)]" />
                  </div>
                ) : (
                  <div className="h-16 bg-[var(--bg-card)] flex items-center justify-center">
                    <FileText size={18} className="text-[var(--text-tertiary)]" />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-[10px] font-medium text-[var(--text-primary)] truncate">{asset.filename}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] truncate">{asset.entity_type} / {asset.entity_id}</p>
                </div>
                <button aria-label="Delete brand vault"
                  onClick={() => handleDelete(asset.id)}
                  className="absolute top-1 right-1 p-0.5 rounded-[4px] bg-[var(--bg-card)]/80 text-[var(--text-tertiary)] hover:text-[#A32D2D] opacity-0 group-hover:opacity-100 transition-opacity"
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
