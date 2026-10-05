import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { TimeEntry } from '../types';
import Button from '../components/ui/Button';
import LoadError from '../components/ui/LoadError';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import MetricCard from '../components/ui/MetricCard';
import { Plus, Trash2, Clock, Grid3X3, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useToasts } from '../store/toastStore';
import { useVisibleList, MoreRows } from '../components/ui/useVisibleList';
import { checkAndNotify } from '../achievements/notify';
import ArchetypeFeatureTabs from '../components/features/ArchetypeFeatureTabs';
import { getUnlockedAchievementKeys } from '../achievements/checker';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { relativeDate } from '../utils/format';
import { sanitizeInput, MAX_LENGTHS } from '../utils/sanitize';
import {
  computeHeatmapGrid,
  computeStreakStats,
  computeDayOfWeekBreakdown,
  computeHourOfDayHeatmap,
  computeMonthLabels,
  getDateKey,
  parseLocalDateKey,
  getIntensityColor,
  formatTooltip,
  getHoursLabel,
  formatHourLabel,
  getMaxHourCount,
  INTENSITY_LEVELS,
  DOW_LABELS_SPARSE,
  type HeatmapCell,
} from '../lib/heatmap';

const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_ABBREV = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TabBar = ({ tab, setTab, showHeatmap }: { tab: string; setTab: (t: 'timer' | 'heatmap') => void; showHeatmap: boolean }) => (
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

export default function TimeScreen() {
  const navigate = useNavigate();
  const { timeEntries, loadTimeEntries, addTimeEntry, updateTimeEntry, removeTimeEntry, projects, loadProjects, clients, loadClients } = useStore();
  const addToast = useToasts((s) => s.add);
  const timeError = useStore((s) => s.errors.timeEntries);
  const [activeTimer, setActiveTimer] = useState<{ entry: TimeEntry; elapsed: number } | null>(null);
  const [intervalId, setIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);
  const [entryForm, setEntryForm] = useState({ project_id: '', client_id: '', description: '', billable: true });
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; description: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<'timer' | 'heatmap'>('timer');
  const pagedEntries = useVisibleList(timeEntries, `${timeEntries.length}`);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    Promise.all([loadTimeEntries(), loadProjects(), loadClients()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadTimeEntries, loadProjects, loadClients, addToast]);

  // Sync timer card with global timer state (started via App.tsx toggle or another session)
  useEffect(() => {
    const running = timeEntries.find((t) => !t.end_time);
    if (running) {
      setActiveTimer((prev) => {
        if (prev && prev.entry.id === running.id) return prev;
        return { entry: running, elapsed: Math.max(0, Math.floor((Date.now() - new Date(running.start_time).getTime()) / 60000)) };
      });
      if (!intervalId) {
        const id = setInterval(() => {
          setActiveTimer((prev) => {
            if (!prev) return null;
            const elapsed = Math.floor((Date.now() - new Date(prev.entry.start_time).getTime()) / 60000);
            return { ...prev, elapsed };
          });
        }, 1000);
        setIntervalId(id);
      }
    } else {
      setActiveTimer(null);
      if (intervalId) { clearInterval(intervalId); setIntervalId(null); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeEntries]);

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

  const addManualEntry = async () => {
    if (!entryForm.project_id || !entryForm.client_id || durationMinutes <= 0) return;
    if (!isFinite(durationMinutes) || durationMinutes > 1440) {
      addToast('Duration must be between 1 minute and 24 hours', 'error');
      return;
    }
    setSaving(true);
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - durationMinutes * 60000).toISOString();
      const created = await addTimeEntry({
        project_id: entryForm.project_id,
        client_id: entryForm.client_id,
        description: entryForm.description ? sanitizeInput(entryForm.description).slice(0, MAX_LENGTHS.description) : undefined,
        start_time: startTime,
        billable: entryForm.billable,
      });
      await updateTimeEntry({
        ...created,
        end_time: now.toISOString(),
        duration_minutes: durationMinutes,
      });
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

  const today = getDateKey(new Date());
  const todaysEntries = timeEntries.filter((t) => getDateKey(new Date(t.start_time)) === today);
  const todaysMinutes = todaysEntries.reduce((acc, t) => acc + (t.duration_minutes || 0), 0);
  const weekEntries = timeEntries.filter((t) => {
    const startDate = new Date(t.start_time);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return startDate >= weekAgo;
  });
  const weekMinutes = weekEntries.reduce((acc, t) => acc + (t.duration_minutes || 0), 0);
  const unbilledMinutes = timeEntries.filter((t) => t.billable && !t.invoiced).reduce((acc, t) => acc + (t.duration_minutes || 0), 0);

  // ── Heatmap state ──
  const now = new Date();
  const [heatmapYear, setHeatmapYear] = useState(now.getFullYear());
  const [selectedProject, setSelectedProject] = useState('__all__');
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [selectedCellPos, setSelectedCellPos] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const heatmapGrid = useMemo(
    () => computeHeatmapGrid(timeEntries, heatmapYear, selectedProject !== '__all__' ? selectedProject : undefined),
    [timeEntries, heatmapYear, selectedProject],
  );

  const streakStats = useMemo(
    () => computeStreakStats(timeEntries, heatmapYear),
    [timeEntries, heatmapYear],
  );

  const dowBreakdown = useMemo(
    () => computeDayOfWeekBreakdown(timeEntries, selectedProject !== '__all__' ? selectedProject : undefined),
    [timeEntries, selectedProject],
  );

  const hourGrid = useMemo(
    () => computeHourOfDayHeatmap(timeEntries, selectedProject !== '__all__' ? selectedProject : undefined),
    [timeEntries, selectedProject],
  );

  const monthLabels = useMemo(() => computeMonthLabels(heatmapGrid), [heatmapGrid]);
  const maxHourCount = useMemo(() => getMaxHourCount(hourGrid), [hourGrid]);

  const maxDOW = useMemo(() => Math.max(...dowBreakdown.map((d) => d.avgHours), 0.1), [dowBreakdown]);

  const projectColor = useMemo(() => {
    if (selectedProject === '__all__') return 'var(--accent)';
    const project = projects.find((p) => p.id === selectedProject);
    return project?.color || 'var(--accent)';
  }, [selectedProject, projects]);

  const hasEnoughData = timeEntries.length >= 7;

  const handleCellClick = (cell: HeatmapCell, event: React.MouseEvent) => {
    if (cell.entries.length === 0) return;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const containerRect = gridRef.current?.getBoundingClientRect();
    if (containerRect) {
      setSelectedCellPos({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top,
      });
    } else {
      setSelectedCellPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setSelectedCell(cell);
  };

  if (loading) return (
    <div className="p-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />)}
      </div>
      <div className="h-16 rounded-[8px] bg-[var(--bg-secondary)] skeleton-pulse mb-4" />
      {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-[var(--bg-secondary)] rounded-[8px] skeleton-pulse mb-2" />)}
    </div>
  );

  return (
    <div className="p-6">
      <TabBar
        tab={tab}
        setTab={setTab}
        showHeatmap={showHeatmap}
      />
      <LoadError error={timeError} onRetry={() => loadTimeEntries()} />

      {tab === 'timer' ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <MetricCard label="Today" value={formatDuration(todaysMinutes)} color="gray" />
            <MetricCard label="This Week" value={formatDuration(weekMinutes)} color="gray" />
            <MetricCard label="Unbilled" value={formatDuration(unbilledMinutes)} subtext="billable hours" color={unbilledMinutes > 0 ? 'amber' : 'gray'} />
            <div
              onClick={() => {
                // Dispatch custom event so App.tsx's toggleTimer handles it
                document.dispatchEvent(new Event('lance:toggle-timer'));
              }}
              className="cursor-pointer"
            >
              <MetricCard
                label={activeTimer ? 'Timer Running' : 'Timer'}
                value={activeTimer ? formatDuration(activeTimer.elapsed) : 'Stopped'}
                subtext={activeTimer ? getProjectName(activeTimer.entry.project_id) : 'No active timer'}
                trend={activeTimer ? 'up' : 'neutral'}
                color={activeTimer ? 'green' : 'gray'}
              />
            </div>
          </div>

          {projects.length > 0 && clients.length > 0 && (
            <Card className="mb-6">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label htmlFor="time-entry-project" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project</label>
                  <select
                    id="time-entry-project"
                    value={entryForm.project_id}
                    onChange={(e) => {
                      const project = projects.find((p) => p.id === e.target.value);
                      setEntryForm({ ...entryForm, project_id: e.target.value, client_id: project?.client_id || '' });
                    }}
                    className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    disabled={!!activeTimer}
                    title={activeTimer ? 'Stop the running timer to change project' : 'Project'}
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
                    min={1}
                    max={10080}
                    value={durationMinutes || ''}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setDurationMinutes(Math.min(10080, Math.max(0, v)));
                    }}
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
              {projects.length === 0 ? (
                <>
                  <p className="text-[13px] text-[var(--text-secondary)] max-w-xs mb-5">
                    Time tracking runs on projects. Create your first project to start logging hours.
                  </p>
                  <Button onClick={() => navigate('/projects')} variant="secondary" size="sm">
                    <Plus size={14} /> Your first project
                  </Button>
                </>
              ) : (
                <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs mb-5">Start a timer or add entries manually.</p>
              )}
            </Card>
          ) : (
            <>
            <div className="space-y-2">
              {pagedEntries.visible.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[8px]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-[var(--text-primary)]">{getProjectName(entry.project_id)}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">--</span>
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
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${entry.billable ? 'bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] border-[var(--accent)]/20' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--neutral-border)]'}`}
                    >
                      {entry.billable ? 'billable' : 'non-billable'}
                    </button>
                    {entry.invoiced && <Badge variant="info">invoiced</Badge>}
                    <button
                      onClick={() => setConfirmDelete({ id: entry.id, description: entry.description || 'No description' })}
                      aria-label="Delete time entry"
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <MoreRows total={pagedEntries.total} shown={pagedEntries.visible.length} hasMore={pagedEntries.hasMore} showMore={pagedEntries.showMore} />
            </>
          )}
        </>
      ) : (
        /* ── Heatmap tab ── */
        <>
          {/* SECTION 2 · Streak Stats + SECTION 5 · Project Filter */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button aria-label="Previous"
                onClick={() => setHeatmapYear((y) => y - 1)}
                className="p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{heatmapYear}</span>
              <button aria-label="Next"
                onClick={() => setHeatmapYear((y) => Math.min(y + 1, now.getFullYear()))}
                className="p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                disabled={heatmapYear >= now.getFullYear()}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="__all__">All Projects</option>
              {projects.filter((p) => p.status === 'active').map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <MetricCard
              label="Current Streak"
              value={`${streakStats.currentStreak} day${streakStats.currentStreak !== 1 ? 's' : ''}`}
              color={streakStats.currentStreak > 0 ? 'green' : 'gray'}
            />
            <MetricCard
              label="Longest Streak"
              value={`${streakStats.longestStreak} day${streakStats.longestStreak !== 1 ? 's' : ''}`}
              color={streakStats.longestStreak > 0 ? 'green' : 'gray'}
            />
            <MetricCard
              label={`${heatmapYear} Total`}
              value={`${Math.round(streakStats.totalHoursThisYear)}h`}
              color="gray"
            />
            <MetricCard
              label="Best Day"
              value={streakStats.bestDayHours > 0 ? `${streakStats.bestDayHours.toFixed(1)}h` : '--'}
              subtext={streakStats.bestDayHours > 0 ? parseLocalDateKey(streakStats.bestDayDate).toLocaleDateString() : undefined}
              color={streakStats.bestDayHours > 0 ? 'purple' : 'gray'}
            />
            <MetricCard
              label="Top Month"
              value={streakStats.mostActiveMonth || '--'}
              subtext={streakStats.mostActiveMonth ? `${Math.round(streakStats.mostActiveMonthHours)}h` : undefined}
              color={streakStats.mostActiveMonth ? 'blue' : 'gray'}
            />
          </div>

          {/* SECTION 1 · Annual Heatmap */}
          <Card className="mb-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Activity Heatmap</h3>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">{streakStats.totalDays} day{streakStats.totalDays !== 1 ? 's' : ''} with logged time</p>

            {!hasEnoughData ? (
              <div className="text-center py-12 flex flex-col items-center">
                <Grid3X3 size={32} className="text-[var(--text-tertiary)] mb-3" />
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Not enough data yet</p>
                <p className="text-xs text-[var(--text-tertiary)] max-w-xs">
                  Start tracking time and check back after logging at least 7 days to see your patterns emerge.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto" ref={gridRef} style={{ position: 'relative' }}>
                <div className="flex" style={{ minWidth: 'fit-content' }}>
                  {/* Day labels */}
                  <div className="flex flex-col mr-2 pt-[18px]">
                    {DOW_LABELS_SPARSE.map((label, i) => (
                      <span
                        key={i}
                        className="text-[9px] text-[var(--text-tertiary)]"
                        style={{ height: '13px', lineHeight: '13px', marginBottom: '3px' }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>

                  <div>
                    {/* Month labels */}
                    <div className="flex mb-1" style={{ gap: '3px' }}>
                      {monthLabels.map((l, i) => (
                        <span
                          key={i}
                          className="text-[9px] text-[var(--text-tertiary)] overflow-hidden whitespace-nowrap"
                          style={{ width: `${l.spans * 13 + (l.spans - 1) * 3}px`, flexShrink: 0 }}
                        >
                          {l.month}
                        </span>
                      ))}
                    </div>

                    {/* Grid */}
                    <div className="mt-1">
                      {heatmapGrid.map((week, wi) => (
                        <div key={wi} className="flex" style={{ gap: '3px', marginBottom: '3px' }}>
                          {week.map((cell, di) => (
                            <div
                              key={di}
                              onClick={(e) => handleCellClick(cell, e)}
                              className="rounded-sm transition-colors hover:ring-1 hover:ring-[var(--text-primary)]/30"
                              style={{
                                width: '13px',
                                height: '13px',
                                backgroundColor: getIntensityColor(cell.hours),
                                cursor: cell.entries.length > 0 ? 'pointer' : 'default',
                              }}
                              title={cell.entries.length > 0 ? formatTooltip(cell) : undefined}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cell popover */}
                {selectedCell && selectedCellPos && (
                  <div
                    className="absolute z-20 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[10px] shadow-lg p-3 min-w-[220px]"
                    style={{
                      left: `${selectedCellPos.x}px`,
                      top: `${selectedCellPos.y + 20}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {DAY_NAMES_FULL[selectedCell.date.getDay()]}, {MONTHS_SHORT[selectedCell.date.getMonth()]} {selectedCell.date.getDate()}
                      </span>
                      <button aria-label="Close"
                        onClick={() => { setSelectedCell(null); setSelectedCellPos(null); }}
                        className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                      {selectedCell.hours.toFixed(1)}h logged · {selectedCell.billableHours.toFixed(1)}h billable
                    </p>
                    {selectedCell.entries.length > 0 && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {selectedCell.entries.map((entry) => (
                          <div key={entry.id} className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
                            <span className="truncate mr-2">{getProjectName(entry.project_id)}</span>
                            <span className="text-[var(--text-primary)] font-medium flex-shrink-0">
                              {entry.duration_minutes ? formatDuration(entry.duration_minutes) : '--'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--border-color)]">
              <span className="text-[9px] text-[var(--text-tertiary)]">Less</span>
              {INTENSITY_LEVELS.map((h) => (
                <div
                  key={h}
                  className="rounded-sm"
                  title={getHoursLabel(h)}
                  style={{
                    width: '13px',
                    height: '13px',
                    backgroundColor: getIntensityColor(h),
                  }}
                />
              ))}
              <span className="text-[9px] text-[var(--text-tertiary)]">More</span>
            </div>
          </Card>

          {/* SECTION 3 · Day of Week Breakdown */}
          <Card className="mb-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Day of Week</h3>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">Average hours per day of the week</p>
            <div className="flex items-end gap-3" style={{ height: '120px' }}>
              {dowBreakdown.map((bar) => (
                <div key={bar.dayIndex} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[var(--text-primary)] font-medium">
                    {bar.avgHours > 0 ? `${bar.avgHours.toFixed(1)}h` : '--'}
                  </span>
                  <div className="w-full flex-1 flex flex-col justify-end">
                    <div
                      className="w-full rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${maxDOW > 0 ? (bar.avgHours / maxDOW) * 100 : 0}%`,
                        minHeight: bar.avgHours > 0 ? '2px' : '0',
                        backgroundColor: projectColor,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)]">{bar.day}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* SECTION 4 · Hour of Day Heatmap */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Hour of Day</h3>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">When you clock in across the week</p>
            <div className="overflow-x-auto">
              <div className="flex" style={{ minWidth: 'fit-content' }}>
                {/* Hour labels */}
                <div className="flex flex-col mr-2 gap-[2px]">
                  <div style={{ height: '10px' }} />
                  {DAY_ABBREV.map((day, i) => (
                    <span key={i} className="text-[9px] text-[var(--text-tertiary)]" style={{ height: '14px', lineHeight: '14px' }}>
                      {day}
                    </span>
                  ))}
                </div>

                <div>
                  {/* Hour header labels */}
                  <div className="flex mb-1" style={{ gap: '2px' }}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <span
                        key={h}
                        className="text-[8px] text-[var(--text-tertiary)] text-center"
                        style={{ width: '18px' }}
                      >
                        {h % 3 === 0 ? formatHourLabel(h) : ''}
                      </span>
                    ))}
                  </div>

                  {/* Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {hourGrid.map((row, dayIdx) => (
                      <div key={dayIdx} className="flex" style={{ gap: '2px' }}>
                        {row.map((cell, hourIdx) => (
                          <div
                            key={hourIdx}
                            className="rounded-sm"
                            title={`${DAY_NAMES[cell.dayOfWeek]} ${formatHourLabel(cell.hour)} · ${cell.count} entr${cell.count !== 1 ? 'ies' : 'y'}`}
                            style={{
                              width: '18px',
                              height: '14px',
                              backgroundColor: maxHourCount > 0
                                ? `color-mix(in srgb, ${projectColor} ${Math.max(5, Math.round((cell.count / maxHourCount) * 100))}%, var(--color-surface-2, var(--bg-secondary)))`
                                : 'var(--color-surface-2, var(--bg-secondary))',
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
              <span className="text-[9px] text-[var(--text-tertiary)]">Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const count = Math.max(0, Math.round(maxHourCount * pct));
                return (
                  <div
                    key={pct}
                    className="rounded-sm"
                    title={count > 0 ? `${count} entries` : '0 entries'}
                    style={{
                      width: '18px',
                      height: '14px',
                      backgroundColor: maxHourCount > 0
                        ? `color-mix(in srgb, ${projectColor} ${Math.max(5, Math.round(pct * 100))}%, var(--color-surface-2, var(--bg-secondary)))`
                        : 'var(--color-surface-2, var(--bg-secondary))',
                    }}
                  />
                );
              })}
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
      <ArchetypeFeatureTabs screen="time" context={{ projectId: selectedProject !== '__all__' ? selectedProject : '' }} />
    </div>
  );
}
