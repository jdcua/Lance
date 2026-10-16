import type { ArchetypeConfig } from './types';

const legal: ArchetypeConfig = {
  id: 'legal',
  label: 'Legal Consultant / Paralegal',
  emoji: '⚖️',
  tagline: 'The tool for people who measure success in cases resolved',
  description: 'Built for legal professionals. Track cases, billable hours, and filing deadlines.',
  psychProfile: 'Thinks in cases, billable hours, and deadlines. Every filing has a hard date. Document versioning is critical.',
  icon: 'Scale',
  theme: 'scale',

  dashboard: {
    greeting: "What's on the docket?",
    subgreeting: 'Your cases, deadlines, and billable hours at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active cases', query: null, format: 'count', color: 'blue' },
      { id: 'deadlinePressure', label: 'Deadlines in 7 days', query: null, format: 'count', color: 'red' },
      { id: 'thisWeeksHours', label: 'Billable hours this month', query: null, format: 'hours', color: 'green' },
      { id: 'totalOutstanding', label: 'Outstanding retainers', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'case-tracker-widget', component: 'CaseTrackerWidget', priority: 1 },
      { id: 'filing-deadline-widget', component: 'FilingDeadlineWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Case', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Time', action: '/time', icon: 'Clock' },
      { label: 'Log Filing', action: '/projects', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'projects', label: 'Cases', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'assets', label: 'Documents', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Practice Economics',
    panels: [
      { id: 'revenue-per-case', title: 'Revenue per Case', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 1 },
      { id: 'billable-trend', title: 'Billable Hours Trend', component: 'BillableTrendPanel', query: 'billableTrend', mode: 'quantitative', priority: 2 },
      { id: 'case-duration', title: 'Case Duration vs Estimate', component: 'CaseDurationPanel', query: 'caseDuration', mode: 'quantitative', priority: 3 },
      { id: 'filing-compliance', title: 'Filing Deadline Compliance', component: 'FilingCompliancePanel', query: 'filingCompliance', mode: 'quantitative', priority: 4 },
      { id: 'retainer-utilization', title: 'Retainer Utilization', component: 'RetainerUtilizationPanel', query: 'retainerUtilization', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'case-tracker', name: 'Case Tracker', description: 'Track case status and key dates', component: 'CaseTracker', injectInto: 'projects', position: 'tab' },
    { id: 'filing-deadline-calendar', name: 'Filing Deadline Calendar', description: 'Track court filing deadlines', component: 'FilingDeadlineCalendar', injectInto: 'projects', position: 'panel' },
    { id: 'document-version-log', name: 'Document Version Log', description: 'Track document versions and changes', component: 'DocumentVersionLog', injectInto: 'assets', position: 'panel' },
    { id: 'conflict-check-log', name: 'Conflict Check Log', description: 'Log conflict-of-interest checks', component: 'ConflictCheckLog', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['hourly', 'retainer', 'flat'],
  defaultRateLabel: 'per hour',

  depositPercentage: 0,
  paymentTerms: 30,
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Legal Services Engagement Letter',
      category: 'Legal',
      body: '<h2>Legal Services Engagement Letter</h2>\n<p>This Engagement Letter ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Attorney/Paralegal").</p>\n<h3>1. Scope of Representation</h3>\n<p>Attorney will provide legal services for: {matter_description}. Jurisdiction: {jurisdiction}. Court: {court_name}.</p>\n<h3>2. Fees & Billing</h3>\n<p>Rate: $ {rate} per {rate_type}. Retainer: $ {retainer_amount}. Billed monthly. Time billed in {billing_increments} increments. Expenses billed at cost + {expense_markup}%.</p>\n<h3>3. Retainer & Trust Account</h3>\n<p>Initial retainer: $ {initial_retainer} (held in trust). Replenish when balance falls below $ {replenish_threshold}. Unearned fees refunded on termination.</p>\n<h3>4. Client Responsibilities</h3>\n<p>Client provides all documents by {document_deadline}. Client appears at all required proceedings. Client keeps Attorney informed of contact changes.</p>\n<h3>5. Termination</h3>\n<p>Either party may terminate with written notice. Unearned retainer refunded. Client entitled to file copy. Attorney may withdraw per ethical rules.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{matter_description}', '{jurisdiction}', '{court_name}', '{rate}', '{rate_type}', '{retainer_amount}', '{billing_increments}', '{expense_markup}', '{initial_retainer}', '{replenish_threshold}', '{document_deadline}'],
    },
    {
      name: 'Paralegal Services Agreement',
      category: 'Legal',
      body: '<h2>Paralegal Services Agreement</h2>\n<p>This Paralegal Services Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Attorney/Firm") and {freelancer_name} ("Paralegal").</p>\n<h3>1. Services</h3>\n<p>Paralegal will provide: {services_list}. Under supervision of: {supervising_attorney}. Practice areas: {practice_areas}.</p>\n<h3>2. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Monthly cap: $ {monthly_cap}. Invoices submitted by 5th of following month.</p>\n<h3>3. Confidentiality & Ethics</h3>\n<p>Paralegal maintains client confidentiality per applicable rules. No conflicts of interest. Secure document handling required.</p>\n<h3>4. Term</h3>\n<p>Month-to-month. {notice_period} days notice. Either party may terminate immediately for ethical violations.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{services_list}', '{supervising_attorney}', '{practice_areas}', '{rate}', '{rate_type}', '{monthly_cap}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my case load and flag approaching deadlines.',
    time: 'Help me estimate billable hours for similar case types.',
    finance: 'Compare my effective rate across case types.',
  },
};

export default legal;
