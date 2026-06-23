import type { ArchetypeConfig } from './types';

const designer: ArchetypeConfig = {
  id: 'designer',
  label: 'Graphic / Brand Designer',
  emoji: '🎨',
  tagline: 'The tool for people who measure success in rounds survived',
  description: 'Built for brand and graphic designers. Track revision cycles, assets, and client feedback.',
  psychProfile: 'Thinks in rounds. Every client relationship is measured by how many revision rounds they burn. Asset handoff is the finish line.',
  icon: 'Palette',
  theme: 'studio',

  dashboard: {
    greeting: 'What are you designing today?',
    subgreeting: 'Your projects, revisions, and asset deliveries at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active revision cycles', query: null, format: 'count', color: 'purple' },
      { id: 'draftsCount', label: 'Awaiting client feedback', query: null, format: 'count', color: 'amber' },
      { id: 'assetsCount', label: 'Assets delivered this month', query: null, format: 'count', color: 'green' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'revision-tracker-widget', component: 'RevisionTrackerWidget', priority: 1 },
      { id: 'brand-vault-widget', component: 'BrandVaultWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Upload Asset', action: '/assets', icon: 'Upload' },
      { label: 'New Proposal', action: '/proposals/new', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Client & Revision Health',
    panels: [
      { id: 'revision-rounds-client', title: 'Revision Rounds per Client', component: 'RevisionRoundsPanel', query: 'revisionRounds', mode: 'qualitative', priority: 1 },
      { id: 'avg-rounds-type', title: 'Avg Rounds per Project Type', component: 'AvgRoundsTypePanel', query: 'avgRoundsType', mode: 'qualitative', priority: 2 },
      { id: 'feedback-frequency', title: 'Client Feedback Frequency', component: 'FeedbackFrequencyPanel', query: 'feedbackFrequency', mode: 'qualitative', priority: 3 },
      { id: 'asset-volume', title: 'Asset Volume per Project', component: 'AssetVolumePanel', query: 'assetVolume', mode: 'qualitative', priority: 4 },
      { id: 'on-time-delivery', title: 'On-Time Delivery Rate', component: 'OnTimeDeliveryPanel', query: 'onTimeDelivery', mode: 'qualitative', priority: 5 },
      { id: 'most-revised-clients', title: 'Most-Revised Clients', component: 'MostRevisedClientsPanel', query: 'mostRevisedClients', mode: 'qualitative', priority: 6 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'revision-tracker', name: 'Revision Tracker', description: 'Log revision rounds and warn at contract limits', component: 'RevisionTracker', injectInto: 'projects', position: 'panel' },
    { id: 'brand-vault', name: 'Brand Vault', description: 'Organize brand deliverables by type', component: 'BrandVault', injectInto: 'assets', position: 'tab' },
    { id: 'mood-board', name: 'Mood Board', description: 'Attach reference images per project', component: 'MoodBoard', injectInto: 'projects', position: 'tab' },
    { id: 'feedback-log', name: 'Feedback Log', description: 'Track client communication patterns', component: 'FeedbackLog', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my design pipeline and flag clients with high revision counts.',
    proposals: 'Help me scope design projects based on past revision data.',
    finance: 'Compare my design rates to my effective hourly after revisions.',
  },
};

export default designer;
