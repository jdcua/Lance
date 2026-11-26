import { describe, it, expect } from 'vitest';
import {
  resolveDunningTone,
  generateFollowUpDraft,
  generateSubjectLine,
} from './followUpTemplates';

const DATA = {
  clientName: 'Acme',
  invoiceNumber: 'INV-1',
  amount: '$500',
  dueDate: '2026-08-01',
  daysElapsed: 7,
  freelancerName: 'Jo',
};

describe('smart dunning tones', () => {
  it('resolves tone from the archetype family', () => {
    expect(resolveDunningTone('developer')).toBe('direct');
    expect(resolveDunningTone('consultant')).toBe('warm');
    expect(resolveDunningTone('accountant')).toBe('formal');
    expect(resolveDunningTone('designer')).toBe('direct');
    expect(resolveDunningTone('writer')).toBe('warm');
    expect(resolveDunningTone(undefined)).toBe('warm');
    expect(resolveDunningTone('nope')).toBe('warm');
  });

  it('lets an explicit override win', () => {
    expect(resolveDunningTone('developer', 'formal')).toBe('formal');
    expect(resolveDunningTone('developer', 'auto')).toBe('direct');
  });

  it('renders tone variants for escalation stages only', () => {
    const direct = generateFollowUpDraft('invoice_day7', DATA, undefined, 'direct');
    const warm = generateFollowUpDraft('invoice_day7', DATA, undefined, 'warm');
    const plain = generateFollowUpDraft('invoice_day7', DATA);
    expect(direct).toContain('Please confirm payment status today');
    expect(warm).toContain('no worries at all');
    expect(plain).not.toBe(direct);
    expect(plain).toContain('Following up on invoice');

    const formalSubject = generateSubjectLine('invoice_day14', DATA, undefined, 'formal');
    expect(formalSubject).toContain('Final notice');
  });

  it('prefers custom user templates over tone variants', () => {
    const custom = { invoice_day7: 'CUSTOM {client_name}' };
    expect(generateFollowUpDraft('invoice_day7', DATA, custom, 'direct')).toBe('CUSTOM Acme');
    expect(generateSubjectLine('invoice_day7', DATA, { invoice_day7: 'SUB' }, 'formal')).toBe(
      'SUB',
    );
  });

  it('leaves non-escalation keys on the default voice', () => {
    const a = generateFollowUpDraft('invoice_day1', DATA, undefined, 'formal');
    const b = generateFollowUpDraft('invoice_day1', DATA);
    expect(a).toBe(b);
  });
});

describe('stage-4 work-paused escalation', () => {
  it('routes 30+ day invoices to stage 4 and invoice_day30', async () => {
    const { getStage, getTemplateKey } = await import('./followUpTemplates');
    expect(getStage('invoice', 29)).toBe(3);
    expect(getStage('invoice', 30)).toBe(4);
    expect(getTemplateKey('invoice', 29, 0)).toBe('invoice_day14');
    expect(getTemplateKey('invoice', 30, 0)).toBe('invoice_day30');
  });

  it('renders the day30 draft in every tone without placeholders leaking', async () => {
    const { generateFollowUpDraft } = await import('./followUpTemplates');
    for (const tone of [undefined, 'warm', 'direct', 'formal'] as const) {
      const draft = generateFollowUpDraft(
        'invoice_day30',
        { ...DATA, daysElapsed: 31 },
        undefined,
        tone,
      );
      expect(draft).toContain('INV-1');
      expect(draft).toContain('31');
      expect(draft).not.toMatch(/\{[a-z_]+\}/);
    }
  });
});
