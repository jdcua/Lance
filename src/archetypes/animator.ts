import type { ArchetypeConfig } from './types';

const animator: ArchetypeConfig = {
  id: 'animator',
  label: 'Animator / Motion Designer',
  emoji: '🎬',
  tagline: 'The tool for people who measure success in renders shipped',
  description: 'Purpose-built for animators and motion designers. Track phases, renders, and revision rounds.',
  psychProfile: 'Animators think in phases. Time is their currency. Render time is unbillable hell.',
  icon: 'Clapperboard',
  theme: 'motion',

  dashboard: {
    greeting: "What's in the pipeline?",
    subgreeting: 'Your projects, phases, and render time at a glance.',
    metricCards: [
      { id: 'thisWeeksHours', label: 'Hours on active projects this week', query: null, format: 'hours', color: 'green' },
      { id: 'activeProjectsWithHours', label: 'Most time-heavy project', query: null, format: 'text', color: 'blue' },
      { id: 'unbilledRenderHours', label: 'Unbilled render hours', query: null, format: 'hours', color: 'amber' },
      { id: 'upcomingMilestones', label: 'Upcoming milestones', query: null, format: 'count', color: 'purple' },
    ],
    widgets: [
      { id: 'project-phases', component: 'ProjectPhasesWidget', priority: 1 },
    ],
    quickActions: [
      { label: 'Log Render', action: 'render-log', icon: 'Monitor' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Time', action: '/time', icon: 'Clock' },
    ],
  },

  sidebar: [
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Utilization & Rate',
    panels: [
      { id: 'hours-per-phase', title: 'Hours per Project Phase', component: 'HoursPerPhasePanel', query: 'hoursPerPhase', mode: 'quantitative', priority: 1 },
      { id: 'render-vs-billable', title: 'Render Time vs Billable Time', component: 'RenderVsBillablePanel', query: 'renderVsBillable', mode: 'quantitative', priority: 2 },
      { id: 'revision-rounds', title: 'Revision Rounds per Client', component: 'RevisionRoundsPanel', query: 'revisionRounds', mode: 'quantitative', priority: 3 },
      { id: 'time-to-delivery', title: 'Time to Delivery per Project', component: 'TimeToDeliveryPanel', query: 'timeToDelivery', mode: 'quantitative', priority: 4 },
      { id: 'unbilled-trend', title: 'Unbilled Hours Trend', component: 'UnbilledTrendPanel', query: 'unbilledTrend', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'render-log', name: 'Render Log', description: 'Log render jobs separately from regular time entries', component: 'RenderLog', injectInto: 'time', position: 'tab' },
    { id: 'phase-tracker', name: 'Phase Tracker', description: 'Tag projects and time entries by production phase', component: 'PhaseTracker', injectInto: 'projects', position: 'panel' },
    { id: 'revision-counter', name: 'Revision Counter', description: 'Track revision rounds and warn at contract limits', component: 'RevisionCounter', injectInto: 'projects', position: 'panel' },
    { id: 'deliverable-log', name: 'Deliverable Log', description: 'Log deliverables with specs and approval status', component: 'DeliverableLog', injectInto: 'projects', position: 'tab' },
  ],

  proposalTypes: ['hourly', 'flat', 'project'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my animation pipeline and suggest where I might be losing time.',
    time: 'Help me estimate how long similar renders took last time.',
    finance: 'Compare my render time cost to my effective hourly rate.',
  },
};

export default animator;
