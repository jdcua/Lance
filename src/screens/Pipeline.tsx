import { useEffect, useMemo, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { motion } from 'motion/react';
import { FileText, PenLine, FolderKanban, Receipt, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Fade from '../components/motion/Fade';
import AnimatedNumber from '../components/motion/AnimatedNumber';
import { formatCurrency, parseDateString, todayLocalISO } from '../utils/format';
import { sanitizeInput, MAX_LENGTHS } from '../utils/sanitize';
import { checkAndNotify } from '../achievements/notify';
import { celebrationLevel, recordCelebration, celebrationToast } from '../lib/celebration';
import type { Proposal, Contract, Project, Invoice } from '../types';

type Stage = 'proposal' | 'contract' | 'project' | 'invoice' | 'paid';
const STAGES: Stage[] = ['proposal', 'contract', 'project', 'invoice', 'paid'];
const STAGE_LABEL: Record<Stage, string> = {
  proposal: 'Proposal',
  contract: 'Contract',
  project: 'Project',
  invoice: 'Invoice',
  paid: 'Paid',
};
const STAGE_ICON: Record<Stage, typeof FileText> = {
  proposal: FileText,
  contract: PenLine,
  project: FolderKanban,
  invoice: Receipt,
  paid: CheckCircle2,
};

const PAYMENT_METHODS = [
  'Bank Transfer', 'E-Transfer', 'Cash', 'Cheque', 'Credit Card',
  'PayPal', 'Stripe', 'Wise', 'Crypto', 'Other',
];

function statusOf(inv: Invoice, paidTotal: number): Invoice['status'] {
  const paidCents = Math.round(paidTotal * 100);
  const totalCents = Math.round(inv.total * 100);
  if (paidCents >= totalCents) return 'paid';
  if (paidCents > 0) return 'partial';
  if (inv.status === 'draft') return 'draft';
  if (inv.due_date && parseDateString(inv.due_date) < new Date()) return 'overdue';
  return 'sent';
}

interface CardData {
  kind: Stage;
  id: string;
  title: string;
  sub: string;
  meta?: string;
}

// Memoized: the board re-renders on every store update (portal polling,
// timer ticks elsewhere), but cards only change when their data does.
// Without this, each poll re-measured every card's layout animation.
const PipeCard = memo(function PipeCard({ card, disabled }: { card: CardData; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${card.kind}:${card.id}`,
    data: { card },
    disabled,
  });
  return (
    <motion.div layout transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 shadow-[var(--card-shadow)] ${
          disabled ? 'opacity-70' : 'cursor-grab active:cursor-grabbing hover:border-[var(--text-tertiary)]'
        } ${isDragging ? 'opacity-40' : ''} transition-colors`}
      >
        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{card.title}</p>
        <p className="text-[11px] text-[var(--text-tertiary)] truncate">{card.sub}</p>
        {card.meta && (
          <p className="text-[11px] font-semibold text-[var(--text-secondary)] tnum mt-0.5">{card.meta}</p>
        )}
      </div>
    </motion.div>
  );
});

function Column({
  stage,
  cards,
  children,
}: {
  stage: Stage;
  cards: CardData[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${stage}` });
  const Icon = STAGE_ICON[stage];
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[220px] rounded-xl border p-3 transition-colors ${
        isOver ? 'border-[var(--accent)] bg-[var(--accent-bg)]/40' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]/40'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-3 px-1">
        <Icon size={13} className="text-[var(--text-secondary)]" />
        <h2 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.6px]">
          {STAGE_LABEL[stage]}
        </h2>
        <span className="ml-auto text-[11px] font-semibold text-[var(--text-tertiary)] tnum">
          <AnimatedNumber value={cards.length} />
        </span>
      </div>
      <div className="space-y-2 min-h-[80px]">{children}</div>
    </div>
  );
}

export default function Pipeline() {
  const navigate = useNavigate();
  const store = useStore();
  const {
    proposals, contracts, projects, invoices, payments, clients,
    loadProposals, loadContracts, loadProjects, loadInvoices, loadPayments, loadClients,
    createContract, createProject, deleteContract, deleteProject,
    createPayment, deletePayment, updateInvoice, updateFollowUpStatus,
    addToast,
  } = store;
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [advance, setAdvance] = useState<{ from: Stage; proposal: Proposal } | { from: Stage; contract: Contract } | null>(null);
  const [advanceTitle, setAdvanceTitle] = useState('');
  const [payInv, setPayInv] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayLocalISO());
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    Promise.all([loadProposals(), loadContracts(), loadProjects(), loadInvoices(), loadPayments(), loadClients()])
      .catch((e) => addToast(String(e), 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name || 'Unknown client';

  const cols = useMemo(() => {
    const open = proposals.filter((p) => p.status === 'draft' || p.status === 'sent' || p.status === 'accepted');
    const cons = contracts.filter((c) => c.status === 'draft' || c.status === 'active');
    const projs = projects.filter((p) => p.status === 'active');
    const unpaid = invoices.filter((i) => i.status !== 'paid');
    const paid = invoices.filter((i) => i.status === 'paid').slice(-30);
    const map = (list: { id: string; client_id: string }[], kind: Stage, title: (x: never) => string, sub: (x: never) => string, meta?: (x: never) => string | undefined): CardData[] =>
      list.map((x) => ({ kind, id: x.id, title: title(x as never), sub: sub(x as never), meta: meta?.(x as never) }));
    return {
      proposal: map(open, 'proposal', (p: Proposal) => p.title, (p: Proposal) => `${clientName(p.client_id)} · ${p.status}`),
      contract: map(cons, 'contract', (c: Contract) => c.title, (c: Contract) => `${clientName(c.client_id)} · ${c.status}`),
      project: map(projs, 'project', (p: Project) => p.title, (p: Project) => clientName(p.client_id)),
      invoice: map(unpaid, 'invoice', (i: Invoice) => i.invoice_number, (i: Invoice) => `${clientName(i.client_id)} · ${i.status}`, (i: Invoice) => formatCurrency(i.total)),
      paid: map(paid, 'paid', (i: Invoice) => i.invoice_number, (i: Invoice) => `${clientName(i.client_id)} · paid`, (i: Invoice) => formatCurrency(i.total)),
    } as Record<Stage, CardData[]>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, contracts, projects, invoices, clients]);

  const onDragStart = (e: DragStartEvent) => {
    const card = e.active.data.current?.card as CardData | undefined;
    setActiveCard(card || null);
  };

  const reject = (msg: string) => addToast(msg, 'info');

  const onDragEnd = (e: DragEndEvent) => {
    setActiveCard(null);
    const card = e.active.data.current?.card as CardData | undefined;
    const over = String(e.over?.id || '');
    if (!card || !over.startsWith('col:')) return;
    const target = over.slice(4) as Stage;
    if (target === card.kind) return; // same column: settle back, no-op
    const fromIdx = STAGES.indexOf(card.kind);
    const toIdx = STAGES.indexOf(target);
    if (toIdx < fromIdx) {
      reject('Backward moves happen on the record itself — open it to walk work back.');
      return;
    }
    if (toIdx > fromIdx + 1) {
      reject('Move one stage at a time — each step creates the real next artifact.');
      return;
    }
    if (target === 'paid' && card.kind !== 'invoice') return;
    // Adjacent forward moves by kind:
    if (card.kind === 'proposal' && target === 'contract') {
      const p = proposals.find((x) => x.id === card.id);
      if (!p) return;
      if (p.status === 'draft') {
        reject('Send or accept the proposal before turning it into a contract.');
        return;
      }
      setAdvanceTitle(p.title);
      setAdvance({ from: 'proposal', proposal: p });
    } else if (card.kind === 'contract' && target === 'project') {
      const c = contracts.find((x) => x.id === card.id);
      if (!c) return;
      setAdvanceTitle(c.title);
      setAdvance({ from: 'contract', contract: c });
    } else if (card.kind === 'project' && target === 'invoice') {
      const p = projects.find((x) => x.id === card.id);
      navigate('/invoices');
      addToast(
        p ? `New invoice opened — bill ${p.title} with real amounts.` : 'New invoice opened — fill in real amounts.',
        'info',
      );
      setTimeout(() => document.dispatchEvent(new CustomEvent('lance:add-invoice')), 350);
    } else if (card.kind === 'invoice' && target === 'paid') {
      const inv = invoices.find((x) => x.id === card.id);
      if (!inv) return;
      const paidSoFar = payments.filter((p) => p.invoice_id === inv.id).reduce((s, p) => s + p.amount, 0);
      setPayAmount((Math.max(0, inv.total - paidSoFar)).toFixed(2));
      setPayDate(todayLocalISO());
      setPayMethod(PAYMENT_METHODS[0]);
      setPayInv(inv);
    }
  };

  const handleAdvance = async () => {
    if (!advance) return;
    setSaving(true);
    try {
      if ('proposal' in advance) {
        const p = advance.proposal;
        const created = await createContract({
          client_id: p.client_id,
          project_id: p.project_id,
          proposal_id: p.id,
          title: advanceTitle.trim() || p.title,
          status: 'draft',
          body: '',
        });
        setAdvance(null);
        addToast('Contract drafted from proposal.', 'success', undefined, [
          {
            label: 'Undo',
            onClick: () => {
              deleteContract(created.id).then(
                () => addToast('Undone — draft contract removed.', 'info'),
                (err) => addToast(`Couldn't undo: ${String(err)}`, 'error'),
              );
            },
          },
        ]);
        navigate('/contracts');
      } else {
        const c = advance.contract;
        const created = await createProject({
          client_id: c.client_id,
          title: advanceTitle.trim() || c.title,
          status: 'active',
        });
        setAdvance(null);
        addToast('Project started from contract.', 'success', undefined, [
          {
            label: 'Undo',
            onClick: () => {
              deleteProject(created.id).then(
                () => addToast('Undone — project removed.', 'info'),
                (err) => addToast(`Couldn't undo: ${String(err)}`, 'error'),
              );
            },
          },
        ]);
        navigate('/projects');
      }
    } catch (err) {
      addToast(`Couldn't advance: ${String(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async () => {
    if (!payInv) return;
    const amount = Math.max(0, parseFloat(payAmount) || 0);
    if (amount <= 0) {
      addToast('Payment amount must be greater than zero', 'error');
      return;
    }
    const paidSoFar = payments.filter((p) => p.invoice_id === payInv.id).reduce((s, p) => s + p.amount, 0);
    const remaining = Math.max(0, payInv.total - paidSoFar);
    if (Math.round(amount * 100) > Math.round(remaining * 100)) {
      addToast(`Payment exceeds remaining balance of ${formatCurrency(remaining)}`, 'error');
      return;
    }
    setSaving(true);
    try {
      const prev = { ...payInv };
      const payment = await createPayment({
        invoice_id: payInv.id,
        amount,
        payment_date: payDate,
        payment_method: payMethod,
      });
      const updated = useStore.getState().payments.filter((p) => p.invoice_id === payInv.id);
      const paidTotal = updated.reduce((s, p) => s + p.amount, 0);
      const next = statusOf(payInv, paidTotal);
      if (next !== payInv.status) {
        await updateInvoice({
          ...payInv,
          status: next,
          paid_at: next === 'paid' ? new Date().toISOString() : payInv.paid_at,
        } as Invoice);
      }
      if (next === 'paid') {
        const fu = useStore.getState().pendingFollowUps.find(
          (f) => f.entity_type === 'invoice' && f.entity_id === payInv.id,
        );
        if (fu) await updateFollowUpStatus(fu.id, 'paid', 'auto-resolved').catch(() => {});
        const level = celebrationLevel('invoice-paid');
        if (level === 'full') addToast(`🎉 ${celebrationToast('invoice-paid')}`, 'success');
        else if (level === 'reduced') addToast(celebrationToast('invoice-paid'), 'success');
        recordCelebration('invoice-paid');
      } else {
        addToast(`Partial payment recorded — ${formatCurrency(Math.max(0, payInv.total - paidTotal))} still owed.`, 'success');
      }
      await checkAndNotify(useStore.getState(), addToast);
      setPayInv(null);
      // Undo removes the recorded payment and restores the prior status.
      // An auto-resolved follow-up stays resolved (history, not money).
      addToast('Payment recorded.', 'success', undefined, [
        {
          label: 'Undo',
          onClick: async () => {
            try {
              await deletePayment(payment.id);
              await updateInvoice(prev);
              addToast('Undone — payment removed, status restored.', 'info');
            } catch (err) {
              addToast(`Couldn't undo: ${String(err)}`, 'error');
            }
          },
        },
      ]);
    } catch (err) {
      addToast(`Couldn't record payment: ${String(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderCard = (card: CardData) =>
    card.kind === 'paid' ? (
      <PipeCard key={card.id} card={card} disabled />
    ) : (
      <PipeCard key={card.id} card={card} />
    );

  return (
    <div className="h-full overflow-x-auto p-4 md:p-6">
      <Fade className="mb-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Pipeline</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Drag work forward. Each move does the real thing — contracts, projects, payments — with an undo.
        </p>
      </Fade>
      {loading ? (
        <div className="flex gap-3">
          {STAGES.map((s) => (
            <div key={s} className="flex-1 min-w-[220px] h-64 bg-[var(--bg-secondary)] rounded-xl skeleton-pulse" />
          ))}
        </div>
      ) : proposals.length + contracts.length + projects.length + invoices.length === 0 ? (
        <EmptyState
          screen="projects"
          icon={<FolderKanban size={40} className="text-[var(--text-tertiary)] mb-4" />}
          action={<Button size="sm" variant="secondary" onClick={() => navigate('/proposals/new')}>Start a proposal</Button>}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-3 items-start">
            {STAGES.map((stage) => (
              <Column key={stage} stage={stage} cards={cols[stage]}>
                {cols[stage].length === 0 ? (
                  <p className="text-[11px] text-[var(--text-tertiary)] text-center py-6 border border-dashed border-[var(--border-color)] rounded-lg">
                    Drop here
                  </p>
                ) : (
                  cols[stage].map(renderCard)
                )}
              </Column>
            ))}
          </div>
          <DragOverlay>
            {activeCard ? (
              <div className="bg-[var(--bg-card)] border border-[var(--accent)] rounded-lg px-3 py-2.5 shadow-[var(--shadow-pop)] rotate-[1.5deg]">
                <p className="text-[13px] font-medium text-[var(--text-primary)]">{activeCard.title}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">{activeCard.sub}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Modal
        open={advance !== null}
        onClose={() => setAdvance(null)}
        title={advance && 'proposal' in advance ? 'Draft contract from proposal' : 'Start project from contract'}
      >
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          This creates the real next record — nothing shadow, nothing fake. Undo is offered after.
        </p>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Title</label>
        <input
          value={advanceTitle}
          onChange={(e) => setAdvanceTitle(sanitizeInput(e.target.value).slice(0, 200))}
          className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] mb-4"
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAdvance(null)}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={handleAdvance}>Create it</Button>
        </div>
      </Modal>

      <Modal open={payInv !== null} onClose={() => setPayInv(null)} title="Record payment">
        {payInv && (
          <>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              {payInv.invoice_number} · {clientName(payInv.client_id)} · total {formatCurrency(payInv.total)}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Amount</label>
                <input
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  inputMode="decimal"
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] tnum focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPayInv(null)}>Cancel</Button>
              <Button size="sm" loading={saving} onClick={handlePay}>Record payment</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
