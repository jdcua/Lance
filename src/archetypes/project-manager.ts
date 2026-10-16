import type { ArchetypeConfig } from './types';

const projectManager: ArchetypeConfig = {
  id: 'project-manager',
  label: 'Project Manager',
  emoji: '📋',
  tagline: 'The tool for people who measure success in milestones cleared',
  description: 'Built for project managers. Track timelines, dependencies, and resource allocation.',
  psychProfile: 'Thinks in timelines, dependencies, and resource allocation. Coordinates others. The timeline is sacred.',
  icon: 'GanttChart',
  theme: 'scale',

  dashboard: {
    greeting: "What's in flight?",
    subgreeting: 'Your projects, milestones, and resources at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active projects', query: null, format: 'count', color: 'blue' },
      { id: 'upcomingMilestones', label: 'Milestones due this week', query: null, format: 'count', color: 'purple' },
      { id: 'blockedTasks', label: 'Blocked tasks', query: null, format: 'count', color: 'red' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'timeline-widget', component: 'TimelineWidget', priority: 1 },
      { id: 'resource-allocation-widget', component: 'ResourceAllocationWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Add Milestone', action: '/projects', icon: 'Flag' },
      { label: 'Status Report', action: '/projects', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Project Velocity',
    panels: [
      { id: 'milestone-completion', title: 'Milestone Completion Rate', component: 'MilestoneCompletionPanel', query: 'milestoneCompletion', mode: 'quantitative', priority: 1 },
      { id: 'estimated-vs-actual', title: 'Estimated vs Actual Hours', component: 'EstimatedVsActualPanel', query: 'estimatedVsActual', mode: 'quantitative', priority: 2 },
      { id: 'project-duration', title: 'Project Duration vs Budget', component: 'ProjectDurationPanel', query: 'projectDuration', mode: 'quantitative', priority: 3 },
      { id: 'revenue-by-client', title: 'Revenue by Client', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 4 },
      { id: 'resource-utilization', title: 'Resource Utilization', component: 'ResourceUtilizationPanel', query: 'resourceUtilization', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'dependency-tracker', name: 'Dependency Tracker', description: 'Track task dependencies across projects', component: 'DependencyTracker', injectInto: 'projects', position: 'tab' },
    { id: 'resource-allocation', name: 'Resource Allocation', description: 'Allocate hours and track capacity', component: 'ResourceAllocation', injectInto: 'projects', position: 'panel' },
    { id: 'timeline-view', name: 'Timeline View', description: 'Visual project timeline with milestones', component: 'TimelineView', injectInto: 'projects', position: 'tab' },
    { id: 'status-report-generator', name: 'Status Report Generator', description: 'Generate client status reports', component: 'StatusReportGenerator', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'retainer'],
  defaultRateLabel: 'per hour',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Project Management Agreement',
      category: 'Project Management',
      body: '<h2>Project Management Agreement</h2>\n<p>This Project Management Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Project Manager").</p>\n<h3>1. Scope</h3>\n<p>Project Manager will manage: {project_name}. Scope: {scope}. Team size: {team_size}. Duration: {estimated_duration_weeks} weeks.</p>\n<h3>2. Services</h3>\n<p>Planning, scheduling, resource allocation, risk management, stakeholder communication, status reporting, milestone tracking, budget management.</p>\n<h3>3. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Total estimated: $ {estimated_total}. {deposit_percentage}% deposit. Monthly invoicing.</p>\n<h3>3. Reporting</h3>\n<p>Weekly status reports. Monthly executive summary. Milestone notifications within 24 hours of completion.</p>\n<h3>4. Change Management</h3>\n<p>Scope changes via Change Request. Impact analysis within {change_impact_hours} hours. Client approval required before implementation.</p>\n<h3>5. Term</h3>\n<p>Project duration or month-to-month. {notice_period} days notice to terminate.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{project_name}', '{scope}', '{team_size}', '{estimated_duration_weeks}', '{rate}', '{rate_type}', '{estimated_total}', '{deposit_percentage}', '{change_impact_hours}', '{notice_period}'],
    },
    {
      name: 'PMO Retainer Agreement',
      category: 'Project Management',
      body: '<h2>PMO Retainer Agreement</h2>\n<p>This PMO Retainer Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Project Manager").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Project Manager reserves {hours_per_month} hours/month. Manages up to {max_projects} concurrent projects.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>2. Scope</h3>\n<p>Ongoing: multi-project coordination, resource planning, cross-project dependency management, executive reporting.</p>\n<h3>3. Payment & Reporting</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days. Monthly portfolio status report.</p>\n<h3>4. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate. Unused hours do not roll over.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{max_projects}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my project portfolio and flag at-risk projects.',
    time: 'Help me estimate project durations based on past performance.',
    finance: 'Compare my project profitability and resource utilization.',
  },
};

export default projectManager;
