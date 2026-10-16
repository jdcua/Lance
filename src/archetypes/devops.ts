import type { ArchetypeConfig } from './types';

const devops: ArchetypeConfig = {
  id: 'devops',
  label: 'DevOps / SRE',
  emoji: '⚙️',
  tagline: 'The tool for people who measure success in uptime maintained',
  description: 'Built for DevOps engineers and SREs. Track infrastructure, incidents, and SLA compliance.',
  psychProfile: 'Thinks in infrastructure, pipelines, and incident response. Every minute of downtime is measured. Automation hours pay back forever.',
  icon: 'Server',
  theme: 'terminal',

  dashboard: {
    greeting: "What's running?",
    subgreeting: 'Your infrastructure, incidents, and automation at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active engagements', query: null, format: 'count', color: 'blue' },
      { id: 'thisWeeksHours', label: 'Hours this week', query: null, format: 'hours', color: 'green' },
      { id: 'unbilledHours', label: 'Incident response hours', query: null, format: 'hours', color: 'red' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'infra-health-widget', component: 'InfraHealthWidget', priority: 1 },
      { id: 'automation-tracker-widget', component: 'AutomationTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Incident', action: '/time', icon: 'AlertCircle' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
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
    headline: 'Infra Economics',
    panels: [
      { id: 'incident-response-time', title: 'Incident Response Time', component: 'IncidentResponsePanel', query: 'incidentResponse', mode: 'quantitative', priority: 1 },
      { id: 'automation-roi', title: 'Automation Hours Saved', component: 'AutomationROIPanel', query: 'automationROI', mode: 'quantitative', priority: 2 },
      { id: 'revenue-per-client', title: 'Revenue per Client', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 3 },
      { id: 'retainer-utilization', title: 'Retainer Utilization', component: 'RetainerUtilizationPanel', query: 'retainerUtilization', mode: 'quantitative', priority: 4 },
      { id: 'tool-cost', title: 'Tool & Infra Cost Ratio', component: 'ToolCostPanel', query: 'toolCost', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'incident-log', name: 'Incident Log', description: 'Log incidents with severity and resolution', component: 'IncidentLog', injectInto: 'time', position: 'tab' },
    { id: 'automation-tracker', name: 'Automation Tracker', description: 'Track time saved by automation scripts', component: 'AutomationTracker', injectInto: 'projects', position: 'panel' },
    { id: 'infra-dashboard', name: 'Infrastructure Dashboard', description: 'Track client infrastructure details', component: 'InfraDashboard', injectInto: 'clients', position: 'panel' },
    { id: 'sla-tracker', name: 'SLA Tracker', description: 'Track SLA compliance per client', component: 'SLATracker', injectInto: 'clients', position: 'tab' },
  ],

  proposalTypes: ['hourly', 'retainer', 'flat'],
  defaultRateLabel: 'per hour',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'DevOps Retainer Agreement',
      category: 'DevOps',
      body: '<h2>DevOps Retainer Agreement</h2>\n<p>This DevOps Retainer Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("DevOps Engineer").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Engineer reserves {hours_per_month} hours/month for Client. Priority incident response: {incident_response_sla} hours.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>2. Scope</h3>\n<p>Ongoing: infrastructure management, CI/CD maintenance, monitoring, security hardening, automation, incident response.</p>\n<h3>3. Incident Response</h3>\n<p>Severity 1: {sev1_response}h response. Severity 2: {sev2_response}h response. On-call rotation: {on_call_schedule}.</p>\n<h3>4. Payment & Reporting</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days. Monthly report: hours used, incidents resolved, automation deployed.</p>\n<h3>5. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{incident_response_sla}', '{sev1_response}', '{sev2_response}', '{on_call_schedule}', '{payment_terms}', '{notice_period}'],
    },
    {
      name: 'Infrastructure Project Agreement',
      category: 'DevOps',
      body: '<h2>Infrastructure Project Agreement</h2>\n<p>This Infrastructure Project Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("DevOps Engineer").</p>\n<h3>1. Project Scope</h3>\n<p>Engineer will deliver: {scope}. Cloud: {cloud_provider}. Technologies: {tech_stack}. Environments: {environments}.</p>\n<h3>2. Timeline</h3>\n<p>Phase 1: Assessment & Design ({design_weeks} weeks). Phase 2: Implementation ({impl_weeks} weeks). Phase 3: Testing & Handoff ({handoff_weeks} weeks).</p>\n<h3>3. Fees</h3>\n<p>Total fee: $ {total_fee}. Payment: {deposit_percentage}% deposit, {milestone_percentage}% at milestones, balance on completion.</p>\n<h3>4. Change Requests</h3>\n<p>Scope changes via Change Order. Additional work at $ {change_order_rate}/hr.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{cloud_provider}', '{tech_stack}', '{environments}', '{design_weeks}', '{impl_weeks}', '{handoff_weeks}', '{total_fee}', '{deposit_percentage}', '{milestone_percentage}', '{change_order_rate}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my incident patterns and suggest automation opportunities.',
    time: 'Help me estimate automation hours vs manual time.',
    finance: 'Compare my retainer rates against incident response overhead.',
  },
};

export default devops;
