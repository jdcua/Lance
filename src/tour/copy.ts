import type { TourPlan, VoiceTempo } from './voice';

/** Pick the line matching the coach's tempo. */
export function speak(tempo: VoiceTempo, lines: Record<VoiceTempo, string>): string {
  return lines[tempo];
}

const STOP_LINES: Record<string, Record<VoiceTempo, string>> = {
  proposals: {
    terse: 'Proposals live here. Draft, send, watch them get viewed.',
    warm: 'This is where your proposals live, and where clients say yes.',
    steady: 'Proposals: draft them, send them, track when clients view them.',
  },
  contracts: {
    terse: 'Contracts. Templates, signing, done.',
    warm: 'Contracts without the paperwork dread. Templates do the heavy lifting.',
    steady: 'Contracts: reusable templates, client signing, everything filed.',
  },
  projects: {
    terse: 'Projects. Active work, milestones, one view.',
    warm: 'Your active work lives here, all in one calm place.',
    steady: 'Projects track active work and milestones in one view.',
  },
  time: {
    terse: 'Log time here. It feeds invoices directly.',
    warm: 'Your hours live here, and they flow straight into invoices.',
    steady: 'Time entries logged here flow directly into invoices.',
  },
  invoices: {
    terse: 'Invoices. Send, chase, get paid.',
    warm: 'Getting paid lives here, with gentle nudges when clients stall.',
    steady: 'Invoices: send them, track them, follow up until paid.',
  },
  clients: {
    terse: 'Clients. Every relationship, one record.',
    warm: 'Your people live here, with every interaction remembered.',
    steady: 'Clients keep contact details plus a full interaction log.',
  },
  finance: {
    terse: 'Finance. Money in, money out, forecast.',
    warm: 'The money picture, without spreadsheet dread.',
    steady: 'Finance covers expenses, income, and cash-flow forecast.',
  },
  insights: {
    terse: 'Insights. Your numbers, decoded.',
    warm: 'Your business telling you how it is doing.',
    steady: 'Insights turn your data into rates, forecasts, and win rates.',
  },
};

function stopLine(id: string, label: string, tempo: VoiceTempo): string {
  const known = STOP_LINES[id];
  if (known) return known[tempo];
  const fallback: Record<VoiceTempo, string> = {
    terse: `${label}. Part of your loop.`,
    warm: `${label} is part of your workflow, ready when you are.`,
    steady: `${label}: one of your core sections.`,
  };
  return fallback[tempo];
}

export interface SpotlightStep {
  kind: 'greeting' | 'stop' | 'action' | 'done';
  title: string;
  body: string;
  /** Element to spotlight via [data-tour="..."]. Undefined = centered card. */
  anchor?: string;
  /** Route to visit before showing this step. */
  path?: string;
  /** Quick action to run from the card CTA. */
  action?: { label: string; action: string };
  cta?: string;
}

/** Expand a TourPlan into concrete spotlight steps. */
export function buildSteps(plan: TourPlan): SpotlightStep[] {
  const tempo = plan.voice.tempo;
  const steps: SpotlightStep[] = [
    {
      kind: 'greeting',
      title: plan.greeting,
      body: speak(tempo, {
        terse: 'Sixty-second tour. Your loop, then your first win.',
        warm: 'Let me show you around. It will take about a minute.',
        steady: 'A short tour of your workspace, then your first action.',
      }),
      cta: 'Show me',
    },
  ];
  for (const stop of plan.stops) {
    steps.push({
      kind: 'stop',
      title: stop.label,
      body: stopLine(stop.id, stop.label, tempo),
      anchor: `nav-${stop.id}`,
      path: stop.path,
      cta: 'Next',
    });
  }
  for (const qa of plan.actions.slice(0, 3)) {
    steps.push({
      kind: 'action',
      title: qa.label,
      body: speak(tempo, {
        terse: 'Do it now. One click, real progress.',
        warm: 'Want to try it together? One click and you are started.',
        steady: 'Run this action now to make your first progress.',
      }),
      action: qa,
      cta: 'Try it',
    });
  }
  steps.push({
    kind: 'done',
    title: speak(tempo, {
      terse: 'Done. Go earn.',
      warm: 'You are all set. Go do great work.',
      steady: 'Tour complete. Your workspace is ready.',
    }),
    body: speak(tempo, {
      terse: 'Everything else reveals as you grow.',
      warm: 'New sections appear as your business grows. No clutter, ever.',
      steady: 'More sections unlock as you add data. The sidebar grows with you.',
    }),
    cta: 'Get started',
  });
  return steps;
}
