import type { ArchetypeConfig } from './types';

const dataAnalyst: ArchetypeConfig = {
  id: 'data-analyst',
  label: 'Data Analyst / Researcher',
  emoji: '📈',
  tagline: 'The tool for people who measure success in insights delivered',
  description: 'Built for data analysts. Track datasets, analysis phases, and tool costs.',
  psychProfile: 'Thinks in datasets, deliverables, and tool costs. Tools and compute can be significant expenses.',
  icon: 'BarChart4',
  theme: 'terminal',

  dashboard: {
    greeting: "What's the data saying today?",
    subgreeting: 'Your datasets, phases, and tool costs at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active analyses', query: null, format: 'count', color: 'blue' },
      { id: 'thisWeeksHours', label: 'Hours this week', query: null, format: 'hours', color: 'green' },
      { id: 'expensesTotal', label: 'Tool costs this month', query: null, format: 'currency', color: 'amber' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'analysis-phase-widget', component: 'AnalysisPhaseWidget', priority: 1 },
      { id: 'dataset-log-widget', component: 'DatasetLogWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Analysis', action: '/time', icon: 'Clock' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Expense', action: '/finance', icon: 'BarChart3' },
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
    { id: 'assets', label: 'Datasets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Analysis Economics',
    panels: [
      { id: 'hours-per-phase', title: 'Hours per Analysis Phase', component: 'HoursPerPhasePanel', query: 'hoursPerPhase', mode: 'quantitative', priority: 1 },
      { id: 'tool-cost', title: 'Tool Cost vs Revenue', component: 'ToolCostPanel', query: 'toolCost', mode: 'quantitative', priority: 2 },
      { id: 'revenue-by-complexity', title: 'Revenue by Complexity Tier', component: 'RevenueByComplexityPanel', query: 'revenueByComplexity', mode: 'quantitative', priority: 3 },
      { id: 'project-duration', title: 'Project Duration vs Estimate', component: 'ProjectDurationPanel', query: 'projectDuration', mode: 'quantitative', priority: 4 },
      { id: 'deliverable-count', title: 'Deliverable Count per Project', component: 'DeliverableCountPanel', query: 'deliverableCount', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'dataset-log', name: 'Dataset Log', description: 'Log datasets used per project', component: 'DatasetLog', injectInto: 'projects', position: 'panel' },
    { id: 'tool-compute-log', name: 'Tool/Compute Log', description: 'Log tools and compute costs as expenses', component: 'ToolComputeLog', injectInto: 'finance', position: 'panel' },
    { id: 'analysis-phase-tracker', name: 'Analysis Phase Tracker', description: 'Track data phases per project', component: 'AnalysisPhaseTracker', injectInto: 'projects', position: 'panel' },
    { id: 'deliverable-log', name: 'Deliverable Log', description: 'Log analysis deliverables with version', component: 'DeliverableLog', injectInto: 'projects', position: 'tab' },
    { id: 'complexity-tagger', name: 'Complexity Tagger', description: 'Tag projects by analysis complexity', component: 'ComplexityTagger', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Data Analysis Engagement',
      category: 'Data Analytics',
      body: '<h2>Data Analysis Engagement</h2>\n<p>This Data Analysis Engagement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Analyst").</p>\n<h3>1. Scope of Analysis</h3>\n<p>Analyst will perform: {analysis_type} analysis on {data_sources}. Research questions: {research_questions}. Deliverables: {deliverables_list}.</p>\n<h3>2. Methodology</h3>\n<p>Methods: {methods}. Tools: {tools}. Data sources: {data_sources}. Sample size: {sample_size}.</p>\n<h3>3. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Estimated total: $ {estimated_total}. {deposit_percentage}% deposit. Milestone payments: {milestone_schedule}.</p>\n<h3>3. Deliverables & Timeline</h3>\n<p>Phase 1: Data prep & exploration ({prep_weeks} weeks). Phase 2: Analysis ({analysis_weeks} weeks). Phase 3: Reporting ({reporting_weeks} weeks).</p>\n<h3>4. Revisions</h3>\n<p>Includes {included_revisions} revision rounds. Additional revisions: $ {revision_rate}/round.</p>\n<h3>5. Data & Confidentiality</h3>\n<p>Client data remains Client property. Analyst destroys raw data {data_retention_days} days post-delivery unless otherwise agreed.</p>\n<h3>6. IP</h3>\n<p>Upon full payment, Client owns all analysis outputs. Analyst retains rights to methodology, code, and reusable scripts.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{analysis_type}', '{data_sources}', '{research_questions}', '{deliverables_list}', '{methods}', '{tools}', '{sample_size}', '{rate}', '{rate_type}', '{deposit_percentage}', '{estimated_total}', '{prep_weeks}', '{analysis_weeks}', '{reporting_weeks}', '{included_revisions}', '{revision_rate}'],
    },
    {
      name: 'Data Advisory Retainer',
      category: 'Data Analytics',
      body: '<h2>Data Advisory Retainer</h2>\n<p>This Data Advisory Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Analyst").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Analyst reserves {hours_per_month} hours/month for Client. Priority for ad-hoc analysis requests.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>2. Scope</h3>\n<p>Ongoing: dashboard maintenance, ad-hoc analysis, data quality checks, stakeholder reporting, tool optimization.</p>\n<h3>3. Payment & Reporting</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days. Monthly summary: hours used, analyses completed, insights delivered.</p>\n<h3>4. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate. Unused hours do not roll over.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my analysis pipeline and suggest where I can reduce tool costs.',
    time: 'Help me estimate analysis hours based on data complexity.',
    finance: 'Compare my tool costs across projects and suggest optimizations.',
  },
};

export default dataAnalyst;
