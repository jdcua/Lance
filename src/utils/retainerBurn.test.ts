import { describe, it, expect } from 'vitest';
import { computeBurn, minutesByClient, currentMonthBounds } from './retainerBurn';

describe('retainer burn-down', () => {
  it('grades burn status at 80 and 100 percent', () => {
    expect(computeBurn(10, 300)).toEqual({
      hoursLogged: 5,
      percent: 50,
      overByHours: 0,
      status: 'ok',
    });
    expect(computeBurn(10, 480)).toEqual({
      hoursLogged: 8,
      percent: 80,
      overByHours: 0,
      status: 'watch',
    });
    expect(computeBurn(10, 600)).toEqual({
      hoursLogged: 10,
      percent: 100,
      overByHours: 0,
      status: 'over',
    });
    expect(computeBurn(10, 750)).toEqual({
      hoursLogged: 12.5,
      percent: 125,
      overByHours: 2.5,
      status: 'over',
    });
  });

  it('handles empty and invalid caps', () => {
    expect(computeBurn(0, 600)).toEqual({
      hoursLogged: 10,
      percent: 0,
      overByHours: 0,
      status: 'ok',
    });
    expect(computeBurn(10, 0)).toEqual({
      hoursLogged: 0,
      percent: 0,
      overByHours: 0,
      status: 'ok',
    });
  });

  it('totals minutes per client inside the month window', () => {
    const { start, end } = currentMonthBounds(new Date('2026-09-08T12:00:00Z'));
    const entries = [
      { client_id: 'a', start_time: '2026-09-02T10:00:00Z', duration_minutes: 60 },
      { client_id: 'a', start_time: '2026-09-03T10:00:00Z', duration_minutes: 30 },
      { client_id: 'b', start_time: '2026-09-04T10:00:00Z', duration_minutes: 45 },
      { client_id: 'a', start_time: '2026-08-20T10:00:00Z', duration_minutes: 999 },
      { client_id: 'b', start_time: '2026-09-05T10:00:00Z' },
    ];
    expect(minutesByClient(entries, start, end)).toEqual({ a: 90, b: 45 });
  });
});
