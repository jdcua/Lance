import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { MoreRows } from '../../components/ui/useVisibleList';
import { Bell, ChevronDown, ChevronRight, DollarSign, Download, Receipt, Pencil, Trash2, Mail, Copy, Check, AlertTriangle, X } from 'lucide-react';
import {
  generateFollowUpDraft,
  generateSubjectLine,
  openMailTo,
} from '../../utils/followUpTemplates';
import { computeLateFee } from '../../utils/lateFees';
import { getCurrencySymbol } from '../../lib/currency';
import { parseDateString, DAY_MS, relativeDate, formatCurrency } from '../../utils/format';
import { statusBadge, type InvoicesBag } from './shared';

/**
 * Invoice list tab: empty state, search-no-match, invoice table with
 * payments, reminders, exports and follow-up badges. Pure relocation.
 */
export default function InvoiceList({ bag }: { bag: InvoicesBag }) {
  const {
    invoices, filteredInvoices, clients, profile, payments, loadPayments,
    pendingFollowUps, followUpSettings, search, paged,
    fmtInv, fmtInvDisplay, getClient, getClientName, getPaidTotal, getRemainingBalance,
    hourlyRate,
    dunningTone, lateFeeOn, lateFeePercent, withFeeNote,
    dropdownRef, feeConfirm, setFeeConfirm, updateFollowUpStatus,
    expandedInv, setExpandedInv, exportDropdown, setExportDropdown,
    setConfirmDelete, setConfirmDeletePayment,
    openEdit, openPaymentModal, openReminderModal,
    handleCreateFromEmptyState, handleMarkSent, handleDuplicate,
    handleAddLateFee, handleExportPDF, handleExportDOCX,
    addToast,
  } = bag;
  return (

        invoices.length === 0 ? (
          <EmptyState
            screen="invoices"
            icon={<Receipt size={40} className="text-[var(--text-tertiary)] mb-4" />}
            hint={
              clients.length === 0 ? (
                <p className="text-xs text-[var(--warning-text)] mb-3">
                  Add at least one client before creating an invoice.
                </p>
              ) : undefined
            }
            action={
              clients.length === 0 ? (
                <Button size="sm" disabled={true}>
                  New Invoice
                </Button>
              ) : (
                <Button onClick={handleCreateFromEmptyState} size="sm" variant="secondary">
                  New Invoice
                </Button>
              )
            }
          />
        ) : filteredInvoices.length === 0 && search ? (
          <Card className="text-center py-12">
            <p className="text-sm text-[var(--text-tertiary)]">No invoices match "{search}"</p>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {paged.visible.map((inv) => {
                const isExpanded = expandedInv === inv.id;
                const paidTotal = getPaidTotal(inv.id);
                const remaining = getRemainingBalance(inv);
                const invPayments = payments.filter((p) => p.invoice_id === inv.id);
                // The follow-up strip below already carries its own Record
                // Payment action, hide the duplicate in the action row.
                const hasFollowUpStrip =
                  inv.status !== 'paid' &&
                  pendingFollowUps.some(
                    (f) => f.entity_type === 'invoice' && f.entity_id === inv.id,
                  );
                const toggleExpand = () => {
                  if (isExpanded) {
                    setExpandedInv(null);
                  } else {
                    setExpandedInv(inv.id);
                    loadPayments();
                  }
                };
                return (
                  <div key={inv.id}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border rounded-[8px] ${isExpanded ? 'rounded-b-none border-b-0' : ''} ${inv.status === 'overdue' ? 'border-l-[3px] border-l-[var(--danger)] border-[var(--border-color)]' : 'border-[var(--border-color)]'}`}
                    >
                      <button
                        onClick={toggleExpand}
                        aria-label={
                          isExpanded ? 'Collapse invoice details' : 'Expand invoice details'
                        }
                        title={isExpanded ? 'Collapse' : 'Expand'}
                        className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex-shrink-0"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {inv.invoice_number}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {getClientName(inv.client_id)}
                          </span>
                          <Badge variant={statusBadge[inv.status]}>{inv.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
                          <span>{fmtInvDisplay(inv)}</span>
                          {inv.due_date && <span>Due: {relativeDate(inv.due_date)}</span>}
                          {inv.paid_at && <span>Paid: {relativeDate(inv.paid_at)}</span>}
                          {paidTotal > 0 && !inv.paid_at && (
                            <span className="text-[var(--warning-text)]">
                              Paid: {fmtInv(paidTotal, inv)}
                            </span>
                          )}
                          {remaining > 0 && remaining < inv.total && (
                            <span className="text-[var(--warning-text)]">
                              Remaining: {fmtInv(remaining, inv)}
                            </span>
                          )}
                          <span>
                            {inv.line_items.length} item{inv.line_items.length !== 1 ? 's' : ''}
                          </span>
                          {(() => {
                            if (!lateFeeOn) return null;
                            if (
                              inv.status !== 'sent' &&
                              inv.status !== 'overdue' &&
                              inv.status !== 'partial'
                            )
                              return null;
                            const fee = computeLateFee(inv.total, inv.due_date, lateFeePercent);
                            if (fee.fee <= 0) return null;
                            return (
                              <>
                                <span className="text-[var(--danger)]">
                                  +{formatCurrency(fee.fee, inv.currency || profile?.currency)} late
                                  fee ({fee.periods}p)
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddLateFee(inv);
                                  }}
                                  className="text-[var(--accent-ink,var(--accent))] hover:underline"
                                  title={
                                    feeConfirm === inv.id
                                      ? 'Click again to confirm adding the fee'
                                      : 'Add the accrued late fee as a line item'
                                  }
                                >
                                  {feeConfirm === inv.id ? 'Confirm add?' : 'Add to invoice'}
                                </button>
                              </>
                            );
                          })()}
                        </div>
                        {/* Follow-up indicator */}
                        {(() => {
                          const fu = pendingFollowUps.find(
                            (f) => f.entity_type === 'invoice' && f.entity_id === inv.id,
                          );
                          if (!fu || inv.status === 'paid') return null;
                          const client = getClient(inv.client_id);
                          const dueDate = inv.due_date ? parseDateString(inv.due_date) : null;
                          const daysElapsed = dueDate
                            ? Math.floor((Date.now() - dueDate.getTime()) / DAY_MS)
                            : 0;
                          const templateKey =
                            daysElapsed >= 10
                              ? 'invoice_day14'
                              : daysElapsed >= 4
                                ? 'invoice_day7'
                                : 'invoice_day1';
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
                          const hasEmail = !!client?.email;
                          return (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Bell size={10} className="text-[var(--accent-ink,var(--accent))]" />
                              <span className="text-[10px] text-[var(--accent-ink,var(--accent))]">
                                {daysElapsed > 0
                                  ? `Follow-up ready · ${daysElapsed}d overdue`
                                  : 'Follow-up ready'}
                              </span>
                              {!hasEmail && (
                                <span className="flex items-center gap-0.5 text-[10px] text-[var(--warning-text)]">
                                  <AlertTriangle size={9} /> No email
                                </span>
                              )}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!client?.email) {
                                    addToast('No email on file for this client', 'error');
                                    return;
                                  }
                                  try {
                                    await openMailTo(client.email, subject, draft);
                                    addToast('Email opened in your default mail client', 'success');
                                  } catch {
                                    addToast('Failed to open email client', 'error');
                                  }
                                }}
                                className="text-[10px] btn-accent px-1.5 py-0.5 rounded-[4px] transition-colors flex-shrink-0"
                              >
                                <Mail size={10} className="inline mr-0.5" /> Email
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await updateFollowUpStatus(fu.id, 'sent', 'sent');
                                  addToast('Marked as sent', 'success');
                                }}
                                className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-1 flex-shrink-0"
                                aria-label="Mark follow-up as sent"
                                title="Mark as sent"
                              >
                                <Check size={10} />
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await updateFollowUpStatus(fu.id, 'dismissed', 'dismissed');
                                  addToast('Dismissed', 'info');
                                }}
                                className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-1 flex-shrink-0"
                                aria-label="Dismiss follow-up"
                                title="Dismiss"
                              >
                                <X size={10} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPaymentModal(inv);
                                }}
                                className="text-[10px] text-[var(--accent-ink,var(--accent))] hover:underline ml-auto flex-shrink-0"
                              >
                                Record Payment
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {inv.status === 'draft' && (
                          <button
                            onClick={() => handleMarkSent(inv)}
                            className="text-[10px] text-[var(--accent-ink,var(--accent))] hover:underline px-1"
                          >
                            Mark Sent
                          </button>
                        )}
                        {(inv.status === 'sent' ||
                          inv.status === 'overdue' ||
                          inv.status === 'partial') && (
                          <>
                            <button
                              onClick={() => openReminderModal(inv)}
                              className="text-[10px] text-[var(--accent-ink,var(--accent))] hover:underline px-1 flex items-center gap-0.5"
                            >
                              <Mail size={10} /> Remind
                            </button>
                            {!hasFollowUpStrip && (
                              <button
                                onClick={() => openPaymentModal(inv)}
                                className="text-[10px] text-[var(--accent-ink,var(--accent))] hover:underline px-1"
                              >
                                Record Payment
                              </button>
                            )}
                          </>
                        )}
                        <div
                          className="relative"
                          ref={exportDropdown === inv.id ? dropdownRef : undefined}
                        >
                          <button
                            onClick={() =>
                              setExportDropdown(exportDropdown === inv.id ? null : inv.id)
                            }
                            aria-label="Export invoice"
                            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]"
                            title="Export"
                          >
                            <Download size={13} />
                          </button>
                          {exportDropdown === inv.id && (
                            <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[8px] shadow-lg py-1 z-10 w-28">
                              <button
                                onClick={() => handleExportPDF(inv)}
                                className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                              >
                                PDF
                              </button>
                              <button
                                onClick={() => handleExportDOCX(inv)}
                                className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                              >
                                DOCX
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDuplicate(inv)}
                          aria-label="Duplicate invoice"
                          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]"
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(inv)}
                          aria-label="Edit invoice"
                          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDelete({
                              id: inv.id,
                              label: inv.invoice_number,
                              type: 'invoice',
                            })
                          }
                          aria-label="Delete invoice"
                          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)] rounded-[8px]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border border-t-0 border-[var(--border-color)] rounded-b-[8px] bg-[var(--bg-secondary)]/30 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                            <DollarSign size={12} />
                            Payments
                          </h4>
                        </div>
                        <div className="flex items-center gap-4 mb-2 text-[10px]">
                          <span className="text-[var(--text-secondary)]">
                            Total paid:{' '}
                            <span className="font-medium text-[var(--accent-ink,var(--accent))]">
                              {fmtInv(paidTotal, inv)}
                            </span>
                          </span>
                          <span className="text-[var(--text-secondary)]">
                            Remaining:{' '}
                            <span
                              className={`font-medium ${remaining > 0 ? 'text-[var(--warning-text)]' : 'text-[var(--accent-ink,var(--accent))]'}`}
                            >
                              {fmtInv(remaining, inv)}
                            </span>
                          </span>
                        </div>
                        {invPayments.length === 0 ? (
                          <p className="text-[10px] text-[var(--text-secondary)]">
                            No payments recorded yet.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {invPayments.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between px-2 py-1.5 rounded-[6px] bg-[var(--bg-card)]"
                              >
                                <div className="flex items-center gap-3 text-[10px]">
                                  <span className="text-[var(--text-primary)] font-medium">
                                    {fmtInv(p.amount, inv)}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">
                                    {relativeDate(p.created_at || p.payment_date)}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">
                                    {p.payment_method}
                                  </span>
                                  {p.reference && (
                                    <span className="text-[var(--text-secondary)]">
                                      Ref: {p.reference}
                                    </span>
                                  )}
                                </div>
                                <button
                                  aria-label="Delete invoices"
                                  onClick={() =>
                                    setConfirmDeletePayment({ id: p.id, invoiceId: inv.id })
                                  }
                                  className="text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <MoreRows
              total={paged.total}
              shown={paged.visible.length}
              hasMore={paged.hasMore}
              showMore={paged.showMore}
            />
          </>
        )
  );
}
