import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { TimeEntry } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import MetricCard from '../components/ui/MetricCard';
import { Play, Square, Plus, Trash2, Clock, Grid3X3 } from 'lucide-react';
import { useToasts } from '../store/toastStore';
import { checkAndNotify } from '../achievements/notify';
import { getUnlockedAchievementKeys } from '../achievements/checker';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { relativeDate } from '../utils/format';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TimeScreen() {
  const { timeEntries, loadTimeEntries, addTimeEntry, updateTimeEntry, removeTimeEntry, projects, loadProjects, clients, loadClients } = useStore();
  const addToast = useToasts((s) => s.add);
  const [activeTimer, setActiveTimer] = useState<{ entry: TimeEntry; elapsed: number } | null>(null);
  const [intervalId, setIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [entryForm, setEntryForm] = useState({ project_id: '', client_id: '', description: '', billable: true });
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; description: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<'timer' | 'heatmap'>('timer');
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    Promise.all([loadTimeEntries(), loadProjects(), loadClients()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadTimeEntries, loadProjects, loadClients]);

  useEffect(() => {
    getUnlockedAchievementKeys().then((keys) => {
      setShowHeatmap(new Set(keys).has('twenty_five_hours'));
    });
  }, []);

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
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to start timer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
    try {
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
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to stop timer', 'error');
    }
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
      setEntryForm({ project_id: '', client_id: '', description: '', billable: true });
      setDurationMinutes(0);
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to log entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await removeTimeEntry(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleEntryBillable = async (entry: TimeEntry) => {
    try {
      await updateTimeEntry({ ...entry, billable: !entry.billable });
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to update', 'error');
    }
  };

  const getProjectName = (projectId: string) => projects.find((p) => p.id === projectId)?.title || 'Unknown';
  const getClientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name || 'Unknown';

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

  // ── Heatmap data ──
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setHours(0, 0, 0, 0);

  const hoursByDay: Record<string, number> = {};
  for (const t of timeEntries) {
    const d = t.start_time.substring(0, 10);
    hoursByDay[d] = (hoursByDay[d] || 0) + ((t.duration_minutes || 0) / 60);
  }

  // Build 52×7 grid
  const heatmapGrid: { date: Date; hours: number }[][] = [];
  let weekStart = new Date(startDate);
  const endOfWeekDay = weekStart.getDay();
  if (endOfWeekDay !== 0) {
    weekStart.setDate(weekStart.getDate() - endOfWeekDay);
  }

  const gridWeeks = 53;
  for (let w = 0; w < gridWeeks; w++) {
    const week: { date: Date; hours: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(weekStart);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const key = getDateKey(cellDate);
      week.push({ date: cellDate, hours: hoursByDay[key] || 0 });
    }
    heatmapGrid.push(week);
  }

  // Summary stats
  const yearStart = new Date(now.getFullYear(), 0, 1);
  let hoursThisYear = 0;
  for (const t of timeEntries) {
    if (new Date(t.start_time) >= yearStart) {
      hoursThisYear += (t.duration_minutes || 0) / 60;
    }
  }

  const sortedDays = Object.entries(hoursByDay)
    .filter(([, h]) => h > 0)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  let longestStreak = 0;
  let currentStreak = 0;
  let bestDayHours = 0;
  let bestDayDate = '';

  const allDates = new Set(Object.keys(hoursByDay).filter((k) => hoursByDay[k] > 0));
  const datesArr = [...allDates].sort();

  for (const [dateStr, hours] of sortedDays) {
    if (hours > bestDayHours) {
      bestDayHours = hours;
      bestDayDate = dateStr;
    }
  }

  let streak = 0;
  for (let i = 0; i < datesArr.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(datesArr[i - 1]);
      const curr = new Date(datesArr[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff <= 1.1) {
        streak++;
      } else {
        if (streak > longestStreak) longestStreak = streak;
        streak = 1;
      }
    }
    if (streak > longestStreak) longestStreak = streak;
  }

  // Current streak
  let cs = 0;
  const checkDate = new Date(now);
  for (let i = 0; i < 365; i++) {
    const key = getDateKey(checkDate);
    if (hoursByDay[key] && hoursByDay[key] > 0) {
      cs++;
    } else {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }
  currentStreak = cs;

  if (loading) return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />)}
      </div>
      <div className="h-16 rounded-[8px] bg-[var(--bg-secondary)] skeleton-pulse mb-4" />
      {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-[var(--bg-secondary)] rounded-[8px] skeleton-pulse mb-2" />)}
    </div>
  );

  const TabBar = () => (
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={() => setTab('timer')}
        className={`text-sm font-medium pb-1.5 border-b-2 transition-colors ${
          tab === 'timer'
            ? 'text-[var(--text-primary)] border-[var(--accent)]'
            : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
        }`}
      >
        Timer
      </button>
      {showHeatmap && (
        <button
          onClick={() => setTab('heatmap')}
          className={`text-sm font-medium pb-1.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'heatmap'
              ? 'text-[var(--text-primary)] border-[var(--accent)]'
              : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
          }`}
        >
          <Grid3X3 size={14} />
          Heatmap
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <TabBar />

      {tab === 'timer' ? (
        <>
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

          {projects.length > 0 && clients.length > 0 && (
            <Card className="mb-6">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project</label>
                  <select
                    value={entryForm.project_id}
                    onChange={(e) => {
                      const project = projects.find((p) => p.id === e.target.value);
                      setEntryForm({ ...entryForm, project_id: e.target.value, client_id: project?.client_id || '' });
                    }}
                    className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]"
                    disabled={!!activeTimer}
                  >
                    <option value="">Select project...</option>
                    {projects.filter((p) => p.status === 'active').map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
                  <input
                    type="text"
                    value={entryForm.description}
                    onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                    placeholder="What are you working on?"
                    className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                    disabled={!!activeTimer}
                  />
                </div>
                <label className="flex items-center gap-1.5 pb-2">
                  <input
                    type="checkbox"
                    checked={entryForm.billable}
                    onChange={(e) => setEntryForm({ ...entryForm, billable: e.target.checked })}
                    className="w-4 h-4 rounded border-[#D4D4D2] text-[var(--accent)]"
                    disabled={!!activeTimer}
                  />
                  <span className="text-xs text-[var(--text-secondary)]">Billable</span>
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
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Time Entries</h3>
            <button
              onClick={() => setShowNewEntry(!showNewEntry)}
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Add Manually
            </button>
          </div>

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
                    className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[8px]"
                  >
                    <option value="">Project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-tertiary)] mb-1">Minutes</label>
                  <input
                    type="number"
                    value={durationMinutes || ''}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                    placeholder="30"
                    className="w-20 px-2 py-2 text-xs border border-[var(--border-color)] rounded-[8px]"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={entryForm.description}
                    onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                    placeholder="Description"
                    className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[8px]"
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
              <Clock size={40} className="text-[var(--text-tertiary)] mb-4" />
              <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">No time entries yet</h3>
              <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs mb-5">Start a timer or add entries manually.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[8px]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-[var(--text-primary)]">{getProjectName(entry.project_id)}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">—</span>
                      <span className="text-xs text-[var(--text-secondary)] truncate">{entry.description || 'No description'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                      <span>{relativeDate(entry.start_time)}</span>
                      <span>{formatTime(entry.start_time)} {entry.end_time ? `- ${formatTime(entry.end_time)}` : ''}</span>
                      <span className="text-[var(--text-secondary)] font-medium">{entry.duration_minutes ? formatDuration(entry.duration_minutes) : 'In progress'}</span>
                      <span>{getClientName(entry.client_id)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleEntryBillable(entry)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${entry.billable ? 'bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent)]/20' : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border-[#D4D4D2]'}`}
                    >
                      {entry.billable ? 'billable' : 'non-billable'}
                    </button>
                    {entry.invoiced && <Badge variant="info">invoiced</Badge>}
                    <button
                      onClick={() => setConfirmDelete({ id: entry.id, description: entry.description || 'No description' })}
                      aria-label="Delete time entry"
                      className="p-1 text-[var(--text-tertiary)] hover:text-[#A32D2D]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── Heatmap tab ── */
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <MetricCard label="Total This Year" value={`${Math.round(hoursThisYear)}h`} color="gray" />
            <MetricCard label="Longest Streak" value={`${longestStreak} days`} color="green" />
            <MetricCard label="Current Streak" value={`${currentStreak} days`} color={currentStreak > 0 ? 'green' : 'gray'} />
            <MetricCard
              label="Best Day"
              value={bestDayHours > 0 ? `${bestDayHours.toFixed(1)}h` : '—'}
              subtext={bestDayHours > 0 ? new Date(bestDayDate).toLocaleDateString() : undefined}
              color={bestDayHours > 0 ? 'purple' : 'gray'}
            />
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Activity Heatmap</h3>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">Each cell represents a day. Hover to see hours logged.</p>

            <div className="overflow-x-auto">
              <div className="flex" style={{ minWidth: 'fit-content' }}>
                {/* Day labels */}
                <div className="flex flex-col gap-[3px] mr-2 pt-[18px]">
                  {DAYS.map((day, i) => (
                    <span key={i} className="text-[9px] text-[var(--text-tertiary)] h-[13px] leading-[13px]">
                      {i % 2 === 0 ? day : ''}
                    </span>
                  ))}
                </div>

                {/* Month labels and grid */}
                <div>
                  <div className="flex mb-1" style={{ paddingLeft: '0' }}>
                    {(() => {
                      const labels: { month: string; col: number }[] = [];
                      let lastMonth = -1;
                      for (let w = 0; w < gridWeeks; w++) {
                        const cellDate = heatmapGrid[w]?.[0]?.date;
                        if (cellDate && cellDate.getMonth() !== lastMonth) {
                          lastMonth = cellDate.getMonth();
                          labels.push({ month: MONTHS_SHORT[cellDate.getMonth()], col: w });
                        }
                      }
                      return labels.map((l, i) => (
                        <span
                          key={i}
                          className="text-[9px] text-[var(--text-tertiary)]"
                          style={{
                            position: 'absolute',
                            left: `${l.col * 16}px`,
                            marginLeft: 0,
                          }}
                        />
                      ));
                    })()}
                  </div>
                  <div className="flex gap-[3px] ml-0">
                    {/* Simple month label row */}
                    {(() => {
                      let lastMonth = -1;
                      const labels: { month: string; spans: number }[] = [];
                      for (let w = 0; w < gridWeeks; w++) {
                        const cellDate = heatmapGrid[w]?.[0]?.date;
                        if (cellDate) {
                          if (cellDate.getMonth() !== lastMonth) {
                            lastMonth = cellDate.getMonth();
                            labels.push({ month: MONTHS_SHORT[cellDate.getMonth()], spans: 1 });
                          } else if (labels.length > 0) {
                            labels[labels.length - 1].spans++;
                          }
                        }
                      }
                      return (
                        <>
                          {labels.map((l, i) => (
                            <span
                              key={i}
                              className="text-[9px] text-[var(--text-tertiary)]"
                              style={{ minWidth: `${l.spans * 16}px` }}
                            >
                              {l.month}
                            </span>
                          ))}
                        </>
                      );
                    })()}
                  </div>

                  <div className="mt-1">
                    {heatmapGrid.map((week, wi) => (
                      <div key={wi} className="flex" style={{ gap: '3px', marginRight: wi < gridWeeks - 1 ? '3px' : '0' }}>
                        {week.map((cell, di) => {
                          const h = cell.hours;
                          return (
                            <div
                              key={di}
                              className={`rounded-sm cursor-default transition-colors`}
                              style={{
                                width: '13px',
                                height: '13px',
                                backgroundColor: `color-mix(in srgb, var(--color-accent, var(--accent)) ${h === 0 ? 5 : h <= 2 ? 15 : h <= 4 ? 35 : h <= 6 ? 60 : 85}%, var(--bg-secondary))`,
                              }}
                              title={`${DAY_NAMES_FULL[cell.date.getDay()]} ${MONTHS_SHORT[cell.date.getMonth()]} ${cell.date.getDate()} — ${h.toFixed(1)}h logged`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--border-color)]">
              <span className="text-[9px] text-[var(--text-tertiary)]">Less</span>
              {[0, 2, 4, 6, 8].map((h) => (
                <div
                  key={h}
                  className="rounded-sm"
                  style={{
                    width: '13px',
                    height: '13px',
                    backgroundColor: `color-mix(in srgb, var(--color-accent, var(--accent)) ${h === 0 ? 5 : 15}%, var(--bg-secondary))`,
                  }}
                />
              ))}
              <span className="text-[9px] text-[var(--text-tertiary)]">More</span>
            </div>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Time Entry"
        message={`Are you sure you want to delete "${confirmDelete?.description}"? This cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
