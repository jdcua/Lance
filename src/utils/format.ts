/** Milliseconds in one day. Date math app-wide uses fixed 24h days (not DST-aware). */
export const DAY_MS = 86400000;

export function formatCurrency(amount: number, currency = 'CAD'): string {
  // Corrupt imports and 0/0 math can produce non-finite amounts. Intl would
  // render "$NaN"/"$∞" — an em dash admits unknown instead of lying.
  if (typeof amount !== 'number' || !isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Parse a date value for display. Date-only strings ("YYYY-MM-DD") are parsed
 * as LOCAL midnight · parsing them via `new Date()` treats them as UTC
 * midnight, which renders as the PREVIOUS day in negative-offset timezones
 * (e.g. "2026-07-01" -> "Jun 30" in UTC-6). Full ISO timestamps (with a "T")
 * keep their normal timezone-aware parsing.
 */
export function parseDateString(iso: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
}

/**
 * Today's date as YYYY-MM-DD in LOCAL time. `new Date().toISOString()` is
 * UTC — in negative-offset timezones the evening hours already belong to
 * tomorrow, so date-input defaults would open on the wrong day.
 */
export function todayLocalISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  return parseDateString(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function relativeDate(iso: string): string {
  const date = parseDateString(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < -30) {
    const absDays = Math.ceil(-diffMs / DAY_MS);
    if (absDays <= 1) return 'tomorrow';
    if (absDays < 7) return `in ${absDays}d`;
    if (absDays < 30) return `in ${Math.floor(absDays / 7)}w`;
    return `in ${absDays}d`;
  }
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
