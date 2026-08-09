import type { ArchetypeConfig } from './types';

const eventPlanner: ArchetypeConfig = {
  id: 'event-planner',
  label: 'Event Planner',
  emoji: '🎪',
  tagline: 'The tool for people who measure success in events that go off without a hitch',
  description: 'Built for event planners. Track vendors, run-of-show, and event budgets.',
  psychProfile: 'Thinks in guest counts, vendor coordination, and run-of-show. The date doesn\'t move.',
  icon: 'PartyPopper',
  theme: 'studio',

  dashboard: {
    greeting: "What's on the calendar?",
    subgreeting: 'Your events, vendors, and budgets at a glance.',
    metricCards: [
      { id: 'upcomingMilestones', label: 'Upcoming events (7d)', query: null, format: 'count', color: 'green' },
      { id: 'activeProjectsCount', label: 'Active vendor contracts', query: null, format: 'count', color: 'blue' },
      { id: 'expensesTotal', label: 'Event budget committed', query: null, format: 'currency', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'run-of-show-widget', component: 'RunOfShowWidget', priority: 1 },
      { id: 'vendor-directory-widget', component: 'VendorDirectoryWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Event', action: '/projects', icon: 'FolderKanban' },
      { label: 'Add Vendor', action: '/clients', icon: 'Users' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Events', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Vendors', icon: 'Users', path: '/clients' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'assets', label: 'Event Assets', icon: 'Package', path: '/assets' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'hybrid',
    headline: 'Event Economics',
    panels: [
      { id: 'revenue-per-event-type', title: 'Revenue per Event Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 1 },
      { id: 'budget-vs-actual', title: 'Budget vs Actual per Event', component: 'BudgetVsActualPanel', query: 'budgetVsActual', mode: 'quantitative', priority: 2 },
      { id: 'events-per-month', title: 'Events per Month', component: 'EventsPerMonthPanel', query: 'eventsPerMonth', mode: 'quantitative', priority: 3 },
      { id: 'vendor-spend', title: 'Top Vendors by Spend', component: 'VendorSpendPanel', query: 'vendorSpend', mode: 'qualitative', priority: 4 },
      { id: 'guest-count-trend', title: 'Guest Count Trend', component: 'GuestCountTrendPanel', query: 'guestCountTrend', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'vendor-directory', name: 'Vendor Directory', description: 'Track vendors with contact and rates', component: 'VendorDirectory', injectInto: 'clients', position: 'tab' },
    { id: 'run-of-show-builder', name: 'Run of Show Builder', description: 'Build event timelines', component: 'RunOfShowBuilder', injectInto: 'projects', position: 'tab' },
    { id: 'guest-list', name: 'Guest List', description: 'Track guest list per event', component: 'GuestList', injectInto: 'projects', position: 'panel' },
    { id: 'budget-vs-actual-tracker', name: 'Budget vs Actual Tracker', description: 'Track event budget vs actual spend', component: 'BudgetVsActualTracker', injectInto: 'finance', position: 'panel' },
  ],

  proposalTypes: ['flat', 'per-event', 'hourly'],
  defaultRateLabel: 'per event',
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Event Planning Agreement',
      category: 'Events',
      body: '<h2>Event Planning Agreement</h2>\n<p>This Event Planning Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Event Planner").</p>\n<h3>1. Event Details</h3>\n<p>Event: {event_name}. Date: {event_date}. Start: {start_time}. End: {end_time}. Venue: {venue_name}. Guest count: {guest_count}.</p>\n<h3>2. Services</h3>\n<p>Planner will provide: {services_list}. Includes: vendor coordination, timeline management, budget tracking, on-site coordination.</p>\n<h3>3. Fees</h3>\n<p>Planning fee: $ {planning_fee}. Coordination fee (day-of): $ {coordination_fee}. Total: $ {total_fee}. {deposit_percentage}% deposit on signing.</p>\n<h3>4. Vendor Management</h3>\n<p>Planner coordinates vendors. Client approves all vendor contracts. Vendor payments: {vendor_payment_responsibility}.</p>\n<h3>5. Cancellation</h3>\n<p>Cancellation {cancellation_days} days prior: {cancellation_refund}% refund. Cancellation within {last_minute_days} days: deposit forfeited.</p>\n<h3>6. Force Majeure</h3>\n<p>Event rescheduled: fees applied to new date. Event cancelled: deposit forfeited, planner reimbursed for expenses.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{event_name}', '{event_date}', '{start_time}', '{end_time}', '{venue_name}', '{guest_count}', '{services_list}', '{planning_fee}', '{coordination_fee}', '{total_fee}', '{deposit_percentage}', '{vendor_payment_responsibility}', '{cancellation_days}', '{cancellation_refund}', '{last_minute_days}'],
    },
    {
      name: 'Event Coordination Agreement (Day-of Only)',
      category: 'Events',
      body: '<h2>Day-of Event Coordination Agreement</h2>\n<p>This Day-of Coordination Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Coordinator").</p>\n<h3>1. Event Details</h3>\n<p>Event: {event_name}. Date: {event_date}. Venue: {venue_name}. Expected guests: {guest_count}.</p>\n<h3>2. Coordination Services</h3>\n<p>Coordinator manages: vendor arrival, timeline execution, guest flow, issue resolution, vendor payments, breakdown coordination.</p>\n<h3>2. Fee</h3>\n<p>Coordination fee: $ {coordination_fee}. {deposit_percentage}% deposit on signing. Balance due {payment_terms} days before event.</p>\n<h3>3. Timeline</h3>\n<p>Pre-event call: {pre_event_weeks} weeks before. Final walkthrough: {walkthrough_days} days before. Day-of: {start_time} to {end_time}.</p>\n<h3>4. Liability</h3>\n<p>Coordinator not liable for vendor failures. Client holds harmless for venue/guest issues.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{event_name}', '{event_date}', '{venue_name}', '{guest_count}', '{coordination_fee}', '{deposit_percentage}', '{payment_terms}', '{pre_event_weeks}', '{walkthrough_days}', '{start_time}', '{end_time}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my upcoming events and flag potential conflicts.',
    time: 'Help me estimate planning hours by event type.',
    finance: 'Compare my event profitability across different event types.',
  },
};

export default eventPlanner;
