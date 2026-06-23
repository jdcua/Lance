import type { ArchetypeConfig } from './types';

const virtualAssistant: ArchetypeConfig = {
  id: 'virtual-assistant',
  label: 'Virtual Assistant / Admin',
  emoji: '🗂️',
  tagline: 'The tool for people who measure success in tasks completed',
  description: 'Built for virtual assistants. Track tasks, client load, and scope boundaries.',
  psychProfile: 'Thinks in tasks and client load. Manages many clients simultaneously. Scope creep happens task by task.',
  icon: 'ClipboardList',
  theme: 'default',

  dashboard: {
    greeting: "What's on your list today?",
    subgreeting: 'Your tasks, client load, and scope at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active clients', query: null, format: 'count', color: 'green' },
      { id: 'todaysHours', label: 'Hours today', query: null, format: 'hours', color: 'blue' },
      { id: 'thisWeeksHours', label: 'Hours this week', query: null, format: 'hours', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'client-load-widget', component: 'ClientLoadWidget', priority: 1 },
      { id: 'task-log-widget', component: 'TaskLogWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Task', action: '/time', icon: 'CheckSquare' },
      { label: 'New Client', action: '/clients', icon: 'Users' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Tasks', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Task Economics',
    panels: [
      { id: 'hours-per-client', title: 'Hours per Client (Stacked)', component: 'HoursPerClientPanel', query: 'hoursPerClient', mode: 'quantitative', priority: 1 },
      { id: 'task-category-breakdown', title: 'Task Category Breakdown', component: 'TaskCategoryPanel', query: 'taskCategory', mode: 'qualitative', priority: 2 },
      { id: 'scope-creep-alerts', title: 'Scope Creep Alerts History', component: 'ScopeCreepPanel', query: 'scopeCreep', mode: 'qualitative', priority: 3 },
      { id: 'client-load-balance', title: 'Client Load Balance', component: 'ClientLoadPanel', query: 'clientLoad', mode: 'quantitative', priority: 4 },
      { id: 'billable-vs-admin', title: 'Billable vs Admin Time', component: 'BillableVsAdminPanel', query: 'billableVsAdmin', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'task-log', name: 'Task Log', description: 'Log individual tasks completed per client', component: 'TaskLog', injectInto: 'time', position: 'tab' },
    { id: 'client-load-monitor', name: 'Client Load Monitor', description: 'Hours used vs included per retainer', component: 'ClientLoadMonitor', injectInto: 'clients', position: 'panel' },
    { id: 'recurring-task-templates', name: 'Recurring Task Templates', description: 'Define recurring tasks that auto-appear', component: 'RecurringTaskTemplates', injectInto: 'time', position: 'panel' },
    { id: 'scope-alert', name: 'Scope Alert', description: 'Alert when approaching retainer limit', component: 'ScopeAlert', injectInto: 'clients', position: 'panel' },
    { id: 'sops', name: 'SOPs', description: 'Store standard procedures per client', component: 'SOPs', injectInto: 'clients', position: 'tab' },
  ],

  proposalTypes: ['flat', 'retainer', 'hourly'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my client load and flag any approaching scope limits.',
    time: 'Help me categorize my tasks by type for better reporting.',
    finance: 'Compare my retainer rates and suggest adjustments.',
  },
};

export default virtualAssistant;
