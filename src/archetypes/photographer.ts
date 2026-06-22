import type { ArchetypeConfig } from './types';

const photographer: ArchetypeConfig = {
  id: 'photographer',
  label: 'Photographer',
  emoji: '📸',
  tagline: 'The tool for people who measure success in keepers delivered',
  description: 'Built for photographers. Track shoots, culling time, and revenue per shoot.',
  psychProfile: 'Thinks in shoots. Time is split between shoot time and culling/editing time. Storage is a real cost.',
  icon: 'Camera',
  theme: 'lens',

  dashboard: {
    greeting: "What's on your lens today?",
    subgreeting: 'Your shoots, editing ratio, and library at a glance.',
    metricCards: [
      { id: 'shoots-month', label: 'Shoots this month', query: null as any, format: 'count', color: 'blue' },
      { id: 'editing-ratio', label: 'Editing vs shoot ratio', query: null as any, format: 'text', color: 'purple' },
      { id: 'assets-count', label: 'Assets in library', query: null as any, format: 'count', color: 'green' },
      { id: 'revenue-per-shoot', label: 'Revenue per shoot (avg)', query: null as any, format: 'currency', color: 'green' },
    ],
    widgets: [
      { id: 'shoot-log-widget', component: 'ShootLogWidget', priority: 1 },
      { id: 'storage-tracker-widget', component: 'StorageTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Shoot', action: 'shoot-log', icon: 'Camera' },
      { label: 'Upload Photos', action: '/assets', icon: 'Upload' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'hybrid',
    headline: 'Shoot Economics',
    panels: [
      { id: 'revenue-per-shoot-type', title: 'Revenue per Shoot Type', component: 'RevenuePerShootTypePanel', query: 'revenuePerShootType', mode: 'quantitative', priority: 1 },
      { id: 'editing-overhead', title: 'Editing Overhead Ratio', component: 'EditingOverheadPanel', query: 'editingOverhead', mode: 'quantitative', priority: 2 },
      { id: 'shoot-volume', title: 'Shoot Volume by Month', component: 'ShootVolumePanel', query: 'shootVolume', mode: 'quantitative', priority: 3 },
      { id: 'top-clients-shoots', title: 'Top Clients by Shoot Count', component: 'TopClientsShootsPanel', query: 'topClientsShoots', mode: 'qualitative', priority: 4 },
      { id: 'storage-trend', title: 'Storage Usage Trend', component: 'StorageTrendPanel', query: 'storageTrend', mode: 'quantitative', priority: 5 },
      { id: 'delivery-turnaround', title: 'Avg Delivery Turnaround', component: 'DeliveryTurnaroundPanel', query: 'deliveryTurnaround', mode: 'quantitative', priority: 6 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'shoot-log', name: 'Shoot Log', description: 'Log individual shoots with location, type, and gear', component: 'ShootLog', injectInto: 'time', position: 'tab' },
    { id: 'culling-tracker', name: 'Culling Tracker', description: 'Track culling and editing sessions separately', component: 'CullingTracker', injectInto: 'time', position: 'panel' },
    { id: 'delivery-tracker', name: 'Delivery Tracker', description: 'Log selects, delivered count, and gallery links', component: 'DeliveryTracker', injectInto: 'projects', position: 'panel' },
    { id: 'equipment-log', name: 'Equipment Log', description: 'Track gear usage per shoot', component: 'EquipmentLog', injectInto: 'projects', position: 'tab' },
    { id: 'storage-tracker', name: 'Storage Tracker', description: 'Log storage used per project', component: 'StorageTracker', injectInto: 'assets', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'per-shoot'],
  defaultRateLabel: 'per shoot',

  aiPrompts: {
    dashboard: 'Analyze my shoot-to-edit ratio and suggest pricing adjustments.',
    time: 'Help me estimate editing time for my next shoot based on past projects.',
    finance: 'Calculate my true per-shoot rate after accounting for editing time.',
  },
};

export default photographer;
