/**
 * Empty-state copy bank. Short, warm, a little witty, never cringe.
 * Variants rotate daily (day-of-year modulo) so repeated views don't repeat
 * the same line — personality without novelty decay problems, and no storage.
 */
export interface EmptyCopy {
  headline: string;
  sub: string;
}

const BANK: Record<string, EmptyCopy[]> = {
  invoices: [
    { headline: 'No invoices yet', sub: 'Money in transit starts here. Draft your first one.' },
    { headline: 'The till is quiet', sub: 'Create an invoice and give a client a reason to pay you.' },
    { headline: 'Zero paperwork, so far', sub: 'Your first invoice takes about a minute.' },
  ],
  projects: [
    { headline: 'No projects yet', sub: 'Every shipped thing starts as a row in this list.' },
    { headline: 'A very clean slate', sub: 'Add a project and Lance will keep its milestones honest.' },
    { headline: 'Nothing on the bench', sub: 'Create a project to start tracking work against it.' },
  ],
  clients: [
    { headline: 'No clients yet', sub: 'Everything in Lance starts with a client.' },
    { headline: 'Your roster awaits', sub: 'Add your first client and the rest of the app wakes up.' },
    { headline: 'Nobody on the books', sub: 'One client is all it takes to get going.' },
  ],
  expenses: [
    { headline: 'No expenses logged', sub: 'Coffee counts. So does software. Log it while you remember.' },
    { headline: 'Spending, but make it visible', sub: 'Record an expense and watch profit tell the truth.' },
    { headline: 'Nothing written off yet', sub: 'Future-you at tax time says thanks in advance.' },
  ],
  proposals: [
    { headline: 'No proposals out', sub: 'Sharpen one scope and send it. Quiet inboxes pay nothing.' },
    { headline: 'The pipeline is empty', sub: 'Draft a proposal — sent beats perfect.' },
    { headline: 'No pitches in flight', sub: 'Your next yes starts as a proposal here.' },
  ],
  contracts: [
    { headline: 'No contracts filed', sub: 'Handshakes are nice. Signed scopes are nicer.' },
    { headline: 'Nothing countersigned', sub: 'Pick a template and make the agreement real.' },
    { headline: 'The drawer is empty', sub: 'Generate a contract before the work starts, not after.' },
  ],
  time: [
    { headline: 'No time tracked', sub: 'Start the timer. Unbilled hours are donations.' },
    { headline: 'The clock is innocent', sub: 'Log an entry and stop giving work away for free.' },
    { headline: 'Zero hours on record', sub: 'Track as you go — reconstruction is a chore.' },
  ],
  followups: [
    { headline: 'Nothing to chase', sub: 'Sent proposals and overdue invoices will queue up here.' },
    { headline: 'All quiet on collections', sub: 'Enjoy it. Lance watches the due dates meanwhile.' },
    { headline: 'Inbox zero, follow-up zero', sub: 'When something goes quiet, the nudge appears here.' },
  ],
  assets: [
    { headline: 'No files attached', sub: 'Deliverables, receipts, references — park them here.' },
    { headline: 'The shelf is bare', sub: 'Attach a file to any record to start the library.' },
    { headline: 'Nothing filed away', sub: 'Drop a file in and it stops living in downloads.' },
  ],
  insights: [
    { headline: 'Not enough signal yet', sub: 'A few invoices and some logged time will light this up.' },
    { headline: 'Charts need data snacks', sub: 'Feed it projects and payments; insights follow.' },
    { headline: 'Quiet analytics', sub: 'Keep working — this screen gets smarter as you do.' },
  ],
  search: [
    { headline: 'No matches', sub: 'Try fewer words, or check the spelling and try again.' },
    { headline: 'The archive shrugs', sub: 'Different keywords sometimes find what exact ones miss.' },
    { headline: 'Nothing by that name', sub: 'Search clients, projects, invoices and more above.' },
  ],
  generic: [
    { headline: 'Nothing here yet', sub: 'This space fills in as you work.' },
    { headline: 'A blank page, politely', sub: 'Add something and it will show up here.' },
    { headline: 'Empty — for now', sub: 'The first entry is the hardest. It gets easier.' },
  ],
};

export function getEmptyCopy(screen: string): EmptyCopy {
  const variants = BANK[screen] || BANK.generic;
  const now = new Date();
  const day = Math.floor(now.getTime() / 86400000);
  return variants[((day % variants.length) + variants.length) % variants.length];
}
