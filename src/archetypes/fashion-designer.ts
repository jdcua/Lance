import type { ArchetypeConfig } from './types';

const fashionDesigner: ArchetypeConfig = {
  id: 'fashion-designer',
  label: 'Fashion Designer / Stylist',
  emoji: '👗',
  tagline: 'The tool for people who measure success in looks delivered',
  description: 'Built for fashion designers and stylists. Track collections, fittings, and sourcing.',
  psychProfile: 'Thinks in collections, seasons, and fabric swatches. Every look is a deliverable. Sourcing is half the work.',
  icon: 'Shirt',
  theme: 'studio',

  dashboard: {
    greeting: "What are you designing?",
    subgreeting: 'Your collections, fittings, and sourcing at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active collections', query: null, format: 'count', color: 'purple' },
      { id: 'upcomingMilestones', label: 'Fittings this week', query: null, format: 'count', color: 'blue' },
      { id: 'expensesTotal', label: 'Materials cost this month', query: null, format: 'currency', color: 'amber' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'collection-tracker-widget', component: 'CollectionTrackerWidget', priority: 1 },
      { id: 'sourcing-log-widget', component: 'SourcingLogWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Collection', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Fitting', action: '/time', icon: 'Clock' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Collections', icon: 'FolderKanban', path: '/projects' },
    { id: 'assets', label: 'Lookbook', icon: 'Package', path: '/assets' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Collection Economics',
    panels: [
      { id: 'revenue-per-collection', title: 'Revenue per Collection', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 1 },
      { id: 'material-cost-ratio', title: 'Material Cost Ratio', component: 'MaterialCostPanel', query: 'materialCost', mode: 'quantitative', priority: 2 },
      { id: 'looks-per-collection', title: 'Looks per Collection', component: 'LooksPerCollectionPanel', query: 'looksPerCollection', mode: 'quantitative', priority: 3 },
      { id: 'top-clients-collections', title: 'Top Clients by Collection', component: 'TopClientsPanel', query: 'topClients', mode: 'qualitative', priority: 4 },
      { id: 'seasonal-trend', title: 'Seasonal Revenue Trend', component: 'SeasonalTrendPanel', query: 'seasonalTrend', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'collection-tracker', name: 'Collection Tracker', description: 'Track pieces, fabrics, and status per collection', component: 'CollectionTracker', injectInto: 'projects', position: 'tab' },
    { id: 'sourcing-log', name: 'Sourcing Log', description: 'Log fabric and trim suppliers', component: 'SourcingLog', injectInto: 'finance', position: 'panel' },
    { id: 'fitting-log', name: 'Fitting Log', description: 'Log fittings with notes and alterations', component: 'FittingLog', injectInto: 'time', position: 'tab' },
    { id: 'lookbook', name: 'Lookbook', description: 'Organize final looks with photos', component: 'Lookbook', injectInto: 'assets', position: 'tab' },
  ],

  proposalTypes: ['flat', 'per-look', 'hourly'],
  defaultRateLabel: 'per look',
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Fashion Design Agreement',
      category: 'Fashion',
      body: '<h2>Fashion Design Agreement</h2>\n<p>This Fashion Design Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Designer").</p>\n<h3>1. Collection Scope</h3>\n<p>Designer will create a collection of {number_of_looks} looks. Category: {category}. Season: {season}. Target market: {target_market}.</p>\n<h3>2. Design Process</h3>\n<p>Phase 1: Mood Board & Sketches ({moodboard_days} days). Phase 2: Pattern Development ({pattern_days} days). Phase 3: Sample Production ({sample_days} days). Phase 4: Final Production ({production_days} days).</p>\n<h3>2. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Total estimated: $ {estimated_total}. {deposit_percentage}% deposit. Milestones: {milestone_schedule}.</p>\n<h3>3. Materials & Sourcing</h3>\n<p>Designer sources fabrics/trims. Client approves swatches. Fabric budget: $ {fabric_budget}. Client reimburses material costs.</p>\n<h3>3. Fittings & Revisions</h3>\n<p>Includes {included_fittings} fittings per look. Additional fittings: $ {additional_fitting_fee} each. Revisions: {included_revisions} rounds included.</p>\n<h3>4. IP & Usage</h3>\n<p>Client owns final patterns and samples. Designer retains rights to use images for portfolio. Designer retains proprietary patterns unless purchased separately.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{number_of_looks}', '{category}', '{season}', '{target_market}', '{rate}', '{rate_type}', '{deposit_percentage}', '{estimated_total}', '{moodboard_days}', '{pattern_days}', '{sample_days}', '{production_days}', '{included_fittings}', '{additional_fitting_fee}', '{included_revisions}'],
    },
    {
      name: 'Styling Services Agreement',
      category: 'Styling',
      body: '<h2>Personal Styling Agreement</h2>\n<p>This Styling Services Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Stylist").</p>\n<h3>1. Services</h3>\n<p>Stylist provides: {services_list}. Includes: wardrobe audit, personal shopping, outfit planning, event styling.</p>\n<h3>2. Sessions</h3>\n<p>Initial consultation: {initial_consultation_hours} hours. Follow-up sessions: {session_count} sessions of {session_duration} hours each.</p>\n<h3>2. Fees</h3>\n<p>Styling fee: $ {styling_fee}. Shopping budget: $ {shopping_budget} (Client reimburses). Stylist commission: {commission_percentage}% on purchases.</p>\n<h3>3. Payment</h3>\n<p>{deposit_percentage}% deposit. Balance due Net {payment_terms} days after final session.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{services_list}', '{initial_consultation_hours}', '{session_count}', '{session_duration}', '{styling_fee}', '{shopping_budget}', '{commission_percentage}', '{deposit_percentage}', '{payment_terms}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my collection pipeline and suggest where to focus.',
    time: 'Help me estimate design time per look.',
    finance: 'Compare my material cost ratio across collections.',
  },
};

export default fashionDesigner;
