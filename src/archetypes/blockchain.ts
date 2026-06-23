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
      { id: 'activeProjectsCount', label: 'Active contracts', query: null as any, format: 'count', color: 'blue' },
      { id: 'upcomingMilestones', label: 'Audits in progress', query: null as any, format: 'count', color: 'purple' },
      { id: 'thisWeeksHours', label: 'Hours this week', query: null as any, format: 'hours', color: 'green' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
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

  aiPrompts: {
    dashboard: 'Analyze my contract pipeline and flag upcoming audit deadlines.',
    time: 'Help me estimate development hours by contract complexity.',
    finance: 'Compare my revenue across different blockchain ecosystems.',
  },
};

export default blockchain;
