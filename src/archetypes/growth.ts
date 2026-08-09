import type { ArchetypeConfig } from './types';

const growth: ArchetypeConfig = {
  id: 'growth',
  label: 'Growth Hacker / CRO',
  emoji: '📈',
  tagline: 'The tool for people who measure success in conversion rates lifted',
  description: 'Built for growth hackers and CRO specialists. Track experiments, funnels, and conversion metrics.',
  psychProfile: 'Thinks in experiments, funnels, and conversion rates. Every test teaches something. Statistical significance is non-negotiable.',
  icon: 'TrendingUp',
  theme: 'scale',

  dashboard: {
    greeting: "What's testing today?",
    subgreeting: 'Your experiments, funnels, and conversion rates at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active experiments', query: null, format: 'count', color: 'blue' },
      { id: 'projectsCompleted', label: 'Experiments completed this month', query: null, format: 'count', color: 'green' },
      { id: 'draftsCount', label: 'Experiments in design', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'experiment-tracker-widget', component: 'ExperimentTrackerWidget', priority: 1 },
      { id: 'funnel-metrics-widget', component: 'FunnelMetricsWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Experiment', action: '/projects', icon: 'Plus' },
      { label: 'Log Metric', action: '/clients', icon: 'BarChart3' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Experiments', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Experiment Velocity',
    panels: [
      { id: 'experiment-win-rate', title: 'Experiment Win Rate', component: 'ExperimentWinPanel', query: 'experimentWin', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-experiment', title: 'Revenue per Experiment', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 2 },
      { id: 'lift-distribution', title: 'Lift Distribution by Type', component: 'LiftDistributionPanel', query: 'liftDistribution', mode: 'quantitative', priority: 3 },
      { id: 'funnel-stage-impact', title: 'Impact by Funnel Stage', component: 'FunnelStageImpactPanel', query: 'funnelStageImpact', mode: 'quantitative', priority: 4 },
      { id: 'test-velocity', title: 'Test Velocity Over Time', component: 'TestVelocityPanel', query: 'testVelocity', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'experiment-log', name: 'Experiment Log', description: 'Log A/B tests with hypothesis and results', component: 'ExperimentLog', injectInto: 'projects', position: 'tab' },
    { id: 'funnel-tracker', name: 'Funnel Tracker', description: 'Track conversion funnel by stage', component: 'FunnelTracker', injectInto: 'clients', position: 'panel' },
    { id: 'metric-snapshot', name: 'Metric Snapshot', description: 'Capture conversion metrics per period', component: 'MetricSnapshot', injectInto: 'clients', position: 'tab' },
    { id: 'hypothesis-backlog', name: 'Hypothesis Backlog', description: 'Manage experiment ideas and ICE scores', component: 'HypothesisBacklog', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['retainer', 'flat', 'hourly'],
  defaultRateLabel: 'per hour',
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Growth / CRO Retainer',
      category: 'Growth',
      body: '<h2>Growth / CRO Retainer</h2>\n<p>This Growth/CRO Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Growth Specialist").</p>\n<h3>1. Monthly Services</h3>\n<p>Specialist will run {experiments_per_month} experiments/month. Funnels: {funnel_areas}. Includes: hypothesis generation, test design, implementation support, analysis, reporting.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>3. Tools & Access</h3>\n<p>Client provides: {analytics_access}, {testing_tool_access}, {cms_access}. Specialist uses own tools for design/analysis.</p>\n<h3>4. Reporting</h3>\n<p>Weekly experiment updates. Monthly results report. Quarterly roadmap review.</p>\n<h3>5. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate. Final experiment results delivered on termination.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{experiments_per_month}', '{funnel_areas}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{analytics_access}', '{testing_tool_access}', '{cms_access}', '{notice_period}'],
    },
    {
      name: 'CRO Audit & Roadmap Project',
      category: 'Growth',
      body: '<h2>CRO Audit & Roadmap Project</h2>\n<p>This CRO Audit & Roadmap Project ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Growth Specialist").</p>\n<h3>1. Project Scope</h3>\n<p>Specialist will deliver: heuristic audit, analytics audit, user research summary, experiment roadmap with ICE scores, implementation prioritization.</p>\n<h3>2. Timeline</h3>\n<p>Heuristic & analytics audit: {audit_weeks} weeks. User research: {research_weeks} weeks. Roadmap synthesis: {roadmap_weeks} weeks. Total: {total_weeks} weeks.</p>\n<h3>3. Fees</h3>\n<p>Total fee: $ {total_fee}. Payment: {deposit_percentage}% deposit, {midpoint_percentage}% at audit delivery, balance on roadmap delivery.</p>\n<h3>4. Deliverables</h3>\n<p>Full audit report, prioritized experiment backlog (ICE scored), implementation specs for top 5 experiments, executive presentation.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{audit_weeks}', '{research_weeks}', '{roadmap_weeks}', '{total_weeks}', '{total_fee}', '{deposit_percentage}', '{midpoint_percentage}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my experiment pipeline and suggest next tests.',
    time: 'Help me estimate experiment run time for statistical significance.',
    finance: 'Compare my retainer rates against client conversion lift.',
  },
};

export default growth;
