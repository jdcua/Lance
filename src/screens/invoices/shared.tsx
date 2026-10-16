import type {
  Invoice,
  LineItem,
  Client,
  UserProfile,
  TimeEntry,
  InvoicePayment,
  FollowUpSettings,
  RecurringInvoice as RecurringInvoiceType,
} from '../../types';
import type { DunningTone } from '../../utils/followUpTemplates';

/** Shared bits for the Invoices split (wave3/4). statusBadge + formatMinutes moved verbatim. */

export const currencies = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'];

/** Shared bits for the Invoices split (wave3/4). statusBadge + formatMinutes moved verbatim. */

export const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'warning',
  sent: 'info',
  paid: 'success',
  partial: 'warning',
  overdue: 'danger',
};

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export interface InvoiceFormState {
  client_id: string;
  project_id: string;
  invoice_number: string;
  due_date: string;
  notes: string;
  tax_rate: string;
  status: Invoice['status'];
  currency: string;
  rate_type: 'flat' | 'hourly';
}

export interface RiFormState {
  client_id: string;
  project_id: string;
  title: string;
  frequency: RecurringInvoiceType['frequency'];
  notes: string;
  tax_rate: string;
  next_due: string;
}

export interface PaymentFormState {
  amount: string;
  payment_date: string;
  payment_method: string;
  reference: string;
  notes: string;
}

export interface ReminderFormState {
  to: string;
  subject: string;
  body: string;
  markFollowedUp: boolean;
}

export interface Paged<T> {
  visible: T[];
  total: number;
  hasMore: boolean;
  showMore: () => void;
}

/**
 * Shell-owned state, handlers, and derived figures passed to invoice
 * sections. Sections are verbatim relocation; nothing here changes behavior.
 */
export interface InvoicesBag {
  invoices: Invoice[];
  filteredInvoices: Invoice[];
  clients: Client[];
  profile: UserProfile | null;
  projects: { id: string; title: string; client_id: string }[];
  recurringInvoices: RecurringInvoiceType[];
  timeEntries: TimeEntry[];
  payments: InvoicePayment[];
  loadPayments: () => Promise<void>;
  pendingFollowUps: { id: string; entity_type: string; entity_id: string }[];
  followUpSettings: FollowUpSettings;
  search: string;
  filteredRecurring: RecurringInvoiceType[];
  paged: Paged<Invoice>;
  unbilledTime: TimeEntry[];
  fmtInv: (amount: number, inv: Invoice) => string;
  fmtInvDisplay: (inv: Invoice) => string;
  hourlyRate: number;
  getClient: (id: string) => Client | undefined;
  getClientName: (id: string) => string;
  getPaidTotal: (invId: string) => number;
  getRemainingBalance: (inv: Invoice) => number;
  relativeDate: (iso: string) => string;
  getCurrencySymbol: (cur: string) => string;
  dunningTone: DunningTone | undefined;
  lateFeeOn: boolean;
  lateFeePercent: number;
  withFeeNote: (text: string, inv: Invoice) => string;
  dropdownRef: React.RefObject<HTMLDivElement>;
  feeConfirm: string | null;
  setFeeConfirm: (v: string | null) => void;
  updateFollowUpStatus: (id: string, status: string, action?: string) => Promise<void>;
  form: InvoiceFormState;
  setForm: React.Dispatch<React.SetStateAction<InvoiceFormState>>;
  items: Omit<LineItem, 'id'>[];
  setItems: React.Dispatch<React.SetStateAction<Omit<LineItem, 'id'>[]>>;
  subtotal: number;
  total: number;
  updateItem: (index: number, field: keyof Omit<LineItem, 'id'>, value: string | number) => void;
  removeItem: (index: number) => void;
  toggleTimeSelection: (id: string) => void;
  selectedTimeIds: Set<string>;
  riForm: RiFormState;
  setRiForm: React.Dispatch<React.SetStateAction<RiFormState>>;
  riItems: Omit<LineItem, 'id'>[];
  setRiItems: React.Dispatch<React.SetStateAction<Omit<LineItem, 'id'>[]>>;
  riSubtotal: number;
  riTotal: number;
  updateRiItem: (index: number, field: keyof Omit<LineItem, 'id'>, value: string | number) => void;
  removeRiItem: (i: number) => void;
  editing: Invoice | null;
  editingRecurring: RecurringInvoiceType | null;
  saving: boolean;
  deleting: boolean;
  deletingPayment: boolean;
  paymentSaving: boolean;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  showPaymentModal: boolean;
  setShowPaymentModal: (v: boolean) => void;
  showRecurringModal: boolean;
  setShowRecurringModal: (v: boolean) => void;
  paymentInv: Invoice | null;
  paymentForm: PaymentFormState;
  setPaymentForm: React.Dispatch<React.SetStateAction<PaymentFormState>>;
  reminderInv: Invoice | null;
  setReminderInv: (v: Invoice | null) => void;
  reminderForm: ReminderFormState;
  setReminderForm: React.Dispatch<React.SetStateAction<ReminderFormState>>;
  confirmDelete: { id: string; label: string; type: 'invoice' | 'recurring' } | null;
  setConfirmDelete: (
    v: { id: string; label: string; type: 'invoice' | 'recurring' } | null,
  ) => void;
  confirmDeletePayment: { id: string; invoiceId: string } | null;
  setConfirmDeletePayment: (v: { id: string; invoiceId: string } | null) => void;
  expandedInv: string | null;
  setExpandedInv: (v: string | null) => void;
  exportDropdown: string | null;
  setExportDropdown: (v: string | null) => void;
  sanitizeInvoiceNumber: (s: string) => string;
  depositHint: { pct: number; amount: number } | null;
  addItem: () => void;
  addRiItem: () => void;
  importSelectedTime: () => void;
  handleClientChange: (clientId: string) => void;
  openNew: () => void;
  openEdit: (inv: Invoice) => void;
  openPaymentModal: (inv: Invoice) => void;
  openReminderModal: (inv: Invoice) => void;
  openNewRecurring: () => void;
  openEditRecurring: (ri: RecurringInvoiceType) => void;
  handleCreateFromEmptyState: () => void;
  handleSave: () => void;
  handleDelete: () => void;
  handleRecordPayment: () => void;
  handleDeletePayment: () => void;
  handleSendReminder: () => void;
  handleSaveRecurring: () => void;
  handleToggleActive: (ri: RecurringInvoiceType) => void;
  handleMarkSent: (inv: Invoice) => void;
  handleDuplicate: (inv: Invoice) => void;
  handleAddLateFee: (inv: Invoice) => void;
  handleExportPDF: (inv: Invoice) => void;
  handleExportDOCX: (inv: Invoice) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning' | 'unlock') => void;
}
