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
      { id: 'shootsThisMonth', label: 'Shoots this month', query: null, format: 'count', color: 'blue' },
      { id: 'editingVsShootRatio', label: 'Editing vs shoot ratio', query: null, format: 'text', color: 'purple' },
      { id: 'assetsCount', label: 'Assets in library', query: null, format: 'count', color: 'green' },
      { id: 'revenuePerProjectAvg', label: 'Revenue per project (avg)', query: null, format: 'currency', color: 'green' },
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
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Photography Service Agreement',
      category: 'Photography',
      body: '<h2>Photography Service Agreement</h2>\n<p>This Photography Service Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Photographer").</p>\n<h3>1. Services</h3>\n<p>Photographer agrees to provide photography services for: {scope}</p>\n<h3>2. Shoot Details</h3>\n<p>Shoot date(s): {shoot_dates}. Location(s): {location}. Estimated duration: {duration}.</p>\n<h3>3. Compensation</h3>\n<p>Client agrees to pay Photographer {rate} per {rate_type}. A {deposit_percentage}% non-refundable deposit is due upon signing. Balance due {payment_terms} days after delivery.</p>\n<h3>4. Deliverables</h3>\n<p>Photographer will deliver {number_of_images} edited high-resolution images via online gallery within {delivery_turnaround} business days.</p>\n<h3>5. Usage Rights</h3>\n<p>Client receives a non-exclusive, perpetual license for {usage_rights}. Photographer retains copyright and may use images for portfolio/marketing unless otherwise agreed.</p>\n<h3>5. Reshoot & Cancellation</h3>\n<p>If Client cancels within {cancellation_notice} days of shoot date, deposit is forfeited. Reschedules within {reschedule_notice} days may incur a {reschedule_fee}% fee.</p>\n<h3>6. Model Releases</h3>\n<p>Client is responsible for obtaining model releases for any recognizable individuals. Photographer is not liable for claims arising from lack of releases.</p>\n<h3>7. Governing Law</h3>\n<p>This Agreement shall be governed by the laws of {jurisdiction}.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{rate}', '{rate_type}', '{deposit_percentage}', '{payment_terms}', '{number_of_images}', '{delivery_turnaround}', '{usage_rights}', '{cancellation_notice}', '{reschedule_notice}', '{reschedule_fee}', '{jurisdiction}'],
    },
    {
      name: 'Event Photography Agreement',
      category: 'Photography',
      body: '<h2>Event Photography Agreement</h2>\n<p>This Event Photography Agreement is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Photographer").</p>\n<h3>1. Event Details</h3>\n<p>Event: {event_name}. Date: {event_date}. Start time: {start_time}. End time: {end_time}. Location: {event_location}.</p>\n<h3>2. Coverage</h3>\n<p>Photographer will provide {hours_of_coverage} hours of coverage. Additional hours billed at $ {overage_rate}/hr.</p>\n<h3>3. Compensation</h3>\n<p>Total fee: $ {total_fee}. {deposit_percentage}% deposit due on signing. Balance due {payment_terms} days before event.</p>\n<h3>4. Deliverables</h3>\n<p>Client will receive {number_of_images} edited images via online gallery within {delivery_turnaround} business days. Includes password-protected client gallery.</p>\n<h3>5. Cancellation & Force Majeure</h3>\n<p>Cancellation by Client: deposit forfeited. Cancellation by Photographer: full refund. Force majeure: both parties released from obligation.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{event_name}', '{event_date}', '{start_time}', '{end_time}', '{event_location}', '{hours_of_coverage}', '{overage_rate}', '{total_fee}', '{deposit_percentage}', '{payment_terms}', '{number_of_images}', '{delivery_turnaround}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my shoot-to-edit ratio and suggest pricing adjustments.',
    time: 'Help me estimate editing time for my next shoot based on past projects.',
    finance: 'Calculate my true per-shoot rate after accounting for editing time.',
  },
};

export default photographer;
