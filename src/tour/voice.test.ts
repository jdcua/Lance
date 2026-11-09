import { describe, it, expect } from 'vitest';
import {
  ARCHETYPE_VOICE,
  driveAxisFor,
  resolveVoice,
  getTourPlan,
  loadDrive,
  saveDrive,
} from './voice';
const ARCHETYPE_LIST = [{ id: 'developer' }, { id: 'consultant' }];

describe('tour voice engine', () => {
  it('covers every selectable archetype with a voice family', () => {
    for (const a of ARCHETYPE_LIST) {
      expect(
        ARCHETYPE_VOICE[a.id],
        `archetype "${a.id}" has no voice family`,
      ).toBeDefined();
    }
  });

  it('assigns drive axes only to ambiguous archetypes', () => {
    expect(driveAxisFor('recruiter')).toBe('deals');
    expect(driveAxisFor('real-estate')).toBe('deals');
    expect(driveAxisFor('musician')).toBe('feel');
    expect(driveAxisFor('voice-actor')).toBe('feel');
    expect(driveAxisFor('developer')).toBeNull();
    expect(driveAxisFor('designer')).toBeNull();
    expect(driveAxisFor('consultant')).toBeNull();
    expect(driveAxisFor('writer')).toBeNull();
  });

  it('resolves pure voices without a drive answer', () => {
    expect(resolveVoice('developer')).toEqual({ families: ['tempo'], tempo: 'terse' });
    expect(resolveVoice('consultant')).toEqual({ families: ['relationship'], tempo: 'warm' });
    expect(resolveVoice('writer')).toEqual({ families: ['pressure'], tempo: 'warm' });
    expect(resolveVoice('designer')).toEqual({ families: ['craft'], tempo: 'steady' });
    expect(resolveVoice('seo')).toEqual({ families: ['proof'], tempo: 'terse' });
    expect(resolveVoice('nope')).toEqual({ families: ['neutral'], tempo: 'steady' });
  });

  it('blends voices from the drive answer', () => {
    expect(resolveVoice('recruiter', { archetype: 'recruiter', axis: 'deals', value: -1 }))
      .toEqual({ families: ['tempo'], tempo: 'terse' });
    expect(resolveVoice('recruiter', { archetype: 'recruiter', axis: 'deals', value: 1 }))
      .toEqual({ families: ['relationship'], tempo: 'warm' });
    const mixed = resolveVoice('recruiter', { archetype: 'recruiter', axis: 'deals', value: 0 });
    expect(mixed.families).toContain('tempo');
    expect(mixed.families).toContain('relationship');
    expect(resolveVoice('musician', { archetype: 'musician', axis: 'feel', value: 1 }).families)
      .toEqual(['relationship']);
  });

  it('ignores stale or bogus drive answers', () => {
    // Answered as recruiter, now a developer: base voice wins.
    expect(resolveVoice('developer', { archetype: 'recruiter', axis: 'deals', value: 1 }))
      .toEqual({ families: ['tempo'], tempo: 'terse' });
    expect(resolveVoice('developer', { archetype: 'developer', axis: 'nope', value: 1 }))
      .toEqual({ families: ['tempo'], tempo: 'terse' });
  });

  it('builds a personalized tour plan from the archetype config', () => {
    const dev = getTourPlan('developer');
    expect(dev.greeting).toBe("What's shipping today?");
    expect(dev.stops.map((s) => s.id)).toEqual(['time', 'projects', 'finance']);
    expect(dev.actions[0]).toMatchObject({ label: 'Log Time' });

    const con = getTourPlan('consultant', {
      archetype: 'consultant',
      axis: 'deals',
      value: 1,
    });
    expect(con.greeting).toBe('Who are you serving today?');
    expect(con.stops.map((s) => s.id)).toEqual(['clients', 'finance', 'invoices']);
    expect(con.actions[0]).toMatchObject({ label: 'Log Session' });
    expect(con.actions.map((a) => a.label)).toContain('New Client');
  });

  it('persists the drive answer in localStorage', () => {
    localStorage.clear();
    expect(loadDrive()).toBeNull();
    saveDrive({ archetype: 'musician', axis: 'feel', value: 0 });
    expect(loadDrive()).toEqual({ archetype: 'musician', axis: 'feel', value: 0 });
    localStorage.clear();
  });
});
