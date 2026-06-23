/**
 * Follow-up template engine — generates draft messages from templates
 * with variable substitution. No AI, no API calls.
 */

export const DEFAULT_TEMPLATES: Record<string, string> = {
  proposal_day3: `Hi {client_name},

Just wanted to check in on the {proposal_title} proposal I sent over a few days ago. I know things get busy — no rush at all.

Happy to jump on a quick call if you have any questions or want to talk through anything.

Best,
{freelancer_name}`,

  proposal_day7: `Hi {client_name},

Following up on the {proposal_title} proposal I sent over last week. I put together a scope that I think would really move the needle for {project_name}.

If the timing isn't right or priorities have shifted, no worries at all — just let me know where your head's at and I can adjust.

Talk soon,
{freelancer_name}`,

  proposal_day14: `Hi {client_name},

I wanted to close the loop on the {proposal_title} proposal I sent your way a couple weeks back. Totally understand if things have changed — no pressure at all.

The offer is open whenever the timing is right. If another direction or format would work better, happy to rework it.

Wishing you well,
{freelancer_name}`,

  invoice_day1: `Hi {client_name},

Just a quick note that invoice {invoice_number} for {amount} was due on {due_date}. Totally possible it slipped through the cracks — happens to all of us.

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
  proposal_day3: 'Proposal — Day 3 (Friendly check-in)',
  proposal_day7: 'Proposal — Day 7 (Gentle nudge)',
  proposal_day14: 'Proposal — Day 14 (Final touch)',
  invoice_day1: 'Invoice — Day 1 overdue (Polite reminder)',
  invoice_day7: 'Invoice — Day 7 overdue (Firm reminder)',
  invoice_day14: 'Invoice — Day 14 overdue (Final notice)',
};

const _TEMPLATE_KEYS = Object.keys(DEFAULT_TEMPLATES);

function getDefaultTemplate(key: string): string {
  return DEFAULT_TEMPLATES[key] || '';
}

function getTemplate(key: string, customTemplates?: Record<string, string>): string {
  if (customTemplates && customTemplates[key]) return customTemplates[key];
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
 */
export function generateFollowUpDraft(
  templateKey: string,
  data: {
    clientName: string;
    proposalTitle?: string;
    invoiceNumber?: string;
    amount?: string;
    dueDate?: string;
    daysElapsed: number;
    projectName?: string;
    freelancerName: string;
  },
  customTemplates?: Record<string, string>
): string {
  const template = getTemplate(templateKey, customTemplates);
  let result = template;

  const vars: Record<string, string> = {
    '{client_name}': data.clientName,
    '{proposal_title}': data.proposalTitle || '',
    '{invoice_number}': data.invoiceNumber || '',
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

// Removed unused exports: getDefaultTemplateKeys(), getDefaultSettings()
