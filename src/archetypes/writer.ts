import type { ArchetypeConfig } from './types';

const writer: ArchetypeConfig = {
  id: 'writer',
  label: 'Writer / Editor',
  emoji: '✍️',
  tagline: 'The tool for people who measure success in words published',
  description: 'Built for writers and editors. Track words, deadlines, and per-word rates.',
  psychProfile: 'Thinks in words and deadlines. Rate anxiety is real. Deadline pressure is the primary stress metric.',
  icon: 'Pen',
  theme: 'craft',

  dashboard: {
    greeting: 'What are you writing today?',
    subgreeting: 'Your words, deadlines, and rates at a glance.',
    metricCards: [
      { id: 'deadlinePressure', label: 'Deadlines in next 7 days', query: null as any, format: 'count', color: 'red' },
      { id: 'effectiveHourlyRate', label: 'Effective per-word rate', query: null as any, format: 'currency', color: 'blue' },
      { id: 'activeProjectsCount', label: 'Active projects', query: null as any, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'deadline-board-widget', component: 'DeadlineBoardWidget', priority: 1 },
      { id: 'word-tracker-widget', component: 'WordTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Time', action: '/time', icon: 'Clock' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'New Proposal', action: '/proposals/new', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'hybrid',
    headline: 'Word Economics',
    panels: [
      { id: 'words-per-month', title: 'Words Written per Month', component: 'WordsPerMonthPanel', query: 'wordsPerMonth', mode: 'quantitative', priority: 1 },
      { id: 'per-word-trend', title: 'Per-Word Rate Trend', component: 'PerWordTrendPanel', query: 'perWordTrend', mode: 'quantitative', priority: 2 },
      { id: 'deadline-adherence', title: 'Deadline Adherence %', component: 'DeadlineAdherencePanel', query: 'deadlineAdherence', mode: 'quantitative', priority: 3 },
      { id: 'revenue-by-type', title: 'Revenue by Content Type', component: 'RevenueByTypePanel', query: 'revenueByType', mode: 'quantitative', priority: 4 },
      { id: 'top-clients-words', title: 'Top Clients by Word Volume', component: 'TopClientsWordsPanel', query: 'topClientsWords', mode: 'qualitative', priority: 5 },
      { id: 'avg-turnaround', title: 'Avg Turnaround by Project Type', component: 'AvgTurnaroundPanel', query: 'avgTurnaround', mode: 'quantitative', priority: 6 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'word-tracker', name: 'Word Tracker', description: 'Add word count to time entries for per-word rate', component: 'WordTracker', injectInto: 'time', position: 'panel' },
    { id: 'deadline-board', name: 'Deadline Board', description: 'Projects sorted by due date with urgency colors', component: 'DeadlineBoard', injectInto: 'projects', position: 'tab' },
    { id: 'publication-log', name: 'Publication Log', description: 'Log where your work was published', component: 'PublicationLog', injectInto: 'projects', position: 'panel' },
    { id: 'style-guide', name: 'Style Guide', description: 'Store client style requirements', component: 'StyleGuide', injectInto: 'clients', position: 'panel' },
    { id: 'rate-benchmarking', name: 'Rate Benchmarking', description: 'Per-word rate trends over time', component: 'RateBenchmarking', injectInto: 'finance', position: 'panel' },
  ],

  proposalTypes: ['per-word', 'flat', 'hourly'],
  defaultRateLabel: 'per word',

  aiPrompts: {
    dashboard: 'Analyze my writing pipeline and flag approaching deadlines.',
    time: 'Help me estimate word counts for similar projects.',
    finance: 'Compare my per-word rate across clients and project types.',
  },
};

export default writer;
