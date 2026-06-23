import type { ArchetypeConfig } from './types';

const realEstate: ArchetypeConfig = {
  id: 'real-estate',
  label: 'Real Estate Agent',
  emoji: '🏠',
  tagline: 'The tool for people who measure success in closings completed',
  description: 'Built for real estate agents. Track listings, showings, and commission checks.',
  psychProfile: 'Thinks in listings, showings, and closings. Every showing is a potential closing. Commission is everything.',
  icon: 'Home',
  theme: 'scale',

  dashboard: {
    greeting: "What's on the market?",
    subgreeting: 'Your listings, showings, and pipeline at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active listings', query: null as any, format: 'count', color: 'blue' },
      { id: 'upcomingMilestones', label: 'Showings this week', query: null as any, format: 'count', color: 'green' },
      { id: 'clientsCount', label: 'Active buyers', query: null as any, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Pending commissions', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'listing-tracker-widget', component: 'ListingTrackerWidget', priority: 1 },
      { id: 'pipeline-widget', component: 'PipelineWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Listing', action: '/projects', icon: 'FolderKanban' },
      { label: 'New Client', action: '/clients', icon: 'Users' },
      { label: 'Log Showing', action: '/time', icon: 'Clock' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Listings', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Buyers', icon: 'Users', path: '/clients' },
    { id: 'finance', label: 'Commissions', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'time', label: 'Showings', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Photos', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Real Estate Pipeline',
    panels: [
      { id: 'commission-trend', title: 'Commission Trend', component: 'CommissionTrendPanel', query: 'commissionTrend', mode: 'quantitative', priority: 1 },
      { id: 'days-on-market', title: 'Days on Market by Property', component: 'DaysOnMarketPanel', query: 'daysOnMarket', mode: 'quantitative', priority: 2 },
      { id: 'closing-rate', title: 'Showings to Closing Rate', component: 'ClosingRatePanel', query: 'closingRate', mode: 'quantitative', priority: 3 },
      { id: 'revenue-by-property-type', title: 'Revenue by Property Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 4 },
      { id: 'seasonal-trend', title: 'Seasonal Revenue Trend', component: 'SeasonalTrendPanel', query: 'seasonalTrend', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'listing-tracker', name: 'Listing Tracker', description: 'Track property details and status', component: 'ListingTracker', injectInto: 'projects', position: 'tab' },
    { id: 'showing-log', name: 'Showing Log', description: 'Log showings with feedback', component: 'ShowingLog', injectInto: 'time', position: 'tab' },
    { id: 'commission-calculator', name: 'Commission Calculator', description: 'Calculate earned and pending commissions', component: 'CommissionCalculator', injectInto: 'finance', position: 'panel' },
    { id: 'comparable-tracker', name: 'Comparable Tracker', description: 'Track comparable sales for pricing', component: 'ComparableTracker', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['commission-based', 'flat', 'hourly'],
  defaultRateLabel: 'per closing',

  aiPrompts: {
    dashboard: 'Analyze my pipeline and flag listings needing price adjustments.',
    time: 'Help me estimate showing volume needed for target income.',
    finance: 'Compare my commission rates across property types.',
  },
};

export default realEstate;
