import type { ArchetypeConfig } from './types';

const architect: ArchetypeConfig = {
  id: 'architect',
  label: 'Architect / Interior Designer',
  emoji: '🏗️',
  tagline: 'The tool for people who measure success in phases completed',
  description: 'Built for architects and interior designers. Track project phases, consultants, and submissions.',
  psychProfile: 'Thinks in phases (SD/DD/CD/CA) and consultant coordination. Projects are long. Billing is milestone-based.',
  icon: 'Building2',
  theme: 'scale',

  dashboard: {
    greeting: "What's in design today?",
    subgreeting: 'Your phases, consultants, and submissions at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active projects', query: null, format: 'count', color: 'blue' },
      { id: 'upcomingMilestones', label: 'Upcoming milestone invoice triggers', query: null, format: 'count', color: 'green' },
      { id: 'unbilledHours', label: 'Unbilled hours', query: null, format: 'hours', color: 'amber' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'phase-gate-widget', component: 'PhaseGateWidget', priority: 1 },
      { id: 'submission-tracker-widget', component: 'SubmissionTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Site Visit', action: 'site-visit-log', icon: 'MapPin' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Drawings', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Phase Economics',
    panels: [
      { id: 'revenue-by-phase', title: 'Revenue by Phase', component: 'RevenueByPhasePanel', query: 'revenueByPhase', mode: 'quantitative', priority: 1 },
      { id: 'project-duration', title: 'Project Duration vs Budget', component: 'ProjectDurationPanel', query: 'projectDuration', mode: 'quantitative', priority: 2 },
      { id: 'consultant-cost', title: 'Consultant Cost Ratio', component: 'ConsultantCostPanel', query: 'consultantCost', mode: 'quantitative', priority: 3 },
      { id: 'phase-completion', title: 'Phase Completion Rates', component: 'PhaseCompletionPanel', query: 'phaseCompletion', mode: 'quantitative', priority: 4 },
      { id: 'milestone-invoice-timing', title: 'Milestone Invoice Timing', component: 'MilestoneInvoicePanel', query: 'milestoneInvoice', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'phase-gate-tracker', name: 'Phase Gate Tracker', description: 'Track SD/DD/CD/CA phases with completion %', component: 'PhaseGateTracker', injectInto: 'projects', position: 'panel' },
    { id: 'consultant-log', name: 'Consultant Log', description: 'Track external consultants and their fees', component: 'ConsultantLog', injectInto: 'projects', position: 'tab' },
    { id: 'submission-tracker', name: 'Submission Tracker', description: 'Log permit/agency submissions', component: 'SubmissionTracker', injectInto: 'projects', position: 'tab' },
    { id: 'revision-set-log', name: 'Revision Set Log', description: 'Log drawing revision sets', component: 'RevisionSetLog', injectInto: 'projects', position: 'panel' },
    { id: 'site-visit-log', name: 'Site Visit Log', description: 'Log site visits with observations', component: 'SiteVisitLog', injectInto: 'time', position: 'tab' },
  ],

  proposalTypes: ['flat', 'hourly', 'milestone'],
  defaultRateLabel: 'per hour',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Architectural Services Agreement',
      category: 'Architecture',
      body: '<h2>Architectural Services Agreement</h2>\n<p>This Architectural Services Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Architect").</p>\n<h3>1. Scope of Services</h3>\n<p>Architect will provide professional architectural services for: {scope}. Project: {project_name}. Location: {project_location}.</p>\n<h3>2. Phases & Deliverables</h3>\n<p>Schematic Design (SD): {sd_deliverables}. Design Development (DD): {dd_deliverables}. Construction Documents (CD): {cd_deliverables}. Construction Administration (CA): {ca_deliverables}.</p>\n<h3>3. Compensation</h3>\n<p>Total fee: $ {total_fee} ({fee_percentage}% of construction cost). Payment by phase: SD {sd_fee}%, DD {dd_fee}%, CD {cd_fee}%, CA {ca_fee}%.</p>\n<h3>3. Additional Services</h3>\n<p>Additional services (consultant coordination, revisions beyond scope, etc.) billed at $ {additional_services_rate}/hr or per Change Order.</p>\n<h3>4. Consultants</h3>\n<p>Architect coordinates structural, MEP, and civil consultants. Consultant fees paid by Client directly or reimbursed with {consultant_markup}% markup.</p>\n<h3>5. Term & Termination</h3>\n<p>Either party may terminate with {notice_period} days written notice. Architect paid for services rendered to termination date.</p>\n<h3>6. Copyright & License</h3>\n<p>Architect retains copyright. Client receives license to use drawings for the Project only.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{project_name}', '{project_location}', '{scope}', '{total_fee}', '{sd_deliverables}', '{dd_deliverables}', '{cd_deliverables}', '{ca_deliverables}', '{fee_percentage}', '{sd_fee}', '{dd_fee}', '{cd_fee}', '{ca_fee}', '{additional_services_rate}', '{consultant_markup}', '{notice_period}'],
    },
    {
      name: 'Interior Design Agreement',
      category: 'Interior Design',
      body: '<h2>Interior Design Agreement</h2>\n<p>This Interior Design Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Designer").</p>\n<h3>1. Scope</h3>\n<p>Designer will provide interior design services for: {scope}. Spaces: {spaces_list}. Style: {design_style}.</p>\n<h3>2. Services</h3>\n<p>Space planning, concept development, material/finish selections, FF&E specifications, procurement assistance, installation oversight.</p>\n<h3>3. Compensation</h3>\n<p>Design fee: $ {design_fee}. Procurement fee: {procurement_fee}% of purchased goods. Purchases billed at cost + {procurement_markup}%.</p>\n<h3>3. Phases</h3>\n<p>Programming/Concept {concept_phase_days} days. Design Development {dd_days} days. Procurement/Installation: {procurement_phase_weeks} weeks.</p>\n<h3>4. Revisions</h3>\n<p>Includes {included_revisions} revision rounds per phase. Additional revisions at $ {revision_rate}/hr.</p>\n<h3>5. Vendor Management</h3>\n<p>Designer specifies products. Client purchases directly or authorizes Designer to procure (with {purchasing_authority_limit} limit per item).</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{spaces_list}', '{design_style}', '{design_fee}', '{procurement_fee}', '{procurement_markup}', '{concept_phase_days}', '{dd_days}', '{procurement_phase_weeks}', '{included_revisions}', '{revision_rate}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my project phases and flag any behind schedule.',
    time: 'Help me estimate phase duration based on past projects.',
    finance: 'Compare consultant costs across my projects.',
  },
};

export default architect;
