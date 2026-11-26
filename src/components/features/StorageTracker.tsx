import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, HardDrive, Upload } from 'lucide-react';

type StorageLog = {
  id: string;
  project_id: string;
  raw_gb?: number;
  exported_gb?: number;
  logged_date: string;
};

export default function StorageTracker({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<StorageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ raw_gb: '', exported_gb: '', logged_date: '' });
  const [saving, setSaving] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<StorageLog[]>(
        'SELECT * FROM storage_log WHERE project_id = $1 ORDER BY logged_date DESC',
        [projectId],
      );
      setLogs(rows);
    } catch {
      /* handled */
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadLogs();
  }, [projectId, loadLogs]);

  const handleSave = async () => {
    if (!form.logged_date.trim()) return;
    setSaving(true);
    try {
      const db = await getDb();
      const id = crypto.randomUUID();
      await db.execute(
        'INSERT INTO storage_log (id, project_id, raw_gb, exported_gb, logged_date) VALUES ($1, $2, $3, $4, $5)',
        [
          id,
          projectId,
          form.raw_gb ? parseFloat(form.raw_gb) : null,
          form.exported_gb ? parseFloat(form.exported_gb) : null,
          form.logged_date,
        ],
      );
      setLogs([
        {
          id,
          project_id: projectId,
          raw_gb: form.raw_gb ? parseFloat(form.raw_gb) : undefined,
          exported_gb: form.exported_gb ? parseFloat(form.exported_gb) : undefined,
          logged_date: form.logged_date,
        },
        ...logs,
      ]);
      setForm({ raw_gb: '', exported_gb: '', logged_date: '' });
      setShowForm(false);
    } catch {
      /* handled */
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM storage_log WHERE id = $1', [id]);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch {
      /* handled */
    }
  };

  const totalRaw = logs.reduce((sum, l) => sum + (l.raw_gb || 0), 0);
  const totalExported = logs.reduce((sum, l) => sum + (l.exported_gb || 0), 0);
  const ratioPercent = totalRaw > 0 ? Math.min((totalExported / totalRaw) * 100, 100) : 0;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) return <p className="text-xs text-[var(--text-tertiary)] py-2">Loading...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Storage</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Storage
        </Button>
      </div>

      {logs.length > 0 && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[var(--text-tertiary)]">
              <HardDrive size={10} className="inline mr-1" />
              Raw:{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {totalRaw.toFixed(1)} GB
              </span>
            </span>
            <span className="text-[var(--text-tertiary)]">
              <Upload size={10} className="inline mr-1" />
              Exported:{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {totalExported.toFixed(1)} GB
              </span>
            </span>
          </div>
          <div className="h-2 w-full glass rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-colors"
              style={{ width: `${ratioPercent}%` }}
            />
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Raw GB"
              step="0.1"
              value={form.raw_gb}
              onChange={(e) => setForm({ ...form, raw_gb: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Exported GB"
              step="0.1"
              value={form.exported_gb}
              onChange={(e) => setForm({ ...form, exported_gb: e.target.value })}
              className={inputClass}
            />
          </div>
          <input
            type="date"
            value={form.logged_date}
            onChange={(e) => setForm({ ...form, logged_date: e.target.value })}
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No storage logs yet.</p>
      ) : (
        <div className="space-y-1">
          {logs.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-[var(--text-primary)]">
                  {l.logged_date.split('T')[0]}
                </span>
                <span className="text-[var(--text-tertiary)] ml-2">
                  {l.raw_gb != null && (
                    <>
                      <HardDrive size={10} className="inline mr-0.5" />
                      {l.raw_gb} GB raw{' '}
                    </>
                  )}
                  {l.exported_gb != null && (
                    <>
                      <Upload size={10} className="inline mr-0.5 ml-1" />
                      {l.exported_gb} GB exported
                    </>
                  )}
                </span>
              </div>
              <button
                aria-label="Delete storage tracker"
                onClick={() => handleDelete(l.id)}
                className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
