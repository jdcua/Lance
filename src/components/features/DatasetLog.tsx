/**
 * Dataset Log · Data Analyst / AI Engineer feature.
 * Lists datasets with metadata (source, size, format, license).
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Plus, Trash2, Database, HardDrive } from 'lucide-react';

export default function DatasetLog({ projectId }: { projectId: string }) {
  const { datasets, loadDatasets, addDataset, removeDataset } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ dataset_name: '', source: '', size_bytes: '', format_type: '', license_type: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadDatasets(); }, [projectId, loadDatasets]);

  const list = datasets.filter(d => d.project_id === projectId);

  const formatSize = (bytes?: number) => {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)}MB`;
    return `${(bytes / 1073741824).toFixed(1)}GB`;
  };

  const handleSave = async () => {
    if (!form.dataset_name.trim()) return;
    setSaving(true);
    try {
      await addDataset({ project_id: projectId, dataset_name: form.dataset_name || undefined, source: form.source || undefined, size_bytes: form.size_bytes ? parseInt(form.size_bytes) : undefined, format_type: form.format_type || undefined, license_type: form.license_type || undefined });
      setForm({ dataset_name: '', source: '', size_bytes: '', format_type: '', license_type: '' });
      setShowForm(false);
    } catch { /* handled */ }
    setSaving(false);
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Datasets</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Dataset
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Dataset name" value={form.dataset_name} onChange={(e) => setForm({ ...form, dataset_name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Source / URL" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Size (bytes)" value={form.size_bytes} onChange={(e) => setForm({ ...form, size_bytes: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Format (e.g. CSV, JSON, Parquet)" value={form.format_type} onChange={(e) => setForm({ ...form, format_type: e.target.value })} className={inputClass} />
            <input type="text" placeholder="License type" value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.dataset_name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No datasets logged yet.</p>
      ) : (
        <div className="space-y-1">
          {list.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-[var(--text-primary)]"><Database size={10} className="inline mr-1" />{d.dataset_name || '--'}</span>
                <span className="text-[var(--text-tertiary)] ml-2">
                  {d.source && <span className="mr-1">{d.source}</span>}
                  {d.size_bytes != null && <><HardDrive size={10} className="inline mr-0.5" />{formatSize(d.size_bytes)} </>}
                  {d.format_type && <span className="ml-1">{d.format_type}</span>}
                </span>
              </div>
              <button
                aria-label="Delete dataset log"
                onClick={() => removeDataset(d.id, projectId)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
