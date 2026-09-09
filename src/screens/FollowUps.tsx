import { useEffect, useState, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { useToasts } from '../store/toastStore';
import type { FollowUpLog } from '../types';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  Bell, Mail, Check, X, Send, AlertTriangle, Edit3, ChevronDown, RefreshCw,
} from 'lucide-react';
import { generateFollowUpDraft, generateSubjectLine, TEMPLATE_LABELS, openMailTo, resolveDunningTone, type DunningTone } from '../utils/followUpTemplates';
import { computeLateFee, lateFeeParagraph } from '../utils/lateFees';
import { getFeatureFlags } from '../lib/constants';
import { formatCurrency, relativeDate, parseDateString, DAY_MS } from '../utils/format';

type Tab = 'pending' | 'sent' | 'dismissed' | 'all';
type Filter = 'all' | 'proposal' | 'invoice';

export default function FollowUps() {
  const {
    clients, loadClients,
    proposals, loadProposals,
    invoices, loadInvoices,
    pendingFollowUps, loadPendingFollowUps,
    followUpLogs, loadAllFollowUpLogs,
    updateFollowUpStatus,
    followUpSettings,
    profile,
    getActiveTier,
  } = useStore();
  const addToast = useToasts((s) => s.add);

  // Smart dunning (Pro): escalation drafts speak in the freelancer's voice.
  // Free tiers always render the default templates.
  const dunningTone: DunningTone | undefined = useMemo(() => {
    if (getFeatureFlags(getActiveTier()).smartDunning !== true) return undefined;
    return resolveDunningTone(profile?.profession, followUpSettings.tone);
  }, [getActiveTier, profile?.profession, followUpSettings.tone]);

  const [tab, setTab] = useState<Tab>('pending');
  const [filter, setFilter] = useState<Filter>('all');
  const [editModal, setEditModal] = useState<{ id: string; subject: string; body: string; email: string } | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadClients(), loadProposals(), loadInvoices(), loadPendingFollowUps(), loadAllFollowUpLogs()]).finally(() => setLoading(false));
  }, [loadClients, loadProposals, loadInvoices, loadPendingFollowUps, loadAllFollowUpLogs]);

  const getClient = useCallback((clientId: string) => clients.find((c) => c.id === clientId), [clients]);
  const getProposal = useCallback((id: string) => proposals.find((p) => p.id === id), [proposals]);
  const getInvoice = useCallback((invId: string) => invoices.find((i) => i.id === invId), [invoices]);

  const allFollowUps = useMemo(() => {
    const results: Array<{
      log: FollowUpLog;
      clientName: string;
      clientEmail?: string;
      entityLabel: string;
      templateLabel: string;
      templateKey: string;
      draft: string;
      daysElapsed: number;
      proposalTitle?: string;
      invoiceNumber?: string;
      amount?: string;
      dueDate?: string;
    }> = [];

    for (const log of [...pendingFollowUps, ...Object.values(followUpLogs).flat().filter(
      (l) => !pendingFollowUps.some((p) => p.id === l.id)
    )]) {
      const client = getClient(
        log.entity_type === 'invoice'
          ? (getInvoice(log.entity_id)?.client_id || '')
          : (getProposal(log.entity_id)?.client_id || '')
      );

      let templateKey = '';
      let daysElapsed = 0;
      let proposalTitle: string | undefined;
      let invoiceNumber: string | undefined;
      let amount: string | undefined;
      let dueDate: string | undefined;

      if (log.entity_type === 'proposal') {
        const p = getProposal(log.entity_id);
        proposalTitle = p?.title;
        const sentDate = p?.sent_at ? new Date(p.sent_at) : new Date();
        daysElapsed = Math.floor((Date.now() - sentDate.getTime()) / DAY_MS);
        if (log.stage === 1) templateKey = 'proposal_day3';
        else if (log.stage === 2) templateKey = 'proposal_day7';
        else templateKey = 'proposal_day14';
      } else {
        const inv = getInvoice(log.entity_id);
        invoiceNumber = inv?.invoice_number;
        amount = inv ? formatCurrency(inv.total) : undefined;
        dueDate = inv?.due_date;
        if (inv?.due_date) {
          daysElapsed = Math.floor((Date.now() - parseDateString(inv.due_date).getTime()) / DAY_MS);
        }
        if (log.stage === 1) templateKey = 'invoice_day1';
        else if (log.stage === 2) templateKey = 'invoice_day7';
        else if (log.stage === 3) templateKey = 'invoice_day14';
        else templateKey = 'invoice_day30';
      }

      const draftBase = generateFollowUpDraft(templateKey, {
        clientName: client?.name || 'Unknown',
        proposalTitle,
        invoiceNumber,
        amount,
        dueDate,
        daysElapsed,
        projectName: proposalTitle,
        freelancerName: profile?.name || 'Freelancer',
      }, followUpSettings.templates, dunningTone);
      // Late-fee footnote on invoice drafts (Pro, when enabled and accrued).
      let draft = draftBase;
      if (dunningTone !== undefined && followUpSettings.lateFeeEnabled === true && log.entity_type === 'invoice') {
        const iv = getInvoice(log.entity_id);
        if (iv) {
          const note = lateFeeParagraph(
            computeLateFee(iv.total, iv.due_date, followUpSettings.lateFeePercent ?? 1.5),
            iv.currency || profile?.currency,
          );
          if (note) draft = `${draftBase}\n\n${note}`;
        }
      }

      results.push({
        log,
        clientName: client?.name || 'Unknown',
        clientEmail: client?.email,
        entityLabel: log.entity_type === 'proposal'
          ? (proposalTitle || log.entity_id.slice(0, 8))
          : (invoiceNumber || log.entity_id.slice(0, 8)),
        templateLabel: TEMPLATE_LABELS[templateKey] || `Stage ${log.stage}`,
        templateKey,
        draft,
        daysElapsed,
        proposalTitle,
        invoiceNumber,
        amount,
        dueDate,
      });
    }

    results.sort((a, b) => new Date(a.log.drafted_at).getTime() - new Date(b.log.drafted_at).getTime());
    return results;
  }, [pendingFollowUps, followUpLogs, profile, followUpSettings, dunningTone, getClient, getInvoice, getProposal]);

  const filtered = useMemo(() => {
    let items = allFollowUps;
    if (tab === 'pending') items = items.filter((f) => f.log.status === 'pending');
    else if (tab === 'sent') items = items.filter((f) => f.log.status === 'sent');
    else if (tab === 'dismissed') items = items.filter((f) => f.log.status === 'dismissed');
    if (filter !== 'all') items = items.filter((f) => f.log.entity_type === filter);
    return items;
  }, [allFollowUps, tab, filter]);

  const pendingFiltered = useMemo(() =>
    filtered.filter((f) => f.log.status === 'pending'),
  [filtered]);

  const handleOpenInEmail = async (item: typeof allFollowUps[0], customSubject?: string, customBody?: string) => {
    const subject = customSubject || generateSubjectLine(item.templateKey, {
      clientName: item.clientName,
      proposalTitle: item.proposalTitle,
      invoiceNumber: item.invoiceNumber,
      amount: item.amount,
      dueDate: item.dueDate,
      daysElapsed: item.daysElapsed,
      freelancerName: profile?.name || 'Freelancer',
    }, followUpSettings.subject_templates, dunningTone);
    const body = customBody || item.draft;

    if (!item.clientEmail) {
      addToast('No email on file for this client. Please add one in Clients.', 'error');
      return;
    }

    try {
      await openMailTo(item.clientEmail, subject, body);
      addToast('Email opened in your default mail client', 'success');
    } catch {
      addToast('Failed to open email client', 'error');
    }
  };

  const handleMarkSent = async (id: string) => {
    await updateFollowUpStatus(id, 'sent', 'sent');
    await loadPendingFollowUps();
    addToast('Marked as sent', 'success');
  };

  const handleDismiss = async (id: string) => {
    await updateFollowUpStatus(id, 'dismissed', 'dismissed');
    await loadPendingFollowUps();
    addToast('Follow-up dismissed', 'info');
  };

  const handleRestore = async (id: string) => {
    await updateFollowUpStatus(id, 'pending', undefined);
    await loadPendingFollowUps();
    addToast('Restored to pending', 'success');
  };

  const handleBulkSend = async () => {
    const items = pendingFiltered.filter((f) => f.clientEmail);
    if (items.length === 0) {
      addToast('No pending follow-ups with valid email addresses', 'error');
      return;
    }
    for (const item of items) {
      await handleOpenInEmail(item);
      await new Promise((r) => setTimeout(r, 800));
    }
    setBulkConfirm(false);
  };

  const openEditModal = (item: typeof allFollowUps[0]) => {
    const subject = generateSubjectLine(item.templateKey, {
      clientName: item.clientName,
      proposalTitle: item.proposalTitle,
      invoiceNumber: item.invoiceNumber,
      amount: item.amount,
      dueDate: item.dueDate,
      daysElapsed: item.daysElapsed,
      freelancerName: profile?.name || 'Freelancer',
    }, followUpSettings.subject_templates, dunningTone);
    setEditModal({
      id: item.log.id,
      subject,
      body: item.draft,
      email: item.clientEmail || '',
    });
  };

  const handleEditAndSend = async () => {
    if (!editModal) return;
    const item = allFollowUps.find((f) => f.log.id === editModal.id);
    if (!item) return;
    await handleOpenInEmail(item, editModal.subject, editModal.body);
    setEditModal(null);
  };

  const pendingCount = pendingFollowUps.length;
  const tabCounts: Record<Tab, number> = {
    pending: allFollowUps.filter((f) => f.log.status === 'pending').length,
    sent: allFollowUps.filter((f) => f.log.status === 'sent').length,
    dismissed: allFollowUps.filter((f) => f.log.status === 'dismissed').length,
    all: allFollowUps.length,
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[var(--bg-secondary)] rounded-[12px] skeleton-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Follow-ups</h1>
          {pendingCount > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">
              {pendingCount} pending
            </span>
          )}
        </div>
        {tab === 'pending' && pendingFiltered.length > 0 && (
          <Button size="sm" onClick={() => setBulkConfirm(true)}>
            <Send size={12} className="mr-1" /> Send All ({pendingFiltered.filter((f) => f.clientEmail).length})
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[var(--border-color)]">
        {(['pending', 'sent', 'dismissed', 'all'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {tabCounts[t] > 0 && (
              <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${
                t === 'pending' ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]'
              }`}>
                {tabCounts[t]}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <FilterDropdown filter={filter} setFilter={setFilter} />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          <Bell size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No {tab} follow-ups{filter !== 'all' ? ` for ${filter}s` : ''}</p>
          <p className="text-xs mt-1">Follow-ups appear here when proposals go unanswered or invoices become overdue.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((item) => {
          const hasEmail = !!item.clientEmail;
          return (
            <div
              key={item.log.id}
              className={`p-4 rounded-[12px] border transition-colors ${
                item.log.status === 'pending'
                  ? 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--accent)]/30'
                  : 'bg-[var(--bg-secondary)]/30 border-[var(--border-color)]/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={item.log.entity_type === 'proposal' ? 'info' : 'warning'}>
                      {item.log.entity_type === 'proposal' ? 'Proposal' : 'Invoice'}
                    </Badge>
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {item.clientName}
                    </span>
                    {hasEmail ? (
                      <span className="text-[10px] text-[var(--text-tertiary)] truncate">{item.clientEmail}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--warning-text)]">
                        <AlertTriangle size={10} />
                        No email
                        <button
                          onClick={() => {
                            const client = getClient(
                              item.log.entity_type === 'invoice'
                                ? (getInvoice(item.log.entity_id)?.client_id || '')
                                : (getProposal(item.log.entity_id)?.client_id || '')
                            );
                            if (client) {
                              document.dispatchEvent(new CustomEvent('lance:edit-client', { detail: client.id }));
                            }
                          }}
                          className="underline hover:text-[var(--warning-hover)]"
                        >
                          Add
                        </button>
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--text-tertiary)]">·</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{item.templateLabel}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 whitespace-pre-wrap">
                    {item.draft.split('\n').slice(0, 3).join(' ')}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--text-tertiary)]">
                    <span>{item.entityLabel}</span>
                    <span>Drafted {relativeDate(item.log.drafted_at)}</span>
                    {item.log.actioned_at && (
                      <>
                        <span>·</span>
                        <span>{item.log.status === 'sent' ? 'Sent' : 'Actioned'} {relativeDate(item.log.actioned_at)}</span>
                      </>
                    )}
                    {item.log.status === 'pending' && (
                      <span className="text-[var(--accent)]">{item.daysElapsed}d elapsed</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.log.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleOpenInEmail(item)}
                        disabled={!hasEmail}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-[6px] transition-colors ${
                          hasEmail
                            ? 'text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
                            : 'text-[var(--text-tertiary)] bg-[var(--bg-secondary)] cursor-not-allowed'
                        }`}
                      >
                        <Mail size={11} /> Open in Email
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[6px] transition-colors"
                        title="Edit before sending"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleMarkSent(item.log.id)}
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[6px] transition-colors"
                        title="Mark as Sent"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => handleDismiss(item.log.id)}
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--danger)] rounded-[6px] transition-colors"
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </>
                  )}
                  {item.log.status === 'dismissed' && (
                    <button
                      onClick={() => handleRestore(item.log.id)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--accent)] hover:bg-[var(--accent-bg)] rounded-[6px] transition-colors"
                    >
                      <RefreshCw size={10} /> Restore
                    </button>
                  )}
                  {item.log.status === 'sent' && (
                    <Badge variant="success">Sent</Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk send confirmation */}
      <Modal open={bulkConfirm} onClose={() => setBulkConfirm(false)} title="Send All Follow-ups" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            This will open{' '}
            <strong className="text-[var(--text-primary)]">{pendingFiltered.filter((f) => f.clientEmail).length}</strong>{' '}
            emails in your default mail client. You'll need to review and send each one.
          </p>
          {pendingFiltered.some((f) => !f.clientEmail) && (
            <div className="flex items-start gap-2 p-3 rounded-[8px] bg-[var(--warning-bg)] text-[var(--warning-text)] text-xs">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{pendingFiltered.filter((f) => !f.clientEmail).length} follow-up(s) skipped · no email on file.</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setBulkConfirm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleBulkSend}>
              <Send size={12} className="mr-1" /> Open {pendingFiltered.filter((f) => f.clientEmail).length} Emails
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit before sending modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit & Send" size="md">
        {editModal && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">To</label>
              <input
                type="email"
                value={editModal.email}
                onChange={(e) => setEditModal({ ...editModal, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Subject</label>
              <input
                type="text"
                value={editModal.subject}
                onChange={(e) => setEditModal({ ...editModal, subject: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Body</label>
              <textarea
                value={editModal.body}
                onChange={(e) => setEditModal({ ...editModal, body: e.target.value })}
                rows={10}
                className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none leading-relaxed"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button size="sm" onClick={handleEditAndSend}>
                <Mail size={12} className="mr-1" /> Open in Email
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function FilterDropdown({ filter, setFilter }: { filter: Filter; setFilter: (f: Filter) => void }) {
  const [open, setOpen] = useState(false);

  const options: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All types' },
    { value: 'proposal', label: 'Proposals' },
    { value: 'invoice', label: 'Invoices' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[6px] hover:bg-[var(--bg-secondary)] transition-colors"
      >
        {options.find((o) => o.value === filter)?.label}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[8px] shadow-lg py-1 z-10 min-w-[100px]"
          onMouseLeave={() => setOpen(false)}
        >
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { setFilter(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors ${
                filter === o.value
                  ? 'text-[var(--accent)] bg-[var(--accent-bg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
