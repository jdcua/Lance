import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import Modal from './Modal';
import Button from './Button';
import { useToasts } from '../../store/toastStore';
import { checkAndNotify } from '../../achievements/notify';

type QuickTimeLogModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function QuickTimeLogModal({ open, onClose }: QuickTimeLogModalProps) {
  const { projects, loadProjects, clients, loadClients, addTimeEntry, updateTimeEntry } = useStore();
  const addToast = useToasts((s) => s.add);
  const [projectId, setProjectId] = useState('');
  const [clientId, setClientId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const projectSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (open) {
      setProjectId('');
      setClientId('');
      setDurationMinutes('');
      setDescription('');
      setSaving(false);
      Promise.all([loadProjects(), loadClients()]).catch(() => {});
      setTimeout(() => projectSelectRef.current?.focus(), 50);
    }
  }, [open, loadProjects, loadClients]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (!projectId || !clientId || !durationMinutes) return;
    setSaving(true);
    try {
      const minutes = parseInt(durationMinutes, 10);
      const now = new Date();
      const startTime = new Date(now.getTime() - minutes * 60000).toISOString();
      const entry = await addTimeEntry({
        project_id: projectId,
        client_id: clientId,
        description: description || undefined,
        start_time: startTime,
        billable: true,
      });
      await updateTimeEntry({
        ...entry,
        end_time: now.toISOString(),
        duration_minutes: minutes,
      });
      const project = projects.find((p) => p.id === projectId);
      addToast(`Logged ${minutes}m — ${project?.title || 'Unknown'}`, 'success');
      localStorage.setItem('lance:last-timer-config', JSON.stringify({ projectId, clientId }));
      checkAndNotify(useStore.getState(), addToast);
      onClose();
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to log time', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleProjectChange = (id: string) => {
    setProjectId(id);
    const project = projects.find((p) => p.id === id);
    if (project) {
      setClientId(project.client_id);
    }
  };

  const activeProjects = projects.filter((p) => p.status === 'active');

  return (
    <Modal open={open} onClose={onClose} title="Quick Log Time" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project</label>
          <select
            ref={projectSelectRef}
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)] bg-[var(--bg-card)]"
          >
            <option value="">Select project...</option>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Duration (minutes)</label>
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="e.g. 30"
            className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] bg-[var(--bg-card)]"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on?"
            className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] bg-[var(--bg-card)]"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} size="sm">Cancel</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!projectId || !clientId || !durationMinutes} size="sm">Log</Button>
        </div>
      </div>
    </Modal>
  );
}
