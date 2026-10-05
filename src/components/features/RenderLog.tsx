/**
 * Render Log · Animator / 3D Artist feature.
 * Lists render passes for a project with duration, software, frame range.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Plus, Trash2, Clock, Monitor, Layers } from 'lucide-react';

export default function RenderLog({ projectId }: { projectId: string }) {
  const { renderLogs, loadRenderLogs, addRenderLog, removeRenderLog } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ pass_name: '', duration_minutes: '', software: '', frame_range: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRenderLogs(); }, [projectId, loadRenderLogs]);

  const logs = renderLogs.filter(l => l.project_id === projectId);

  const handleSave = async () => {
    if (!form.pass_name.trim()) return;
    setSaving(true);
    try {
      await addRenderLog({ project_id: projectId, pass_name: form.pass_name || undefined, duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined, software: form.software || undefined, frame_range: form.frame_range || undefined, notes: form.notes || undefined });
      setForm({ pass_name: '', duration_minutes: '', software: '', frame_range: '', notes: '' });
      setShowForm(false);
    } catch { /* handled */ }
    setSaving(false);
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Render Passes</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Pass
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Pass name (e.g. Beauty, AO, Shadow)" value={form.pass_name} onChange={(e) => setForm({ ...form, pass_name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Duration (min)" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Software" value={form.software} onChange={(e) => setForm({ ...form, software: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Frame range (e.g. 1–240)" value={form.frame_range} onChange={(e) => setForm({ ...form, frame_range: e.target.value })} className={inputClass} />
          <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.pass_name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No render passes logged yet.</p>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-[var(--text-primary)]">{log.pass_name}</span>
                <span className="text-[var(--text-tertiary)] ml-2">
                  {log.duration_minutes != null && <><Clock size={10} className="inline mr-0.5" />{log.duration_minutes}m </>}
                  {log.software && <><Monitor size={10} className="inline mr-0.5 ml-1" />{log.software} </>}
                  {log.frame_range && <><Layers size={10} className="inline mr-0.5 ml-1" />{log.frame_range}</>}
                </span>
              </div>
              <button
                aria-label="Delete render log"
                onClick={() => removeRenderLog(log.id, projectId)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
