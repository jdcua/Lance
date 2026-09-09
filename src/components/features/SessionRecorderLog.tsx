/**
 * Session Recorder Log · Voice Actor feature.
 * Track recording sessions with duration and file path.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Clock } from 'lucide-react';

type SessionRecording = {
  id: string;
  client_id?: string;
  project_id?: string;
  title: string;
  duration_min?: number;
  file_path?: string;
  notes?: string;
  created_at: string;
};

export default function SessionRecorderLog({ clientId, projectId }: { clientId?: string; projectId?: string }) {
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    duration_min: '',
    file_path: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadRecordings = async () => {
    try {
      const db = await getDb();
      let rows: (SessionRecording & Record<string, unknown>)[];
      if (projectId) {
        rows = await db.select<(SessionRecording & Record<string, unknown>)[]>(
          'SELECT id, client_id, project_id, title, duration_min, file_path, notes, created_at FROM session_recordings WHERE project_id = ? ORDER BY created_at DESC',
          [projectId]
        );
      } else if (clientId) {
        rows = await db.select<(SessionRecording & Record<string, unknown>)[]>(
          'SELECT id, client_id, project_id, title, duration_min, file_path, notes, created_at FROM session_recordings WHERE client_id = ? ORDER BY created_at DESC',
          [clientId]
        );
      } else {
        rows = await db.select<(SessionRecording & Record<string, unknown>)[]>(
          'SELECT id, client_id, project_id, title, duration_min, file_path, notes, created_at FROM session_recordings ORDER BY created_at DESC'
        );
      }
      setRecordings(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string | undefined,
          project_id: r.project_id as string | undefined,
          title: r.title as string,
          duration_min: r.duration_min as number | undefined,
          file_path: r.file_path as string | undefined,
          notes: r.notes as string | undefined,
          created_at: r.created_at as string,
        }))
      );
    } catch (e) {
      console.error('[SessionRecorderLog] loadRecordings failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRecordings();
  }, [clientId, projectId]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const db = await getDb();
      await db.execute(
        'INSERT INTO session_recordings (id, client_id, project_id, title, duration_min, file_path, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId || null,
          projectId || null,
          form.title.trim(),
          form.duration_min ? parseInt(form.duration_min) : null,
          form.file_path || null,
          form.notes || null,
          now,
        ]
      );
      const recording: SessionRecording = {
        id,
        client_id: clientId,
        project_id: projectId,
        title: form.title.trim(),
        duration_min: form.duration_min ? parseInt(form.duration_min) : undefined,
        file_path: form.file_path || undefined,
        notes: form.notes || undefined,
        created_at: now,
      };
      setRecordings((prev) => [recording, ...prev]);
      setForm({ title: '', duration_min: '', file_path: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[SessionRecorderLog] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM session_recordings WHERE id = ?', [id]);
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error('[SessionRecorderLog] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Session Recordings</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Recordings ({recordings.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Recording
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Recording title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Duration (min)"
              value={form.duration_min}
              onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="File path"
              value={form.file_path}
              onChange={(e) => setForm({ ...form, file_path: e.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.title.trim()}>Save</Button>
          </div>
        </div>
      )}

      {recordings.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No session recordings yet.</p>
      ) : (
        <div className="space-y-1">
          {recordings.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)] truncate">{r.title}</span>
                {r.duration_min != null && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    <Clock size={10} className="inline mr-0.5" />{r.duration_min}m
                  </span>
                )}
                {r.file_path && (
                  <span className="text-[10px] text-[var(--text-tertiary)] truncate">{r.file_path}</span>
                )}
                {r.notes && <span className="text-[10px] text-[var(--text-tertiary)] truncate">{r.notes}</span>}
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              <button onClick={() => handleDelete(r.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
