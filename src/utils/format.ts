export function formatCurrency(amount: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Parse a date value for display. Date-only strings ("YYYY-MM-DD") are parsed
 * as LOCAL midnight — parsing them via `new Date()` treats them as UTC
 * midnight, which renders as the PREVIOUS day in negative-offset timezones
 * (e.g. "2026-07-01" -> "Jun 30" in UTC-6). Full ISO timestamps (with a "T")
 * keep their normal timezone-aware parsing.
 */
export function parseDateString(iso: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
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
    const absDays = Math.ceil(-diffMs / 86400000);
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
