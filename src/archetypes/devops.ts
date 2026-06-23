import type { ArchetypeConfig } from './types';

const devops: ArchetypeConfig = {
  id: 'devops',
  label: 'DevOps / SRE',
  emoji: '⚙️',
  tagline: 'The tool for people who measure success in uptime maintained',
  description: 'Built for DevOps engineers and SREs. Track infrastructure, incidents, and SLA compliance.',
  psychProfile: 'Thinks in infrastructure, pipelines, and incident response. Every minute of downtime is measured. Automation hours pay back forever.',
  icon: 'Server',
  theme: 'terminal',

  dashboard: {
    greeting: "What's running?",
    subgreeting: 'Your infrastructure, incidents, and automation at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active engagements', query: null as any, format: 'count', color: 'blue' },
      { id: 'thisWeeksHours', label: 'Hours this week', query: null as any, format: 'hours', color: 'green' },
      { id: 'unbilledHours', label: 'Incident response hours', query: null as any, format: 'hours', color: 'red' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'infra-health-widget', component: 'InfraHealthWidget', priority: 1 },
      { id: 'automation-tracker-widget', component: 'AutomationTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Incident', action: '/time', icon: 'AlertCircle' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Infra Economics',
    panels: [
      { id: 'incident-response-time', title: 'Incident Response Time', component: 'IncidentResponsePanel', query: 'incidentResponse', mode: 'quantitative', priority: 1 },
      { id: 'automation-roi', title: 'Automation Hours Saved', component: 'AutomationROIPanel', query: 'automationROI', mode: 'quantitative', priority: 2 },
      { id: 'revenue-per-client', title: 'Revenue per Client', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 3 },
      { id: 'retainer-utilization', title: 'Retainer Utilization', component: 'RetainerUtilizationPanel', query: 'retainerUtilization', mode: 'quantitative', priority: 4 },
      { id: 'tool-cost', title: 'Tool & Infra Cost Ratio', component: 'ToolCostPanel', query: 'toolCost', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'incident-log', name: 'Incident Log', description: 'Log incidents with severity and resolution', component: 'IncidentLog', injectInto: 'time', position: 'tab' },
    { id: 'automation-tracker', name: 'Automation Tracker', description: 'Track time saved by automation scripts', component: 'AutomationTracker', injectInto: 'projects', position: 'panel' },
    { id: 'infra-dashboard', name: 'Infrastructure Dashboard', description: 'Track client infrastructure details', component: 'InfraDashboard', injectInto: 'clients', position: 'panel' },
    { id: 'sla-tracker', name: 'SLA Tracker', description: 'Track SLA compliance per client', component: 'SLATracker', injectInto: 'clients', position: 'tab' },
  ],

  proposalTypes: ['hourly', 'retainer', 'flat'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my incident patterns and suggest automation opportunities.',
    time: 'Help me estimate automation hours vs manual time.',
    finance: 'Compare my retainer rates against incident response overhead.',
  },
};

export default devops;
