export type ProposalInputs = {
  clientName: string;
  projectType: string;
  scope: string;
  timeline: string;
  rate: number;
  rateType: 'flat' | 'hourly';
  currency: string;
  freelancerName: string;
  writingVoice?: string;
  tagline?: string;
  alwaysInclude?: string;
};

const approachByType: Record<string, string[]> = {
  'Brand identity': [
    'Discovery session to understand your brand values, audience, and competitive landscape',
    'Mood board and direction presentation before any design work begins',
    'Iterative design rounds with structured feedback cycles',
    'Final delivery of all assets in print and digital formats',
  ],
  'Web design': [
    'Sitemap and information architecture review',
    'Wireframes for all key pages before visual design begins',
    'High-fidelity mockups with responsive breakpoints',
    'Developer handoff with full asset export and style guide',
  ],
  Development: [
    'Technical scoping and architecture review before writing code',
    'Iterative builds with regular check-ins and demos',
    'Clean, documented code with version control throughout',
    'Deployment, testing, and handoff documentation',
  ],
  Consulting: [
    'Initial audit and gap analysis',
    'Structured recommendations report',
    'Implementation roadmap with prioritized actions',
    'Follow-up session to review progress and adjust',
  ],
  Photography: [
    'Pre-shoot consultation and creative brief',
    'Location or studio scouting and setup',
    'Full-resolution shoot with professional lighting',
    'Post-production editing and final delivery in agreed formats',
  ],
  'Video editing': [
    'Footage review and narrative structure planning',
    'Rough cut for timing and flow approval',
    'Fine cut with color grading, sound mix, and motion graphics',
    'Final export in requested formats with revision notes addressed',
  ],
  Animation: [
    'Storyboard and style frame approval',
    'Animatic with timing and motion direction',
    'Full animation production with feedback loops',
    'Final render in specified formats with source files',
  ],
  'SEO audit': [
    'Full site crawl and technical audit',
    'Keyword research and competitive analysis',
    'Prioritized recommendations with estimated impact',
    'Implementation guide and 30-day follow-up review',
  ],
  'Social media': [
    'Content strategy and platform audit',
    'Monthly content calendar with post concepts',
    'Asset creation and copywriting for each post',
    'Performance review and strategy adjustment each month',
  ],
  'Content writing': [
    'Topic research and outline approval',
    'First draft delivery for feedback',
    'Revision round incorporating your notes',
    'Final proofread and delivery in agreed format',
  ],
  default: [
    'Discovery phase to align on goals and success criteria',
    'Structured delivery with clear milestones and check-ins',
    'Revisions and refinement based on your feedback',
    'Final delivery and handoff',
  ],
};

const vaguePatterns = [
  { pattern: /as needed/i, warning: '"As needed" is vague \u2014 define a maximum revision count.' },
  { pattern: /unlimited/i, warning: '"Unlimited" revisions will cause scope creep. Set a number.' },
  { pattern: /and more/i, warning: '"And more" is open-ended. List everything explicitly.' },
  { pattern: /etc\b/i, warning: '"Etc." leaves scope undefined. Be specific.' },
  { pattern: /ongoing/i, warning: '"Ongoing" has no end date. Define a term or milestone.' },
  { pattern: /asap/i, warning: '"ASAP" is not a deadline. Set a specific date.' },
];

export type ScopeWarning = {
  pattern: string;
  warning: string;
};

export function checkScopeWarnings(scope: string): ScopeWarning[] {
  return vaguePatterns
    .filter((vp) => vp.pattern.test(scope))
    .map((vp) => ({ pattern: vp.pattern.source, warning: vp.warning }));
}

function getOpening(inputs: ProposalInputs): string {
  const voice = inputs.writingVoice?.toLowerCase() || '';
  const projectType = inputs.projectType || 'project';
  const clientName = inputs.clientName;

  const lines: string[] = [];

  if (inputs.tagline) {
    lines.push(inputs.tagline);
    lines.push('');
  }

  if (voice.includes('bold')) {
    lines.push(
      `I am the right person for ${clientName}'s ${projectType}. ` +
      `This proposal outlines exactly how I will deliver outstanding results \u2014 on time and within scope.`
    );
  } else if (voice.includes('direct')) {
    lines.push(
      `I have reviewed your requirements for the ${projectType} project and I am confident I can deliver exactly what ${clientName} needs. ` +
      `This proposal outlines my approach, timeline, and investment.`
    );
  } else if (voice.includes('warm')) {
    lines.push(
      `Thank you for trusting me with this ${projectType} project, ${clientName}. ` +
      `I have enjoyed our conversations and I am genuinely excited about the work ahead. ` +
      `Here is my plan for bringing your vision to life.`
    );
  } else {
    lines.push(
      `Thank you for the opportunity to work with ${clientName} on this ${projectType} project. ` +
      `Based on our conversation, I have a clear picture of what you need and I am confident I can deliver something exceptional.`
    );
  }

  return lines.join('\n');
}

function getApproach(projectType: string): string[] {
  const key = Object.keys(approachByType).find(
    (k) => k.toLowerCase() === projectType.toLowerCase()
  );
  return approachByType[key || 'default'] || approachByType.default;
}

function formatRate(rate: number, rateType: 'flat' | 'hourly', currency: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(rate);
  if (rateType === 'hourly') return `${formatted} per hour`;
  return `${formatted} flat project fee`;
}

export function generateProposalBody(inputs: ProposalInputs): string {
  const approach = getApproach(inputs.projectType);
  const opening = getOpening(inputs);
  const rateStr = formatRate(inputs.rate, inputs.rateType, inputs.currency);
  const freelancerName = inputs.freelancerName;

  const sections: string[] = [];

  // 1. Opening
  sections.push(opening);

  // 2. Understanding
  if (inputs.scope) {
    sections.push('');
    sections.push('Here is how I understand the project:');
    sections.push('');
    sections.push(inputs.scope);
    sections.push('');
    sections.push(
      'If anything here needs clarification, I am happy to discuss before we proceed.'
    );
  }

  // 3. Approach
  if (approach.length > 0) {
    sections.push('');
    sections.push('My approach:');
    sections.push('');
    for (const step of approach) {
      sections.push(`\u2022 ${step}`);
    }
  }

  // 4. Investment
  sections.push('');
  sections.push(
    `Investment: ${rateStr}`
  );
  if (inputs.timeline) {
    sections.push(`Timeline: ${inputs.timeline}`);
  }
  sections.push('');
  sections.push(
    'This proposal is valid for 14 days from the date above.'
  );
  sections.push(
    'To proceed, simply reply to confirm and I will send over a contract.'
  );

  // 5. Closing
  sections.push('');
  sections.push(
    `I am looking forward to working together. Please do not hesitate to reach out with any questions.`
  );
  sections.push('');
  sections.push(freelancerName);

  // Always-include context
  if (inputs.alwaysInclude) {
    sections.push('');
    sections.push(inputs.alwaysInclude);
  }

  return sections.join('\n');
}
