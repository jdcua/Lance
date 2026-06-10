import { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import type { TimeEntry } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import MetricCard from '../components/ui/MetricCard';
import { Play, Square, Plus, Trash2, Clock } from 'lucide-react';
import { useToasts } from '../store/toastStore';
import { checkAndNotify } from '../achievements/notify';

export default function TimeScreen() {
  const { timeEntries, loadTimeEntries, addTimeEntry, updateTimeEntry, removeTimeEntry, projects, loadProjects, clients, loadClients } = useStore();
  const addToast = useToasts((s) => s.add);
  const [activeTimer, setActiveTimer] = useState<{ entry: TimeEntry; elapsed: number } | null>(null);
  const [intervalId, setIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [entryForm, setEntryForm] = useState({ project_id: '', client_id: '', description: '', start_time: '', end_time: '', billable: true });
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTimeEntries();
    loadProjects();
    loadClients();
  }, [loadTimeEntries, loadProjects, loadClients]);

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervalId]);

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString();
  };

  const startTimer = async () => {
    if (!entryForm.project_id || !entryForm.client_id) return;
    setSaving(true);
    try {
      const entry = await addTimeEntry({
        project_id: entryForm.project_id,
        client_id: entryForm.client_id,
        description: entryForm.description || undefined,
        start_time: new Date().toISOString(),
        billable: entryForm.billable,
      });
      setActiveTimer({ entry, elapsed: 0 });
      const id = setInterval(() => {
        setActiveTimer((prev) => {
          if (!prev) return null;
          const elapsed = Math.floor((Date.now() - new Date(prev.entry.start_time).getTime()) / 60000);
          return { ...prev, elapsed };
        });
      }, 1000);
      setIntervalId(id);
    } finally {
      setSaving(false);
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
    const endTime = new Date().toISOString();
    const duration = Math.floor((Date.now() - new Date(activeTimer.entry.start_time).getTime()) / 60000);
    await updateTimeEntry({
      ...activeTimer.entry,
      end_time: endTime,
      duration_minutes: duration,
    });
    setActiveTimer(null);
    await loadTimeEntries();
    checkAndNotify(useStore.getState(), addToast);
  };

  const addManualEntry = async () => {
    if (!entryForm.project_id || !entryForm.client_id || durationMinutes <= 0) return;
    setSaving(true);
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - durationMinutes * 60000).toISOString();
      const created = await addTimeEntry({
        project_id: entryForm.project_id,
        client_id: entryForm.client_id,
        description: entryForm.description || undefined,
        start_time: startTime,
        billable: entryForm.billable,
      });
      await updateTimeEntry({
        ...created,
        end_time: now.toISOString(),
        duration_minutes: durationMinutes,
      });
      setShowNewEntry(false);
      setEntryForm({ project_id: '', client_id: '', description: '', start_time: '', end_time: '', billable: true });
      setDurationMinutes(0);
      checkAndNotify(useStore.getState(), addToast);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this time entry?')) {
      await removeTimeEntry(id);
    }
  };

  const toggleEntryBillable = async (entry: TimeEntry) => {
    await updateTimeEntry({ ...entry, billable: !entry.billable });
  };

  const getProjectName = (projectId: string) => projects.find((p) => p.id === projectId)?.title || 'Unknown';
  const getClientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name || 'Unknown';

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const todaysEntries = timeEntries.filter((t) => t.start_time.startsWith(today));
  const todaysMinutes = todaysEntries.reduce((acc, t) => acc + (t.duration_minutes || 0), 0);
  const weekEntries = timeEntries.filter((t) => {
    const startDate = new Date(t.start_time);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return startDate >= weekAgo;
  });
  const weekMinutes = weekEntries.reduce((acc, t) => acc + (t.duration_minutes || 0), 0);
  const unbilledMinutes = timeEntries.filter((t) => t.billable && !t.invoiced).reduce((acc, t) => acc + (t.duration_minutes || 0), 0);

  return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-3 mb-6">
        <MetricCard label="Today" value={formatDuration(todaysMinutes)} color="gray" />
        <MetricCard label="This Week" value={formatDuration(weekMinutes)} color="gray" />
        <MetricCard label="Unbilled" value={formatDuration(unbilledMinutes)} subtext="billable hours" color={unbilledMinutes > 0 ? 'amber' : 'gray'} />
        <MetricCard
          label={activeTimer ? 'Timer Running' : 'Timer'}
          value={activeTimer ? formatDuration(activeTimer.elapsed) : 'Stopped'}
          subtext={activeTimer ? getProjectName(activeTimer.entry.project_id) : 'No active timer'}
          trend={activeTimer ? 'up' : 'neutral'}
          color={activeTimer ? 'green' : 'gray'}
        />
      </div>

      {/* Active Timer */}
      {projects.length > 0 && clients.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Project</label>
              <select
                value={entryForm.project_id}
                onChange={(e) => {
                  const project = projects.find((p) => p.id === e.target.value);
                  setEntryForm({ ...entryForm, project_id: e.target.value, client_id: project?.client_id || '' });
                }}
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75]"
                disabled={!!activeTimer}
              >
                <option value="">Select project...</option>
                {projects.filter((p) => p.status === 'active').map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Description</label>
              <input
                type="text"
                value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                placeholder="What are you working on?"
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75]"
                disabled={!!activeTimer}
              />
            </div>
            <label className="flex items-center gap-1.5 pb-2">
              <input
                type="checkbox"
                checked={entryForm.billable}
                onChange={(e) => setEntryForm({ ...entryForm, billable: e.target.checked })}
                className="w-4 h-4 rounded border-[#D4D4D2] text-[#1D9E75]"
                disabled={!!activeTimer}
              />
              <span className="text-xs text-[#6B6B67]">Billable</span>
            </label>
            {activeTimer ? (
              <Button variant="danger" onClick={stopTimer} size="md">
                <Square size={14} />
                Stop ({formatDuration(activeTimer.elapsed)})
              </Button>
            ) : (
              <Button onClick={startTimer} loading={saving} disabled={!entryForm.project_id || !entryForm.client_id} size="md">
                <Play size={14} />
                Start
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#1C1C1A]">Time Entries</h3>
        <button
          onClick={() => setShowNewEntry(!showNewEntry)}
          className="text-xs text-[#1D9E75] hover:underline flex items-center gap-1"
        >
          <Plus size={12} /> Add Manually
        </button>
      </div>

      {/* Manual entry form */}
      {showNewEntry && (
        <Card className="mb-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <select
                value={entryForm.project_id}
                onChange={(e) => {
                  const project = projects.find((p) => p.id === e.target.value);
                  setEntryForm({ ...entryForm, project_id: e.target.value, client_id: project?.client_id || '' });
                }}
                className="w-full px-3 py-2 text-xs border border-[#E5E5E3] rounded-[8px]"
              >
                <option value="">Project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[#A3A39E] mb-1">Minutes</label>
              <input
                type="number"
                value={durationMinutes || ''}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                placeholder="30"
                className="w-20 px-2 py-2 text-xs border border-[#E5E5E3] rounded-[8px]"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                placeholder="Description"
                className="w-full px-3 py-2 text-xs border border-[#E5E5E3] rounded-[8px]"
              />
            </div>
            <Button onClick={addManualEntry} loading={saving} disabled={!entryForm.project_id || durationMinutes <= 0} size="sm">
              Log
            </Button>
          </div>
        </Card>
      )}

      {timeEntries.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <Clock size={40} className="text-[#A3A39E] mb-4" />
          <h3 className="text-[15px] font-medium text-[#6B6B67] mb-1.5">No time entries yet</h3>
          <p className="text-[13px] text-[#A3A39E] max-w-xs mb-5">Start a timer or add entries manually.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {timeEntries.slice(0, 50).map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 bg-white border border-[#E5E5E3] rounded-[8px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-[#1C1C1A]">{getProjectName(entry.project_id)}</span>
                  <span className="text-[10px] text-[#A3A39E]">—</span>
                  <span className="text-xs text-[#6B6B67] truncate">{entry.description || 'No description'}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#A3A39E]">
                  <span>{formatDate(entry.start_time)}</span>
                  <span>{formatTime(entry.start_time)} {entry.end_time ? `- ${formatTime(entry.end_time)}` : ''}</span>
                  <span className="text-[#6B6B67] font-medium">{entry.duration_minutes ? formatDuration(entry.duration_minutes) : 'In progress'}</span>
                  <span>{getClientName(entry.client_id)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleEntryBillable(entry)}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border ${entry.billable ? 'bg-[#E6F5EE] text-[#1D9E75] border-[#1D9E75]/20' : 'bg-[#F2F2F0] text-[#A3A39E] border-[#D4D4D2]'}`}
                >
                  {entry.billable ? 'billable' : 'non-billable'}
                </button>
                {entry.invoiced && <Badge variant="info">invoiced</Badge>}
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-1 text-[#A3A39E] hover:text-[#A32D2D]"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
