/**
 * Local-first telemetry: product events recorded on this machine to help
 * THIS user (struggle detection, personal stats), never exfiltrated.
 *
 * Privacy contract, enforced by convention and tested below:
 * - No names, emails, amounts, notes, or free text. Ever.
 * - Only: event names, step indexes, counts, feature ids, timestamps.
 * - Capped ring buffer (200 events), user can view, export, or wipe it
 *   in Settings. There is no network call anywhere in this module.
 */

export type TelemetryEventName =
  | 'app_launch'
  | 'onboarding_step'
  | 'onboarding_done'
  | 'checklist_step_done'
  | 'validation_error'
  | 'empty_state_seen';

export interface TelemetryEvent {
  t: string;
  event: TelemetryEventName;
  /** Counts and ids only. Never names, emails, amounts, or free text. */
  data?: Record<string, string | number | boolean>;
}

const KEY = 'lance:telemetry';
const FIRED_KEY = 'lance:coach-fired';
const MAX_EVENTS = 200;

const FORBIDDEN_KEYS = ['name', 'email', 'amount', 'notes', 'body', 'subject', 'address', 'phone'];

function scrub(
  data?: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> | undefined {
  if (!data) return undefined;
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(data)) {
    if (FORBIDDEN_KEYS.includes(k.toLowerCase())) continue;
    if (typeof v === 'string' && (v.includes('@') || v.length > 64)) continue;
    clean[k] = v;
  }
  return clean;
}

export function recordTelemetry(
  event: TelemetryEventName,
  data?: Record<string, string | number | boolean>,
): void {
  try {
    const raw = localStorage.getItem(KEY);
    const events: TelemetryEvent[] = raw ? JSON.parse(raw) : [];
    events.push({ t: new Date().toISOString(), event, data: scrub(data) });
    localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* private mode: telemetry is best-effort */
  }
}

export function getTelemetryEvents(): TelemetryEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    const events = raw ? JSON.parse(raw) : [];
    return Array.isArray(events) ? events : [];
  } catch {
    return [];
  }
}

export function clearTelemetry(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(FIRED_KEY);
  } catch {
    /* private mode */
  }
}

export function eventCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of getTelemetryEvents()) {
    counts[e.event] = (counts[e.event] || 0) + 1;
  }
  return counts;
}

// ── Struggle rules: pure functions over the buffer ───────────────────────

export type CoachTipId = 'stalled_checklist' | 'repeat_validation' | 'overdue_no_followups';

export interface CoachContext {
  launches: number;
  checklistDone: number;
  checklistTotal: number;
  validationErrors: Record<string, number>;
  overdueCount: number;
  followUpsEnabled: boolean;
}

/** Which nudges fire, given context. Each id fires once ever (tracked). */
export function evaluateStruggle(ctx: CoachContext): CoachTipId[] {
  const tips: CoachTipId[] = [];
  if (ctx.launches >= 3 && ctx.checklistDone === 0 && ctx.checklistTotal > 0) {
    tips.push('stalled_checklist');
  }
  for (const count of Object.values(ctx.validationErrors)) {
    if (count >= 3) {
      tips.push('repeat_validation');
      break;
    }
  }
  if (ctx.overdueCount > 0 && !ctx.followUpsEnabled) {
    tips.push('overdue_no_followups');
  }
  return tips;
}

export function markTipFired(id: CoachTipId): void {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const fired: string[] = raw ? JSON.parse(raw) : [];
    if (!fired.includes(id)) {
      fired.push(id);
      localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
    }
  } catch {
    /* private mode */
  }
}

export function wasTipFired(id: CoachTipId): boolean {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const fired: string[] = raw ? JSON.parse(raw) : [];
    return fired.includes(id);
  } catch {
    return true;
  }
}
