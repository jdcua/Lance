import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

beforeEach(() => {
  localStorage.clear();
  useStore.setState({
    followUpSettings: { enabled: true, proposal_delay_days: 3, invoice_delay_days: 0, templates: {}, subject_templates: {} },
  } as never);
});

describe('follow-up settings hardening', () => {
  it('falls back to defaults with no stored settings', () => {
    useStore.getState().loadFollowUpSettings();
    const s = useStore.getState().followUpSettings;
    expect(s.proposal_delay_days).toBe(3);
    expect(s.enabled).toBe(true);
  });

  it('sanitizes hand-edited garbage instead of trusting it', () => {
    localStorage.setItem('lance:follow-up-settings', JSON.stringify({
      enabled: 'yes',
      proposal_delay_days: -5,
      invoice_delay_days: 'soon',
      tone: 'yolo',
      templates: { a: 1, b: 'ok' },
      subject_templates: null,
    }));
    useStore.getState().loadFollowUpSettings();
    const s = useStore.getState().followUpSettings;
    expect(s.enabled).toBe(true);
    expect(s.proposal_delay_days).toBe(1);
    expect(s.invoice_delay_days).toBe(0);
    expect(s.tone).toBeUndefined();
    expect(s.templates).toEqual({ b: 'ok' });
    expect(s.subject_templates).toEqual({});
  });

  it('clamps out-of-range numbers into bounds', () => {
    localStorage.setItem('lance:follow-up-settings', JSON.stringify({
      proposal_delay_days: 9999,
      invoice_delay_days: 45,
      tone: 'formal',
    }));
    useStore.getState().loadFollowUpSettings();
    const s = useStore.getState().followUpSettings;
    expect(s.proposal_delay_days).toBe(30);
    expect(s.invoice_delay_days).toBe(30);
    expect(s.tone).toBe('formal');
  });

  it('ignores corrupt JSON entirely', () => {
    localStorage.setItem('lance:follow-up-settings', '{broken');
    useStore.getState().loadFollowUpSettings();
    expect(useStore.getState().followUpSettings.proposal_delay_days).toBe(3);
  });
});
