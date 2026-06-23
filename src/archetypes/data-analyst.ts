import type { ArchetypeConfig } from './types';

const dataAnalyst: ArchetypeConfig = {
  id: 'data-analyst',
  label: 'Data Analyst / Researcher',
  emoji: '📈',
  tagline: 'The tool for people who measure success in insights delivered',
  description: 'Built for data analysts. Track datasets, analysis phases, and tool costs.',
  psychProfile: 'Thinks in datasets, deliverables, and tool costs. Tools and compute can be significant expenses.',
  icon: 'BarChart4',
  theme: 'terminal',

  dashboard: {
    greeting: "What's the data saying today?",
    subgreeting: 'Your datasets, phases, and tool costs at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active analyses', query: null as any, format: 'count', color: 'blue' },
      { id: 'thisWeeksHours', label: 'Hours this week', query: null as any, format: 'hours', color: 'green' },
      { id: 'expensesTotal', label: 'Tool costs this month', query: null as any, format: 'currency', color: 'amber' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'analysis-phase-widget', component: 'AnalysisPhaseWidget', priority: 1 },
      { id: 'dataset-log-widget', component: 'DatasetLogWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Analysis', action: '/time', icon: 'Clock' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Expense', action: '/finance', icon: 'BarChart3' },
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
    { id: 'assets', label: 'Datasets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Analysis Economics',
    panels: [
      { id: 'hours-per-phase', title: 'Hours per Analysis Phase', component: 'HoursPerPhasePanel', query: 'hoursPerPhase', mode: 'quantitative', priority: 1 },
      { id: 'tool-cost', title: 'Tool Cost vs Revenue', component: 'ToolCostPanel', query: 'toolCost', mode: 'quantitative', priority: 2 },
      { id: 'revenue-by-complexity', title: 'Revenue by Complexity Tier', component: 'RevenueByComplexityPanel', query: 'revenueByComplexity', mode: 'quantitative', priority: 3 },
      { id: 'project-duration', title: 'Project Duration vs Estimate', component: 'ProjectDurationPanel', query: 'projectDuration', mode: 'quantitative', priority: 4 },
      { id: 'deliverable-count', title: 'Deliverable Count per Project', component: 'DeliverableCountPanel', query: 'deliverableCount', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'dataset-log', name: 'Dataset Log', description: 'Log datasets used per project', component: 'DatasetLog', injectInto: 'projects', position: 'panel' },
    { id: 'tool-compute-log', name: 'Tool/Compute Log', description: 'Log tools and compute costs as expenses', component: 'ToolComputeLog', injectInto: 'finance', position: 'panel' },
    { id: 'analysis-phase-tracker', name: 'Analysis Phase Tracker', description: 'Track data phases per project', component: 'AnalysisPhaseTracker', injectInto: 'projects', position: 'panel' },
    { id: 'deliverable-log', name: 'Deliverable Log', description: 'Log analysis deliverables with version', component: 'DeliverableLog', injectInto: 'projects', position: 'tab' },
    { id: 'complexity-tagger', name: 'Complexity Tagger', description: 'Tag projects by analysis complexity', component: 'ComplexityTagger', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my analysis pipeline and suggest where I can reduce tool costs.',
    time: 'Help me estimate analysis hours based on data complexity.',
    finance: 'Compare my tool costs across projects and suggest optimizations.',
  },
};

export default dataAnalyst;
