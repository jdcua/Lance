import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Camera, Image as ImageIcon } from 'lucide-react';

type SiteVisit = {
  id: string;
  project_id: string;
  date?: string;
  phase?: string;
  observations?: string;
  photo_asset_ids?: string;
  created_at: string;
};

type Attachment = {
  id: string;
  entity_type: string;
  entity_id: string;
  filename: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  tags: string;
  notes?: string;
  created_at: string;
};

export default function SiteVisitLog({ projectId }: { projectId: string }) {
  const { allAttachments, loadAllAttachments } = useStore();
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', phase: '', observations: '', selectedPhotoIds: '' });
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadVisits = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(SiteVisit & Record<string, unknown>)[]>(
        'SELECT id, project_id, date, phase, observations, photo_asset_ids, created_at FROM site_visits WHERE project_id = ? ORDER BY date DESC',
        [projectId],
      );
      setVisits(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          date: r.date as string | undefined,
          phase: r.phase as string | undefined,
          observations: r.observations as string | undefined,
          photo_asset_ids: r.photo_asset_ids as string | undefined,
          created_at: r.created_at as string,
        })),
      );
    } catch (e) {
      console.error('[SiteVisitLog] load failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadAllAttachments();
    loadVisits();
  }, [projectId, loadAllAttachments, loadVisits]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const db = await getDb();
      const photoIds = form.selectedPhotoIds || null;
      await db.execute(
        'INSERT INTO site_visits (id, project_id, date, phase, observations, photo_asset_ids, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.date || null,
          form.phase.trim() || null,
          form.observations.trim() || null,
          photoIds,
          now,
        ],
      );
      const visit: SiteVisit = {
        id,
        project_id: projectId,
        date: form.date || undefined,
        phase: form.phase.trim() || undefined,
        observations: form.observations.trim() || undefined,
        photo_asset_ids: photoIds || undefined,
        created_at: now,
      };
      setVisits((prev) => [visit, ...prev]);
      setForm({ date: '', phase: '', observations: '', selectedPhotoIds: '' });
      setShowPhotoPicker(false);
      setShowForm(false);
    } catch (e) {
      console.error('[SiteVisitLog] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM site_visits WHERE id = ?', [id]);
      setVisits((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      console.error('[SiteVisitLog] delete failed:', e);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const ids = form.selectedPhotoIds ? form.selectedPhotoIds.split(',') : [];
    const updated = ids.includes(photoId) ? ids.filter((id) => id !== photoId) : [...ids, photoId];
    setForm({ ...form, selectedPhotoIds: updated.join(',') });
  };

  const selectedIds = form.selectedPhotoIds ? form.selectedPhotoIds.split(',') : [];
  const isImage = (mime: string) => mime.startsWith('image/');

  const getFirstPhotoPreview = (photoIds: string): Attachment | undefined => {
    const ids = photoIds.split(',');
    for (const id of ids) {
      const found = allAttachments.find((a) => a.id === id.trim());
      if (found && isImage(found.mime_type)) return found;
    }
    return undefined;
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Site Visits</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Site Visits ({visits.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Visit
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Phase"
              value={form.phase}
              onChange={(e) => setForm({ ...form, phase: e.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Observations"
            value={form.observations}
            onChange={(e) => setForm({ ...form, observations: e.target.value })}
            className={inputClass + ' resize-none h-16'}
            autoFocus
          />

          {showPhotoPicker && (
            <div className="p-2 glass rounded-xs border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  Select photos ({selectedIds.length} selected)
                </span>
                <button
                  onClick={() => setShowPhotoPicker(false)}
                  className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Done
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                {allAttachments
                  .filter((a) => isImage(a.mime_type))
                  .map((a) => (
                    <button
                      key={a.id}
                      onClick={() => togglePhotoSelection(a.id)}
                      className={`aspect-square rounded-[4px] overflow-hidden border-2 ${selectedIds.includes(a.id) ? 'border-[var(--accent)]' : 'border-transparent'}`}
                    >
                      <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center">
                        <ImageIcon size={14} className="text-[var(--text-tertiary)]" />
                      </div>
                      <span className="text-[8px] text-[var(--text-tertiary)] truncate block px-1">
                        {a.filename}
                      </span>
                    </button>
                  ))}
                {allAttachments.filter((a) => isImage(a.mime_type)).length === 0 && (
                  <span className="text-[10px] text-[var(--text-tertiary)] col-span-4 text-center py-2">
                    No photos in library
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPhotoPicker(!showPhotoPicker)}
            >
              <Camera size={12} />{' '}
              {selectedIds.length > 0 ? `${selectedIds.length} photos` : 'Attach photos'}
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setShowPhotoPicker(false);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>
              Add
            </Button>
          </div>
        </div>
      )}

      {visits.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No site visits yet. Log your first visit.
        </p>
      ) : (
        <div className="space-y-1">
          {visits.map((v) => {
            const firstPhoto = v.photo_asset_ids
              ? getFirstPhotoPreview(v.photo_asset_ids)
              : undefined;
            return (
              <div
                key={v.id}
                className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
              >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {firstPhoto && (
                    <div className="w-8 h-8 rounded-[4px] glass border border-[var(--border-color)] flex-shrink-0 flex items-center justify-center overflow-hidden">
                      <ImageIcon size={12} className="text-[var(--text-tertiary)]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {v.date && (
                        <span className="font-medium text-[var(--text-primary)]">{v.date}</span>
                      )}
                      {v.phase && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">
                          {v.phase}
                        </span>
                      )}
                      {v.photo_asset_ids && (
                        <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5">
                          <Camera size={9} />
                          {v.photo_asset_ids.split(',').length}
                        </span>
                      )}
                    </div>
                    {v.observations && (
                      <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                        {v.observations}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  aria-label="Delete site visit log"
                  onClick={() => handleDelete(v.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
