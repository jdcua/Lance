import type { ArchetypeConfig } from './types';

const developer: ArchetypeConfig = {
  id: 'developer',
  label: 'Developer / Engineer',
  emoji: '💻',
  tagline: 'The tool for people who measure success in commits that ship',
  description: 'Optimized for developers. Track sprints, utilization, and effective rates.',
  psychProfile: 'Thinks in sprints and tickets. Optimizes for utilization rate and effective hourly rate. Hates context switching.',
  icon: 'Code2',
  theme: 'terminal',

  dashboard: {
    greeting: "What's shipping today?",
    subgreeting: 'Your projects, time, and money at a glance.',
    metricCards: [
      { id: 'utilizationRate', label: 'Utilization rate this month', query: null, format: 'percent', color: 'green' },
      { id: 'effectiveHourlyRate', label: 'Effective hourly rate', query: null, format: 'currency', color: 'blue' },
      { id: 'activeProjectsCount', label: 'Active Projects', query: null, format: 'count', color: 'purple' },
      { id: 'unbilledHours', label: 'Unbilled hours', query: null, format: 'hours', color: 'amber' },
    ],
    widgets: [
      { id: 'sprint-board-widget', component: 'SprintBoardWidget', priority: 1 },
    ],
    quickActions: [
      { label: 'Log Time', action: '/time', icon: 'Clock' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Rate Calculator', action: 'rate-calculator', icon: 'Calculator' },
    ],
  },

  sidebar: [
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Utilization & Rate',
    panels: [
      { id: 'utilization-trend', title: 'Utilization Rate Trend (12mo)', component: 'UtilizationTrendPanel', query: 'utilizationTrend', mode: 'quantitative', priority: 1 },
      { id: 'effective-vs-stated', title: 'Effective Rate vs Stated Rate', component: 'EffectiveVsStatedPanel', query: 'effectiveVsStated', mode: 'quantitative', priority: 2 },
      { id: 'revenue-by-tech', title: 'Revenue by Technology', component: 'RevenueByTechPanel', query: 'revenueByTech', mode: 'quantitative', priority: 3 },
      { id: 'hours-by-type', title: 'Hours by Project Type', component: 'HoursByTypePanel', query: 'hoursByType', mode: 'quantitative', priority: 4 },
      { id: 'invoice-lag', title: 'Invoice Lag', component: 'InvoiceLagPanel', query: 'invoiceLag', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'sprint-board', name: 'Sprint Board', description: 'Kanban view for project milestones and tasks', component: 'SprintBoard', injectInto: 'projects', position: 'tab' },
    { id: 'stack-logger', name: 'Stack Logger', description: 'Log tech stack used per project', component: 'StackLogger', injectInto: 'projects', position: 'panel' },
    { id: 'bug-log', name: 'Bug/Issue Log', description: 'Lightweight issue tracker per project', component: 'BugLog', injectInto: 'projects', position: 'tab' },
    { id: 'rate-calculator', name: 'Rate Calculator', description: 'Back-calculate required hourly rate from target income', component: 'RateCalculator', injectInto: 'finance', position: 'panel' },
  ],

  proposalTypes: ['hourly', 'flat', 'project'],
  defaultRateLabel: 'per hour',
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Software Development Agreement',
      category: 'Development',
      body: '<h2>Software Development Agreement</h2>\n<p>This Software Development Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Developer").</p>\n<h3>1. Scope of Work</h3>\n<p>Developer will build: {scope}. Technology stack: {tech_stack}. Key features: {key_features}.</p>\n<h3>2. Development Process</h3>\n<p>Agile methodology with {sprint_length}-week sprints. Sprint reviews every {sprint_length} weeks. Client provides feedback within {review_period} business days.</p>\n<h3>3. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Estimated total: $ {estimated_total}. {deposit_percentage}% deposit on signing. Milestone payments per Exhibit A.</p>\n<h3>4. Milestones & Acceptance</h3>\n<p>Milestones defined in Exhibit A. Client has {acceptance_period} business days to test and accept each milestone. Unaccepted milestones deemed accepted after {auto_acceptance_days} days.</p>\n<h3>4. Intellectual Property</h3>\n<p>Upon full payment, Client owns all code and deliverables. Developer retains rights to general knowledge, frameworks, and reusable components.</p>\n<h3>5. Change Requests</h3>\n<p>Scope changes require written Change Order. Additional work at $ {change_order_rate}/hr. Developer provides estimate before proceeding.</p>\n<h3>6. Warranty & Support</h3>\n<p>Developer warrants code for {warranty_period} days post-delivery. Bug fixes during warranty included. Post-warranty support available at $ {support_rate}/hr.</p>\n<h3>7. Confidentiality & Security</h3>\n<p>Developer will follow Client security policies. Code stored in Client repositories. Access revoked on termination.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{tech_stack}', '{key_features}', '{sprint_length}', '{review_period}', '{rate}', '{rate_type}', '{estimated_total}', '{deposit_percentage}', '{acceptance_period}', '{auto_acceptance_days}', '{change_order_rate}', '{warranty_period}', '{support_rate}'],
    },
    {
      name: 'Retainer Development Agreement',
      category: 'Development',
      body: '<h2>Retainer Development Agreement</h2>\n<p>This Retainer Development Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Developer").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Developer reserves {hours_per_month} hours per month for Client. Priority access to Developer\'s schedule.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>3. Scope</h3>\n<p>Ongoing development, maintenance, and support for: {scope}. Priority bugs addressed within {sla_response_time} hours.</p>\n<h3>4. Payment & Reporting</h3>\n<p>Invoices sent 1st of month. Payment Net {payment_terms} days. Monthly time report provided by {report_date}.</p>\n<h3>5. Term & Termination</h3>\n<p>Month-to-month. Either party may terminate with {notice_period} days notice. Unused hours do not roll over.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{scope}', '{sla_response_time}', '{payment_terms}', '{report_date}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my utilization and suggest ways to improve my effective rate.',
    time: 'Help me categorize my time entries by project type.',
    finance: 'Compare my rates against industry benchmarks for my tech stack.',
  },
};

export default developer;
