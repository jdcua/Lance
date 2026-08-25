/**
 * Build Log -- Developer / Game Developer / DevOps feature.
 * Tracks software builds with version, platform, notes.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Plus, Trash2, Box, Monitor } from 'lucide-react';

export default function BuildLog({ projectId }: { projectId: string }) {
  const { builds, loadBuilds, addBuild, removeBuild } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ version: '', platform: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadBuilds(); }, [projectId, loadBuilds]);

  const list = builds.filter(b => b.project_id === projectId);

  const handleSave = async () => {
    setSaving(true);
    try {
      await addBuild({ project_id: projectId, version: form.version || undefined, platform: form.platform || undefined, notes: form.notes || undefined });
      setForm({ version: '', platform: '', notes: '' });
      setShowForm(false);
    } catch { /* handled */ }
    setSaving(false);
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Builds</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Build
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Version (e.g. v1.2.0)" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className={inputClass} autoFocus />
            <input type="text" placeholder="Platform (e.g. win/mac/web)" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No builds logged yet.</p>
      ) : (
        <div className="space-y-1">
          {list.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-[var(--text-primary)]"><Box size={10} className="inline mr-1" />{b.version || '--'}</span>
                <span className="text-[var(--text-tertiary)] ml-2">
                  {b.platform && <><Monitor size={10} className="inline mr-0.5" />{b.platform}</>}
                </span>
              </div>
              <button onClick={() => removeBuild(b.id, projectId)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
