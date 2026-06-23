import type { ArchetypeConfig } from './types';

const embedded: ArchetypeConfig = {
  id: 'embedded',
  label: 'Hardware / Embedded Engineer',
  emoji: '🔌',
  tagline: 'The tool for people who measure success in prototypes shipped',
  description: 'Built for hardware and embedded engineers. Track builds, components, and fabrication.',
  psychProfile: 'Thinks in schematics, BOMs, and fabrication runs. Components have lead times. Prototypes iterate fast.',
  icon: 'Cpu',
  theme: 'terminal',

  dashboard: {
    greeting: "What's on the bench?",
    subgreeting: 'Your builds, components, and fabrication at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active builds', query: null, format: 'count', color: 'blue' },
      { id: 'expensesTotal', label: 'Component cost this month', query: null, format: 'currency', color: 'amber' },
      { id: 'upcomingMilestones', label: 'Fabrication orders pending', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'bom-tracker-widget', component: 'BOMTrackerWidget', priority: 1 },
      { id: 'prototype-log-widget', component: 'PrototypeLogWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Build', action: '/projects', icon: 'FolderKanban' },
      { label: 'Add Component', action: '/finance', icon: 'Plus' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Builds', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'BOM Costs', icon: 'BarChart3', path: '/finance' },
    { id: 'assets', label: 'Schematics', icon: 'Package', path: '/assets' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Build Economics',
    panels: [
      { id: 'revenue-per-build', title: 'Revenue per Build', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 1 },
      { id: 'component-cost-ratio', title: 'Component Cost Ratio', component: 'ComponentCostPanel', query: 'componentCost', mode: 'quantitative', priority: 2 },
      { id: 'prototype-iterations', title: 'Prototype Iterations', component: 'PrototypeIterationsPanel', query: 'prototypeIterations', mode: 'quantitative', priority: 3 },
      { id: 'fabrication-lead-time', title: 'Fabrication Lead Time Impact', component: 'FabLeadTimePanel', query: 'fabLeadTime', mode: 'quantitative', priority: 4 },
      { id: 'revenue-by-type', title: 'Revenue by Build Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'bom-tracker', name: 'BOM Tracker', description: 'Bill of materials with costs and suppliers', component: 'BOMTracker', injectInto: 'projects', position: 'tab' },
    { id: 'prototype-log', name: 'Prototype Log', description: 'Log prototype versions and test results', component: 'PrototypeLog', injectInto: 'projects', position: 'panel' },
    { id: 'fabrication-tracker', name: 'Fabrication Tracker', description: 'Track fab orders and lead times', component: 'FabricationTracker', injectInto: 'finance', position: 'panel' },
    { id: 'component-inventory', name: 'Component Inventory', description: 'Track component stock and reorder points', component: 'ComponentInventory', injectInto: 'assets', position: 'tab' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my build pipeline and flag component availability risks.',
    time: 'Help me estimate build hours based on complexity.',
    finance: 'Compare BOM costs across similar builds.',
  },
};

export default embedded;
