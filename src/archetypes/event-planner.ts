import type { ArchetypeConfig } from './types';

const eventPlanner: ArchetypeConfig = {
  id: 'event-planner',
  label: 'Event Planner',
  emoji: '🎪',
  tagline: 'The tool for people who measure success in events that go off without a hitch',
  description: 'Built for event planners. Track vendors, run-of-show, and event budgets.',
  psychProfile: 'Thinks in guest counts, vendor coordination, and run-of-show. The date doesn\'t move.',
  icon: 'PartyPopper',
  theme: 'studio',

  dashboard: {
    greeting: "What's on the calendar?",
    subgreeting: 'Your events, vendors, and budgets at a glance.',
    metricCards: [
      { id: 'upcomingMilestones', label: 'Upcoming events (7d)', query: null, format: 'count', color: 'green' },
      { id: 'activeProjectsCount', label: 'Active vendor contracts', query: null, format: 'count', color: 'blue' },
      { id: 'expensesTotal', label: 'Event budget committed', query: null, format: 'currency', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'run-of-show-widget', component: 'RunOfShowWidget', priority: 1 },
      { id: 'vendor-directory-widget', component: 'VendorDirectoryWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Event', action: '/projects', icon: 'FolderKanban' },
      { label: 'Add Vendor', action: '/clients', icon: 'Users' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Events', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Vendors', icon: 'Users', path: '/clients' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'assets', label: 'Event Assets', icon: 'Package', path: '/assets' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'hybrid',
    headline: 'Event Economics',
    panels: [
      { id: 'revenue-per-event-type', title: 'Revenue per Event Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 1 },
      { id: 'budget-vs-actual', title: 'Budget vs Actual per Event', component: 'BudgetVsActualPanel', query: 'budgetVsActual', mode: 'quantitative', priority: 2 },
      { id: 'events-per-month', title: 'Events per Month', component: 'EventsPerMonthPanel', query: 'eventsPerMonth', mode: 'quantitative', priority: 3 },
      { id: 'vendor-spend', title: 'Top Vendors by Spend', component: 'VendorSpendPanel', query: 'vendorSpend', mode: 'qualitative', priority: 4 },
      { id: 'guest-count-trend', title: 'Guest Count Trend', component: 'GuestCountTrendPanel', query: 'guestCountTrend', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'vendor-directory', name: 'Vendor Directory', description: 'Track vendors with contact and rates', component: 'VendorDirectory', injectInto: 'clients', position: 'tab' },
    { id: 'run-of-show-builder', name: 'Run of Show Builder', description: 'Build event timelines', component: 'RunOfShowBuilder', injectInto: 'projects', position: 'tab' },
    { id: 'guest-list', name: 'Guest List', description: 'Track guest list per event', component: 'GuestList', injectInto: 'projects', position: 'panel' },
    { id: 'budget-vs-actual-tracker', name: 'Budget vs Actual Tracker', description: 'Track event budget vs actual spend', component: 'BudgetVsActualTracker', injectInto: 'finance', position: 'panel' },
  ],

  proposalTypes: ['flat', 'per-event', 'hourly'],
  defaultRateLabel: 'per event',

  aiPrompts: {
    dashboard: 'Analyze my upcoming events and flag potential conflicts.',
    time: 'Help me estimate planning hours by event type.',
    finance: 'Compare my event profitability across different event types.',
  },
};

export default eventPlanner;
