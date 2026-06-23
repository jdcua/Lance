import type { ArchetypeConfig } from './types';

const accountant: ArchetypeConfig = {
  id: 'accountant',
  label: 'Accountant / Bookkeeper',
  emoji: '🧾',
  tagline: 'The tool for people who measure success in books balanced',
  description: 'Built for accountants and bookkeepers. Track engagements, reconciliations, and tax periods.',
  psychProfile: 'Thinks in ledgers, reconciliations, and tax periods. Billable by the hour or engagement. Accuracy above all.',
  icon: 'Calculator',
  theme: 'default',

  dashboard: {
    greeting: "What's on the books?",
    subgreeting: 'Your engagements, hours, and tax deadlines at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active engagements', query: null, format: 'count', color: 'blue' },
      { id: 'unbilledHours', label: 'Unbilled hours', query: null, format: 'hours', color: 'amber' },
      { id: 'expensesTotal', label: 'Expenses logged this month', query: null, format: 'currency', color: 'green' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'ledger-widget', component: 'LedgerWidget', priority: 1 },
      { id: 'tax-deadline-widget', component: 'TaxDeadlineWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Engagement', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Expense', action: '/finance', icon: 'BarChart3' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'projects', label: 'Engagements', icon: 'FolderKanban', path: '/projects' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Financial Health',
    panels: [
      { id: 'revenue-per-client', title: 'Revenue per Client', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 1 },
      { id: 'hours-per-client', title: 'Hours per Client', component: 'HoursPerClientPanel', query: 'hoursPerClient', mode: 'quantitative', priority: 2 },
      { id: 'expense-trend', title: 'Expense Trend', component: 'ExpenseTrendPanel', query: 'expenseTrend', mode: 'quantitative', priority: 3 },
      { id: 'invoice-lag', title: 'Invoice Lag', component: 'InvoiceLagPanel', query: 'invoiceLag', mode: 'quantitative', priority: 4 },
      { id: 'profit-margin-trend', title: 'Profit Margin Trend', component: 'ProfitMarginTrendPanel', query: 'profitMarginTrend', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'ledger-log', name: 'Ledger Log', description: 'Log journal entries and adjustments', component: 'LedgerLog', injectInto: 'finance', position: 'tab' },
    { id: 'reconciliation-tracker', name: 'Reconciliation Tracker', description: 'Track bank reconciliations per client', component: 'ReconciliationTracker', injectInto: 'finance', position: 'panel' },
    { id: 'tax-deadline-calendar', name: 'Tax Deadline Calendar', description: 'Track tax filing and payment deadlines', component: 'TaxDeadlineCalendar', injectInto: 'clients', position: 'tab' },
    { id: 'client-financial-summary', name: 'Client Financial Summary', description: 'P&L summary per client', component: 'ClientFinancialSummary', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['hourly', 'flat', 'retainer'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my client engagements and flag approaching tax deadlines.',
    time: 'Help me categorize expenses by tax category.',
    finance: 'Generate a P&L summary for my top clients.',
  },
};

export default accountant;
