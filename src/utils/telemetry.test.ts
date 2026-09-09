import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordTelemetry,
  getTelemetryEvents,
  clearTelemetry,
  eventCounts,
  evaluateStruggle,
  markTipFired,
  wasTipFired,
} from './telemetry';

describe('local-first telemetry', () => {
  beforeEach(() => {
    clearTelemetry();
  });

  it('buffers events with a cap', () => {
    for (let i = 0; i < 250; i++) recordTelemetry('app_launch', { n: i });
    const events = getTelemetryEvents();
    expect(events).toHaveLength(200);
    expect(eventCounts()).toEqual({ app_launch: 200 });
  });

  it('scrubs anything resembling identity or money', () => {
    recordTelemetry('validation_error', { field: 'email', value: 'a@b.com' });
    recordTelemetry('pro_feature_used', { feature: 'forecast', name: 'Jo' });
    recordTelemetry('checklist_step_done', { step: 1, amount: 999 });
    for (const e of getTelemetryEvents()) {
      const flat = JSON.stringify(e);
      expect(flat).not.toContain('a@b.com');
      expect(flat).not.toContain('Jo');
      expect(flat).not.toContain('999');
      expect(e.data).not.toHaveProperty('value');
      expect(e.data).not.toHaveProperty('name');
      expect(e.data).not.toHaveProperty('amount');
    }
    expect(getTelemetryEvents()[0].data).toEqual({ field: 'email' });
  });

  it('survives corrupt storage', () => {
    localStorage.setItem('lance:telemetry', '[[broken');
    expect(getTelemetryEvents()).toEqual([]);
    expect(eventCounts()).toEqual({});
  });

  it('detects struggles without nagging twice', () => {
    expect(
      evaluateStruggle({
        launches: 4, checklistDone: 0, checklistTotal: 5,
        validationErrors: {}, overdueCount: 0, followUpsEnabled: true,
      }),
    ).toEqual(['stalled_checklist']);
    expect(
      evaluateStruggle({
        launches: 1, checklistDone: 0, checklistTotal: 5,
        validationErrors: { email: 4 }, overdueCount: 0, followUpsEnabled: true,
      }),
    ).toEqual(['repeat_validation']);
    expect(
      evaluateStruggle({
        launches: 10, checklistDone: 5, checklistTotal: 5,
        validationErrors: {}, overdueCount: 2, followUpsEnabled: false,
      }),
    ).toEqual(['overdue_no_followups']);
    expect(
      evaluateStruggle({
        launches: 10, checklistDone: 5, checklistTotal: 5,
        validationErrors: {}, overdueCount: 0, followUpsEnabled: true,
      }),
    ).toEqual([]);
    expect(wasTipFired('stalled_checklist')).toBe(false);
    markTipFired('stalled_checklist');
    expect(wasTipFired('stalled_checklist')).toBe(true);
  });
});
