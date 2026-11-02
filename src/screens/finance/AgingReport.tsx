import { useState } from 'react';
import type { Invoice, InvoicePayment } from '../../types';
import { parseDateString, DAY_MS, todayLocalISO } from '../../utils/format';
import { sanitizeInput, MAX_LENGTHS } from '../../utils/sanitize';
import type { ToastType } from '../../store/toastStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Check, AlertTriangle, ArrowUpDown, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

import { MoneyLines } from './shared';

/**
 * Aging report: unpaid buckets, per-invoice remaining, record-payment flow.
 * Moved verbatim from Finance.tsx; still fully props-driven.
 */
type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

interface AgingInvoice {
  invoice: Invoice;
  clientName: string;
  remaining: number;
  daysOverdue: number;
  bucket: AgingBucket;
}

function getBucket(dueDate: string | undefined): AgingBucket {
  if (!dueDate) return 'current';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = parseDateString(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((now.getTime() - due.getTime()) / DAY_MS);
  if (diffDays < 0) return 'current';
  if (diffDays <= 30) return '1-30';
  if (diffDays <= 60) return '31-60';
  if (diffDays <= 90) return '61-90';
  return '90+';
}

const bucketOrder: AgingBucket[] = ['current', '1-30', '31-60', '61-90', '90+'];

const bucketLabel: Record<AgingBucket, string> = {
  current: 'Current',
  '1-30': '1–30 days',
  '31-60': '31–60 days',
  '61-90': '61–90 days',
  '90+': '90+ days',
};

const bucketColor: Record<AgingBucket, string> = {
  current: 'var(--accent)',
  '1-30': 'var(--warning)',
  '31-60': '#f59e0b',
  '61-90': '#ef4444',
  '90+': '#b91c1c',
};

const bucketBg: Record<AgingBucket, string> = {
  current: 'var(--accent-bg)',
  '1-30': 'var(--warning-bg)',
  '31-60': 'rgba(245,158,11,0.12)',
  '61-90': 'rgba(239,68,68,0.12)',
  '90+': 'rgba(185,28,28,0.15)',
};

type AgingSortKey =
  | 'number'
  | 'client'
  | 'total'
  | 'remaining'
  | 'due_date'
  | 'days_overdue'
  | 'status';

function AgingReport({
  invoices,
  payments,
  getClientName,
  fmt,
  addPayment,
  updateInvoice,
  addToast,
  curFallback = 'CAD',
}: {
  invoices: Invoice[];
  payments: Record<string, InvoicePayment[]>;
  getClientName: (id: string) => string;
  fmt: (n: number) => string;
  addPayment: (data: {
    invoice_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference?: string;
    notes?: string;
  }) => Promise<InvoicePayment>;
  updateInvoice: (data: Invoice) => Promise<void>;
  addToast: (msg: string, type?: ToastType) => void;
  curFallback?: string;
}) {
  const [sortKey, setSortKey] = useState<AgingSortKey>('days_overdue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvId, setPaymentInvId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: todayLocalISO(),
    payment_method: 'Bank Transfer',
    reference: '',
    notes: '',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);

  const agingInvoices: AgingInvoice[] = invoices
    .filter((inv) => inv.status !== 'draft' && inv.status !== 'paid')
    .map((inv) => {
      const paidTotal = (payments[inv.id] || []).reduce((s, p) => s + p.amount, 0);
      const remaining = Math.max(0, inv.total - paidTotal);
      if (remaining <= 0) return null;
      const bucket = getBucket(inv.due_date);
      const daysOverdue = inv.due_date
        ? Math.floor((new Date().getTime() - parseDateString(inv.due_date).getTime()) / DAY_MS)
        : 0;
      return {
        invoice: inv,
        clientName: getClientName(inv.client_id),
        remaining,
        daysOverdue,
        bucket,
      };
    })
    .filter((a): a is AgingInvoice => a !== null);

  const bucketTotals: Record<AgingBucket, number> = {
    current: 0,
    '1-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
  };

  const bucketCounts: Record<AgingBucket, number> = { ...bucketTotals };

  for (const ai of agingInvoices) {
    bucketTotals[ai.bucket] += ai.remaining;
    bucketCounts[ai.bucket]++;
  }

  const totalAging = Object.values(bucketTotals).reduce((s, v) => s + v, 0);
  const agingMixed = new Set(agingInvoices.map((a) => a.invoice.currency || curFallback)).size > 1;
  const agingMoney = (list: AgingInvoice[], single: number, pick: (a: AgingInvoice) => number) => {
    if (!agingMixed) return fmt(single);
    const by: Record<string, number> = {};
    list.forEach((a) => {
      const cur = a.invoice.currency || curFallback;
      by[cur] = (by[cur] || 0) + pick(a);
    });
    return <MoneyLines byCurrency={by} size="sm" fallbackCur={curFallback} />;
  };

  const sorted = [...agingInvoices].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'number':
        return dir * a.invoice.invoice_number.localeCompare(b.invoice.invoice_number);
      case 'client':
        return dir * a.clientName.localeCompare(b.clientName);
      case 'total':
        return dir * (a.invoice.total - b.invoice.total);
      case 'remaining':
        return dir * (a.remaining - b.remaining);
      case 'due_date': {
        const da = a.invoice.due_date || '';
        const db = b.invoice.due_date || '';
        return dir * da.localeCompare(db);
      }
      case 'days_overdue':
        return dir * (a.daysOverdue - b.daysOverdue);
      case 'status':
        return dir * a.invoice.status.localeCompare(b.invoice.status);
      default:
        return 0;
    }
  });

  const toggleSort = (key: AgingSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: AgingSortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={10} className="text-[var(--text-tertiary)]" />;
    return sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  };

  const openPaymentModal = (invId: string) => {
    const inv = invoices.find((i) => i.id === invId);
    if (!inv) return;
    const paidTotal = (payments[invId] || []).reduce((s, p) => s + p.amount, 0);
    const remaining = Math.max(0, inv.total - paidTotal);
    setPaymentInvId(invId);
    setPaymentForm({
      amount: remaining > 0 ? remaining.toString() : inv.total.toString(),
      payment_date: todayLocalISO(),
      payment_method: 'Bank Transfer',
      reference: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentInvId || !paymentForm.amount) return;
    const amount = parseFloat(paymentForm.amount);
    const inv = invoices.find((i) => i.id === paymentInvId);
    if (!isFinite(amount) || amount <= 0) {
      addToast('Payment amount must be a positive number', 'error');
      return;
    }
    if (inv) {
      const alreadyPaid = (payments[paymentInvId] || []).reduce((s, p) => s + p.amount, 0);
      if (amount > Math.max(0, inv.total - alreadyPaid) + 0.005) {
        addToast(
          `Payment exceeds the remaining balance of ${fmt(inv.total - alreadyPaid)}`,
          'error',
        );
        return;
      }
    }
    setPaymentSaving(true);
    try {
      await addPayment({
        invoice_id: paymentInvId,
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
      if (inv) {
        const existingPayments = payments[paymentInvId] || [];
        const paidTotal = existingPayments.reduce((s, p) => s + p.amount, 0) + amount;
        if (paidTotal >= inv.total) {
          await updateInvoice({
            ...inv,
            status: 'paid' as const,
            paid_at: paymentForm.payment_date,
          });
        } else if (paidTotal > 0 && inv.status !== 'partial') {
          await updateInvoice({ ...inv, status: 'partial' as const });
        }
      }
      setShowPaymentModal(false);
      addToast('Payment recorded', 'success');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to record payment', 'error');
    } finally {
      setPaymentSaving(false);
    }
  };

  if (agingInvoices.length === 0) {
    return (
      <Card className="text-center py-16 flex flex-col items-center">
        <Check size={40} className="text-[var(--accent-ink,var(--accent))] mb-4" />
        <h2 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">
          All invoices are paid. Nice work.
        </h2>
      </Card>
    );
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {bucketOrder.map((bucket) => (
          <div key={bucket} style={{ borderTop: `3px solid ${bucketColor[bucket]}` }}>
            <Card className="text-center">
              <p className="text-[10px] text-[var(--text-tertiary)] mb-1">
                {bucketLabel[bucket]}
              </p>
              <p className="text-sm font-semibold" style={{ color: bucketColor[bucket] }}>
                {fmt(bucketTotals[bucket])}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                {bucketCounts[bucket]} invoice{bucketCounts[bucket] !== 1 ? 's' : ''}
              </p>
            </Card>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Outstanding & Partial Invoices
        </h2>
        <span className="text-xs text-[var(--text-secondary)]">
          Total:{' '}
          <strong className="text-[var(--text-primary)]">
            {agingMoney(agingInvoices, totalAging, (a) => a.remaining)}
          </strong>{' '}
          across {agingInvoices.length} invoice{agingInvoices.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-color)]">
              {(
                [
                  ['number', 'Invoice #'],
                  ['client', 'Client'],
                  ['total', 'Amount'],
                  ['remaining', 'Remaining'],
                  ['due_date', 'Due Date'],
                  ['days_overdue', 'Days Overdue'],
                  ['status', 'Status'],
                ] as [AgingSortKey, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className="text-left px-3 py-2 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] select-none whitespace-nowrap"
                  onClick={() => toggleSort(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSort(key);
                    }
                  }}
                  tabIndex={0}
                >
                  <span className="flex items-center gap-1">
                    {label}
                    <SortIcon col={key} />
                  </span>
                </th>
              ))}
              <th
                scope="col"
                className="text-right px-3 py-2 font-medium text-[var(--text-secondary)]"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ai) => {
              const { invoice: inv } = ai;
              return (
                <tr
                  key={inv.id}
                  className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-secondary)]/50"
                >
                  <td className="px-3 py-2 text-[var(--text-primary)] font-medium">
                    {inv.invoice_number}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{ai.clientName}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] tabular-nums">
                    {fmt(inv.total)}
                  </td>
                  <td
                    className="px-3 py-2 tabular-nums font-medium"
                    style={{ color: ai.remaining > 0 ? bucketColor[ai.bucket] : 'var(--accent)' }}
                  >
                    {fmt(ai.remaining)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-tertiary)]">
                    {inv.due_date ? relativeDate(inv.due_date) : '--'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="flex items-center gap-1"
                      style={{ color: bucketColor[ai.bucket] }}
                    >
                      {ai.bucket === '90+' && <AlertTriangle size={10} />}
                      <span className="font-medium">
                        {ai.daysOverdue > 0 ? ai.daysOverdue : '--'}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium`}
                      style={{
                        backgroundColor: bucketBg[ai.bucket],
                        color: bucketColor[ai.bucket],
                      }}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => openPaymentModal(inv.id)}
                      className="text-[10px] text-[var(--accent-ink,var(--accent))] hover:underline whitespace-nowrap"
                    >
                      <DollarSign size={10} className="inline mr-0.5" />
                      Record Payment
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--border-color)] font-medium">
              <td className="px-3 py-2 text-[var(--text-secondary)]" colSpan={2}>
                Total ({agingInvoices.length})
              </td>
              <td className="px-3 py-2 text-[var(--text-primary)] tabular-nums">
                {agingMoney(
                  agingInvoices,
                  agingInvoices.reduce((s, a) => s + a.invoice.total, 0),
                  (a) => a.invoice.total,
                )}
              </td>
              <td className="px-3 py-2 text-[var(--text-primary)] tabular-nums">
                {agingMoney(agingInvoices, totalAging, (a) => a.remaining)}
              </td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* Payment Modal */}
      <Modal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
        size="sm"
      >
        <div className="space-y-4">
          {(() => {
            const inv = invoices.find((i) => i.id === paymentInvId);
            return inv ? (
              <div className="px-3 py-2 rounded-[8px] bg-[var(--bg-secondary)]">
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  {inv.invoice_number}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  {getClientName(inv.client_id)} &middot; {fmt(inv.total)}
                </p>
              </div>
            ) : null;
          })()}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Amount Received
            </label>
            <input
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Payment Method
            </label>
            <select
              aria-label="Payment Method"
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Reference / Transaction ID
            </label>
            <input
              type="text"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Notes
            </label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="Optional"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none"
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
    </>
  );
}

function relativeDate(iso: string): string {
  const date = parseDateString(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / DAY_MS);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}


export default AgingReport;
