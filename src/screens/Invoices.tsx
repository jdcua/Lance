import { useEffect, useState, useRef, useMemo } from 'react';
import { useStore } from '../store';
import type { Invoice, LineItem, RecurringInvoice as RecurringInvoiceType } from '../types';
import Button from '../components/ui/Button';
import LoadError from '../components/ui/LoadError';
import MetricCard from '../components/ui/MetricCard';
import { useVisibleList } from '../components/ui/useVisibleList';
import { exportInvoicePDF, exportInvoiceDOCX } from '../export';
import {
  formatCurrency,
  relativeDate,
  parseDateString,
  DAY_MS,
  todayLocalISO,
} from '../utils/format';
import { getCurrencySymbol } from '../lib/currency';
import { generateInvoiceNumber, sanitizeInvoiceNumber } from '../utils/invoiceNumber';
import { sanitizeInput, MAX_LENGTHS } from '../utils/sanitize';
import { useToasts } from '../store/toastStore';
import { Plus, Search } from 'lucide-react';
import {
  generateFollowUpDraft,
  generateSubjectLine,
  openMailTo,
  resolveDunningTone,
  type DunningTone,
} from '../utils/followUpTemplates';
import { computeLateFee, lateFeeParagraph } from '../utils/lateFees';
import { recordTrialValue } from '../utils/trialValue';
import { recordTelemetry } from '../utils/telemetry';
import { getFeatureFlags } from '../lib/constants';
import { checkAndNotify, tryUnlock } from '../achievements/notify';
import { getArchetype } from '../archetypes';
import InvoiceList from './invoices/InvoiceList';
import RecurringList from './invoices/RecurringList';
import InvoiceModals from './invoices/InvoiceModals';
import type { InvoicesBag } from './invoices/shared';

type InvSortKey = 'number' | 'client' | 'status' | 'total' | 'date';

export default function Invoices() {
  const {
    invoices,
    loadInvoices,
    clients,
    loadClients,
    addInvoice,
    updateInvoice,
    removeInvoice,
    profile,
    loadProfile,
    timeEntries,
    loadTimeEntries,
    updateTimeEntry,
    projects,
    loadProjects,
    recurringInvoices,
    loadRecurringInvoices,
    addRecurringInvoice,
    updateRecurringInvoice,
    removeRecurringInvoice,
    pendingFollowUps,
    loadPendingFollowUps,
    updateFollowUpStatus,
    followUpSettings,
    getActiveTier,
    payments,
    loadPayments,
    addPayment,
    removePayment,
    addCommunication,
  } = useStore();
  const invoicesError = useStore((s) => s.errors.invoices);
  const addToast = useToasts((s) => s.add);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportDropdown, setExportDropdown] = useState<string | null>(null);
  const [feeConfirm, setFeeConfirm] = useState<string | null>(null);
  const [selectedTimeIds, setSelectedTimeIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'recurring'>('all');
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringInvoiceType | null>(null);
  const [riForm, setRiForm] = useState({
    client_id: '',
    project_id: '',
    title: '',
    frequency: 'monthly' as RecurringInvoiceType['frequency'],
    notes: '',
    tax_rate: '',
    next_due: todayLocalISO(),
  });
  const [riItems, setRiItems] = useState<Omit<LineItem, 'id'>[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 },
  ]);
  const [form, setForm] = useState({
    client_id: '',
    project_id: '',
    invoice_number: '',
    due_date: '',
    notes: '',
    tax_rate: '',
    status: 'draft' as Invoice['status'],
    currency: '',
    rate_type: 'flat' as 'flat' | 'hourly',
  });
  const [items, setItems] = useState<Omit<LineItem, 'id'>[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<InvSortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    label: string;
    type: 'invoice' | 'recurring';
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInv, setPaymentInv] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: todayLocalISO(),
    payment_method: 'Bank Transfer',
    reference: '',
    notes: '',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [expandedInv, setExpandedInv] = useState<string | null>(null);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<{
    id: string;
    invoiceId: string;
  } | null>(null);
  const [deletingPayment, setDeletingPayment] = useState(false);
  const [reminderInv, setReminderInv] = useState<Invoice | null>(null);
  const [reminderForm, setReminderForm] = useState({
    to: '',
    subject: '',
    body: '',
    markFollowedUp: false,
  });

  // Archetype-aware invoice defaults
  const archetype = useMemo(() => getArchetype(profile?.profession || ''), [profile?.profession]);
  // Smart dunning (Pro): overdue drafts speak in the freelancer's voice and
  // can carry an accrued late fee. Free tiers render default templates.
  const dunningTone: DunningTone | undefined = useMemo(() => {
    if (getFeatureFlags(getActiveTier()).smartDunning !== true) return undefined;
    return resolveDunningTone(profile?.profession, followUpSettings.tone);
  }, [getActiveTier, profile?.profession, followUpSettings.tone]);
  const lateFeeOn = dunningTone !== undefined && followUpSettings.lateFeeEnabled === true;
  const lateFeePercent = followUpSettings.lateFeePercent ?? 1.5;

  const withFeeNote = (text: string, inv: Invoice): string => {
    if (!lateFeeOn) return text;
    const note = lateFeeParagraph(
      computeLateFee(inv.total, inv.due_date, lateFeePercent),
      inv.currency || profile?.currency,
    );
    return note ? `${text}\n\n${note}` : text;
  };

  const handleAddLateFee = async (inv: Invoice) => {
    const fee = computeLateFee(inv.total, inv.due_date, lateFeePercent);
    if (fee.fee <= 0) return;
    if (feeConfirm !== inv.id) {
      setFeeConfirm(inv.id);
      return;
    }
    setFeeConfirm(null);
    const item = {
      id: crypto.randomUUID(),
      description: `Late fee (${fee.periods} period${fee.periods === 1 ? '' : 's'} overdue, ${fee.percentPerPeriod}%/mo)`,
      quantity: 1,
      unit_price: fee.fee,
      total: fee.fee,
    };
    try {
      await updateInvoice({
        ...inv,
        line_items: [...inv.line_items, item],
        subtotal: Math.round((inv.subtotal + fee.fee) * 100) / 100,
        total: Math.round((inv.total + fee.fee) * 100) / 100,
      });
      addToast(
        `Late fee of ${formatCurrency(fee.fee, inv.currency || profile?.currency)} added`,
        'success',
      );
      recordTrialValue('late-fee', fee.fee);
      recordTelemetry('pro_feature_used', { feature: 'late-fee' });
    } catch {
      addToast('Could not add the late fee', 'error');
    }
  };
  const defaultPaymentTerms = useMemo(
    () => archetype?.paymentTerms ?? profile?.payment_terms ?? 14,
    [archetype, profile?.payment_terms],
  );

  useEffect(() => {
    Promise.all([loadInvoices(), loadClients(), loadProfile(), loadProjects(), loadTimeEntries()])
      .catch((err) => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
    loadPendingFollowUps();
  }, [
    loadInvoices,
    loadClients,
    loadProfile,
    loadProjects,
    loadPendingFollowUps,
    loadTimeEntries,
    addToast,
  ]);

  useEffect(() => {
    if (activeTab === 'recurring') loadRecurringInvoices();
  }, [activeTab, loadRecurringInvoices]);

  useEffect(() => {
    if (!exportDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setExportDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportDropdown]);

  const resolveDefaultCurrency = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.preferred_currency || '';
  };

  const openNew = () => {
    const paymentTerms = defaultPaymentTerms;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    setEditing(null);
    setForm({
      client_id: '',
      project_id: '',
      invoice_number: generateInvoiceNumber(invoices || []),
      due_date: dueDate.toISOString().split('T')[0],
      notes: '',
      tax_rate: profile?.tax_rate ? String(profile.tax_rate) : '',
      status: 'draft',
      currency: '',
      rate_type: 'flat',
    });
    setItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
    setSelectedTimeIds(new Set());
    setShowModal(true);
  };

  // External triggers: first-run checklist + Cmd/Ctrl+N shortcut (App.tsx).
  // (The shortcut was previously dispatched here but nothing listened.)
  useEffect(() => {
    const handler = () => openNew();
    document.addEventListener('lance:add-invoice', handler);
    return () => document.removeEventListener('lance:add-invoice', handler);
  });

  const handleCreateFromEmptyState = () => {
    if (!clients || clients.length === 0) {
      addToast('Add a client before creating an invoice', 'info');
      return;
    }
    if (!profile) {
      addToast('Complete your profile before creating an invoice', 'info');
      return;
    }
    openNew();
  };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      client_id: inv.client_id,
      project_id: inv.project_id || '',
      invoice_number: inv.invoice_number,
      due_date: inv.due_date || '',
      notes: inv.notes || '',
      tax_rate: inv.tax_rate?.toString() || '',
      status: inv.status,
      currency: inv.currency || '',
      rate_type: inv.rate_type ?? 'flat',
    });
    setItems(
      inv.line_items.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        total: li.total,
      })),
    );
    setShowModal(true);
  };

  const handleClientChange = (clientId: string) => {
    const prefCurrency = resolveDefaultCurrency(clientId);
    setForm({
      ...form,
      client_id: clientId,
      project_id: '',
      currency: form.currency || prefCurrency,
    });
  };

  const updateItem = (index: number, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newItem = { ...item, [field]: value };
        if (field === 'quantity') newItem.quantity = Math.max(0, Number(value) || 0);
        if (field === 'unit_price') newItem.unit_price = Math.max(0, Number(value) || 0);
        if (field === 'quantity' || field === 'unit_price')
          newItem.total = newItem.quantity * newItem.unit_price;
        return newItem;
      }),
    );
  };

  const addItem = () =>
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const taxRate = form.tax_rate ? parseFloat(form.tax_rate) : 0;
  const total = subtotal + subtotal * (taxRate / 100);

  const handleSave = async () => {
    if (!form.client_id) {
      addToast('Select a client before saving the invoice', 'error');
      return;
    }
    // Typo guard (mirrors the expense form): computed totals can only be
    // absurd via a mistyped rate/quantity. Zero is rejected like the
    // recurring flow: a $0 invoice is a draft with extra steps.
    if (total > 999999999.99 || !(total > 0)) {
      addToast('That total looks off, please check rates and quantities for typos', 'error');
      return;
    }
    const invoice_number = sanitizeInvoiceNumber(form.invoice_number);
    if (!invoice_number) {
      setForm((f) => ({ ...f, invoice_number: generateInvoiceNumber(invoices || []) }));
      addToast('Enter an invoice number', 'error');
      return;
    }
    if (invoice_number !== form.invoice_number.trim()) {
      addToast('Cleaned invalid characters from the invoice number', 'info');
    }
    setSaving(true);
    try {
      // Invoice numbers must be unique across all invoices (case-insensitive:
      // "inv-001" and "INV-001" are the same number to a human).
      const duplicateNum = (invoices || []).find(
        (i) =>
          (i.invoice_number || '').toLowerCase() === invoice_number.toLowerCase() &&
          (!editing || i.id !== editing.id),
      );
      if (duplicateNum) {
        setSaving(false);
        addToast(`Invoice number ${invoice_number} already exists`, 'error');
        return;
      }
      const lineItems: LineItem[] = items.map((i) => ({
        ...i,
        id: crypto.randomUUID(),
        description: i.description
          ? sanitizeInput(i.description).slice(0, MAX_LENGTHS.description)
          : '',
      }));
      const hourlyRateTypes = new Set([
        'hourly',
        'per-shoot',
        'per-session',
        'per-track',
        'per-word',
        'per-look',
        'per-event',
        'per-commission',
        'per-plan',
        'per-closing',
        'per-campaign',
        'per-placement',
        'per-project',
        'milestone',
        'retainer',
        'commission-based',
        'per-track',
        'per-look',
        'per-word',
      ]);
      const storedRateType: 'flat' | 'hourly' = hourlyRateTypes.has(form.rate_type)
        ? 'hourly'
        : 'flat';
      const invoiceData = {
        client_id: form.client_id,
        invoice_number,
        status: form.status,
        line_items: lineItems,
        subtotal,
        tax_rate: taxRate || undefined,
        total,
        due_date: form.due_date || undefined,
        notes: form.notes ? sanitizeInput(form.notes).slice(0, MAX_LENGTHS.notes) : undefined,
        currency: form.currency || undefined,
        rate_type: storedRateType,
      };
      if (editing) await updateInvoice({ ...editing, ...invoiceData });
      else await addInvoice(invoiceData);
      // Editing totals can strand status (e.g. total lowered below paid
      // amount). Recompute when payments exist; untouched otherwise.
      if (editing) {
        const paidTotal = useStore
          .getState()
          .payments.filter((p) => p.invoice_id === editing.id)
          .reduce((s, p) => s + p.amount, 0);
        if (paidTotal > 0) {
          const corrected = computeInvoiceStatus({ ...editing, ...invoiceData, total }, paidTotal);
          if (corrected !== invoiceData.status) {
            const fix: Partial<Invoice> = { status: corrected };
            if (corrected !== 'paid') fix.paid_at = undefined;
            await updateInvoice({
              ...editing,
              ...invoiceData,
              total,
              ...fix,
              status: corrected,
            } as Invoice);
          }
        }
      }
      const ids = Array.from(selectedTimeIds);
      const timeUpdates = ids
        .map((id) => timeEntries.find((t: { id: string }) => t.id === id))
        .filter((entry): entry is NonNullable<typeof entry> => !!entry)
        .map((entry) => updateTimeEntry({ ...entry, invoiced: true }));
      await Promise.allSettled(timeUpdates);
      setShowModal(false);
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'invoice') await removeInvoice(confirmDelete.id);
      else await removeRecurringInvoice(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openPaymentModal = (inv: Invoice) => {
    setPaymentInv(inv);
    setPaymentForm({
      amount: inv.total.toString(),
      payment_date: todayLocalISO(),
      payment_method: 'Bank Transfer',
      reference: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const openReminderModal = (inv: Invoice) => {
    const client = getClient(inv.client_id);
    const dueDate = inv.due_date ? parseDateString(inv.due_date) : null;
    const daysElapsed = dueDate ? Math.floor((Date.now() - dueDate.getTime()) / DAY_MS) : 0;
    const templateKey =
      daysElapsed >= 10 ? 'invoice_day14' : daysElapsed >= 4 ? 'invoice_day7' : 'invoice_day1';
    const draft = withFeeNote(
      generateFollowUpDraft(
        templateKey,
        {
          clientName: client?.name || 'Unknown',
          invoiceNumber: inv.invoice_number,
          amount: formatCurrency(inv.total),
          dueDate: inv.due_date,
          daysElapsed,
          freelancerName: profile?.name || 'Freelancer',
        },
        followUpSettings.templates,
        dunningTone,
      ),
      inv,
    );
    const subject = generateSubjectLine(
      templateKey,
      {
        clientName: client?.name || 'Unknown',
        invoiceNumber: inv.invoice_number,
        amount: formatCurrency(inv.total),
        dueDate: inv.due_date,
        daysElapsed,
        freelancerName: profile?.name || 'Freelancer',
      },
      followUpSettings.subject_templates,
      dunningTone,
    );
    setReminderInv(inv);
    setReminderForm({
      to: client?.email || '',
      subject:
        subject || `Friendly reminder · Invoice ${inv.invoice_number} due ${inv.due_date || 'now'}`,
      body: draft,
      markFollowedUp: false,
    });
  };

  const handleSendReminder = async () => {
    if (!reminderInv || !reminderForm.to) {
      addToast('No email address provided', 'error');
      return;
    }
    try {
      await openMailTo(reminderForm.to, reminderForm.subject, reminderForm.body);
      addToast('Email opened in your default mail client', 'success');
      if (reminderForm.markFollowedUp && reminderInv) {
        const client = getClient(reminderInv.client_id);
        if (client) {
          await addCommunication({
            id: crypto.randomUUID(),
            client_id: client.id,
            type: 'email',
            summary: `Invoice reminder sent for ${reminderInv.invoice_number}`,
            date: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
        }
        const fu = pendingFollowUps.find(
          (f) => f.entity_type === 'invoice' && f.entity_id === reminderInv.id,
        );
        if (fu) {
          await updateFollowUpStatus(fu.id, 'sent', 'sent');
        }
      }
      setReminderInv(null);
    } catch {
      addToast('Failed to open email client', 'error');
    }
  };

  const getPaidTotal = (invId: string) => {
    return payments.filter((p) => p.invoice_id === invId).reduce((sum, p) => sum + p.amount, 0);
  };

  const getRemainingBalance = (inv: Invoice) => {
    return Math.max(0, inv.total - getPaidTotal(inv.id));
  };

  // Money is compared in integer CENTS, never in floats. Totals are persisted as
  // raw f64 (invoices.rs stores whatever JS summed), so `3 × 10.005 = 30.015`
  // is stored while Intl renders "$30.02". Comparing 30.015 >= 30.02 in floats
  // made the *displayed* balance unpayable: the guard rejected the exact amount
  // the app had just shown the user.
  const computeInvoiceStatus = (inv: Invoice, paidTotal: number): Invoice['status'] => {
    const paidCents = Math.round(paidTotal * 100);
    const totalCents = Math.round(inv.total * 100);
    if (paidCents >= totalCents) return 'paid';
    if (paidCents > 0) return 'partial';
    // No payments remain. A previously paid/partial invoice must revert to a
    // billable state instead of staying 'paid' with zero payments.
    if (inv.status === 'draft') return 'draft';
    if (inv.due_date && parseDateString(inv.due_date) < new Date()) return 'overdue';
    return 'sent';
  };

  const handleRecordPayment = async () => {
    if (!paymentInv || !paymentForm.amount) return;
    setPaymentSaving(true);
    try {
      const amount = Math.max(0, parseFloat(paymentForm.amount) || 0);
      if (amount <= 0) {
        setPaymentSaving(false);
        addToast('Payment amount must be greater than zero', 'error');
        return;
      }
      // Guard against overpayment: total paid must never exceed the invoice
      // total. Compared in cents so a stored float total does not reject the
      // rounded amount the UI just displayed.
      const paidSoFar = useStore
        .getState()
        .payments.filter((p) => p.invoice_id === paymentInv.id)
        .reduce((s, p) => s + p.amount, 0);
      const remaining = Math.max(0, paymentInv.total - paidSoFar);
      if (Math.round(amount * 100) > Math.round(remaining * 100)) {
        setPaymentSaving(false);
        addToast(`Payment exceeds remaining balance of ${fmtInv(remaining, paymentInv)}`, 'error');
        return;
      }
      await addPayment({
        invoice_id: paymentInv.id,
        amount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference
          ? sanitizeInput(paymentForm.reference).slice(0, 500)
          : undefined,
        notes: paymentForm.notes
          ? sanitizeInput(paymentForm.notes).slice(0, MAX_LENGTHS.notes)
          : undefined,
      });
      // Read the payments back AFTER the insert, and do NOT add `amount` again:
      // addPayment already appended the new row. The extra `+ amount` made a
      // $500 payment on a $1000 invoice report the invoice as fully paid while
      // the balance still said $500, the freelancer thinks they are owed
      // nothing.
      const updatedPayments = useStore
        .getState()
        .payments.filter((p) => p.invoice_id === paymentInv.id);
      const paidTotal = updatedPayments.reduce((s, p) => s + p.amount, 0);
      const newStatus = computeInvoiceStatus(paymentInv, paidTotal);
      const isFullyPaid = newStatus === 'paid';
      if (newStatus !== paymentInv.status || isFullyPaid) {
        const updateData: Partial<Invoice> = { status: newStatus };
        if (isFullyPaid) updateData.paid_at = new Date().toISOString();
        await updateInvoice({ ...paymentInv, ...updateData, status: newStatus } as Invoice);
      }
      if (isFullyPaid) {
        const fu = pendingFollowUps.find(
          (f) => f.entity_type === 'invoice' && f.entity_id === paymentInv.id,
        );
        if (fu) {
          await updateFollowUpStatus(fu.id, 'paid', 'marked_paid').catch(() => {});
        }
      }
      setShowPaymentModal(false);
      checkAndNotify(useStore.getState(), addToast);
      addToast('Payment recorded', 'success');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to record payment', 'error');
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!confirmDeletePayment) return;
    setDeletingPayment(true);
    try {
      const { id, invoiceId } = confirmDeletePayment;
      await removePayment(id, invoiceId);
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv) {
        const remainingPayments = useStore
          .getState()
          .payments.filter((p) => p.invoice_id === invoiceId && p.id !== id);
        const paidTotal = remainingPayments.reduce((s, p) => s + p.amount, 0);
        const newStatus = computeInvoiceStatus(inv, paidTotal);
        if (newStatus !== inv.status) {
          const updateData: Partial<Invoice> = { status: newStatus };
          if (newStatus !== 'paid') updateData.paid_at = undefined;
          await updateInvoice({ ...inv, ...updateData, status: newStatus } as Invoice);
        }
      }
      setConfirmDeletePayment(null);
      addToast('Payment deleted', 'info');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to delete payment', 'error');
    } finally {
      setDeletingPayment(false);
    }
  };

  const handleMarkSent = async (inv: Invoice) => {
    try {
      await updateInvoice({ ...inv, status: 'sent' as const });
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to mark as sent', 'error');
    }
  };

  const handleDuplicate = async (inv: Invoice) => {
    const paymentTerms = profile?.payment_terms ?? 14;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    const newNumber = generateInvoiceNumber(invoices);
    const newItems = inv.line_items.map((li) => ({
      ...li,
      id: crypto.randomUUID(),
      // Fresh lines: inherited time-entry links would let deleting this copy
      // unmark hours billed on the original invoice.
      time_entry_ids: undefined,
    }));
    try {
      await addInvoice({
        client_id: inv.client_id,
        project_id: inv.project_id,
        invoice_number: newNumber,
        status: 'draft',
        line_items: newItems,
        subtotal: inv.subtotal,
        tax_rate: inv.tax_rate,
        total: inv.total,
        due_date: dueDate.toISOString().split('T')[0],
        notes: inv.notes,
        currency: inv.currency,
      });
      addToast(`Invoice duplicated · ${newNumber} created as draft`, 'success');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to duplicate invoice', 'error');
    }
  };

  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);
  const getClientName = (clientId: string) => getClient(clientId)?.name || 'Unknown';

  const getInvoiceCurrency = (inv: Invoice) => inv.currency || profile?.currency || 'CAD';

  const fmtInv = (amount: number, inv: Invoice) => {
    const cur = getInvoiceCurrency(inv);
    return formatCurrency(amount, cur);
  };

  const fmtInvDisplay = (inv: Invoice) => {
    const cur = getInvoiceCurrency(inv);
    const formatted = formatCurrency(inv.total, cur);
    if (cur !== (profile?.currency || 'CAD')) {
      return `${formatted} ${cur}`;
    }
    return formatted;
  };

  const hourlyRate = profile?.hourly_rate || 0;

  const unbilledTime = timeEntries.filter((t) => {
    if (!t.billable || t.invoiced) return false;
    if (!t.duration_minutes || t.duration_minutes <= 0) return false;
    if (form.project_id && t.project_id !== form.project_id) return false;
    if (form.client_id && t.client_id !== form.client_id) return false;
    return true;
  });

  const toggleTimeSelection = (id: string) =>
    setSelectedTimeIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const importSelectedTime = () => {
    if (hourlyRate <= 0) {
      addToast('Set your hourly rate in profile to use time import.', 'error');
      return;
    }
    const selected = timeEntries.filter((t) => selectedTimeIds.has(t.id));
    const newItems: Omit<LineItem, 'id'>[] = selected.map((t) => {
      const hours = (t.duration_minutes || 0) / 60;
      const amount = Math.round(hours * hourlyRate * 100) / 100;
      return {
        description: t.description || `Time entry ${new Date(t.start_time).toLocaleDateString()}`,
        quantity: 1,
        unit_price: amount,
        total: amount,
        time_entry_ids: [t.id],
      };
    });
    const existingItems = items.filter((i) => i.description.trim() !== '' || i.total > 0);
    setItems([...existingItems, ...newItems]);
    addToast(
      `Imported ${newItems.length} time entr${newItems.length !== 1 ? 'ies' : 'y'}`,
      'success',
    );
  };

  // ── Recurring handlers ──
  const openNewRecurring = () => {
    setEditingRecurring(null);
    setRiForm({
      client_id: '',
      project_id: '',
      title: '',
      frequency: 'monthly',
      notes: '',
      tax_rate: '',
      next_due: todayLocalISO(),
    });
    setRiItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
    setShowRecurringModal(true);
  };
  const openEditRecurring = (ri: RecurringInvoiceType) => {
    setEditingRecurring(ri);
    setRiForm({
      client_id: ri.client_id,
      project_id: ri.project_id || '',
      title: ri.title,
      frequency: ri.frequency,
      notes: ri.notes || '',
      tax_rate: ri.tax_rate?.toString() || '',
      next_due: ri.next_due.split('T')[0],
    });
    setRiItems(
      ri.line_items.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        total: li.total,
      })),
    );
    setShowRecurringModal(true);
  };
  const updateRiItem = (
    index: number,
    field: keyof Omit<LineItem, 'id'>,
    value: string | number,
  ) => {
    setRiItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newItem = { ...item, [field]: value };
        if (field === 'quantity') newItem.quantity = Math.max(0, Number(value) || 0);
        if (field === 'unit_price') newItem.unit_price = Math.max(0, Number(value) || 0);
        if (field === 'quantity' || field === 'unit_price')
          newItem.total = newItem.quantity * newItem.unit_price;
        return newItem;
      }),
    );
  };
  const addRiItem = () =>
    setRiItems([...riItems, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  const removeRiItem = (i: number) => {
    if (riItems.length > 1) setRiItems(riItems.filter((_, idx) => idx !== i));
  };
  const riSubtotal = riItems.reduce((s, i) => s + i.total, 0);
  const riTaxRate = riForm.tax_rate ? parseFloat(riForm.tax_rate) : 0;
  const riTotal = riSubtotal + riSubtotal * (riTaxRate / 100);

  const handleSaveRecurring = async () => {
    if (!riForm.title.trim() || !riForm.client_id) {
      addToast('Give the recurring invoice a title and a client', 'error');
      return;
    }
    if (!(riTotal > 0)) {
      addToast('Recurring total must be greater than zero', 'error');
      return;
    }
    setSaving(true);
    try {
      const lineItems: LineItem[] = riItems.map((i) => ({
        ...i,
        id: crypto.randomUUID(),
        description: i.description
          ? sanitizeInput(i.description).slice(0, MAX_LENGTHS.description)
          : '',
      }));
      const recurringTitle = sanitizeInput(riForm.title).slice(0, MAX_LENGTHS.title);
      if (recurringTitle !== riForm.title) {
        addToast('Trimmed the recurring title to fit (300 characters max)', 'info');
      }
      const data = {
        client_id: riForm.client_id,
        project_id: riForm.project_id || undefined,
        title: recurringTitle,
        frequency: riForm.frequency,
        line_items: lineItems,
        subtotal: riSubtotal,
        tax_rate: riTaxRate || undefined,
        total: riTotal,
        notes: riForm.notes ? sanitizeInput(riForm.notes).slice(0, MAX_LENGTHS.notes) : undefined,
        active: true,
        next_due: riForm.next_due,
      };
      if (editingRecurring)
        await updateRecurringInvoice({
          ...editingRecurring,
          ...data,
          active: editingRecurring.active,
        });
      else await addRecurringInvoice(data);
      setShowRecurringModal(false);
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save recurring invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (ri: RecurringInvoiceType) => {
    try {
      await updateRecurringInvoice({ ...ri, active: !ri.active });
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to toggle', 'error');
    }
  };

  const handleExportPDF = (inv: Invoice) => {
    try {
      const client = getClient(inv.client_id);
      if (client && profile) {
        exportInvoicePDF(inv, client, profile);
        tryUnlock('first_export', addToast);
      }
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to export PDF', 'error');
    }
    setExportDropdown(null);
  };
  const handleExportDOCX = (inv: Invoice) => {
    try {
      const client = getClient(inv.client_id);
      if (client && profile) {
        exportInvoiceDOCX(inv, client, profile);
        tryUnlock('first_export', addToast);
      }
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to export DOCX', 'error');
    }
    setExportDropdown(null);
  };

  const totalOutstanding = invoices
    .filter((i) => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const invCurrency = (i: { currency?: string }) => i.currency || profile?.currency || 'CAD';
  const sumByCurrency = (list: { currency?: string; total: number }[]) => {
    const by: Record<string, number> = {};
    list.forEach((i) => {
      by[invCurrency(i)] = (by[invCurrency(i)] || 0) + i.total;
    });
    return by;
  };
  const mixedCurrencies =
    new Set(invoices.filter((i) => i.status !== 'draft').map(invCurrency)).size > 1;
  const moneyValue = (list: { currency?: string; total: number }[], single: number) =>
    mixedCurrencies
      ? Object.entries(sumByCurrency(list))
          .map(([cur, amt]) => `${formatCurrency(amt, cur)} ${cur}`)
          .join(' · ')
      : formatCurrency(single, invCurrency(list[0] || {}));

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (inv.invoice_number || '').toLowerCase().includes(s) ||
      (getClientName(inv.client_id) || '').toLowerCase().includes(s)
    );
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'number':
        return dir * a.invoice_number.localeCompare(b.invoice_number);
      case 'client':
        return dir * getClientName(a.client_id).localeCompare(getClientName(b.client_id));
      case 'status':
        return dir * a.status.localeCompare(b.status);
      case 'total':
        return dir * (a.total - b.total);
      case 'date':
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default:
        return 0;
    }
  });

  const toggleSort = (key: InvSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Incremental rendering: 10k invoices build ~350k DOM nodes unbounded.
  const paged = useVisibleList(sortedInvoices, `${search}|${sortKey}|${sortDir}`);

  const filteredRecurring = recurringInvoices.filter((ri) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (ri.title || '').toLowerCase().includes(s) ||
      (getClientName(ri.client_id) || '').toLowerCase().includes(s)
    );
  });

  // Section prop bag: shell-local state, handlers, and derived figures.
  // Sections are verbatim relocation; computations stay here.
  const bag: InvoicesBag = {
    invoices, filteredInvoices, clients, profile, projects, recurringInvoices,
    timeEntries, payments, loadPayments, pendingFollowUps, followUpSettings,
    search, filteredRecurring, paged, unbilledTime,
    fmtInv, fmtInvDisplay, getClient, getClientName, getPaidTotal, getRemainingBalance,
    relativeDate, hourlyRate, getCurrencySymbol, dunningTone, lateFeeOn, lateFeePercent,
    withFeeNote, dropdownRef, feeConfirm, setFeeConfirm, updateFollowUpStatus,
    form, setForm, items, setItems, subtotal, total,
    updateItem, removeItem, toggleTimeSelection, selectedTimeIds,
    riForm, setRiForm, riItems, setRiItems, riSubtotal, riTotal,
    updateRiItem, removeRiItem,
    editing, editingRecurring, saving, deleting, deletingPayment, paymentSaving,
    showModal, setShowModal, showPaymentModal, setShowPaymentModal,
    showRecurringModal, setShowRecurringModal,
    paymentInv, paymentForm, setPaymentForm,
    reminderInv, setReminderInv, reminderForm, setReminderForm,
    confirmDelete, setConfirmDelete, confirmDeletePayment, setConfirmDeletePayment,
    expandedInv, setExpandedInv, exportDropdown, setExportDropdown,
    sanitizeInvoiceNumber, addItem, addRiItem, importSelectedTime, handleClientChange,
    openNew, openEdit, openPaymentModal, openReminderModal,
    openNewRecurring, openEditRecurring, handleCreateFromEmptyState,
    handleSave, handleDelete, handleRecordPayment, handleDeletePayment,
    handleSendReminder, handleSaveRecurring, handleToggleActive,
    handleMarkSent, handleDuplicate, handleAddLateFee, handleExportPDF, handleExportDOCX,
    addToast,
  };

  if (loading)
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-[var(--bg-secondary)] rounded-[8px] skeleton-pulse" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="p-6">
      <LoadError error={invoicesError} onRetry={() => loadInvoices()} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <MetricCard
          label="Outstanding"
          value={moneyValue(
            invoices.filter(
              (i) => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue',
            ),
            totalOutstanding,
          )}
          subtext={`${invoices.filter((i) => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue').length} invoices`}
          color="amber"
        />
        <MetricCard
          label="Paid"
          value={moneyValue(
            invoices.filter((i) => i.status === 'paid'),
            totalPaid,
          )}
          subtext={`${invoices.filter((i) => i.status === 'paid').length} invoices`}
          trend="up"
          color="green"
        />
        <MetricCard
          label="Overdue"
          value={moneyValue(
            invoices.filter((i) => i.status === 'overdue'),
            invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total, 0),
          )}
          subtext="needs attention"
          trend={invoices.filter((i) => i.status === 'overdue').length > 0 ? 'down' : 'neutral'}
          color={invoices.filter((i) => i.status === 'overdue').length > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Tab bar + search + sort */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] flex-shrink-0 min-w-max">
          <button
            onClick={() => setActiveTab('all')}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${activeTab === 'all' ? 'text-[var(--accent-ink,var(--accent))] border-[var(--accent)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
          >
            All invoices
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${activeTab === 'recurring' ? 'text-[var(--accent-ink,var(--accent))] border-[var(--accent)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
          >
            Recurring
          </button>
        </div>
        <div className="relative max-w-[180px] flex-shrink-0">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] bg-[var(--bg-secondary)]"
          />
        </div>
        {activeTab === 'all' && (
          <>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--text-tertiary)]">Sort:</span>
              {(['date', 'number', 'client', 'status', 'total'] as InvSortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => toggleSort(k)}
                  className={`text-[10px] px-2 py-0.5 rounded-[4px] transition-colors capitalize ${sortKey === k ? 'bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] font-medium' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
                >
                  {k}
                  {sortKey === k && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </button>
              ))}
            </div>
            <Button onClick={handleCreateFromEmptyState} size="sm" disabled={clients.length === 0}>
              <Plus size={14} />
              New Invoice
            </Button>
          </>
        )}
        {activeTab === 'recurring' && (
          <Button onClick={openNewRecurring} size="sm">
            <Plus size={14} />
            New recurring
          </Button>
        )}
      </div>

      {activeTab === 'all' ? (
        <InvoiceList bag={bag} />
      ) : (
        <RecurringList bag={bag} />
      )}

      <InvoiceModals bag={bag} />
    </div>
  );
}
