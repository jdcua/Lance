import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import type { Attachment } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
  Search,
  Upload,
  Grid3X3,
  List,
  Image,
  FileText,
  File,
  Trash2,
  Pencil,
  ExternalLink,
  X,
  Tag,
  Link2,
  FolderOpen,
  Clock,
  Package,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { useToasts } from '../store/toastStore';
import { relativeDate } from '../utils/format';
import ArchetypeFeatureTabs from '../components/features/ArchetypeFeatureTabs';
import AssetImg from '../demo/AssetImg';

type ViewMode = 'grid' | 'list';
type SelectedScope =
  | { type: 'library'; id: string }
  | { type: 'client'; id: string }
  | { type: 'project'; id: string };

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('word') || mimeType.includes('document')) return FileText;
  return File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) {
  return mime.startsWith('image/');
}
function isPDF(mime: string) {
  return mime === 'application/pdf';
}

function parseTags(tags: string): string[] {
  try {
    return JSON.parse(tags);
  } catch {
    /* malformed tags JSON; treat as empty */ return [];
  }
}

export default function Assets() {
  const {
    allAttachments,
    loadAllAttachments,
    assetStats,
    loadAssetStats,
    addAttachment,
    removeAttachment,
    renameAttachment,
    moveAttachment,
    updateAttachmentMeta,
    saveAssetFile,
    searchAssets,
    clients,
    loadClients,
    projects,
    loadProjects,
  } = useStore();
  const addToast = useToasts((s) => s.add);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  // Deep-link highlight from search: /assets?highlight=<id>
  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get('highlight');
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<SelectedScope>({ type: 'library', id: 'root' });
  const [dragOver, setDragOver] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Attachment | null>(null);
  const [previewImgFailed, setPreviewImgFailed] = useState(false);
  // A failed load must not hide the NEXT image previewed in the same modal.
  useEffect(() => {
    setPreviewImgFailed(false);
  }, [previewAsset?.id]);
  const [renameTarget, setRenameTarget] = useState<Attachment | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Attachment | null>(null);
  const [attachTarget, setAttachTarget] = useState<Attachment | null>(null);
  const [tagEditor, setTagEditor] = useState<Attachment | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [searchResults, setSearchResults] = useState<Attachment[] | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    asset: Attachment;
    x: number;
    y: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllAttachments();
    loadAssetStats();
    loadClients();
    loadProjects();
  }, [loadAllAttachments, loadAssetStats, loadClients, loadProjects]);

  const scopeAssets = useMemo(() => {
    const source = searchResults || allAttachments;
    return source.filter((a) => {
      if (scope.type === 'library' && scope.id === 'root') {
        return a.entity_type === 'library' && a.entity_id === 'root';
      }
      return a.entity_type === scope.type && a.entity_id === scope.id;
    });
  }, [allAttachments, searchResults, scope]);

  const recentAssets = useMemo(() => {
    return allAttachments
      .filter((a) => a.entity_type === 'library' && a.entity_id === 'root')
      .slice(0, 12);
  }, [allAttachments]);

  const unclassifiedAssets = useMemo(() => {
    return allAttachments.filter(
      (a) =>
        a.entity_type === 'library' &&
        a.entity_id === 'root' &&
        parseTags(a.tags).includes('unclassified'),
    );
  }, [allAttachments]);

  const libraryStats = useMemo(() => {
    if (!assetStats) return { total: 0, totalSize: 0 };
    return {
      total: assetStats.total_files,
      totalSize: assetStats.total_size_bytes,
    };
  }, [assetStats]);

  const scopeLabel = useMemo(() => {
    if (scope.type === 'library') return 'Asset Library';
    if (scope.type === 'client') {
      const c = clients.find((cl) => cl.id === scope.id);
      return c ? c.name : 'Client';
    }
    const p = projects.find((pr) => pr.id === scope.id);
    return p ? p.title : 'Project';
  }, [scope, clients, projects]);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      let ok = 0;
      for (const file of fileArray) {
        try {
          const filePath = await saveAssetFile(file);
          await addAttachment({
            entity_type: scope.type,
            entity_id: scope.id,
            filename: file.name,
            file_path: filePath,
            mime_type: file.type || 'application/octet-stream',
            size_bytes: file.size,
            tags: '[]',
          });
          ok += 1;
        } catch {
          addToast(`Failed to upload ${file.name}`, 'error');
        }
      }
      await loadAllAttachments();
      await loadAssetStats();
      if (ok === 0) {
        addToast('No files uploaded', 'error');
      } else if (ok < fileArray.length) {
        addToast(`${ok} of ${fileArray.length} files uploaded`, 'info');
      } else {
        addToast(`${ok} file${ok !== 1 ? 's' : ''} uploaded`, 'success');
      }
    },
    [scope, saveAssetFile, addAttachment, loadAllAttachments, loadAssetStats, addToast],
  );

  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q);
      if (!q.trim()) {
        setSearchResults(null);
        return;
      }
      try {
        const results = await searchAssets(q);
        setSearchResults(results);
      } catch {
        /* search is non-critical; show error toast */
        addToast('Search failed', 'error');
      }
    },
    [searchAssets, addToast],
  );

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await renameAttachment(renameTarget.id, renameValue.trim());
      setRenameTarget(null);
      addToast('Renamed', 'success');
    } catch {
      /* rename is best-effort; show error toast */
      addToast('Rename failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await removeAttachment(deleteConfirm.id, deleteConfirm.entity_type, deleteConfirm.entity_id);
      setDeleteConfirm(null);
      if (previewAsset?.id === deleteConfirm.id) setPreviewAsset(null);
      addToast('Deleted', 'success');
    } catch {
      /* delete is best-effort; show error toast */
      addToast('Delete failed', 'error');
    }
  };

  const handleAttachTo = async (entityType: string, entityId: string) => {
    if (!attachTarget) return;
    try {
      await moveAttachment(
        attachTarget.id,
        entityType,
        entityId,
        attachTarget.entity_type,
        attachTarget.entity_id,
      );
      setAttachTarget(null);
      await loadAllAttachments();
      addToast('Asset attached', 'success');
    } catch {
      addToast('Failed to attach', 'error');
    } /* attachment is best-effort */
  };

  const handleAddTag = async (asset: Attachment, tag: string) => {
    if (!tag.trim()) return;
    const tags = parseTags(asset.tags);
    if (tags.includes(tag.trim())) return;
    const newTags = [...tags, tag.trim()];
    try {
      await updateAttachmentMeta(asset.id, { tags: JSON.stringify(newTags) });
      setTagInput('');
    } catch {
      /* tag operations are best-effort; show error toast */
      addToast('Failed to add tag', 'error');
    }
  };

  const handleRemoveTag = async (asset: Attachment, tag: string) => {
    const tags = parseTags(asset.tags).filter((t) => t !== tag);
    try {
      await updateAttachmentMeta(asset.id, { tags: JSON.stringify(tags) });
    } catch {
      /* tag operations are best-effort; show error toast */
      addToast('Failed to remove tag', 'error');
    }
  };

  const renderAssetGrid = (assets: Attachment[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {assets.map((asset) => {
        const Icon = getFileIcon(asset.mime_type);
        const tags = parseTags(asset.tags);
        const isUnclassified = tags.includes('unclassified');
        return (
          <button
            key={asset.id}
            onClick={() => setPreviewAsset(asset)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ asset, x: e.clientX, y: e.clientY });
            }}
            className={`group relative flex flex-col rounded-[12px] border overflow-hidden transition-all duration-150 hover:border-[var(--accent)]/40 hover:shadow-sm text-left ${
              highlightedId === asset.id
                ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40'
                : isUnclassified
                  ? 'border-[var(--medium-conf-text)]/30 bg-[var(--medium-conf-bg)]/50'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)]'
            }`}
          >
            {/* Thumbnail */}
            <div className="aspect-square bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
              {isImage(asset.mime_type) ? (
                <AssetImg
                  filePath={asset.file_path}
                  alt={asset.filename}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <Icon
                size={isImage(asset.mime_type) ? 32 : 32}
                className={`text-[var(--text-tertiary)] ${isImage(asset.mime_type) ? 'hidden' : ''}`}
              />
            </div>
            {/* Info */}
            <div className="p-2.5 space-y-0.5 min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {asset.filename}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                {formatSize(asset.size_bytes)} &middot; {relativeDate(asset.created_at)}
              </p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${
                        tag === 'unclassified'
                          ? 'bg-[var(--medium-conf-text)]/10 text-[var(--medium-conf-text)]'
                          : tag === 'imported'
                            ? 'bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                  {tags.length > 3 && (
                    <span className="px-1.5 py-0.5 text-[9px] text-[var(--text-tertiary)]">
                      +{tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderAssetList = (assets: Attachment[]) => (
    <div className="border border-[var(--border-color)] rounded-[12px] overflow-x-auto"><div className="min-w-[560px]">
      <div className="grid grid-cols-[1fr_100px_120px_80px] items-center px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Name
        </span>
        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right">
          Size
        </span>
        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide text-right">
          Modified
        </span>
        <span />
      </div>
      {assets.map((asset) => {
        const Icon = getFileIcon(asset.mime_type);
        return (
          <div
            key={asset.id}
            onClick={() => setPreviewAsset(asset)}
            className={`grid grid-cols-[1fr_100px_120px_80px] items-center px-4 py-2.5 hover:bg-[var(--bg-secondary)]/50 cursor-pointer border-b border-[var(--border-color)] last:border-b-0 transition-colors group ${highlightedId === asset.id ? 'bg-[var(--accent-bg)] ring-1 ring-inset ring-[var(--accent)]/40' : ''}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
              <span className="text-xs text-[var(--text-primary)] truncate">{asset.filename}</span>
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] text-right">
              {formatSize(asset.size_bytes)}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] text-right">
              {relativeDate(asset.created_at)}
            </span>
            <div className="flex justify-end">
              <button aria-label="Delete assets"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(asset);
                }}
                className="p-1 rounded-[6px] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );

  const showScopeSelector = searchResults === null;

  return (
    <div className="p-6 space-y-5" onClick={() => setContextMenu(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-lg font-semibold text-[var(--text-primary)]"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Assets
          </h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1">
            <Package size={12} />
            {libraryStats.total} files &middot; {formatSize(libraryStats.totalSize)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--bg-secondary)] rounded-[8px] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`p-1.5 rounded-[6px] transition-colors ${viewMode === 'grid' ? 'bg-[var(--bg-card)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
            >
              <Grid3X3 size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`p-1.5 rounded-[6px] transition-colors ${viewMode === 'list' ? 'bg-[var(--bg-card)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
            >
              <List size={14} />
            </button>
          </div>
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleUpload(e.target.files);
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      {/* Unclassified banner */}
      {showScopeSelector && scope.type === 'library' && unclassifiedAssets.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-[var(--medium-conf-bg)] border border-[var(--medium-conf-text)]/20">
          <AlertTriangle size={16} className="text-[var(--medium-conf-text)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--medium-conf-text)]">
              {unclassifiedAssets.length} file{unclassifiedAssets.length !== 1 ? 's' : ''} from
              import need review
            </p>
            <p className="text-[10px] text-[var(--medium-conf-text)]/70">
              These files couldn't be automatically classified. Review and attach them to the right
              place.
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const first = unclassifiedAssets[0];
              if (first) setPreviewAsset(first);
            }}
          >
            Review <ChevronRight size={12} />
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
        />
        <input
          type="text"
          placeholder="Search assets by name or tag..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-10 py-2 text-sm border border-[var(--border-color)] rounded-[10px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
        />
        {searchQuery && (
          <button aria-label="Close"
            onClick={() => {
              setSearchQuery('');
              setSearchResults(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Scope selector */}
      {showScopeSelector && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { label: 'Library', icon: FolderOpen, scope: { type: 'library' as const, id: 'root' } },
            ...clients.map((c) => ({
              label: c.name,
              icon: FolderOpen,
              scope: { type: 'client' as const, id: c.id },
            })),
            ...projects.map((p) => ({
              label: p.title,
              icon: FolderOpen,
              scope: { type: 'project' as const, id: p.id },
            })),
          ].map((item) => {
            const isActive = scope.type === item.scope.type && scope.id === item.scope.id;
            const count = allAttachments.filter(
              (a) => a.entity_type === item.scope.type && a.entity_id === item.scope.id,
            ).length;
            return (
              <button
                key={`${item.scope.type}:${item.scope.id}`}
                onClick={() => setScope(item.scope)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs transition-colors flex-shrink-0 ${
                  isActive
                    ? 'bg-[var(--accent)]/10 text-[var(--text-primary)] border border-[var(--accent)]/30'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                <item.icon size={12} />
                <span className="max-w-[120px] truncate">{item.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--accent-on)]'
                        : 'bg-[var(--border-color)] text-[var(--text-tertiary)]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-[12px] p-8 text-center transition-colors ${
          dragOver
            ? 'drop-zone-active border-[var(--accent)] bg-[var(--accent-bg)]'
            : 'border-[var(--border-color)] hover:border-[var(--accent)]/30'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
        }}
      >
        <Upload size={28} className="mx-auto mb-2 text-[var(--text-tertiary)]" />
        <p className="text-xs text-[var(--text-secondary)]">
          Drop files here to add to{' '}
          <strong className="text-[var(--text-primary)]">{scopeLabel}</strong>
        </p>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
          Any file type supported · stored locally in your assets folder (see Settings for location)
        </p>
      </div>

      {/* Content */}
      {scopeAssets.length === 0 && searchResults === null ? (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto mb-3 text-[var(--text-tertiary)] opacity-40" />
          <p className="text-sm font-medium text-[var(--text-primary)]">No assets yet</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 mb-4">
            Upload files or import them through the Import system
          </p>
          <label className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[8px] bg-[var(--accent)] text-[var(--accent-on)] hover:opacity-90 cursor-pointer">
            Upload your first file
            <input type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) handleUpload(e.target.files); e.target.value = ''; }} />
          </label>
        </div>
      ) : searchResults !== null && searchResults.length === 0 ? (
        <div className="text-center py-16">
          <Search size={40} className="mx-auto mb-3 text-[var(--text-tertiary)] opacity-40" />
          <p className="text-sm text-[var(--text-secondary)]">No assets match your search</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Try a different name or tag.</p>
        </div>
      ) : searchResults !== null ? (
        viewMode === 'grid' ? (
          renderAssetGrid(scopeAssets)
        ) : (
          renderAssetList(scopeAssets)
        )
      ) : scope.type === 'library' && scope.id === 'root' ? (
        <>
          {/* Recently added */}
          {recentAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-[var(--text-tertiary)]" />
                <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Recently Added
                </span>
              </div>
              {viewMode === 'grid' ? renderAssetGrid(recentAssets) : renderAssetList(recentAssets)}
            </div>
          )}

          {/* All assets */}
          {scopeAssets.length > recentAssets.length && (
            <div>
              <div className="flex items-center gap-2 mb-3 mt-5">
                <Package size={14} className="text-[var(--text-tertiary)]" />
                <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  All Assets ({scopeAssets.length})
                </span>
              </div>
              {viewMode === 'grid' ? renderAssetGrid(scopeAssets) : renderAssetList(scopeAssets)}
            </div>
          )}
        </>
      ) : viewMode === 'grid' ? (
        renderAssetGrid(scopeAssets)
      ) : (
        renderAssetList(scopeAssets)
      )}

      {/* Preview Modal */}
      <Modal
        open={!!previewAsset}
        onClose={() => {
          setPreviewAsset(null);
          setPreviewImgFailed(false);
        }}
        title={previewAsset?.filename || ''}
        size="lg"
      >
        {previewAsset && (
          <div className="space-y-4">
            {/* Preview content */}
            <div className="bg-[var(--bg-secondary)] rounded-[8px] flex items-center justify-center min-h-[200px] max-h-[400px] overflow-hidden">
              {isImage(previewAsset.mime_type) && !previewImgFailed ? (
                <AssetImg
                  filePath={previewAsset.file_path}
                  alt={previewAsset.filename}
                  className="max-w-full max-h-[400px] object-contain"
                  onError={() => setPreviewImgFailed(true)}
                />
              ) : isImage(previewAsset.mime_type) ? (
                <div className="text-center py-8">
                  <Image size={48} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
                  <p className="text-sm text-[var(--text-secondary)]">Preview unavailable</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Image previews need the desktop app's asset server
                  </p>
                </div>
              ) : isPDF(previewAsset.mime_type) ? (
                <div className="text-center py-8">
                  <FileText size={48} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
                  <p className="text-sm text-[var(--text-secondary)]">PDF Preview</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Open in system viewer for full content
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  {(() => {
                    const Icon = getFileIcon(previewAsset.mime_type);
                    return <Icon size={48} className="mx-auto mb-3 text-[var(--text-tertiary)]" />;
                  })()}
                  <p className="text-xs text-[var(--text-tertiary)]">No preview available</p>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--bg-secondary)] rounded-[8px] px-3 py-2">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Size</span>
                <span className="text-xs text-[var(--text-primary)]">
                  {formatSize(previewAsset.size_bytes)}
                </span>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-[8px] px-3 py-2">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Type</span>
                <span className="text-xs text-[var(--text-primary)]">{previewAsset.mime_type}</span>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-[8px] px-3 py-2">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Added</span>
                <span className="text-xs text-[var(--text-primary)]">
                  {relativeDate(previewAsset.created_at)}
                </span>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-[8px] px-3 py-2">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Location</span>
                <span className="text-xs text-[var(--text-primary)] capitalize">
                  {previewAsset.entity_type}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={12} className="text-[var(--text-tertiary)]" />
                <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Tags
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {parseTags(previewAsset.tags).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-full bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  >
                    {tag}
                    <button aria-label="Close"
                      onClick={() => handleRemoveTag(previewAsset, tag)}
                      className="hover:text-[var(--danger)]"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={tagEditor?.id === previewAsset.id ? tagInput : ''}
                  onChange={(e) => {
                    setTagEditor(previewAsset);
                    setTagInput(e.target.value);
                  }}
                  onFocus={() => setTagEditor(previewAsset)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTag(previewAsset, tagInput);
                      setTagInput('');
                    }
                  }}
                  className="flex-1 px-2.5 py-1 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    handleAddTag(previewAsset, tagInput);
                    setTagInput('');
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-color)]">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPreviewAsset(null);
                  setRenameTarget(previewAsset);
                  setRenameValue(previewAsset.filename);
                }}
              >
                <Pencil size={12} /> Rename
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPreviewAsset(null);
                  setAttachTarget(previewAsset);
                }}
              >
                <Link2 size={12} /> Attach to...
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setPreviewAsset(null);
                  setDeleteConfirm(previewAsset);
                }}
              >
                <Trash2 size={12} /> Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rename Modal */}
      <Modal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Rename Asset"
        size="sm"
      >
        <div className="space-y-3">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
            }}
            className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleRename} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </div>
        </div>
      </Modal>

      {/* Attach To Modal */}
      <Modal
        open={!!attachTarget}
        onClose={() => setAttachTarget(null)}
        title="Attach Asset"
        size="sm"
      >
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          <button
            onClick={() => handleAttachTo('library', 'root')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[var(--bg-secondary)] text-left transition-colors"
          >
            <FolderOpen size={16} className="text-[var(--accent-ink,var(--accent))]" />
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">Asset Library</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">Root library</p>
            </div>
          </button>
          <div className="border-t border-[var(--border-color)] pt-2">
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide px-1 mb-2">
              Clients
            </p>
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => handleAttachTo('client', c.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[var(--bg-secondary)] text-left transition-colors"
              >
                <FolderOpen size={16} className="text-[var(--text-tertiary)]" />
                <div>
                  <p className="text-xs text-[var(--text-primary)]">{c.name}</p>
                  {c.company && (
                    <p className="text-[10px] text-[var(--text-tertiary)]">{c.company}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--border-color)] pt-2">
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide px-1 mb-2">
              Projects
            </p>
            {projects.map((p) => {
              const client = clients.find((c) => c.id === p.client_id);
              return (
                <button
                  key={p.id}
                  onClick={() => handleAttachTo('project', p.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[var(--bg-secondary)] text-left transition-colors"
                >
                  <FolderOpen size={16} className="text-[var(--text-tertiary)]" />
                  <div>
                    <p className="text-xs text-[var(--text-primary)]">{p.title}</p>
                    {client && (
                      <p className="text-[10px] text-[var(--text-tertiary)]">{client.name}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Asset"
        message={`Delete "${deleteConfirm?.filename}"? This removes the file from disk and cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-[60] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[10px] shadow-lg py-1 min-w-[160px] animate-fade-scale-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setPreviewAsset(contextMenu.asset);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors text-left"
          >
            <ExternalLink size={12} /> Preview
          </button>
          <button
            onClick={() => {
              setRenameTarget(contextMenu.asset);
              setRenameValue(contextMenu.asset.filename);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors text-left"
          >
            <Pencil size={12} /> Rename
          </button>
          <button
            onClick={() => {
              setAttachTarget(contextMenu.asset);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors text-left"
          >
            <Link2 size={12} /> Attach to...
          </button>
          <div className="border-t border-[var(--border-color)] my-1" />
          <button
            onClick={() => {
              setDeleteConfirm(contextMenu.asset);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors text-left"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
      <ArchetypeFeatureTabs
        screen="assets"
        context={{
          projectId: scope.type === 'project' ? scope.id : '',
          clientId: scope.type === 'client' ? scope.id : '',
        }}
      />
    </div>
  );
}
