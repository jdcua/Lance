import type { ArchetypeConfig } from './types';

const seo: ArchetypeConfig = {
  id: 'seo',
  label: 'SEO / Digital Marketer',
  emoji: '🔍',
  tagline: 'The tool for people who measure success in rankings improved',
  description: 'Built for SEO specialists. Track keywords, deliverables, and retainer health.',
  psychProfile: 'Thinks in rankings, traffic, and retainer renewals. Results are slow to show. Reporting proves value.',
  icon: 'Search',
  theme: 'scale',

  dashboard: {
    greeting: "What's ranking today?",
    subgreeting: 'Your keywords, deliverables, and retainer health at a glance.',
    metricCards: [
      { id: 'activeRetainers', label: 'Active retainers', query: null, format: 'count', color: 'green' },
      { id: 'activeProjectsCount', label: 'Active projects', query: null, format: 'count', color: 'blue' },
      { id: 'draftsCount', label: 'Deliverables pending', query: null, format: 'count', color: 'amber' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'keyword-tracker-widget', component: 'KeywordTrackerWidget', priority: 1 },
      { id: 'deliverable-tracker-widget', component: 'DeliverableTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Deliverable', action: '/projects', icon: 'CheckSquare' },
      { label: 'Log Report', action: 'report-log', icon: 'FileText' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Retainer Health',
    panels: [
      { id: 'retainer-renewal', title: 'Retainer Renewal Rate', component: 'RetainerRenewalPanel', query: 'retainerRenewal', mode: 'quantitative', priority: 1 },
      { id: 'deliverable-completion', title: 'Deliverable Completion Rate', component: 'DeliverableCompletionPanel', query: 'deliverableCompletion', mode: 'quantitative', priority: 2 },
      { id: 'revenue-by-service', title: 'Revenue by Service Type', component: 'RevenueByServicePanel', query: 'revenueByService', mode: 'qualitative', priority: 3 },
      { id: 'client-health', title: 'Client Health Scores', component: 'ClientHealthPanel', query: 'clientHealth', mode: 'qualitative', priority: 4 },
      { id: 'avg-retainer-duration', title: 'Avg Retainer Duration', component: 'AvgRetainerDurationPanel', query: 'avgRetainerDuration', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'keyword-tracker', name: 'Keyword Tracker', description: 'Track keyword positions per client', component: 'KeywordTracker', injectInto: 'clients', position: 'panel' },
    { id: 'deliverable-tracker', name: 'Deliverable Tracker', description: 'Track deliverables completed vs promised', component: 'DeliverableTracker', injectInto: 'projects', position: 'tab' },
    { id: 'report-log', name: 'Report Log', description: 'Log monthly reports delivered', component: 'ReportLog', injectInto: 'clients', position: 'tab' },
    { id: 'retainer-health-score', name: 'Retainer Health Score', description: 'Composite score for retainer clients', component: 'RetainerHealthScore', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['retainer', 'flat', 'hourly'],
  defaultRateLabel: 'per hour',
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'SEO Retainer Agreement',
      category: 'SEO',
      body: '<h2>SEO Retainer Agreement</h2>\n<p>This SEO Retainer Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("SEO Specialist").</p>\n<h3>1. Monthly Services</h3>\n<p>Specialist will deliver: {monthly_deliverables}. Includes: technical audit, keyword research, on-page optimization, content strategy, link building outreach, monthly reporting.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>3. Keyword & Content</h3>\n<p>Target keywords: {target_keywords}. Content pieces per month: {content_pieces_per_month}. Link building targets: {links_per_month}.</p>\n<h3>4. Reporting</h3>\n<p>Weekly ranking updates. Monthly comprehensive report. Quarterly strategy review. Access to live dashboard.</p>\n<h3>5. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate. 30-day minimum recommended for SEO results.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{monthly_deliverables}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{target_keywords}', '{content_pieces_per_month}', '{links_per_month}', '{notice_period}'],
    },
    {
      name: 'SEO Audit & Strategy Project',
      category: 'SEO',
      body: '<h2>SEO Audit & Strategy Project</h2>\n<p>This SEO Audit & Strategy Project ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("SEO Specialist").</p>\n<h3>1. Project Scope</h3>\n<p>Specialist will deliver: technical audit, content audit, competitor gap analysis, keyword strategy, technical roadmap, content calendar.</p>\n<h3>2. Timeline</h3>\n<p>Technical audit: {audit_weeks} weeks. Competitor analysis: {competitor_weeks} weeks. Strategy & roadmap: {strategy_weeks} weeks. Total: {total_weeks} weeks.</p>\n<h3>3. Fees</h3>\n<p>Total fee: $ {total_fee}. Payment: {deposit_percentage}% deposit, {midpoint_percentage}% at audit delivery, balance on strategy delivery.</p>\n<h3>4. Deliverables</h3>\n<p>Technical audit report, content audit, competitor gap analysis, keyword strategy document, 12-month content calendar, implementation checklist.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{audit_weeks}', '{competitor_weeks}', '{strategy_weeks}', '{total_weeks}', '{total_fee}', '{deposit_percentage}', '{midpoint_percentage}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my retainer health and flag at-risk clients.',
    time: 'Help me estimate hours for similar SEO projects.',
    finance: 'Compare my retainer rates and suggest pricing for new clients.',
  },
};

export default seo;
