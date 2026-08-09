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
      { id: 'activeProjectsCount', label: 'Active listings', query: null, format: 'count', color: 'blue' },
      { id: 'upcomingMilestones', label: 'Showings this week', query: null, format: 'count', color: 'green' },
      { id: 'clientsCount', label: 'Active buyers', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Pending commissions', query: null, format: 'currency', color: 'amber' },
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
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Listing Agreement',
      category: 'Real Estate',
      body: '<h2>Exclusive Listing Agreement</h2>\n<p>This Exclusive Listing Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Seller") and {freelancer_name} ("Agent").</p>\n<h3>1. Property</h3>\n<p>Address: {property_address}. Property type: {property_type}. Asking price: $ {listing_price}.</p>\n<h3>2. Agency & Commission</h3>\n<p>Agent commission: {commission_percentage}% of sale price. Co-broker commission: {cobroke_percentage}%. Payable at closing.</p>\n<h3>3. Term</h3>\n<p>Exclusive listing period: {listing_period_days} days. Auto-renews for {renewal_period_days} days unless terminated with {notice_period} days notice.</p>\n<h3>4. Marketing</h3>\n<p>Agent will: {marketing_plan}. Photography: {photography_included}. Virtual tour: {virtual_tour_included}. MLS listing: {mls_included}.</p>\n<h3>5. Termination</h3>\n<p>Either party may terminate with {termination_notice} days written notice. Seller liable for marketing costs incurred.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{property_address}', '{property_type}', '{listing_price}', '{commission_percentage}', '{cobroke_percentage}', '{listing_period_days}', '{renewal_period_days}', '{notice_period}', '{marketing_plan}', '{photography_included}', '{virtual_tour_included}', '{mls_included}', '{termination_notice}'],
    },
    {
      name: 'Buyer Representation Agreement',
      category: 'Real Estate',
      body: '<h2>Buyer Representation Agreement</h2>\n<p>This Buyer Representation Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Buyer") and {freelancer_name} ("Agent").</p>\n<h3>1. Scope</h3>\n<p>Agent will assist Buyer in finding and purchasing property in: {search_areas}. Price range: ${price_min} - ${price_max}. Property type: {property_types}.</p>\n<h3>2. Agency & Compensation</h3>\n<p>Agent represents Buyer exclusively. Commission paid by Seller via co-broker agreement. If Seller does not offer co-broke, Buyer pays: {buyer_commission}%.</p>\n<h3>3. Services</h3>\n<p>Property search, showings, market analysis, offer preparation, negotiation, inspection coordination, closing coordination.</p>\n<h3>4. Term</h3>\n<p>Term: {term_days} days. Auto-renews unless terminated with {notice_period} days notice.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{search_areas}', '{price_min}', '{price_max}', '{property_types}', '{buyer_commission}', '{term_days}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my pipeline and flag listings needing price adjustments.',
    time: 'Help me estimate showing volume needed for target income.',
    finance: 'Compare my commission rates across property types.',
  },
};

export default realEstate;
