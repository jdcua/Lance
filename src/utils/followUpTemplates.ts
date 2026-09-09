/**
 * Follow-up template engine -- generates draft messages from templates
 * with variable substitution. No AI, no API calls.
 *
 * TODO v1.5: SMTP integration
 * Allow users to configure SMTP credentials (host, port, user, password, from address)
 * stored encrypted in SQLite. Use lettre (Rust SMTP crate) in lib.rs to send directly.
 * Remove mailto: approach, replace with Tauri command: send_email(to, subject, body)
 * This enables true auto-send without opening the mail client.
 */

import { sanitizeInvoiceNumber } from './invoiceNumber';
import { ARCHETYPE_VOICE } from '../tour/voice';

export type DunningTone = 'warm' | 'direct' | 'formal';

/**
 * Smart dunning (Pro): escalation drafts rewritten in the freelancer's
 * voice. Resolved from the archetype family unless overridden in Settings.
 * Free tiers always use the default templates below.
 */
const FAMILY_TONE: Record<string, DunningTone> = {
  tempo: 'direct',
  relationship: 'warm',
  craft: 'direct',
  proof: 'formal',
  pressure: 'warm',
  neutral: 'warm',
};

export function resolveDunningTone(
  profession?: string,
  override?: 'auto' | DunningTone,
): DunningTone {
  if (override && override !== 'auto') return override;
  if (!profession) return 'warm';
  return FAMILY_TONE[ARCHETYPE_VOICE[profession] || 'neutral'] || 'warm';
}

interface ToneVariant {
  body: string;
  subject: string;
}

const TONE_TEMPLATES: Record<DunningTone, Partial<Record<string, ToneVariant>>> = {
  warm: {
    invoice_day7: {
      body: `Hi {client_name},

Just checking in on invoice {invoice_number} for {amount}, due {due_date} ({days_elapsed} days ago). If it slipped through, no worries at all.

Just let me know it is on its way.

Thanks,
{freelancer_name}`,
      subject: 'Checking in: invoice {invoice_number}',
    },
    invoice_day14: {
      body: `Hi {client_name},

One last personal note on invoice {invoice_number} for {amount}, now {days_elapsed} days overdue. I value working with you and want to resolve this smoothly.

Can we wrap it up this week?

Thanks,
{freelancer_name}`,
      subject: 'One last note on invoice {invoice_number}',
    },
  },
  direct: {
    invoice_day7: {
      body: `Hi {client_name},

Invoice {invoice_number} for {amount} is now {days_elapsed} days past due (due {due_date}). Please confirm payment status today so we can close this out.

Thanks,
{freelancer_name}`,
      subject: 'Payment due: invoice {invoice_number} ({days_elapsed} days overdue)',
    },
    invoice_day14: {
      body: `Hi {client_name},

Final notice: invoice {invoice_number} for {amount} is {days_elapsed} days overdue. Please pay within 5 business days. If anything is disputed, tell me now so we can fix it.

Thanks,
{freelancer_name}`,
      subject: 'Final notice: invoice {invoice_number}',
    },
  },
  formal: {
    invoice_day7: {
      body: `Dear {client_name},

This is a formal reminder that invoice {invoice_number} for {amount}, due {due_date}, remains unpaid ({days_elapsed} days overdue). Please remit payment promptly or contact me to resolve any discrepancy.

Regards,
{freelancer_name}`,
      subject: 'Formal reminder: invoice {invoice_number}',
    },
    invoice_day14: {
      body: `Dear {client_name},

Final notice regarding invoice {invoice_number} for {amount}, now {days_elapsed} days overdue. Please remit within 5 business days. Further work will be paused until this is resolved.

Regards,
{freelancer_name}`,
      subject: 'Final notice: invoice {invoice_number} ({days_elapsed} days overdue)',
    },
  },
};

export const DEFAULT_TEMPLATES: Record<string, string> = {
  proposal_day3: `Hi {client_name},

Just wanted to check in on the {proposal_title} proposal I sent over a few days ago. I know things get busy -- no rush at all.

Happy to jump on a quick call if you have any questions or want to talk through anything.

Best,
{freelancer_name}`,

  proposal_day7: `Hi {client_name},

Following up on the {proposal_title} proposal I sent over last week. I put together a scope that I think would really move the needle for {project_name}.

If the timing isn't right or priorities have shifted, no worries at all -- just let me know where your head's at and I can adjust.

Talk soon,
{freelancer_name}`,

  proposal_day14: `Hi {client_name},

I wanted to close the loop on the {proposal_title} proposal I sent your way a couple weeks back. Totally understand if things have changed -- no pressure at all.

The offer is open whenever the timing is right. If another direction or format would work better, happy to rework it.

Wishing you well,
{freelancer_name}`,

  invoice_day1: `Hi {client_name},

Just a quick note that invoice {invoice_number} for {amount} was due on {due_date}. Totally possible it slipped through the cracks -- happens to all of us.

Let me know if you need anything on my end to get this processed.

Thanks,
{freelancer_name}`,

  invoice_day7: `Hi {client_name},

Following up on invoice {invoice_number} for {amount}, which was due on {due_date}. It's now {days_elapsed} days past due.

I want to make sure everything's in order on your end. If there's an issue with the invoice or if payment has already been sent, just let me know.

Appreciate it,
{freelancer_name}`,

  invoice_day14: `Hi {client_name},

This is a final note about invoice {invoice_number} for {amount}, which is now {days_elapsed} days overdue (due {due_date}).

I value our working relationship and want to resolve this smoothly. If there's a dispute or issue, please let me know. Otherwise, I'd appreciate getting this wrapped up this week.

All the best,
{freelancer_name}`,
};

export const TEMPLATE_LABELS: Record<string, string> = {
  proposal_day3: 'Proposal · Day 3 (Friendly check-in)',
  proposal_day7: 'Proposal · Day 7 (Gentle nudge)',
  proposal_day14: 'Proposal · Day 14 (Final touch)',
  invoice_day1: 'Invoice · Day 1 overdue (Polite reminder)',
  invoice_day7: 'Invoice · Day 7 overdue (Firm reminder)',
  invoice_day14: 'Invoice · Day 14 overdue (Final notice)',
};

export const DEFAULT_SUBJECT_TEMPLATES: Record<string, string> = {
  proposal_day3: 'Following up -- {proposal_title}',
  proposal_day7: 'Checking in -- {proposal_title}',
  proposal_day14: 'Closing the loop on {proposal_title}',
  invoice_day1: 'Invoice {invoice_number} -- Friendly Reminder',
  invoice_day7: 'Invoice {invoice_number} -- Reminder ({days_elapsed} days past due)',
  invoice_day14: 'Invoice {invoice_number} -- Final Notice ({days_elapsed} days overdue)',
};

function getDefaultTemplate(key: string): string {
  return DEFAULT_TEMPLATES[key] || '';
}

function getTemplate(key: string, customTemplates?: Record<string, string>, tone?: DunningTone): string {
  if (customTemplates && customTemplates[key]) return customTemplates[key];
  if (tone && TONE_TEMPLATES[tone][key]) return TONE_TEMPLATES[tone][key]!.body;
  return getDefaultTemplate(key);
}

/**
 * Get the template key for a given entity type and days elapsed.
 */
export function getTemplateKey(
  entityType: 'proposal' | 'invoice',
  daysElapsed: number,
  delayDays: number
): string | null {
  if (entityType === 'proposal') {
    const adjustedDays = daysElapsed - delayDays;
    if (adjustedDays >= 0 && adjustedDays < 4) return 'proposal_day3';
    if (adjustedDays >= 4 && adjustedDays < 10) return 'proposal_day7';
    if (adjustedDays >= 10) return 'proposal_day14';
    return null;
  }
  if (entityType === 'invoice') {
    if (daysElapsed >= 1 && daysElapsed < 4) return 'invoice_day1';
    if (daysElapsed >= 4 && daysElapsed < 10) return 'invoice_day7';
    if (daysElapsed >= 10) return 'invoice_day14';
    return null;
  }
  return null;
}

/**
 * Get the stage number for a given entity type and days elapsed.
 */
export function getStage(entityType: 'proposal' | 'invoice', daysElapsed: number): number {
  if (entityType === 'proposal') {
    if (daysElapsed < 4) return 1;
    if (daysElapsed < 10) return 2;
    return 3;
  }
  if (daysElapsed < 4) return 1;
  if (daysElapsed < 10) return 2;
  return 3;
}

/**
 * Generate a follow-up draft by substituting variables into a template.
 * Resolution order: custom user template, Pro tone variant, default.
 */
export interface FollowUpDraftData {
  clientName: string;
  proposalTitle?: string;
  invoiceNumber?: string;
  amount?: string;
  dueDate?: string;
  daysElapsed: number;
  projectName?: string;
  freelancerName: string;
}

function substituteVars(template: string, data: FollowUpDraftData): string {
  let result = template;
  const vars: Record<string, string> = {
    '{client_name}': data.clientName,
    '{proposal_title}': data.proposalTitle || '',
    '{invoice_number}': sanitizeInvoiceNumber(data.invoiceNumber || ''),
    '{amount}': data.amount || '',
    '{due_date}': data.dueDate || '',
    '{days_elapsed}': String(data.daysElapsed),
    '{project_name}': data.projectName || '',
    '{freelancer_name}': data.freelancerName,
  };

  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  return result;
}

export function generateFollowUpDraft(
  templateKey: string,
  data: FollowUpDraftData,
  customTemplates?: Record<string, string>,
  tone?: DunningTone,
): string {
  return substituteVars(getTemplate(templateKey, customTemplates, tone), data);
}

function getSubjectTemplate(key: string, customSubjectTemplates?: Record<string, string>, tone?: DunningTone): string {
  if (customSubjectTemplates && customSubjectTemplates[key]) return customSubjectTemplates[key];
  if (tone && TONE_TEMPLATES[tone][key]) return TONE_TEMPLATES[tone][key]!.subject;
  return DEFAULT_SUBJECT_TEMPLATES[key] || '';
}

export function generateSubjectLine(
  templateKey: string,
  data: FollowUpDraftData,
  customSubjectTemplates?: Record<string, string>,
  tone?: DunningTone,
): string {
  return substituteVars(getSubjectTemplate(templateKey, customSubjectTemplates, tone), data);
}

export function truncateForMailTo(body: string, maxLen = 1900): string {
  if (body.length <= maxLen) return body;
  return body.slice(0, maxLen - 30) + '\n\n(see full message below)';
}

export async function openMailTo(email: string, subject: string, body: string): Promise<void> {
  const truncated = truncateForMailTo(body);
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(truncated);
  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodedSubject}&body=${encodedBody}`;
  if (typeof window !== 'undefined' && !(window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
    // Browser mode: hand off to the default mail client directly
    window.location.href = mailtoUrl;
    return;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('open_mailto', { mailtoUrl });
}
