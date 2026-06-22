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
      { id: 'active-projects', label: 'Active projects', query: null as any, format: 'count', color: 'blue' },
      { id: 'upcoming-milestones', label: 'Upcoming milestone invoice triggers', query: null as any, format: 'count', color: 'green' },
      { id: 'unbilled-hours', label: 'Unbilled hours', query: null as any, format: 'hours', color: 'amber' },
      { id: 'outstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
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

  aiPrompts: {
    dashboard: 'Analyze my project phases and flag any behind schedule.',
    time: 'Help me estimate phase duration based on past projects.',
    finance: 'Compare consultant costs across my projects.',
  },
};

export default architect;
