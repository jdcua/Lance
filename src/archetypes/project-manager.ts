import type { ArchetypeConfig } from './types';

const projectManager: ArchetypeConfig = {
  id: 'project-manager',
  label: 'Project Manager',
  emoji: '📋',
  tagline: 'The tool for people who measure success in milestones cleared',
  description: 'Built for project managers. Track timelines, dependencies, and resource allocation.',
  psychProfile: 'Thinks in timelines, dependencies, and resource allocation. Coordinates others. The timeline is sacred.',
  icon: 'GanttChart',
  theme: 'scale',

  dashboard: {
    greeting: "What's in flight?",
    subgreeting: 'Your projects, milestones, and resources at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active projects', query: null, format: 'count', color: 'blue' },
      { id: 'upcomingMilestones', label: 'Milestones due this week', query: null, format: 'count', color: 'purple' },
      { id: 'blockedTasks', label: 'Blocked tasks', query: null, format: 'count', color: 'red' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'timeline-widget', component: 'TimelineWidget', priority: 1 },
      { id: 'resource-allocation-widget', component: 'ResourceAllocationWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Add Milestone', action: '/projects', icon: 'Flag' },
      { label: 'Status Report', action: '/projects', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Project Velocity',
    panels: [
      { id: 'milestone-completion', title: 'Milestone Completion Rate', component: 'MilestoneCompletionPanel', query: 'milestoneCompletion', mode: 'quantitative', priority: 1 },
      { id: 'estimated-vs-actual', title: 'Estimated vs Actual Hours', component: 'EstimatedVsActualPanel', query: 'estimatedVsActual', mode: 'quantitative', priority: 2 },
      { id: 'project-duration', title: 'Project Duration vs Budget', component: 'ProjectDurationPanel', query: 'projectDuration', mode: 'quantitative', priority: 3 },
      { id: 'revenue-by-client', title: 'Revenue by Client', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 4 },
      { id: 'resource-utilization', title: 'Resource Utilization', component: 'ResourceUtilizationPanel', query: 'resourceUtilization', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'dependency-tracker', name: 'Dependency Tracker', description: 'Track task dependencies across projects', component: 'DependencyTracker', injectInto: 'projects', position: 'tab' },
    { id: 'resource-allocation', name: 'Resource Allocation', description: 'Allocate hours and track capacity', component: 'ResourceAllocation', injectInto: 'projects', position: 'panel' },
    { id: 'timeline-view', name: 'Timeline View', description: 'Visual project timeline with milestones', component: 'TimelineView', injectInto: 'projects', position: 'tab' },
    { id: 'status-report-generator', name: 'Status Report Generator', description: 'Generate client status reports', component: 'StatusReportGenerator', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'retainer'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my project portfolio and flag at-risk projects.',
    time: 'Help me estimate project durations based on past performance.',
    finance: 'Compare my project profitability and resource utilization.',
  },
};

export default projectManager;
