export type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
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
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  scope?: string;
  timeline?: string;
  rate?: number;
  rate_type: 'flat' | 'hourly';
  body?: string;
  sent_at?: string;
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
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  line_items: LineItem[];
  subtotal: number;
  tax_rate?: number;
  total: number;
  due_date?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
};

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
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
