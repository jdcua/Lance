import type { ArchetypeConfig } from './types';

const blockchain: ArchetypeConfig = {
  id: 'blockchain',
  label: 'Blockchain / Web3 Developer',
  emoji: '⛓️',
  tagline: 'The tool for people who measure success in contracts deployed',
  description: 'Built for blockchain developers. Track smart contracts, audits, and gas optimization.',
  psychProfile: 'Thinks in smart contracts, audits, and gas efficiency. Every deployment costs real money. Security audits are mandatory.',
  icon: 'Link',
  theme: 'terminal',

  dashboard: {
    greeting: "What's deploying?",
    subgreeting: 'Your contracts, audits, and gas at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active contracts', query: null, format: 'count', color: 'blue' },
      { id: 'upcomingMilestones', label: 'Audits in progress', query: null, format: 'count', color: 'purple' },
      { id: 'thisWeeksHours', label: 'Hours this week', query: null, format: 'hours', color: 'green' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'contract-registry-widget', component: 'ContractRegistryWidget', priority: 1 },
      { id: 'audit-tracker-widget', component: 'AuditTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Contract', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Audit', action: '/projects', icon: 'Shield' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Contracts', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Agreements', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Web3 Economics',
    panels: [
      { id: 'revenue-per-chain', title: 'Revenue by Blockchain', component: 'RevenueByChainPanel', query: 'revenueByChain', mode: 'quantitative', priority: 1 },
      { id: 'audit-findings', title: 'Audit Findings per Contract', component: 'AuditFindingsPanel', query: 'auditFindings', mode: 'quantitative', priority: 2 },
      { id: 'gas-optimization', title: 'Gas Optimization Savings', component: 'GasOptimizationPanel', query: 'gasOptimization', mode: 'quantitative', priority: 3 },
      { id: 'deployment-frequency', title: 'Deployment Frequency', component: 'DeploymentFrequencyPanel', query: 'deploymentFrequency', mode: 'quantitative', priority: 4 },
      { id: 'revenue-by-contract-type', title: 'Revenue by Contract Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'smart-contract-registry', name: 'Smart Contract Registry', description: 'Track deployed contracts per chain', component: 'SmartContractRegistry', injectInto: 'projects', position: 'tab' },
    { id: 'audit-finding-log', name: 'Audit Finding Log', description: 'Log audit findings with severity', component: 'AuditFindingLog', injectInto: 'projects', position: 'panel' },
    { id: 'gas-tracker', name: 'Gas Tracker', description: 'Log deployment and transaction gas costs', component: 'GasTracker', injectInto: 'finance', position: 'panel' },
    { id: 'chain-log', name: 'Chain Log', description: 'Tag projects by blockchain', component: 'ChainLog', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'milestone'],
  defaultRateLabel: 'per hour',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Smart Contract Development Agreement',
      category: 'Blockchain',
      body: '<h2>Smart Contract Development Agreement</h2>\n<p>This Smart Contract Development Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Developer").</p>\n<h3>1. Scope</h3>\n<p>Developer will design, develop, test, and deploy smart contracts on {blockchain_network}. Contract type: {contract_type} (ERC-20, ERC-721, ERC-1155, custom). Scope: {scope}.</p>\n<h3>2. Development Process</h3>\n<p>Phase 1: Specification & Architecture ({spec_days} days). Phase 2: Implementation ({impl_days} days). Phase 3: Testing & Testnet Deployment ({test_days} days). Phase 4: Mainnet Deployment ({deploy_days} days).</p>\n<h3>3. Compensation</h3>\n<p>Total fee: $ {total_fee}. Payment schedule: {deposit_percentage}% deposit, {milestone_payments}% per milestone, balance on mainnet deployment.</p>\n<h3>3. Testing & Audit</h3>\n<p>Unit test coverage: {test_coverage}% minimum. External audit: {audit_required}. Audit cost: Client responsibility.</p>\n<h3>4. Deployment</h3>\n<p>Testnet deployment included. Mainnet deployment: Developer deploys with Client\'s keys or Client deploys with Developer guidance. Gas fees: Client responsibility.</p>\n<h3>4. Security & Warranty</h3>\n<p>Developer warrants code for {warranty_period} days post-deployment. Bug fixes during warranty included. Reentrancy, overflow, access control audited.</p>\n<h3>5. IP & License</h3>\n<p>Upon full payment, Client owns deployed contracts. Developer retains rights to libraries, patterns, and reusable components.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{blockchain_network}', '{contract_type}', '{scope}', '{total_fee}', '{deposit_percentage}', '{milestone_payments}', '{spec_days}', '{impl_days}', '{test_days}', '{deploy_days}', '{test_coverage}', '{audit_required}', '{warranty_period}'],
    },
    {
      name: 'Web3 Consulting Retainer',
      category: 'Blockchain',
      body: '<h2>Web3 Consulting Retainer</h2>\n<p>This Web3 Consulting Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Consultant").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Consultant reserves {hours_per_month} hours/month for Client. Priority access for urgent issues (exploits, governance, migrations).</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>2. Scope</h3>\n<p>Smart contract review, architecture guidance, gas optimization, upgrade planning, governance support, security best practices.</p>\n<h3>3. Payment & Reporting</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days. Monthly report: hours used, contracts reviewed, issues found.</p>\n<h3>4. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate. Unused hours do not roll over.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my contract pipeline and flag upcoming audit deadlines.',
    time: 'Help me estimate development hours by contract complexity.',
    finance: 'Compare my revenue across different blockchain ecosystems.',
  },
};

export default blockchain;
