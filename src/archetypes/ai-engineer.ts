import type { ArchetypeConfig } from './types';

const aiEngineer: ArchetypeConfig = {
  id: 'ai-engineer',
  label: 'AI / ML Engineer',
  emoji: '🤖',
  tagline: 'The tool for people who measure success in models deployed',
  description: 'Built for AI and ML engineers. Track experiments, compute costs, and model iterations.',
  psychProfile: 'Thinks in experiments, datasets, and model metrics. Compute cost is a real line item. Every training run costs money.',
  icon: 'Bot',
  theme: 'terminal',

  dashboard: {
    greeting: "What's training?",
    subgreeting: 'Your experiments, compute, and deployments at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active experiments', query: null, format: 'count', color: 'blue' },
      { id: 'expensesTotal', label: 'Compute cost this month', query: null, format: 'currency', color: 'red' },
      { id: 'thisWeeksHours', label: 'Hours this week', query: null, format: 'hours', color: 'green' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'experiment-tracker-widget', component: 'ExperimentTrackerWidget', priority: 1 },
      { id: 'model-registry-widget', component: 'ModelRegistryWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Experiment', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Compute', action: '/finance', icon: 'Cloud' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Experiments', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'Compute Costs', icon: 'BarChart3', path: '/finance' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Datasets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'ML Economics',
    panels: [
      { id: 'compute-cost-trend', title: 'Compute Cost Trend', component: 'ComputeCostPanel', query: 'computeCost', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-experiment', title: 'Revenue per Experiment', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 2 },
      { id: 'model-iteration-count', title: 'Model Iterations per Project', component: 'ModelIterationsPanel', query: 'modelIterations', mode: 'quantitative', priority: 3 },
      { id: 'infra-cost-ratio', title: 'Infrastructure Cost Ratio', component: 'InfraCostPanel', query: 'infraCost', mode: 'quantitative', priority: 4 },
      { id: 'deployment-frequency', title: 'Deployment Frequency', component: 'DeploymentFrequencyPanel', query: 'deploymentFrequency', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'experiment-tracker', name: 'Experiment Tracker', description: 'Log experiments with metrics and params', component: 'ExperimentTracker', injectInto: 'projects', position: 'tab' },
    { id: 'model-registry', name: 'Model Registry', description: 'Track model versions and deployment status', component: 'ModelRegistry', injectInto: 'projects', position: 'panel' },
    { id: 'compute-cost-log', name: 'Compute Cost Log', description: 'Log GPU and API costs per experiment', component: 'ComputeCostLog', injectInto: 'finance', position: 'tab' },
    { id: 'dataset-versioning', name: 'Dataset Versioning', description: 'Track dataset versions and preprocessing', component: 'DatasetVersioning', injectInto: 'assets', position: 'panel' },
  ],

  proposalTypes: ['hourly', 'flat', 'project'],
  defaultRateLabel: 'per hour',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'ML Engineering Agreement',
      category: 'AI/ML',
      body: '<h2>ML Engineering Agreement</h2>\n<p>This ML Engineering Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("AI Engineer").</p>\n<h3>1. Scope</h3>\n<p>Engineer will: {scope}. Task type: {task_type} (classification, regression, NLP, CV, RL, etc.). Model type: {model_type}. Dataset: {dataset_description}.</p>\n<h3>2. Development Process</h3>\n<p>Phase 1: Data prep & EDA ({eda_weeks} weeks). Phase 2: Baseline modeling ({baseline_weeks} weeks). Phase 3: Iteration & tuning ({tuning_weeks} weeks). Phase 4: Deployment ({deploy_weeks} weeks).</p>\n<h3>2. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Estimated total: $ {estimated_total}. {deposit_percentage}% deposit. Milestone payments per phase.</p>\n<h3>3. Compute & Infrastructure</h3>\n<p>Client provides: {client_provided_compute}. Engineer uses: {engineer_compute}. Compute costs: {compute_cost_responsibility}. Cloud: {cloud_provider}.</p>\n<h3>3. Evaluation & Acceptance</h3>\n<p>Target metric: {target_metric} >= {target_value}. Test set: {test_set_description}. Client has {acceptance_period} days to evaluate.</p>\n<h3>4. IP & Deployment</h3>\n<p>Upon full payment, Client owns trained model and code. Engineer retains rights to architecture patterns, preprocessing pipelines, and reusable components.</p>\n<h3>5. Warranty & Monitoring</h3>\n<p>Warranty: {warranty_months} months. Includes drift monitoring setup. Retraining: separate agreement.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{task_type}', '{model_type}', '{dataset_description}', '{eda_weeks}', '{baseline_weeks}', '{tuning_weeks}', '{deploy_weeks}', '{rate}', '{rate_type}', '{estimated_total}', '{deposit_percentage}', '{milestone_percentage}', '{client_provided_compute}', '{engineer_compute}', '{compute_cost_responsibility}', '{cloud_provider}', '{target_metric}', '{target_value}', '{test_set_description}', '{acceptance_period}', '{warranty_months}'],
    },
    {
      name: 'ML Advisory Retainer',
      category: 'AI/ML',
      body: '<h2>ML Advisory Retainer</h2>\n<p>This ML Advisory Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("AI Advisor").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Advisor reserves {hours_per_month} hours/month. Priority for: model issues, deployment incidents, architecture reviews.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>2. Scope</h3>\n<p>Architecture review, model debugging, MLOps guidance, cost optimization, team mentoring, vendor evaluation.</p>\n<h3>3. Payment & Reporting</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days. Monthly report: hours used, models reviewed, recommendations made.</p>\n<h3>4. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate. Unused hours do not roll over.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my compute costs and suggest optimization strategies.',
    time: 'Help me estimate experiment hours based on past projects.',
    finance: 'Compare my compute cost to revenue ratio across experiments.',
  },
};

export default aiEngineer;
