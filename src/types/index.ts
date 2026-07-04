export type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  preferred_currency?: string;
  created_at: string;
};

export type Project = {
  id: string;
  client_id: string;
  title: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  start_date?: string;
  end_date?: string;
  budget?: number;
  notes?: string;
  color?: string;
  created_at: string;
};

export type Milestone = {
  id: string;
  project_id: string;
  title: string;
  due_date?: string;
  completed: boolean;
  invoice_on_completion: boolean;
};

export type Proposal = {
  id: string;
  client_id: string;
  project_id?: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  scope?: string;
  timeline?: string;
  rate?: number;
  rate_type: 'flat' | 'hourly';
  body?: string;
  sent_at?: string;
  expires_at?: string;
  created_at: string;
};

export type Contract = {
  id: string;
  client_id: string;
  project_id?: string;
  proposal_id?: string;
  title: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  body?: string;
  signed_at?: string;
  created_at: string;
};

export type TimeEntry = {
  id: string;
  project_id: string;
  client_id: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  billable: boolean;
  invoiced: boolean;
};

export type Invoice = {
  id: string;
  client_id: string;
  project_id?: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue';
  line_items: LineItem[];
  subtotal: number;
  tax_rate?: number;
  total: number;
  due_date?: string;
  paid_at?: string;
  notes?: string;
  currency?: string;
  created_at: string;
};

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type InvoicePayment = {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string;
  notes?: string;
  created_at: string;
};

export type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  recurring?: boolean;
  frequency?: string;
};

export type UserProfile = {
  id?: number;
  name?: string;
  email?: string;
  hourly_rate?: number;
  currency: string;
  writing_voice?: string;
  tax_rate?: number;
  payment_terms?: number;
  tagline?: string;
  always_include?: string;
  writing_style?: string;
  theme?: string;
  license_key?: string;
  licensed_at?: string;
  ai_enabled?: boolean;
  profession?: string;
  custom_archetype_config?: string;
  density?: string;
  accent_color?: string;
  proposal_expiry_days?: number;
  income_target?: number;
};

export type Communication = {
  id: string;
  client_id: string;
  type: 'note' | 'call' | 'email' | 'meeting';
  summary: string;
  date: string;
  created_at: string;
};

export type RecurringInvoice = {
  id: string;
  client_id: string;
  project_id?: string;
  title: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  line_items: LineItem[];
  subtotal: number;
  tax_rate?: number;
  total: number;
  notes?: string;
  active: boolean;
  next_due: string;
  last_generated?: string;
  last_catch_up_warning?: string;
  created_at: string;
};

export type ImportLog = {
  id: string;
  filename: string;
  file_type: string;
  file_path: string;
  detected_type?: string;
  target_entity?: string;
  target_id?: string;
  status: 'pending' | 'imported' | 'skipped' | 'error';
  error_message?: string;
  imported_at: string;
};

export type Attachment = {
  id: string;
  entity_type: 'client' | 'project' | 'proposal' | 'contract' | 'invoice' | 'library';
  entity_id: string;
  filename: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  tags: string;
  notes?: string;
  created_at: string;
};

export type AssetStats = {
  total_files: number;
  total_size_bytes: number;
  by_entity: Array<{
    entity_type: string;
    entity_id: string;
    count: number;
  }>;
};

export type MetricDefinition = {
  id: string;
  client_id: string;
  name: string;
  metric_type: 'number' | 'percentage' | 'currency' | 'text';
  unit_label?: string;
  is_headline: boolean;
  sort_order: number;
  created_at: string;
};

export type MetricValue = {
  id: string;
  definition_id: string;
  client_id: string;
  value: string;
  period: string;
  notes?: string;
  created_at: string;
};

export type MetricTemplate = {
  id: string;
  name: string;
  definitions_json: string;
  created_at: string;
};

export type HeadlineMetric = {
  client_id: string;
  client_name: string;
  definition_id: string;
  metric_name: string;
  metric_type: string;
  unit_label?: string;
  latest_value?: string;
  previous_value?: string;
  values: MetricValue[];
};

export type FollowUpLog = {
  id: string;
  entity_type: 'proposal' | 'invoice';
  entity_id: string;
  stage: number;
  status: 'pending' | 'sent' | 'dismissed' | 'snoozed' | 'responded' | 'paid' | 'superseded';
  drafted_at: string;
  actioned_at?: string;
  action?: string;
};

export type FollowUpSettings = {
  enabled: boolean;
  proposal_delay_days: number;
  invoice_delay_days: number;
  templates: Record<string, string>;
  subject_templates: Record<string, string>;
};

export type DetectedEntityType =
  | 'client_list'
  | 'project_list'
  | 'invoice'
  | 'expense_list'
  | 'contract'
  | 'proposal'
  | 'financial_data'
  | 'attachment'
  | 'unknown';

export type ImportFileType = 'spreadsheet' | 'document' | 'image';

export type ImportDetection = {
  file: File;
  fileType: ImportFileType;
  detectedEntity: DetectedEntityType;
  confidence: number;
  preview: ImportPreview;
  columnMapping?: Record<string, string>;
  userOverride?: DetectedEntityType;
  skipped?: boolean;
  targetEntityId?: string;
};

export type ImportPreview = {
  headers?: string[];
  rows?: Record<string, string>[];
  extractedFields?: Record<string, string>;
  extractedLineItems?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  rawText?: string;
  summary: string;
  rowCount?: number;
  imageDataUrl?: string;
  imageDimensions?: { width: number; height: number };
};

export type ExportTemplate = {
  id: string;
  name: string;
  type: 'invoice_pdf' | 'proposal_pdf' | 'proposal_docx' | 'contract_docx';
  header?: string;
  footer?: string;
  sections: string[];
  color_scheme?: string;
  created_at: string;
};

export type ContractTemplate = {
  id: string;
  name: string;
  category?: string;
  body: string;
  variables: string[];
  created_at: string;
};

// ── Archetype domain tables ──

export type ArchetypeRenderLog = {
  id: string;
  project_id: string;
  pass_name?: string;
  duration_minutes?: number;
  software?: string;
  frame_range?: string;
  notes?: string;
  created_at: string;
};

export type ArchetypeSession = {
  id: string;
  client_id: string;
  project_id?: string;
  session_type?: string;
  duration_minutes?: number;
  notes?: string;
  action_items?: string;
  next_session_date?: string;
  created_at: string;
};

export type ArchetypeShoot = {
  id: string;
  project_id: string;
  shoot_date?: string;
  location?: string;
  shoot_type?: string;
  camera_system?: string;
  hours_on_location?: number;
  conditions_notes?: string;
  created_at: string;
};

export type ArchetypeRevision = {
  id: string;
  project_id: string;
  round_number: number;
  change_summary?: string;
  approved: boolean;
  created_at: string;
};

export type ArchetypeBuild = {
  id: string;
  project_id: string;
  version?: string;
  platform?: string;
  notes?: string;
  created_at: string;
};

export type ArchetypeKeyword = {
  id: string;
  client_id: string;
  keyword: string;
  position_start?: number;
  position_current?: number;
  target_position?: number;
  created_at: string;
};

export type ArchetypeDataset = {
  id: string;
  project_id: string;
  dataset_name?: string;
  source?: string;
  size_bytes?: number;
  format_type?: string;
  license_type?: string;
  created_at: string;
};

export type ProjectTemplate = {
  id: string;
  name: string;
  description?: string;
  default_budget?: number;
  default_status: string;
  is_default: boolean;
  created_at: string;
};

export type ProjectTemplateMilestone = {
  id: string;
  template_id: string;
  title: string;
  days_from_start: number;
  invoice_on_completion: boolean;
};

export type ShareToken = {
  id: number;
  token: string;
  entity_type: 'proposal' | 'contract';
  entity_id: string;
  created_at: string;
  expires_at?: string;
  viewed_at?: string;
  view_count: number;
  client_response?: 'accepted' | 'declined';
  client_response_at?: string;
  client_name?: string;
  client_signature?: string;
  client_signed_at?: string;
};

export type PortalActivity = {
  entity_type: string;
  entity_id: string;
  token: string;
  activity: string;
  timestamp: string;
};

// ── Phase tracker ──
export type ProjectPhase = {
  id: string;
  project_id: string;
  phase_name: string;
  status: string;
  color?: string;
};

export type TimeEntryPhase = {
  id: string;
  time_entry_id: string;
  phase_id: string;
};

// ── Deliverables (Animator) ──
export type Deliverable = {
  id: string;
  project_id: string;
  file_name?: string;
  format?: string;
  resolution?: string;
  delivery_date?: string;
  client_approved: boolean;
  notes?: string;
};

// ── Sprint tasks (Developer) ──
export type SprintTask = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  priority: string;
  hours_estimated?: number;
  hours_actual?: number;
  sort_order: number;
  created_at: string;
};

// ── Project stack (Developer) ──
export type ProjectStack = {
  id: string;
  project_id: string;
  technology: string;
  category: string;
};

// ── Bugs (Developer) ──
export type Bug = {
  id: string;
  project_id: string;
  title: string;
  priority: string;
  status: string;
  hours_spent?: number;
  created_at: string;
  resolved_at?: string;
};

// ── Mood board (Designer) ──
export type MoodBoardItem = {
  id: string;
  project_id: string;
  asset_id?: string;
  url?: string;
  notes?: string;
  sort_order: number;
};

// ── Client feedback (Designer) ──
export type ClientFeedback = {
  id: string;
  client_id: string;
  project_id?: string;
  date: string;
  medium: string;
  summary: string;
  actioned: boolean;
};

// ── Culling sessions (Photographer) ──
export type CullingSession = {
  id: string;
  project_id: string;
  shoot_id?: string;
  date?: string;
  shoot_hours?: number;
  culling_hours?: number;
  editing_hours?: number;
  notes?: string;
};

// ── Project deliveries (Photographer) ──
export type ProjectDelivery = {
  id: string;
  project_id: string;
  selects_count?: number;
  delivered_count?: number;
  gallery_link?: string;
  delivery_date?: string;
  notes?: string;
};

// ── Equipment usage (Photographer) ──
export type EquipmentUsage = {
  id: string;
  project_id: string;
  shoot_id?: string;
  equipment_name: string;
  equipment_type: string;
  notes?: string;
};

// ── Storage log (Photographer) ──
export type StorageLog = {
  id: string;
  project_id: string;
  raw_gb?: number;
  exported_gb?: number;
  logged_date: string;
};

// ── Time entry words (Writer) ──
export type TimeEntryWords = {
  id: string;
  time_entry_id: string;
  word_count: number;
};

// ── Publications (Writer) ──
export type Publication = {
  id: string;
  project_id: string;
  outlet_name?: string;
  url?: string;
  publish_date?: string;
  byline?: string;
  notes?: string;
};

// ── Client style guides (Writer) ──
export type ClientStyleGuide = {
  id: string;
  client_id: string;
  tone?: string;
  formatting_rules?: string;
  banned_words?: string;
  style_guide_ref?: string;
  notes?: string;
};

// ── Retainers (Consultant) ──
export type Retainer = {
  id: string;
  client_id: string;
  monthly_hours: number;
  rate: number;
  renewal_date?: string;
  active: boolean;
};

// ── Action items (Consultant) ──
export type ActionItem = {
  id: string;
  client_id: string;
  session_id?: string;
  title: string;
  owner: string;
  due_date?: string;
  completed: boolean;
  created_at: string;
};

// ── Outcomes (Consultant) ──
export type Outcome = {
  id: string;
  project_id: string;
  before_state?: string;
  after_state?: string;
  metrics_improved?: string;
  testimonial_draft?: string;
  created_at: string;
};

// ── Shots (Filmmaker) ──
export type Shot = {
  id: string;
  project_id: string;
  scene?: string;
  description?: string;
  status: string;
  sort_order: number;
};

// ── Cuts (Filmmaker) ──
export type Cut = {
  id: string;
  project_id: string;
  cut_name?: string;
  duration_seconds?: number;
  format?: string;
  client_approved: boolean;
  delivery_date?: string;
  notes?: string;
};

// ── Deliverable specs (Filmmaker) ──
export type DeliverableSpec = {
  id: string;
  project_id: string;
  format?: string;
  resolution?: string;
  aspect_ratio?: string;
  audio_spec?: string;
  delivery_method?: string;
  notes?: string;
};

// ── Commissions (Illustrator) ──
export type Commission = {
  id: string;
  client_id: string;
  title: string;
  brief?: string;
  deadline?: string;
  payment_status: string;
  sort_order: number;
  status: string;
};

// ── Project style tags (Illustrator) ──
export type ProjectStyleTag = {
  id: string;
  project_id: string;
  tag: string;
};

// ── Asset licenses (Illustrator, Musician) ──
export type AssetLicense = {
  id: string;
  asset_id: string;
  license_type: string;
  licensee?: string;
  term?: string;
  fee?: number;
  currency: string;
  created_at: string;
};

// ── Project complexity (3D Artist) ──
export type ProjectComplexity = {
  id: string;
  project_id: string;
  poly_count?: string;
  texture_count?: number;
  rig_complexity?: string;
  software?: string;
  notes?: string;
};

// ── Format deliverables (3D Artist) ──
export type FormatDeliverable = {
  id: string;
  project_id: string;
  format?: string;
  poly_spec?: string;
  texture_spec?: string;
  delivered: boolean;
  delivery_date?: string;
};

// ── Game features (Game Developer) ──
export type GameFeature = {
  id: string;
  project_id: string;
  title: string;
  priority: string;
  status: string;
  hours_estimated?: number;
  hours_actual?: number;
  sort_order: number;
};

// ── Project platforms (Game Developer) ──
export type ProjectPlatform = {
  id: string;
  project_id: string;
  engine?: string;
  target_platform?: string;
};

// ── QA sessions (Game Developer) ──
export type QASession = {
  id: string;
  project_id: string;
  date?: string;
  build_version?: string;
  bugs_found?: number;
  bugs_fixed?: number;
  hours?: number;
  notes?: string;
};

// ── Build deliveries (Game Developer) ──
export type BuildDelivery = {
  id: string;
  project_id: string;
  version?: string;
  date?: string;
  platform?: string;
  notes?: string;
  created_at: string;
};

// ── Research activities (UX Designer) ──
export type ResearchActivity = {
  id: string;
  project_id: string;
  type: string;
  date?: string;
  participants?: number;
  key_findings?: string;
  created_at: string;
};

// ── Prototypes (UX Designer) ──
export type Prototype = {
  id: string;
  project_id: string;
  tool?: string;
  fidelity?: string;
  iteration: number;
  link?: string;
  feedback?: string;
  created_at: string;
};

// ── Usability tests (UX Designer) ──
export type UsabilityTest = {
  id: string;
  project_id: string;
  date?: string;
  participants?: number;
  tasks_tested?: string;
  issues_found?: string;
  severity: string;
};

// ── Handoff items (UX Designer) ──
export type HandoffItem = {
  id: string;
  project_id: string;
  item: string;
  completed: boolean;
  sort_order: number;
};

// ── Component count (UX Designer) ──
export type ComponentCountEntry = {
  id: string;
  project_id: string;
  component_name: string;
  count: number;
};

// ── Campaigns (Marketing) ──
export type Campaign = {
  id: string;
  project_id: string;
  name: string;
  channel?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  kpi_target?: string;
  kpi_result?: string;
};

// ── Client report cadence (Marketing) ──
export type ClientReportCadence = {
  id: string;
  client_id: string;
  frequency: string;
  last_report_date?: string;
  next_due?: string;
};

// ── Project channels (Marketing) ──
export type ProjectChannel = {
  id: string;
  project_id: string;
  channel: string;
};

// ── Content posts (Social Media) ──
export type ContentPost = {
  id: string;
  client_id: string;
  date?: string;
  platform: string;
  content_type?: string;
  status: string;
  notes?: string;
  created_at: string;
};

// ── Client platforms (Social Media) ──
export type ClientPlatform = {
  id: string;
  client_id: string;
  platform: string;
  handle?: string;
  active: boolean;
};

// ── Stems (Musician) ──
export type Stem = {
  id: string;
  project_id: string;
  name: string;
  format?: string;
  delivered: boolean;
  delivery_date?: string;
  notes?: string;
};

// ── Sync licenses (Musician) ──
export type SyncLicense = {
  id: string;
  project_id?: string;
  track_name: string;
  licensee?: string;
  use_type?: string;
  territory?: string;
  term?: string;
  fee?: number;
  royalty: boolean;
  created_at: string;
};

// ── Credits (Musician) ──
export type Credit = {
  id: string;
  project_id: string;
  artist?: string;
  role?: string;
  release_link?: string;
  release_date?: string;
  notes?: string;
};

// ── Architecture phases (Architect) ──
export type ArchPhase = {
  id: string;
  project_id: string;
  phase_name: string;
  completion_percent: number;
  invoice_trigger: boolean;
  completed: boolean;
  sort_order: number;
};

// ── Arch consultants (Architect) ──
export type ArchConsultant = {
  id: string;
  project_id: string;
  name: string;
  discipline?: string;
  fee?: number;
  fee_type?: string;
  status: string;
};

// ── Submissions (Architect) ──
export type Submission = {
  id: string;
  project_id: string;
  type: string;
  submitted_date?: string;
  response_date?: string;
  status: string;
  resubmit: boolean;
  notes?: string;
};

// ── Revision sets (Architect) ──
export type RevisionSet = {
  id: string;
  project_id: string;
  set_number: number;
  date?: string;
  changes_summary?: string;
  distributed_to?: string;
};

// ── Site visits (Architect) ──
export type SiteVisit = {
  id: string;
  project_id: string;
  date?: string;
  phase?: string;
  observations?: string;
  photo_asset_ids?: string;
  created_at: string;
};

// ── VA tasks (Virtual Assistant) ──
export type VATask = {
  id: string;
  client_id: string;
  title: string;
  duration_minutes?: number;
  category: string;
  completed_date?: string;
  created_at: string;
};

// ── SOPs (Virtual Assistant) ──
export type SOP = {
  id: string;
  client_id: string;
  title: string;
  content?: string;
  sort_order: number;
  created_at: string;
};

// ── Translation counts (Translator) ──
export type TranslationCount = {
  id: string;
  time_entry_id: string;
  source_words?: number;
  target_words?: number;
  characters?: number;
};

// ── Project language pairs (Translator) ──
export type ProjectLanguagePair = {
  id: string;
  project_id: string;
  source_lang: string;
  target_lang: string;
};

// ── Project quality (Translator) ──
export type ProjectQuality = {
  id: string;
  project_id: string;
  quality_tier: string;
  notes?: string;
};

// ── Glossary terms (Translator) ──
export type GlossaryTerm = {
  id: string;
  client_id: string;
  term: string;
  approved_translation?: string;
  notes?: string;
  created_at: string;
};

// ── SEO deliverables (SEO) ──
export type SEODeliverable = {
  id: string;
  client_id: string;
  period: string;
  title: string;
  type?: string;
  completed: boolean;
  due_date?: string;
};

// ── Client reports (SEO) ──
export type ClientReport = {
  id: string;
  client_id: string;
  date: string;
  traffic_notes?: string;
  ranking_notes?: string;
  conversion_notes?: string;
  summary?: string;
};

// ── Analysis deliverables (Data Analyst) ──
export type AnalysisDeliverable = {
  id: string;
  project_id: string;
  title: string;
  type?: string;
  version?: string;
  delivery_date?: string;
  notes?: string;
};

// ── Analysis complexity (Data Analyst) ──
export type AnalysisComplexity = {
  id: string;
  project_id: string;
  complexity_tier: string;
  notes?: string;
};

// ── Incidents (DevOps) ──
export type Incident = {
  id: string;
  project_id: string;
  title: string;
  severity: string;
  status: string;
  resolved_at?: string;
  notes?: string;
  created_at: string;
};

// ── Automations (DevOps) ──
export type Automation = {
  id: string;
  project_id: string;
  name: string;
  type: string;
  frequency?: string;
  last_run?: string;
  status: string;
};

// ── Infrastructure (DevOps) ──
export type InfrastructureItem = {
  id: string;
  project_id: string;
  service_name: string;
  provider?: string;
  cost_monthly?: number;
  status: string;
};

// ── SLAs (DevOps) ──
export type SLA = {
  id: string;
  project_id: string;
  metric_name: string;
  target?: string;
  actual?: string;
  period?: string;
};

// ── Experiments (AI Engineer) ──
export type Experiment = {
  id: string;
  project_id: string;
  name: string;
  type: string;
  status: string;
  metrics?: string;
  notes?: string;
  created_at: string;
};

// ── Models (AI Engineer) ──
export type AIModel = {
  id: string;
  project_id: string;
  name: string;
  framework?: string;
  version?: string;
  status: string;
  metrics?: string;
  created_at: string;
};

// ── Compute costs (AI Engineer) ──
export type ComputeCost = {
  id: string;
  project_id: string;
  provider?: string;
  instance_type?: string;
  hours?: number;
  cost?: number;
  date?: string;
};

// ── Dataset versions (AI Engineer) ──
export type DatasetVersion = {
  id: string;
  project_id: string;
  dataset_id: string;
  version: string;
  description?: string;
  created_at: string;
};

// ── Students (Tutor) ──
export type Student = {
  id: string;
  client_id: string;
  grade_level?: string;
  subject?: string;
  hourly_rate?: number;
  status: string;
};

// ── Curriculum items (Tutor) ──
export type CurriculumItem = {
  id: string;
  project_id: string;
  title: string;
  item_order: number;
  status: string;
  notes?: string;
};

// ── Progress reports (Tutor) ──
export type ProgressReport = {
  id: string;
  project_id: string;
  date: string;
  summary?: string;
  next_steps?: string;
  score?: number;
};

// ── Cancellations (Wellness) ──
export type Cancellation = {
  id: string;
  client_id: string;
  session_date: string;
  reason?: string;
  refund_amount?: number;
};

// ── Intake forms (Wellness) ──
export type IntakeForm = {
  id: string;
  client_id: string;
  form_data?: string;
  created_at: string;
};

// ── Progress notes (Wellness) ──
export type ProgressNote = {
  id: string;
  client_id: string;
  date: string;
  mood_score?: number;
  notes?: string;
  goals?: string;
};

// ── Programs (Trainer) ──
export type Program = {
  id: string;
  client_id: string;
  name: string;
  duration_weeks?: number;
  sessions_per_week?: number;
  notes?: string;
};

// ── Assessments (Trainer) ──
export type Assessment = {
  id: string;
  client_id: string;
  date: string;
  metrics?: string;
  notes?: string;
};

// ── Client progress (Trainer) ──
export type ClientProgress = {
  id: string;
  client_id: string;
  date: string;
  measurements?: string;
  notes?: string;
};

// ── Kanban Board ──
export type KanbanBoard = {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
};

export type KanbanColumn = {
  id: string;
  board_id: string;
  name: string;
  color?: string;
  sort_order: number;
  wip_limit?: number;
  created_at: string;
};

export type KanbanCard = {
  id: string;
  column_id: string;
  project_id: string;
  title: string;
  description?: string;
  priority: string;
  hours_estimated?: number;
  hours_actual?: number;
  due_date?: string;
  labels: string;
  assignee?: string;
  sort_order: number;
  created_at: string;
};

// ── Commission TOS (Illustrator) ──
export type CommissionTOS = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

