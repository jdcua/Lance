import { describe, it, expect } from 'vitest';
import { getTourPlan } from './voice';
import { buildSteps, speak } from './copy';
import { ARCHETYPE_LIST } from '../archetypes';

describe('tour copy + steps', () => {
  it('speak picks the line for each tempo', () => {
    const lines = { terse: 't', warm: 'w', steady: 's' } as const;
    expect(speak('terse', lines)).toBe('t');
    expect(speak('warm', lines)).toBe('w');
    expect(speak('steady', lines)).toBe('s');
  });

  it('builds greeting + stops + actions + done for every archetype', () => {
    for (const a of ARCHETYPE_LIST) {
      const plan = getTourPlan(a.id, null);
      const steps = buildSteps(plan);
      expect(steps[0].kind).toBe('greeting');
      expect(steps[0].title).toBe(plan.greeting);
      expect(steps[steps.length - 1].kind).toBe('done');
      const stops = steps.filter((s) => s.kind === 'stop');
      expect(stops.length).toBe(plan.stops.length);
      for (const s of stops) {
        expect(s.anchor).toMatch(/^nav-/);
        expect(s.path).toBeTruthy();
      }
      const actions = steps.filter((s) => s.kind === 'action');
      expect(actions.length).toBe(Math.min(3, plan.actions.length));
    }
  });

  it('every step has a non-empty title, body, and CTA', () => {
    const steps = buildSteps(getTourPlan('designer', null));
    for (const s of steps) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
      expect(s.cta?.length).toBeGreaterThan(0);
    }
  });
});
