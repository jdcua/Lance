import type { ArchetypeConfig } from './types';

const recruiter: ArchetypeConfig = {
  id: 'recruiter',
  label: 'Recruiter / Talent Agent',
  emoji: '🤝',
  tagline: 'The tool for people who measure success in placements made',
  description: 'Built for recruiters and talent agents. Track candidates, placements, and client relationships.',
  psychProfile: 'Thinks in pipelines, placements, and commissions. Every placement is a closed deal. Pipeline velocity is everything.',
  icon: 'Handshake',
  theme: 'scale',

  dashboard: {
    greeting: "Who's in the pipeline?",
    subgreeting: 'Your candidates, placements, and commissions at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active searches', query: null, format: 'count', color: 'blue' },
      { id: 'upcomingMilestones', label: 'Candidates in final stage', query: null, format: 'count', color: 'green' },
      { id: 'clientsCount', label: 'Active clients', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'pipeline-widget', component: 'PipelineWidget', priority: 1 },
      { id: 'placement-tracker-widget', component: 'PlacementTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Search', action: '/projects', icon: 'FolderKanban' },
      { label: 'New Client', action: '/clients', icon: 'Users' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Searches', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Placement Economics',
    panels: [
      { id: 'placement-rate', title: 'Placement Rate', component: 'PlacementRatePanel', query: 'placementRate', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-placement', title: 'Revenue per Placement', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 2 },
      { id: 'time-to-fill', title: 'Time to Fill Trend', component: 'TimeToFillPanel', query: 'timeToFill', mode: 'quantitative', priority: 3 },
      { id: 'pipeline-velocity', title: 'Pipeline Velocity', component: 'PipelineVelocityPanel', query: 'pipelineVelocity', mode: 'quantitative', priority: 4 },
      { id: 'client-retention', title: 'Client Retention Rate', component: 'RetentionRatePanel', query: 'retentionRate', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'candidate-pipeline', name: 'Candidate Pipeline', description: 'Track candidates through hiring stages', component: 'CandidatePipeline', injectInto: 'projects', position: 'tab' },
    { id: 'placement-log', name: 'Placement Log', description: 'Log completed placements with fees', component: 'PlacementLog', injectInto: 'projects', position: 'panel' },
    { id: 'commission-calculator', name: 'Commission Calculator', description: 'Calculate earned commissions', component: 'CommissionCalculator', injectInto: 'finance', position: 'panel' },
    { id: 'client-search-tracker', name: 'Client Search Tracker', description: 'Track active searches per client', component: 'ClientSearchTracker', injectInto: 'clients', position: 'tab' },
  ],

  proposalTypes: ['commission-based', 'retainer', 'flat'],
  defaultRateLabel: 'per placement',

  aiPrompts: {
    dashboard: 'Analyze my pipeline and flag at-risk searches.',
    time: 'Help me estimate time-to-fill for similar role types.',
    finance: 'Compare my commission rates across placement types.',
  },
};

export default recruiter;
