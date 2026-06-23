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

