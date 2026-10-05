/**
 * Session Log · Tutor / Wellness / Trainer / Consultant feature.
 * Logs client sessions with type, duration, notes, action items, next session date.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Plus, Trash2, Clock, Calendar, FileText } from 'lucide-react';

export default function SessionLog({
  clientId,
  projectId,
}: {
  clientId?: string;
  projectId?: string;
}) {
  const { sessions, loadSessions, addSession, removeSession } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    client_id: clientId || '',
    project_id: projectId || '',
    session_type: '',
    duration_minutes: '',
    notes: '',
    action_items: '',
    next_session_date: '',
  });
  const [saving, setSaving] = useState(false);
  const { clients } = useStore();

  useEffect(() => {
    loadSessions(clientId, projectId);
  }, [clientId, projectId, loadSessions]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      client_id: clientId || f.client_id,
      project_id: projectId || f.project_id,
    }));
  }, [clientId, projectId]);

  const list = sessions || [];

  const handleSave = async () => {
    if (!form.client_id.trim()) return;
    setSaving(true);
    try {
      await addSession({
        client_id: form.client_id,
        project_id: form.project_id || undefined,
        session_type: form.session_type || undefined,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
        notes: form.notes || undefined,
        action_items: form.action_items || undefined,
        next_session_date: form.next_session_date || undefined,
      });
      setForm({
        client_id: clientId || '',
        project_id: projectId || '',
        session_type: '',
        duration_minutes: '',
        notes: '',
        action_items: '',
        next_session_date: '',
      });
      setShowForm(false);
    } catch {
      /* handled */
    }
    setSaving(false);
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Sessions ({list.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Session
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          {!clientId && (
            <select
              aria-label="Client"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className={inputClass}
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Session type"
              value={form.session_type}
              onChange={(e) => setForm({ ...form, session_type: e.target.value })}
              className={inputClass}
              autoFocus
            />
            <input
              type="number"
              placeholder="Duration (min)"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
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
          <textarea
            placeholder="Action items"
            value={form.action_items}
            onChange={(e) => setForm({ ...form, action_items: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <input
            type="date"
            value={form.next_session_date}
            onChange={(e) => setForm({ ...form, next_session_date: e.target.value })}
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.client_id.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No sessions logged yet.</p>
      ) : (
        <div className="space-y-1">
          {list.map((s) => {
            const client = clients.find((c) => c.id === s.client_id);
            return (
              <div
                key={s.id}
                className="flex items-start justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">
                      {s.session_type || 'Session'}
                    </span>
                    {!clientId && client && (
                      <span className="text-[var(--text-tertiary)]">-- {client.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
                    {s.duration_minutes != null && (
                      <span>
                        <Clock size={10} className="inline mr-0.5" />
                        {s.duration_minutes}m
                      </span>
                    )}
                    {s.next_session_date && (
                      <span>
                        <Calendar size={10} className="inline mr-0.5" />
                        {s.next_session_date?.split('T')[0]}
                      </span>
                    )}
                    {s.action_items && (
                      <span>
                        <FileText size={10} className="inline mr-0.5" />
                        {s.action_items.length > 40
                          ? s.action_items.slice(0, 40) + '...'
                          : s.action_items}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  aria-label="Delete session log"
                  onClick={() => removeSession(s.id)}
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
