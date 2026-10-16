import type { ArchetypeConfig } from './types';

const embedded: ArchetypeConfig = {
  id: 'embedded',
  label: 'Hardware / Embedded Engineer',
  emoji: '🔌',
  tagline: 'The tool for people who measure success in prototypes shipped',
  description: 'Built for hardware and embedded engineers. Track builds, components, and fabrication.',
  psychProfile: 'Thinks in schematics, BOMs, and fabrication runs. Components have lead times. Prototypes iterate fast.',
  icon: 'Cpu',
  theme: 'terminal',

  dashboard: {
    greeting: "What's on the bench?",
    subgreeting: 'Your builds, components, and fabrication at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active builds', query: null, format: 'count', color: 'blue' },
      { id: 'expensesTotal', label: 'Component cost this month', query: null, format: 'currency', color: 'amber' },
      { id: 'upcomingMilestones', label: 'Fabrication orders pending', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'bom-tracker-widget', component: 'BOMTrackerWidget', priority: 1 },
      { id: 'prototype-log-widget', component: 'PrototypeLogWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Build', action: '/projects', icon: 'FolderKanban' },
      { label: 'Add Component', action: '/finance', icon: 'Plus' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Builds', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'BOM Costs', icon: 'BarChart3', path: '/finance' },
    { id: 'assets', label: 'Schematics', icon: 'Package', path: '/assets' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Build Economics',
    panels: [
      { id: 'revenue-per-build', title: 'Revenue per Build', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 1 },
      { id: 'component-cost-ratio', title: 'Component Cost Ratio', component: 'ComponentCostPanel', query: 'componentCost', mode: 'quantitative', priority: 2 },
      { id: 'prototype-iterations', title: 'Prototype Iterations', component: 'PrototypeIterationsPanel', query: 'prototypeIterations', mode: 'quantitative', priority: 3 },
      { id: 'fabrication-lead-time', title: 'Fabrication Lead Time Impact', component: 'FabLeadTimePanel', query: 'fabLeadTime', mode: 'quantitative', priority: 4 },
      { id: 'revenue-by-type', title: 'Revenue by Build Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'bom-tracker', name: 'BOM Tracker', description: 'Bill of materials with costs and suppliers', component: 'BOMTracker', injectInto: 'projects', position: 'tab' },
    { id: 'prototype-log', name: 'Prototype Log', description: 'Log prototype versions and test results', component: 'PrototypeLog', injectInto: 'projects', position: 'panel' },
    { id: 'fabrication-tracker', name: 'Fabrication Tracker', description: 'Track fab orders and lead times', component: 'FabricationTracker', injectInto: 'finance', position: 'panel' },
    { id: 'component-inventory', name: 'Component Inventory', description: 'Track component stock and reorder points', component: 'ComponentInventory', injectInto: 'assets', position: 'tab' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Embedded Engineering Agreement',
      category: 'Embedded',
      body: '<h2>Embedded Engineering Agreement</h2>\n<p>This Embedded Engineering Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Engineer").</p>\n<h3>1. Scope</h3>\n<p>Engineer will develop firmware/software for: {project_name}. Hardware: {hardware_platform}. MCU: {mcu}. RTOS: {rtos}.</p>\n<h3>2. Development Phases</h3>\n<p>Phase 1: Architecture & HAL ({arch_weeks} weeks). Phase 2: Driver & Middleware ({driver_weeks} weeks). Phase 3: Application Logic ({app_weeks} weeks). Phase 4: Integration & Test ({test_weeks} weeks).</p>\n<h3>2. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Estimated total: $ {estimated_total}. {deposit_percentage}% deposit. Milestone payments per phase.</p>\n<h3>3. Hardware & BOM</h3>\n<p>Client provides: {client_provided_hw}. Engineer specifies BOM: {bom_responsibility}. Component procurement: {procurement_responsibility}.</p>\n<h3>3. Testing & Delivery</h3>\n<p>Unit test coverage: {test_coverage}%. Hardware-in-loop testing: {hil_required}. Delivery: {delivery_format} (hex, bin, elf). Source code upon full payment.</p>\n<h3>4. Warranty</h3>\n<p>Warranty period: {warranty_months} months. Bug fixes included. Field failure analysis: $ {field_analysis_rate}/hr.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{project_name}', '{hardware_platform}', '{mcu}', '{rtos}', '{scope}', '{rate}', '{rate_type}', '{deposit_percentage}', '{estimated_total}', '{delivery_format}', '{warranty_months}'],
    },
    {
      name: 'Hardware Design Agreement',
      category: 'Hardware',
      body: '<h2>Hardware Design Agreement</h2>\n<p>This Hardware Design Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Engineer").</p>\n<h3>1. Scope</h3>\n<p>Engineer will design: {board_description}. Layers: {layer_count}. Components: {component_count}. Target: {target_application}.</p>\n<h3>2. Deliverables</h3>\n<p>Schematics, PCB layout (Gerbers), BOM, assembly drawings, 3D models, DRC/ERC reports, assembly/test procedures.</p>\n<h3>3. Fees</h3>\n<p>Schematic: $ {schematic_fee}. Layout: $ {layout_fee}. BOM optimization: $ {bom_opt_fee}. Total: $ {total_fee}. {deposit_percentage}% deposit.</p>\n<h3>3. Revisions</h3>\n<p>Includes {included_revisions} layout revisions. Additional spins: $ {additional_spin_fee} each.</p>\n<h3>4. Fabrication</h3>\n<p>Fab house: {fab_house}. Lead time: {lead_time_days} days. Assembly: {assembly_required}. Stencil: {stencil_required}.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{board_description}', '{layer_count}', '{component_count}', '{target_application}', '{schematic_fee}', '{layout_fee}', '{bom_opt_fee}', '{total_fee}', '{deposit_percentage}', '{included_revisions}', '{additional_spin_fee}', '{fab_house}', '{lead_time_days}', '{assembly_required}', '{stencil_required}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my build pipeline and flag component availability risks.',
    time: 'Help me estimate build hours based on complexity.',
    finance: 'Compare BOM costs across similar builds.',
  },
};

export default embedded;
