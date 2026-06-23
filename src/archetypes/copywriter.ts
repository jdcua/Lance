import type { ArchetypeConfig } from './types';

const copywriter: ArchetypeConfig = {
  id: 'copywriter',
  label: 'Copywriter / Content Writer',
  emoji: '📝',
  tagline: 'The tool for people who measure success in words that convert',
  description: 'Built for copywriters and content writers. Track words, content types, and brand voice.',
  psychProfile: 'Thinks in deliverables and conversion. More commercial focus than editorial writing.',
  icon: 'FileEdit',
  theme: 'craft',

  dashboard: {
    greeting: "What are you writing today?",
    subgreeting: 'Your words, content types, and rates at a glance.',
    metricCards: [
      { id: 'deadlinePressure', label: 'Deadlines in 7 days', query: null as any, format: 'count', color: 'red' },
      { id: 'activeProjectsCount', label: 'Active projects', query: null as any, format: 'count', color: 'purple' },
      { id: 'unbilledHours', label: 'Words pending (est)', query: null as any, format: 'hours', color: 'amber' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'deadline-board-widget', component: 'DeadlineBoardWidget', priority: 1 },
      { id: 'content-type-widget', component: 'ContentTypeWidget', priority: 2 },
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
    { id: 'assets', label: 'Swipe File', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Word Economics',
    panels: [
      { id: 'per-word-by-type', title: 'Per-Word Rate by Content Type', component: 'PerWordByTypePanel', query: 'perWordByType', mode: 'quantitative', priority: 1 },
      { id: 'words-per-month', title: 'Words per Month', component: 'WordsPerMonthPanel', query: 'wordsPerMonth', mode: 'quantitative', priority: 2 },
      { id: 'revenue-by-type', title: 'Revenue by Content Type', component: 'RevenueByTypePanel', query: 'revenueByType', mode: 'quantitative', priority: 3 },
      { id: 'approval-speed', title: 'Fastest vs Slowest Clients to Approve', component: 'ApprovalSpeedPanel', query: 'approvalSpeed', mode: 'qualitative', priority: 4 },
      { id: 'turnaround-by-type', title: 'Turnaround by Deliverable Type', component: 'TurnaroundByTypePanel', query: 'turnaroundByType', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'word-count-tracker', name: 'Word Count Tracker', description: 'Track word count per time entry', component: 'WordCountTracker', injectInto: 'time', position: 'panel' },
    { id: 'content-type-library', name: 'Content Type Library', description: 'Tag deliverables by type', component: 'ContentTypeLibrary', injectInto: 'projects', position: 'tab' },
    { id: 'brand-voice-notes', name: 'Brand Voice Notes', description: 'Store brand voice guidelines per client', component: 'BrandVoiceNotes', injectInto: 'clients', position: 'panel' },
    { id: 'cta-library', name: 'CTA Library', description: 'Personal swipe file for effective CTAs', component: 'CTALibrary', injectInto: 'assets', position: 'tab' },
    { id: 'ab-variant-log', name: 'A/B Variant Log', description: 'Log copy variants and performance', component: 'ABVariantLog', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['per-word', 'flat', 'hourly'],
  defaultRateLabel: 'per word',

  aiPrompts: {
    dashboard: 'Analyze my writing pipeline and suggest where I can increase my effective rate.',
    time: 'Help me estimate word count for similar past projects.',
    finance: 'Compare my per-word rate across content types.',
  },
};

export default copywriter;
