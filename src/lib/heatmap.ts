import type { TimeEntry } from '../types';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface HeatmapCell {
  date: Date;
  hours: number;
  billableHours: number;
  entries: TimeEntry[];
}

export interface HourCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface DOWBar {
  day: string;
  dayIndex: number;
  avgHours: number;
  totalHours: number;
  count: number;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalHoursThisYear: number;
  bestDayHours: number;
  bestDayDate: string;
  bestDayEntries: number;
  mostActiveMonth: string;
  mostActiveMonthHours: number;
  totalDays: number;
}

export interface MonthLabel {
  month: string;
  col: number;
  spans: number;
}

export function getDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parse a local date key (YYYY-MM-DD) as LOCAL midnight, not UTC (avoids off-by-one day). */
export function parseLocalDateKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

export function getIntensity(hours: number): number {
  if (hours <= 0) return 0;
  if (hours <= 1) return 1;
  if (hours <= 2) return 2;
  if (hours <= 4) return 3;
  if (hours <= 6) return 4;
  return 5;
}

export function getIntensityColor(hours: number): string {
  const level = getIntensity(hours);
  const accentVar = 'var(--accent)';
  const surfaceVar = 'var(--color-surface-2, var(--bg-secondary))';
  // Wider gradient so low vs high activity is visually distinct
  const opacity = [6, 22, 40, 60, 80, 100][level];
  return `color-mix(in srgb, ${accentVar} ${opacity}%, ${surfaceVar})`;
}

export function formatTooltip(cell: HeatmapCell): string {
  const d = cell.date;
  return `${DAY_NAMES_FULL[d.getDay()]} ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} — ${cell.hours.toFixed(1)}h logged (${cell.billableHours.toFixed(1)}h billable)`;
}

function getFirstSunday(year: number): Date {
  const d = new Date(year, 0, 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  return d;
}

export function computeHeatmapGrid(
  timeEntries: TimeEntry[],
  year: number,
  projectId?: string,
): HeatmapCell[][] {
  const filtered = projectId
    ? timeEntries.filter((t) => t.project_id === projectId)
    : timeEntries;

  const minutesByDay: Record<string, { minutes: number; billableMinutes: number; entries: TimeEntry[] }> = {};
  for (const t of filtered) {
    const key = getDateKey(new Date(t.start_time));
    if (!minutesByDay[key]) minutesByDay[key] = { minutes: 0, billableMinutes: 0, entries: [] };
    minutesByDay[key].minutes += (t.duration_minutes || 0);
    if (t.billable) minutesByDay[key].billableMinutes += (t.duration_minutes || 0);
    minutesByDay[key].entries.push(t);
  }

  const startDate = getFirstSunday(year);
  const now = new Date();
  const endDate = new Date(year, 11, 31);
  const lastDate = endDate > now ? now : endDate;

  const totalDays = Math.ceil((lastDate.getTime() - startDate.getTime()) / 86400000) + 1;
  const numWeeks = Math.ceil(totalDays / 7);

  const grid: HeatmapCell[][] = [];
  for (let w = 0; w < numWeeks; w++) {
    const week: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const key = getDateKey(cellDate);
      const day = minutesByDay[key];
      week.push({
        date: cellDate,
        hours: day ? day.minutes / 60 : 0,
        billableHours: day ? day.billableMinutes / 60 : 0,
        entries: day ? day.entries : [],
      });
    }
    grid.push(week);
  }

  return grid;
}

export function computeStreakStats(
  timeEntries: TimeEntry[],
  year: number,
): StreakStats {
  const minutesByDay: Record<string, { minutes: number; entries: number }> = {};
  for (const t of timeEntries) {
    const key = getDateKey(new Date(t.start_time));
    if (!minutesByDay[key]) minutesByDay[key] = { minutes: 0, entries: 0 };
    minutesByDay[key].minutes += (t.duration_minutes || 0);
    minutesByDay[key].entries += 1;
  }

  const sortedDates = Object.keys(minutesByDay)
    .filter((k) => minutesByDay[k].minutes > 0)
    .sort();

  const now = new Date();
  const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let currentStreak = 0;
  let cs = 0;
  for (let i = 0; i < 365; i++) {
    const key = getDateKey(checkDate);
    if (minutesByDay[key] && minutesByDay[key].minutes > 0) {
      cs++;
    } else {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }
  currentStreak = cs;

  const yearStart = parseLocalDateKey(`${year}-01-01`);
  const yearEnd = parseLocalDateKey(`${year + 1}-01-01`);
  const yearDates = sortedDates.filter((k) => {
    const d = parseLocalDateKey(k);
    return d >= yearStart && d < yearEnd;
  });

  let longestStreak = 0;
  let streak = 0;
  for (let i = 0; i < yearDates.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = parseLocalDateKey(yearDates[i - 1]);
      const curr = parseLocalDateKey(yearDates[i]);
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

  let hoursThisYear = 0;
  for (const key of yearDates) {
    hoursThisYear += minutesByDay[key].minutes / 60;
  }

  let bestDayHours = 0;
  let bestDayDate = '';
  let bestDayEntries = 0;
  for (const key of yearDates) {
    const day = minutesByDay[key];
    if (day.minutes / 60 > bestDayHours) {
      bestDayHours = day.minutes / 60;
      bestDayDate = key;
      bestDayEntries = day.entries;
    }
  }

  const monthlyHours: Record<string, number> = {};
  for (const key of yearDates) {
    const m = key.substring(0, 7);
    monthlyHours[m] = (monthlyHours[m] || 0) + minutesByDay[key].minutes / 60;
  }
  let mostActiveMonth = '';
  let mostActiveMonthHours = 0;
  for (const [m, h] of Object.entries(monthlyHours)) {
    if (h > mostActiveMonthHours) {
      mostActiveMonthHours = h;
      mostActiveMonth = m;
    }
  }
  if (mostActiveMonth) {
    const [y, mo] = mostActiveMonth.split('-').map(Number);
    mostActiveMonth = `${MONTHS_SHORT[mo - 1]} ${y}`;
  }

  return {
    currentStreak: cs,
    longestStreak,
    totalHoursThisYear: hoursThisYear,
    bestDayHours,
    bestDayDate,
    bestDayEntries,
    mostActiveMonth,
    mostActiveMonthHours,
    totalDays: sortedDates.length,
  };
}

export function computeDayOfWeekBreakdown(
  timeEntries: TimeEntry[],
  projectId?: string,
): DOWBar[] {
  const filtered = projectId
    ? timeEntries.filter((t) => t.project_id === projectId)
    : timeEntries;

  const byDay: { minutes: number; count: number }[] = Array.from({ length: 7 }, () => ({ minutes: 0, count: 0 }));
  const seenDays = new Set<string>();

  for (const t of filtered) {
    const d = new Date(t.start_time);
    const day = d.getDay();
    byDay[day].minutes += (t.duration_minutes || 0);
    byDay[day].count += 1;
    seenDays.add(getDateKey(new Date(t.start_time)));
  }

  const uniqueDays = seenDays.size || 1;
  const dowDays: Record<number, number> = {};
  for (const dk of seenDays) {
    const dw = parseLocalDateKey(dk).getDay();
    dowDays[dw] = (dowDays[dw] || 0) + 1;
  }

  return DAY_NAMES_SHORT.map((day, i) => ({
    day,
    dayIndex: i,
    avgHours: byDay[i].minutes / 60 / Math.max(dowDays[i] || 1, 1),
    totalHours: byDay[i].minutes / 60,
    count: byDay[i].count,
  }));
}

export function computeHourOfDayHeatmap(
  timeEntries: TimeEntry[],
  projectId?: string,
): HourCell[][] {
  const filtered = projectId
    ? timeEntries.filter((t) => t.project_id === projectId)
    : timeEntries;

  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));

  for (const t of filtered) {
    const d = new Date(t.start_time);
    const day = d.getDay();
    const hour = d.getHours();
    grid[day][hour]++;
  }

  return grid.map((hours, dayOfWeek) =>
    hours.map((count, hour) => ({
      dayOfWeek,
      hour,
      count,
    })),
  );
}

export function getMaxHourCount(hourGrid: HourCell[][]): number {
  let max = 0;
  for (const row of hourGrid) {
    for (const cell of row) {
      if (cell.count > max) max = cell.count;
    }
  }
  return max;
}

export function computeMonthLabels(
  grid: HeatmapCell[][],
): MonthLabel[] {
  const labels: MonthLabel[] = [];
  let lastMonth = -1;

  for (let w = 0; w < grid.length; w++) {
    const cell = grid[w]?.[0];
    if (cell) {
      const m = cell.date.getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        labels.push({ month: MONTHS_SHORT[m], col: w, spans: 1 });
      } else if (labels.length > 0) {
        labels[labels.length - 1].spans++;
      }
    }
  }

  return labels;
}

export function computeProjectColor(
  projectId: string | undefined,
  projects: { id: string; color?: string }[],
  defaultColor: string = 'var(--accent)',
): string {
  if (!projectId) return defaultColor;
  const project = projects.find((p) => p.id === projectId);
  if (project?.color) {
    return project.color;
  }
  return defaultColor;
}

export function getHoursLabel(hours: number): string {
  if (hours >= 0.01 && hours < 1) return '0–1h';
  if (hours >= 1 && hours < 2) return '1–2h';
  if (hours >= 2 && hours < 4) return '2–4h';
  if (hours >= 4 && hours < 6) return '4–6h';
  if (hours >= 6) return '6h+';
  return '0h';
}

export function formatHourLabel(hour: number): string {
  const ampm = hour < 12 ? 'AM' : 'PM';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h}${ampm}`;
}

export const INTENSITY_LEVELS = [0, 1, 2, 4, 6] as const;

export const DOW_LABELS_SPARSE = ['', 'M', '', 'W', '', 'F', ''] as const;
