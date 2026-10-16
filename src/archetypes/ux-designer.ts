import type { ArchetypeConfig } from './types';

const uxDesigner: ArchetypeConfig = {
  id: 'ux-designer',
  label: 'UX / UI Designer',
  emoji: '📱',
  tagline: 'The tool for people who measure success in handoffs shipped',
  description: 'Built for UX and UI designers. Track research, prototypes, and handoff quality.',
  psychProfile: 'Thinks in research → wireframe → prototype → test → handoff loops. Research hours are invisible but crucial.',
  icon: 'Layers',
  theme: 'studio',

  dashboard: {
    greeting: "What are you designing today?",
    subgreeting: 'Your research, prototypes, and handoffs at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active projects', query: null, format: 'count', color: 'purple' },
      { id: 'unbilledHours', label: 'Research hours this month', query: null, format: 'hours', color: 'blue' },
      { id: 'draftsCount', label: 'Draft proposals', query: null, format: 'count', color: 'amber' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'prototype-tracker-widget', component: 'PrototypeTrackerWidget', priority: 1 },
      { id: 'handoff-checklist-widget', component: 'HandoffChecklistWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Research', action: 'research-log', icon: 'Search' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'New Proposal', action: '/proposals/new', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'assets', label: 'Design Assets', icon: 'Package', path: '/assets' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'hybrid',
    headline: 'Design Process Health',
    panels: [
      { id: 'research-hours-ratio', title: 'Research Hours Ratio', component: 'ResearchHoursPanel', query: 'researchHours', mode: 'quantitative', priority: 1 },
      { id: 'prototype-iterations', title: 'Prototype Iterations per Project', component: 'PrototypeIterationsPanel', query: 'prototypeIterations', mode: 'quantitative', priority: 2 },
      { id: 'handoff-quality', title: 'Handoff Quality Score', component: 'HandoffQualityPanel', query: 'handoffQuality', mode: 'qualitative', priority: 3 },
      { id: 'revenue-by-type', title: 'Revenue by Project Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 4 },
      { id: 'time-per-phase', title: 'Time per Phase', component: 'TimePerPhasePanel', query: 'timePerPhase', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'research-log', name: 'Research Log', description: 'Log research activities with findings', component: 'ResearchLog', injectInto: 'time', position: 'tab' },
    { id: 'prototype-tracker', name: 'Prototype Tracker', description: 'Log prototypes with tool, fidelity, and feedback', component: 'PrototypeTracker', injectInto: 'projects', position: 'tab' },
    { id: 'usability-test-log', name: 'Usability Test Log', description: 'Log test sessions with issues found', component: 'UsabilityTestLog', injectInto: 'projects', position: 'panel' },
    { id: 'handoff-checklist', name: 'Handoff Checklist', description: 'Track handoff completeness', component: 'HandoffChecklist', injectInto: 'projects', position: 'panel' },
    { id: 'component-count', name: 'Component Count', description: 'Track components designed per project', component: 'ComponentCount', injectInto: 'projects', position: 'tab' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'UX/UI Design Agreement',
      category: 'UX/UI Design',
      body: '<h2>UX/UI Design Agreement</h2>\n<p>This UX/UI Design Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Designer").</p>\n<h3>1. Scope</h3>\n<p>Designer will design: {scope}. Deliverables: {deliverables_list} (user flows, wireframes, high-fidelity mockups, prototype, design system, handoff specs).</p>\n<h3>2. Process & Phases</h3>\n<p>Phase 1: Research & Discovery ({research_weeks} weeks). Phase 2: Wireframes & IA ({wireframe_weeks} weeks). Phase 3: Visual Design & Prototyping ({design_weeks} weeks). Phase 4: Handoff ({handoff_weeks} weeks).</p>\n<h3>2. Compensation</h3>\n<p>Total fee: $ {total_fee}. Payment: {deposit_percentage}% deposit, {milestone_percentage}% per phase, balance on handoff.</p>\n<h3>3. Revisions</h3>\n<p>Includes {included_revisions} revision rounds per phase. Additional revisions: $ {revision_rate}/round.</p>\n<h3>4. Handoff & Assets</h3>\n<p>Files delivered in {design_tool} (Figma/Sketch/Adobe XD). Includes: component library, tokens, annotations, prototype links. Source files retained by Designer unless purchased separately.</p>\n<h3>5. Rights</h3>\n<p>Client owns final designs upon full payment. Designer retains right to use for portfolio with attribution.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{deliverables_list}', '{research_weeks}', '{wireframe_weeks}', '{design_weeks}', '{handoff_weeks}', '{total_fee}', '{deposit_percentage}', '{milestone_percentage}', '{included_revisions}', '{revision_rate}', '{design_tool}'],
    },
    {
      name: 'UX Retainer Agreement',
      category: 'UX/UI Design',
      body: '<h2>UX Retainer Agreement</h2>\n<p>This UX Retainer Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Designer").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Designer reserves {hours_per_month} hours/month. Priority for sprint work, design system maintenance, ad-hoc research.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>2. Scope</h3>\n<p>Ongoing: feature design, design system updates, usability testing, design QA, handoff support.</p>\n<h3>3. Workflow</h3>\n<p>Sprint planning: {planning_day}. Design reviews: {review_day}. Handoff: {handoff_day}. Async feedback within {async_feedback_days} days.</p>\n<h3>4. Payment Terms</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days.</p>\n<h3>5. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{planning_day}', '{review_day}', '{handoff_day}', '{async_feedback_days}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my design process and suggest where I spend too much time.',
    proposals: 'Help me scope design projects based on past component counts.',
    finance: 'Compare my rates across design project types.',
  },
};

export default uxDesigner;
