/**
 * Dataset Versioning -- AI Engineer feature.
 * Changelog-style list of dataset versions, most recent first.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, GitBranch, Database } from 'lucide-react';

type DatasetVersion = {
  id: string;
  project_id: string;
  dataset_id: string;
  version: string;
  description?: string;
  created_at: string;
};

export default function DatasetVersioning({ projectId }: { projectId: string }) {
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ dataset_id: '', version: '', description: '' });
  const [saving, setSaving] = useState(false);

  const loadVersions = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(DatasetVersion & Record<string, unknown>)[]>(
        'SELECT id, project_id, dataset_id, version, description, created_at FROM dataset_versions WHERE project_id = ? ORDER BY created_at DESC',
        [projectId]
      );
      setVersions(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        dataset_id: r.dataset_id as string,
        version: r.version as string,
        description: r.description as string | undefined,
        created_at: r.created_at as string,
      })));
    } catch (e) { console.error('[DatasetVersioning] loadVersions failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadVersions(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.dataset_id.trim() || !form.version.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO dataset_versions (id, project_id, dataset_id, version, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, projectId, form.dataset_id.trim(), form.version.trim(), form.description || null, new Date().toISOString()]
      );
      const item: DatasetVersion = { id, project_id: projectId, dataset_id: form.dataset_id.trim(), version: form.version.trim(), description: form.description || undefined, created_at: new Date().toISOString() };
      setVersions(prev => [item, ...prev]);
      setForm({ dataset_id: '', version: '', description: '' });
      setShowForm(false);
    } catch (e) { console.error('[DatasetVersioning] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM dataset_versions WHERE id = ?', [id]);
      setVersions(prev => prev.filter(v => v.id !== id));
    } catch (e) { console.error('[DatasetVersioning] delete failed:', e); }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Dataset Versions</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Dataset Versions ({versions.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> New Version
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Dataset ID" value={form.dataset_id} onChange={(e) => setForm({ ...form, dataset_id: e.target.value })} className={inputClass} autoFocus />
            <input type="text" placeholder="Version (e.g. v1.2)" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Description (changelog entry)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.dataset_id.trim() || !form.version.trim()}>Add</Button>
          </div>
        </div>
      )}

      {versions.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No dataset versions tracked yet.</p>
      ) : (
        <div className="space-y-1">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <GitBranch size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="font-medium text-[var(--text-primary)]">
                  <Database size={10} className="inline mr-1" />
                  {v.dataset_id}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex-shrink-0">{v.version}</span>
                {v.description && (
                  <span className="text-[var(--text-tertiary)] truncate">{v.description}</span>
                )}
                <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-auto">{formatDate(v.created_at)}</span>
              </div>
              <button onClick={() => handleDelete(v.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
