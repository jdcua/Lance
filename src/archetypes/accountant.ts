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
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Bookkeeping Engagement Letter',
      category: 'Accounting',
      body: '<h2>Bookkeeping Engagement Letter</h2>\n<p>This Engagement Letter ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Accountant").</p>\n<h3>1. Scope of Services</h3>\n<p>Accountant will provide the following bookkeeping services: {scope}. Services include: {services_included}.</p>\n<h3>2. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Monthly retainer: $ {monthly_retainer} for {hours_included} hours/month. Overage at $ {overage_rate}/hr.</p>\n<h3>3. Payment Terms</h3>\n<p>Invoices sent monthly on the 1st. Payment due Net {payment_terms} days.</p>\n<h3>4. Responsibilities</h3>\n<p>Client will provide all bank statements, receipts, and documents by {client_doc_deadline} each month. Accountant will deliver reconciled books by {delivery_deadline}.</p>\n<h3>5. Term & Termination</h3>\n<p>Month-to-month. Either party may terminate with {notice_period} days written notice. Final deliverables provided upon full payment.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{services_included}', '{rate}', '{rate_type}', '{monthly_retainer}', '{hours_included}', '{overage_rate}', '{payment_terms}', '{client_doc_deadline}', '{delivery_deadline}', '{notice_period}'],
    },
    {
      name: 'Tax Preparation Engagement',
      category: 'Tax',
      body: '<h2>Tax Preparation Engagement Letter</h2>\n<p>This Tax Preparation Engagement Letter ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Tax Preparer").</p>\n<h3>1. Services</h3>\n<p>Tax Preparer will prepare the following returns: {returns_list}. Includes: {services_included}.</p>\n<h3>2. Fees</h3>\n<p>Estimated fee: $ {estimated_fee}. Final fee based on complexity. {deposit_percentage}% deposit due on signing.</p>\n<h3>3. Client Responsibilities</h3>\n<p>Client will provide all tax documents by {doc_deadline}. Client is responsible for accuracy of information provided.</p>\n<h3>3. Filing & Deadlines</h3>\n<p>Returns filed by {filing_deadline}. Extensions filed if documents not received on time.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{returns_list}', '{services_included}', '{estimated_fee}', '{deposit_percentage}', '{doc_deadline}', '{filing_deadline}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my client engagements and flag approaching tax deadlines.',
    time: 'Help me categorize expenses by tax category.',
    finance: 'Generate a P&L summary for my top clients.',
  },
};

export default accountant;
