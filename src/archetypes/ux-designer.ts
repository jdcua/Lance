import type { ArchetypeConfig } from './types';

const uxDesigner: ArchetypeConfig = {
  id: 'ux-designer',
  label: 'UX / UI Designer',
  emoji: '📱',
  tagline: 'The tool for people who measure success in handoffs shipped',
  description: 'Built for UX and UI designers. Track research, prototypes, and handoff quality.',
  psychProfile: 'Thinks in research → wireframe → prototype → test → handoff loops. Research hours are invisible but crucial.',
  icon: 'Layers',
  theme: 'studio',

  dashboard: {
    greeting: "What are you designing today?",
    subgreeting: 'Your research, prototypes, and handoffs at a glance.',
    metricCards: [
      { id: 'active-projects', label: 'Active projects', query: null as any, format: 'count', color: 'purple' },
      { id: 'unbilled-hours', label: 'Research hours this month', query: null as any, format: 'hours', color: 'blue' },
      { id: 'draft-proposals', label: 'Draft proposals', query: null as any, format: 'count', color: 'amber' },
      { id: 'outstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'prototype-tracker-widget', component: 'PrototypeTrackerWidget', priority: 1 },
      { id: 'handoff-checklist-widget', component: 'HandoffChecklistWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Research', action: 'research-log', icon: 'Search' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'New Proposal', action: '/proposals/new', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'assets', label: 'Design Assets', icon: 'Package', path: '/assets' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'hybrid',
    headline: 'Design Process Health',
    panels: [
      { id: 'research-hours-ratio', title: 'Research Hours Ratio', component: 'ResearchHoursPanel', query: 'researchHours', mode: 'quantitative', priority: 1 },
      { id: 'prototype-iterations', title: 'Prototype Iterations per Project', component: 'PrototypeIterationsPanel', query: 'prototypeIterations', mode: 'quantitative', priority: 2 },
      { id: 'handoff-quality', title: 'Handoff Quality Score', component: 'HandoffQualityPanel', query: 'handoffQuality', mode: 'qualitative', priority: 3 },
      { id: 'revenue-by-type', title: 'Revenue by Project Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 4 },
      { id: 'time-per-phase', title: 'Time per Phase', component: 'TimePerPhasePanel', query: 'timePerPhase', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'research-log', name: 'Research Log', description: 'Log research activities with findings', component: 'ResearchLog', injectInto: 'time', position: 'tab' },
    { id: 'prototype-tracker', name: 'Prototype Tracker', description: 'Log prototypes with tool, fidelity, and feedback', component: 'PrototypeTracker', injectInto: 'projects', position: 'tab' },
    { id: 'usability-test-log', name: 'Usability Test Log', description: 'Log test sessions with issues found', component: 'UsabilityTestLog', injectInto: 'projects', position: 'panel' },
    { id: 'handoff-checklist', name: 'Handoff Checklist', description: 'Track handoff completeness', component: 'HandoffChecklist', injectInto: 'projects', position: 'panel' },
    { id: 'component-count', name: 'Component Count', description: 'Track components designed per project', component: 'ComponentCount', injectInto: 'projects', position: 'tab' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my design process and suggest where I spend too much time.',
    proposals: 'Help me scope design projects based on past component counts.',
    finance: 'Compare my rates across design project types.',
  },
};

export default uxDesigner;
