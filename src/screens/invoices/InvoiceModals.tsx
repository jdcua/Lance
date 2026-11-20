import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ClientSelect from '../../components/ui/ClientSelect';
import DocPreview from '../../components/ui/DocPreview';
import { AlertTriangle, Clock, Copy, Mail, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { getCurrencySymbol } from '../../lib/currency';
import type { RecurringInvoice as RecurringInvoiceType } from '../../types';
import { MAX_LENGTHS } from '../../utils/sanitize';
import { formatMinutes, type InvoicesBag } from './shared';
import { CURRENCIES } from '../../lib/constants';

/**
 * All invoice modals: invoice editor, payment recorder, reminder composer,
 * recurring editor, delete confirms. Pure relocation; state stays in shell.
 */
export default function InvoiceModals({ bag }: { bag: InvoicesBag }) {
  const {
    addToast, clients, profile, projects, recurringInvoices,
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
    fmtInvDisplay, getClientName, hourlyRate, unbilledTime,
    sanitizeInvoiceNumber, addItem, addRiItem, importSelectedTime, handleClientChange,
    handleSave, handleDelete, handleRecordPayment, handleDeletePayment,
    handleSendReminder, handleSaveRecurring, depositHint,
  } = bag;
  return (

    <>
      {/* Invoice Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Invoice' : 'New Invoice'}
        size="lg"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">
                Client *
              </label>
              <ClientSelect
                clients={clients}
                value={form.client_id}
                onChange={handleClientChange}
                placeholder="Select a client..."
              />
            </div>
            <div>
              <label className="form-label">
                Project (optional)
              </label>
              <select aria-label="Project"
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">None</option>
                {projects
                  .filter((p) => !form.client_id || p.client_id === form.client_id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="form-label">
                Invoice #
              </label>
              <input
                type="text"
                value={form.invoice_number}
                onChange={(e) =>
                  setForm({ ...form, invoice_number: sanitizeInvoiceNumber(e.target.value) })
                }
                maxLength={40}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Due Date
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="form-label">
                Currency
              </label>
              <select aria-label="Currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">
                  {profile?.currency
                    ? `${getCurrencySymbol(profile.currency)} (default)`
                    : 'Default'}
                </option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {getCurrencySymbol(c)} {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!editing && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Clock size={13} /> Import unbilled time
                </label>
                {selectedTimeIds.size > 0 && (
                  <button
                    onClick={importSelectedTime}
                    className="text-xs text-[var(--accent-ink,var(--accent))] hover:underline"
                  >
                    Import {selectedTimeIds.size} selected
                  </button>
                )}
              </div>
              {hourlyRate <= 0 ? (
                <p className="text-xs text-[var(--warning-text)] bg-[var(--warning-bg)] px-3 py-2 rounded-xs">
                  Set your hourly rate in profile to use time import.
                </p>
              ) : unbilledTime.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">
                  No unbilled time entries to import.
                </p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto border border-[var(--border-color)] rounded-sm p-1">
                  {unbilledTime.map((t) => {
                    const hours = (t.duration_minutes || 0) / 60;
                    const amount = Math.round(hours * hourlyRate * 100) / 100;
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-xs cursor-pointer text-xs ${selectedTimeIds.has(t.id) ? 'bg-[var(--accent-bg)]' : 'hover:bg-[var(--bg-secondary)]'}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTimeIds.has(t.id)}
                          onChange={() => toggleTimeSelection(t.id)}
                          className="w-3.5 h-3.5 rounded border-[var(--neutral-border)] text-[var(--accent-ink,var(--accent))]"
                        />
                        <span className="flex-1 truncate">{t.description || 'No description'}</span>
                        <span className="text-[var(--text-secondary)] flex-shrink-0">
                          {formatMinutes(t.duration_minutes || 0)}
                        </span>
                        <span className="text-[var(--accent-ink,var(--accent))] font-medium flex-shrink-0 w-16 text-right">
                          {formatCurrency(amount)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Line Items</label>
              <button
                onClick={addItem}
                className="text-xs text-[var(--accent-ink,var(--accent))] hover:underline"
              >
                + Add Line
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                    placeholder="Qty"
                    className="w-16 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    type="number"
                    value={item.unit_price || ''}
                    onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    placeholder="Rate"
                    className="w-24 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                  <span className="text-xs text-[var(--text-secondary)] w-20 text-right font-medium tabular-nums">
                    {formatCurrency(item.total)}
                  </span>
                  <button
                    onClick={() => removeItem(i)}
                    aria-label="Remove line item"
                    className="text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[var(--border-color)] pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Subtotal</span>
              <span className="text-[var(--text-primary)] font-medium">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">VAT / sales tax (%)</span>
              <input
                type="number"
                min={0}
                value={form.tax_rate}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, tax_rate: Number(v) < 0 ? '0' : v });
                }}
                placeholder="0"
                className="w-20 px-2 py-1 text-xs text-right border border-[var(--border-color)] rounded-xs focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex justify-between pt-1 border-t border-[var(--border-color)]">
              <span className="font-medium text-[var(--text-primary)]">Total</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {formatCurrency(total)}
              </span>
            </div>
            {depositHint && (
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Typical deposit for your craft: {depositHint.pct}% ({formatCurrency(depositHint.amount)}).
                Add a line above if you take deposits upfront.
              </p>
            )}
          </div>
          <div>
            <label className="form-label">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Invoice notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.client_id} size="sm">
              {editing ? 'Save Changes' : 'Create Invoice'}
            </Button>
          </div>
          </div>
          <div className="hidden lg:block min-w-0">
            <DocPreview
              eyebrow="Invoice"
              title={form.invoice_number || 'New invoice'}
              from={profile?.name}
              to={clients.find((c) => c.id === form.client_id)?.name}
              meta={[
                ...(form.due_date ? [['Due', form.due_date] as [string, string]] : []),
                ...(form.status ? [['Status', form.status] as [string, string]] : []),
              ]}
              lines={items.map((li) => ({
                description: li.description,
                detail:
                  li.quantity > 1
                    ? `${li.quantity} × ${formatCurrency(li.unit_price)}`
                    : undefined,
                amount: formatCurrency(li.total),
              }))}
              totals={[
                { label: 'Subtotal', value: formatCurrency(subtotal) },
                ...(total - subtotal > 0
                  ? [{ label: `Tax${form.tax_rate ? ` (${form.tax_rate}%)` : ''}`, value: formatCurrency(total - subtotal) }]
                  : []),
                { label: 'Total', value: formatCurrency(total), strong: true },
              ]}
              notes={form.notes || undefined}
            />
          </div>
        </div>
      </Modal>

      {/* Recurring Invoice Modal */}
      <Modal
        open={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        title={editingRecurring ? 'Edit Recurring Invoice' : 'New Recurring Invoice'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">
                Client *
              </label>
              <ClientSelect
                clients={clients}
                value={riForm.client_id}
                onChange={(clientId) => setRiForm({ ...riForm, client_id: clientId })}
                placeholder="Select a client..."
              />
            </div>
            <div>
              <label className="form-label">
                Frequency
              </label>
              <select aria-label="Frequency"
                value={riForm.frequency}
                onChange={(e) =>
                  setRiForm({
                    ...riForm,
                    frequency: e.target.value as RecurringInvoiceType['frequency'],
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label className="form-label">
                Starts on
              </label>
              <input
                type="date"
                value={riForm.next_due}
                onChange={(e) => setRiForm({ ...riForm, next_due: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
          <div>
            <label className="form-label">
              Title *
            </label>
            <input
              type="text"
              value={riForm.title}
              onChange={(e) => setRiForm({ ...riForm, title: e.target.value })}
              placeholder="e.g. Monthly retainer"
              maxLength={MAX_LENGTHS.title}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Line Items</label>
              <button
                onClick={addRiItem}
                className="text-xs text-[var(--accent-ink,var(--accent))] hover:underline"
              >
                + Add Line
              </button>
            </div>
            <div className="space-y-2">
              {riItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateRiItem(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => updateRiItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                    placeholder="Qty"
                    className="w-16 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    type="number"
                    value={item.unit_price || ''}
                    onChange={(e) => updateRiItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    placeholder="Rate"
                    className="w-24 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                  <span className="text-xs text-[var(--text-secondary)] w-20 text-right font-medium tabular-nums">
                    {formatCurrency(item.total)}
                  </span>
                  <button
                    onClick={() => removeRiItem(i)}
                    aria-label="Remove line item"
                    className="text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[var(--border-color)] pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Subtotal</span>
              <span className="text-[var(--text-primary)] font-medium">
                {formatCurrency(riSubtotal)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">VAT / sales tax (%)</span>
              <input
                type="number"
                min={0}
                value={riForm.tax_rate}
                onChange={(e) => {
                  const v = e.target.value;
                  setRiForm({ ...riForm, tax_rate: Number(v) < 0 ? '0' : v });
                }}
                placeholder="0"
                className="w-20 px-2 py-1 text-xs text-right border border-[var(--border-color)] rounded-xs focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex justify-between pt-1 border-t border-[var(--border-color)]">
              <span className="font-medium text-[var(--text-primary)]">Total</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {formatCurrency(riTotal)}
              </span>
            </div>
          </div>
          <div>
            <label className="form-label">
              Notes
            </label>
            <textarea
              value={riForm.notes}
              onChange={(e) => setRiForm({ ...riForm, notes: e.target.value })}
              placeholder="Invoice notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm resize-none focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowRecurringModal(false)} size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleSaveRecurring}
              loading={saving}
              disabled={!riForm.title.trim() || !riForm.client_id}
              size="sm"
            >
              {editingRecurring ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Recording Modal */}
      <Modal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
        size="sm"
      >
        <div className="space-y-4">
          {paymentInv && (
            <div className="px-3 py-2 rounded-sm bg-[var(--bg-secondary)]">
              <p className="text-xs font-medium text-[var(--text-primary)]">
                {paymentInv.invoice_number}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {getClientName(paymentInv.client_id)} &middot; {fmtInvDisplay(paymentInv)}
              </p>
            </div>
          )}
          <div>
            <label className="form-label">
              Payment Date
            </label>
            <input
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="form-label">
              Amount Received
            </label>
            <input
              type="number"
              min={0}
              value={paymentForm.amount}
              onChange={(e) => {
                const v = e.target.value;
                setPaymentForm({ ...paymentForm, amount: Number(v) < 0 ? '0' : v });
              }}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="form-label">
              Payment Method
            </label>
            <select aria-label="Payment Method"
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              {[
                'Bank Transfer',
                'E-Transfer',
                'Cash',
                'Cheque',
                'Credit Card',
                'PayPal',
                'Stripe',
                'Wise',
                'Crypto',
                'Other',
              ].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">
              Reference / Transaction ID
            </label>
            <input
              type="text"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="form-label">
              Notes
            </label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="Optional"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)} size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              loading={paymentSaving}
              disabled={!paymentForm.amount}
              size="sm"
            >
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!reminderInv}
        onClose={() => setReminderInv(null)}
        title="Send Invoice Reminder"
        size="md"
      >
        {reminderInv && (
          <div className="space-y-3">
            {!reminderForm.to && (
              <div className="flex items-center gap-2 p-2.5 rounded-sm bg-[var(--warning-bg)] text-[var(--warning-text)] text-xs">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>No email on file for this client. Enter one below or add it in Clients.</span>
              </div>
            )}
            <div>
              <label className="form-label">
                To
              </label>
              <input
                type="email"
                value={reminderForm.to}
                onChange={(e) => setReminderForm({ ...reminderForm, to: e.target.value })}
                placeholder="client@example.com"
                className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="form-label">
                Subject
              </label>
              <input
                type="text"
                value={reminderForm.subject}
                onChange={(e) => setReminderForm({ ...reminderForm, subject: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="form-label">
                Body
              </label>
              <textarea
                value={reminderForm.body}
                onChange={(e) => setReminderForm({ ...reminderForm, body: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none leading-relaxed"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={reminderForm.markFollowedUp}
                onChange={(e) =>
                  setReminderForm({ ...reminderForm, markFollowedUp: e.target.checked })
                }
                className="w-3.5 h-3.5 rounded border-[var(--border-color)] text-[var(--accent-ink,var(--accent))] focus:ring-[var(--accent)]"
              />
              Mark as followed up (logs a communication entry)
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (reminderForm.to && reminderForm.subject && reminderForm.body) {
                    navigator.clipboard.writeText(
                      `To: ${reminderForm.to}\nSubject: ${reminderForm.subject}\n\n${reminderForm.body}`,
                    );
                    addToast('Copied to clipboard', 'success');
                  }
                }}
              >
                <Copy size={12} className="mr-1" /> Copy
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setReminderInv(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSendReminder}>
                <Mail size={12} className="mr-1" /> Open in Email
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Delete ${confirmDelete?.type === 'invoice' ? 'Invoice' : 'Recurring Invoice'}`}
        message={`Are you sure you want to delete "${confirmDelete?.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />

      <ConfirmDialog
        open={!!confirmDeletePayment}
        onClose={() => setConfirmDeletePayment(null)}
        onConfirm={handleDeletePayment}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? The invoice status will be recalculated."
        confirmLabel="Delete"
        variant="danger"
        loading={deletingPayment}
      />
    </>
  );
}
