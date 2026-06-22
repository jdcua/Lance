import type { ArchetypeConfig } from './types';

const filmmaker: ArchetypeConfig = {
  id: 'filmmaker',
  label: 'Filmmaker / Videographer',
  emoji: '🎥',
  tagline: 'The tool for people who measure success in final cuts delivered',
  description: 'Built for filmmakers and videographers. Track production phases, crew, and deliverables.',
  psychProfile: 'Thinks in production phases. Pre-production planning, production chaos, post-production grind.',
  icon: 'Film',
  theme: 'lens',

  dashboard: {
    greeting: "What's in pre-pro?",
    subgreeting: 'Your productions, shoots, and post-production at a glance.',
    metricCards: [
      { id: 'active-projects', label: 'Active productions', query: null as any, format: 'count', color: 'blue' },
      { id: 'days-until-shoot', label: 'Days until next shoot', query: null as any, format: 'text', color: 'purple' },
      { id: 'unbilled-hours', label: 'Post hours remaining (est)', query: null as any, format: 'hours', color: 'amber' },
      { id: 'outstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'production-phase-widget', component: 'ProductionPhaseWidget', priority: 1 },
      { id: 'shot-list-widget', component: 'ShotListWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Shoot', action: 'shoot-log', icon: 'Camera' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Add Expense', action: '/finance', icon: 'BarChart3' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Production Economics',
    panels: [
      { id: 'hours-per-phase', title: 'Hours per Production Phase', component: 'HoursPerPhasePanel', query: 'hoursPerPhase', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-type', title: 'Revenue per Project Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 2 },
      { id: 'expense-ratio', title: 'Expense Ratio (Crew+Equipment vs Revenue)', component: 'ExpenseRatioPanel', query: 'expenseRatio', mode: 'quantitative', priority: 3 },
      { id: 'delivery-turnaround', title: 'Delivery Turnaround', component: 'DeliveryTurnaroundPanel', query: 'deliveryTurnaround', mode: 'quantitative', priority: 4 },
      { id: 'cut-revision-rounds', title: 'Cut Revision Rounds', component: 'CutRevisionRoundsPanel', query: 'cutRevisionRounds', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'production-phase-tracker', name: 'Production Phase Tracker', description: 'Track pre/production/post/delivery phases', component: 'ProductionPhaseTracker', injectInto: 'projects', position: 'panel' },
    { id: 'shot-list', name: 'Shot List', description: 'Log shots with status per project', component: 'ShotList', injectInto: 'projects', position: 'tab' },
    { id: 'crew-equipment-log', name: 'Crew & Equipment Log', description: 'Track crew and equipment as expenses', component: 'CrewEquipmentLog', injectInto: 'finance', position: 'panel' },
    { id: 'cut-tracker', name: 'Cut Tracker', description: 'Log video cuts delivered', component: 'CutTracker', injectInto: 'projects', position: 'tab' },
    { id: 'deliverable-specs', name: 'Deliverable Specs', description: 'Define deliverable specs per project', component: 'DeliverableSpecs', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my production pipeline and suggest where phases are taking too long.',
    time: 'Help me estimate post-production hours based on shoot duration.',
    finance: 'Compare crew and equipment costs across my projects.',
  },
};

export default filmmaker;
