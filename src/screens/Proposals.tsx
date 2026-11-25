import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Proposal, ShareToken } from '../types';
import Button from '../components/ui/Button';
import LoadError from '../components/ui/LoadError';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatCurrency } from '../utils/format';
import { formatDate } from '../utils/format';
import { relativeDate, parseDateString, DAY_MS } from '../utils/format';
import { getProposalViews } from '../utils/portalActivity';
import { scoreProposalHeat, compareHeat, type ProposalHeat } from '../utils/proposalHeat';
import { htmlToPlainText } from '../utils/htmlToText';
import { useToasts } from '../store/toastStore';
import { checkAndNotify, tryUnlock } from '../achievements/notify';
import { Plus, Trash2, Send, Eye, Download, FileText, Search, Bell, Check, X, Copy, Clock, Mail, Share2, Link, Flame } from 'lucide-react';
import ShareModal from '../components/ShareModal';
import { useVisibleList, MoreRows } from '../components/ui/useVisibleList';
import { generateFollowUpDraft, generateSubjectLine, openMailTo } from '../utils/followUpTemplates';
import ArchetypeFeatureTabs from '../components/features/ArchetypeFeatureTabs';
import { sanitizeInput, MAX_LENGTHS } from '../utils/sanitize';

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'dark'> = {
  draft: 'warning',
  sent: 'info',
  accepted: 'success',
  declined: 'danger',
  expired: 'dark',
};

function generateContractBody(
  freelancerName: string,
  clientName: string,
  proposalTitle: string,
  scope: string,
  timeline: string,
  formattedRate: string
): string {
  return [
    'SERVICE AGREEMENT', '',
    `This agreement is between ${freelancerName} ("Contractor") and ${clientName} ("Client").`, '',
    'PROJECT', proposalTitle, '',
    'SCOPE OF WORK', scope, '',
    'TIMELINE', timeline || 'As agreed upon by both parties.', '',
    'COMPENSATION', formattedRate, 'Payment is due within 14 days of invoice.', '',
    'REVISIONS', 'This agreement includes up to 2 rounds of revisions. Additional revisions will be quoted separately.', '',
    'KILL FEE', 'If the Client cancels the project after work has begun, a kill fee of 25% of the total project value is due immediately.', '',
    'INTELLECTUAL PROPERTY', 'All intellectual property created under this agreement transfers to the Client upon receipt of final payment.', '',
    'CONFIDENTIALITY', 'Both parties agree to keep the terms of this agreement and any shared materials confidential.', '',
    'Agreed by:', '',
    `${freelancerName}                    ${clientName}`,
    'Date: ___________                   Date: ___________',
  ].join('\n');
}

// Follow-up draft/subject pair for an expanded proposal, computed once from
// the same inputs the old inline IIFE used.
function buildProposalFollowUpDraft(
  p: Proposal,
  client: { name?: string } | undefined,
  profile: { name?: string } | null,
  settings: { templates: Record<string, string>; subject_templates: Record<string, string> },
) {
  const sentDate = p.sent_at ? new Date(p.sent_at) : new Date(p.created_at);
  const daysElapsed = Math.floor((Date.now() - sentDate.getTime()) / DAY_MS);
  const templateKey =
    daysElapsed >= 10 ? 'proposal_day14' : daysElapsed >= 4 ? 'proposal_day7' : 'proposal_day3';
  const vars = {
    clientName: client?.name || 'Unknown',
    proposalTitle: p.title,
    daysElapsed,
    projectName: p.title,
    freelancerName: profile?.name || 'Freelancer',
  };
  return {
    daysElapsed,
    draft: generateFollowUpDraft(templateKey, vars, settings.templates),
    subject: generateSubjectLine(templateKey, vars, settings.subject_templates),
  };
}

type SortKey = 'title' | 'client' | 'status' | 'date' | 'heat';
type StatusFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export default function Proposals() {
  const { proposals, loadProposals, clients, loadClients, updateProposal, removeProposal, profile, loadProfile, addProposal, addContract, contracts, loadContracts, pendingFollowUps, loadPendingFollowUps, updateFollowUpStatus, logFollowUp, followUpSettings, portalActivity, loadPortalActivity } = useStore();
  const addToast = useToasts((s) => s.add);
  const proposalsError = useStore((s) => s.errors.proposals);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exportDropdown, setExportDropdown] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [shareModal, setShareModal] = useState<{ entityType: 'proposal'; entityId: string } | null>(null);
  const [shareTokenIds, setShareTokenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadShareTokens = async () => {
      try {
        // Shared invoke, not the Tauri import directly: the browser shim
        // implements this command, and the direct import throws outside
        // Tauri — which used to hide every share badge in browser mode.
        const { tauriInvoke } = await import('../utils/tauri');
        const tokens = await tauriInvoke<ShareToken[]>('get_all_share_tokens');
        const ids = new Set(tokens.filter(t => t.entity_type === 'proposal').map(t => t.entity_id));
        setShareTokenIds(ids);
      } catch { /* ignore */ }
    };
    Promise.all([loadProposals(), loadClients(), loadProfile(), loadShareTokens(), loadPortalActivity(), loadContracts()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
    loadPendingFollowUps();
  }, [loadProposals, loadClients, loadProfile, loadContracts, loadPendingFollowUps, loadPortalActivity, addToast]);

  useEffect(() => {
    if (!exportDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExportDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportDropdown]);

  const computeExpiry = (): { expiresAt: string | null } => {
    if (!profile?.proposal_expiry_days) return { expiresAt: null };
    const d = new Date();
    d.setDate(d.getDate() + profile.proposal_expiry_days);
    return { expiresAt: d.toISOString() };
  };

  // Human countdown for sent proposals. A past expiry that the hourly
  // engine hasn't swept yet says so honestly instead of "Expires {past}".
  const expiryCountdown = (expiresAt: string, long = false): string => {
    const days = Math.ceil((parseDateString(expiresAt).getTime() - Date.now()) / DAY_MS);
    if (days < 0) return long ? `Expired ${formatDate(expiresAt)} · auto-expiry pending` : 'Expired · expiring soon';
    if (days === 0) return 'Expires today';
    if (days === 1) return long ? `Expires tomorrow (${formatDate(expiresAt)})` : 'Expires tomorrow';
    return long ? `Expires in ${days} days (${formatDate(expiresAt)})` : `Expires in ${days} days`;
  };

  const handleSend = async (p: Proposal) => {
    try {
      const expiry = computeExpiry();
      await updateProposal({
        ...p,
        status: 'sent' as const,
        sent_at: new Date().toISOString(),
        expires_at: expiry.expiresAt ?? undefined,
      });
      checkAndNotify(useStore.getState(), addToast);
      // Sending completes via the share link: open it so the proposal
      // actually reaches the client instead of only flipping status.
      setShareModal({ entityType: 'proposal', entityId: p.id });
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to send', 'error');
    }
  };

  const handleResend = async (p: Proposal) => {
    try {
      const expiry = computeExpiry();
      // A resend restarts the clock: retire pendings from the previous send
      // so the timeline (and nudge copy) matches the new sent_at below.
      try {
        for (const l of useStore.getState().pendingFollowUps.filter(
          (f) => f.entity_type === 'proposal' && f.entity_id === p.id,
        )) {
          await updateFollowUpStatus(l.id, 'dismissed', 'auto-resolved');
        }
      } catch { /* resend stands regardless */ }
      await updateProposal({
        ...p,
        status: 'sent' as const,
        sent_at: new Date().toISOString(),
        expires_at: expiry.expiresAt ?? undefined,
      });
      addToast('Proposal resent', 'success');
      setShareModal({ entityType: 'proposal', entityId: p.id });
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to resend', 'error');
    }
  };

  const handleExportPDF = async (p: Proposal) => {
    const client = getClient(p.client_id);
    if (client && profile) {
      // Renderer chunk loads on first export, never on route load.
      const { exportProposalPDF } = await import('../export');
      await exportProposalPDF(p, client, profile);
      tryUnlock('first_export', addToast);
    }
    setExportDropdown(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await removeProposal(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (p: Proposal) => {
    try {
      await addProposal({
        client_id: p.client_id,
        project_id: p.project_id,
        title: sanitizeInput(`Copy of ${p.title}`).slice(0, MAX_LENGTHS.title),
        status: 'draft',
        scope: p.scope ? sanitizeInput(p.scope).slice(0, MAX_LENGTHS.description) : undefined,
        timeline: p.timeline ? sanitizeInput(p.timeline).slice(0, 200) : undefined,
        rate: p.rate,
        rate_type: p.rate_type,
        body: p.body,
      });
      addToast('Proposal duplicated · saved as draft', 'success');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to duplicate proposal', 'error');
    }
  };

  const handleAccept = async (p: Proposal) => {
    try {
      await updateProposal({ ...p, status: 'accepted' as const });
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to accept', 'error');
    }
  };

  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);
  const getClientName = (clientId: string) => getClient(clientId)?.name || 'Unknown';

  const handleConvertToContract = async (p: Proposal) => {
    const client = getClient(p.client_id);
    if (!client || !profile) return;
    setConvertingId(p.id);
    try {
      // Guard against double conversion (double-click, retry after a slow
      // save, re-run): contracts remember their source proposal.
      const existing = useStore.getState().contracts.find((c) => c.proposal_id === p.id);
      if (existing) {
        addToast('Contract already exists for this proposal', 'info');
        navigate('/contracts');
        return;
      }
      const freelancerName = profile.name || 'Freelancer';
      const rateStr = p.rate
        ? formatCurrency(p.rate, profile.currency) + (p.rate_type === 'hourly' ? ' per hour' : ' flat project fee')
        : 'TBD';
      const body = generateContractBody(freelancerName, client.name, p.title, p.scope || '', p.timeline || '', rateStr);
      const contractTitle = sanitizeInput(`Contract · ${p.title}`).slice(0, MAX_LENGTHS.title);
      await addContract({ client_id: p.client_id, proposal_id: p.id, title: contractTitle, status: 'draft', body });
      // Converting means the deal closed: accept the proposal so follow-ups
      // stop nagging and expiry can't fire on a won deal.
      if (p.status !== 'accepted') {
        await updateProposal({ ...p, status: 'accepted' as const });
      }
      navigate('/contracts');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to convert to contract', 'error');
    } finally {
      setConvertingId(null);
    }
  };

  const handleExportDOCX = async (p: Proposal) => {
    const client = getClient(p.client_id);
    if (client && profile) {
      const { exportProposalDOCX } = await import('../export');
      await exportProposalDOCX(p, client, profile);
      tryUnlock('first_export', addToast);
    }
    setExportDropdown(null);
  };

  const formatRate = (p: Proposal) => {
    if (!p.rate || !profile) return '';
    const formatted = formatCurrency(p.rate, profile.currency);
    if (p.rate_type === 'hourly') return `${formatted}/hr`;
    return `${formatted} flat`;
  };

  const statusLabels: Record<StatusFilter, string> = {
    all: 'All',
    draft: 'Draft',
    sent: 'Sent',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
  };

  const filtered = proposals.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.title || '').toLowerCase().includes(s) || (getClientName(p.client_id) || '').toLowerCase().includes(s);
  });

  // Buy-intent ranking: hot means opened in the last 72 hours, cooling means
  // sent 3+ weeks ago and never opened. Always available.
  const heatOn = true;
  const heatOf = (id: string, status: string, sentAt?: string, createdAt?: string): ProposalHeat => {
    const views = getProposalViews(portalActivity, id);
    return scoreProposalHeat({
      status,
      sentAt,
      createdAt: createdAt || new Date().toISOString(),
      opens: views?.opens || 0,
      lastOpenedAt: views?.lastOpenedAt,
    });
  };

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'title': return dir * a.title.localeCompare(b.title);
      case 'client': return dir * getClientName(a.client_id).localeCompare(getClientName(b.client_id));
      case 'status': return dir * a.status.localeCompare(b.status);
      case 'date': return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'heat': return compareHeat(heatOf(a.id, a.status, a.sent_at, a.created_at), heatOf(b.id, b.status, b.sent_at, b.created_at));
      default: return 0;
    }
  });

  const pagedProposals = useVisibleList(sorted, `${search}|${sortKey}|${sortDir}|${statusFilter}`);

  // Rescue queue: sent proposals gone cold (3+ weeks, never opened)
  // are money left on the table. One click queues a follow-up nudge.
  const rescueList = proposals
    .filter((p) => heatOf(p.id, p.status, p.sent_at, p.created_at) === 'cooling')
    .sort((a, b) => (b.rate || 0) - (a.rate || 0));
  const rescueQueued = new Set(
    pendingFollowUps.filter((f) => f.entity_type === 'proposal').map((f) => f.entity_id),
  );
  const daysStale = (p: Proposal) => {
    const since = p.sent_at || p.created_at;
    return Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 86400000));
  };
  const handleRescueNudge = async (p: Proposal) => {
    try {
      await logFollowUp({ entity_type: 'proposal', entity_id: p.id, stage: 1 });
      await loadPendingFollowUps();
      addToast(`Nudge queued for ${p.title}`, 'success');
    } catch {
      addToast('Failed to queue nudge', 'error');
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (loading) return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-[var(--bg-secondary)] rounded-[12px] skeleton-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <LoadError error={proposalsError} onRetry={() => loadProposals()} />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-lg font-semibold text-[var(--text-primary)]">Proposals</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {proposals.filter((p) => p.status === 'draft').length} drafts, {proposals.length} total
          </p>
        </div>
        <Button onClick={() => navigate('/proposals/new')} size="sm" disabled={clients.length === 0}>
          <Plus size={14} />
          New Proposal
        </Button>
      </div>

      {/* Rescue queue: cold proposals worth reviving */}
      {rescueList.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] mb-2">
            Needs a nudge · {rescueList.length} going cold
          </p>
          <div className="space-y-1.5">
            {rescueList.slice(0, 4).map((p) => {
              const queued = rescueQueued.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[var(--text-primary)] truncate">{p.title}</span>
                    <span className="text-[var(--text-tertiary)]"> · {getClientName(p.client_id)}</span>
                  </div>
                  <span className="flex-shrink-0 text-[var(--text-tertiary)] tabular-nums">
                    {p.rate && profile ? `${formatCurrency(p.rate, profile.currency)} · ` : ''}{daysStale(p)}d stale
                  </span>
                  {queued ? (
                    <span className="flex-shrink-0 text-[10px] font-medium text-[var(--accent-ink,var(--accent))]">Nudge queued</span>
                  ) : (
                    <button
                      onClick={() => handleRescueNudge(p)}
                      className="flex-shrink-0 text-[11px] font-medium text-[var(--accent-ink,var(--accent))] hover:underline"
                    >
                      Draft nudge
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search proposals..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border-color)] rounded-xs placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] bg-[var(--bg-secondary)]"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--text-tertiary)]">Status:</span>
          {(Object.keys(statusLabels) as StatusFilter[]).map(k => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={`text-[10px] px-2 py-0.5 rounded-[4px] transition-colors capitalize ${statusFilter === k ? 'bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] font-medium' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
            >
              {statusLabels[k]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--text-tertiary)]">Sort:</span>
          {(['date', 'title', 'client', 'status'] as SortKey[]).map(k => (
            <button key={k} onClick={() => toggleSort(k)} className={`text-[10px] px-2 py-0.5 rounded-[4px] transition-colors capitalize ${sortKey === k ? 'bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] font-medium' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>
              {k}{sortKey === k && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
          <button
            onClick={() => toggleSort('heat')}
            title="Sort by buy-intent"
            className={`text-[10px] px-2 py-0.5 rounded-[4px] transition-colors capitalize flex items-center gap-0.5 ${sortKey === 'heat' ? 'bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))] font-medium' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
          >
            <Flame size={10} />
            heat
          </button>
        </div>
      </div>

      {clients.length === 0 ? (
        <Card className="mb-4 border-[var(--warning-bg)] bg-[var(--warning-bg)]/50">
          <p className="text-sm text-[var(--warning-text)]">Add at least one client before creating a proposal.</p>
        </Card>
      ) : proposals.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <FileText size={40} className="text-[var(--text-tertiary)] mb-4" />
          <h2 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">No proposals yet</h2>
          <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs mb-5">Create your first proposal to start winning work.</p>
          <Button onClick={() => navigate('/proposals/new')} size="sm" variant="secondary">New Proposal</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12"><p className="text-sm text-[var(--text-tertiary)]">No proposals match your filters.</p></Card>
      ) : (
        <>
        <div className="space-y-3">
          {pagedProposals.visible.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                {(() => (
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{p.title}</h2>
                      {shareTokenIds.has(p.id) && (
                        <Link size={12} className="text-[var(--accent-ink,var(--accent))] flex-shrink-0" />
                      )}
                      <Badge variant={statusBadge[p.status]}>{p.status}</Badge>
                      {(() => {
                        const v = getProposalViews(portalActivity, p.id);
                        const heat = heatOn ? heatOf(p.id, p.status, p.sent_at, p.created_at) : null;
                        if (!v && heat !== 'cooling') return null;
                        return (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]"
                            title={v ? `Last opened ${relativeDate(v.lastOpenedAt)}` : 'Sent over 3 weeks ago, never opened'}
                          >
                            {v && (
                              <>
                                <Eye size={12} />
                                Opened {v.opens}x
                              </>
                            )}
                            {heat === 'hot' && (
                              <span className="inline-flex items-center gap-0.5 font-semibold px-1 py-px rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]">
                                <Flame size={9} />
                                HOT
                              </span>
                            )}
                            {heat === 'cooling' && (
                              <span className="font-medium px-1 py-px rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                Cooling
                              </span>
                            )}
                          </span>
                        );
                      })()}
                    </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mb-2">
                    <span>{getClientName(p.client_id)}</span>
                    {formatRate(p) && <span>{formatRate(p)}</span>}
                    {p.timeline && <span>{p.timeline}</span>}
                  </div>
                  {p.scope && (
                    <p className="text-xs text-[var(--text-tertiary)] line-clamp-2 mb-2">{p.scope}</p>
                  )}
                  {p.status === 'accepted' && (
                    <button
                      onClick={() => handleConvertToContract(p)}
                      disabled={convertingId === p.id}
                      className="inline-flex items-center gap-1.5 text-xs font-medium btn-accent px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50"
                    >
                      <FileText size={13} />
                      {convertingId === p.id ? 'Creating...' : 'Convert to contract'}
                    </button>
                  )}
                  {p.status === 'expired' && p.expires_at && (
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      Expired on {formatDate(p.expires_at)}
                    </p>
                  )}
                  {p.status === 'sent' && p.expires_at && (
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      {expiryCountdown(p.expires_at)}
                    </p>
                  )}
                </div>
                ))()}
                {(() => (
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  {p.status === 'draft' && (
                    <button onClick={() => handleSend(p)} aria-label="Send proposal" className="p-1.5 rounded-sm text-[var(--accent-ink,var(--accent))] hover:bg-[var(--accent-bg)] transition-colors" title="Send">
                      <Send size={14} />
                    </button>
                  )}
                  {p.status === 'sent' && (
                    <>
                      <button onClick={() => handleAccept(p)} aria-label="Accept proposal" className="p-1.5 rounded-sm text-[var(--accent-ink,var(--accent))] hover:bg-[var(--accent-bg)] transition-colors" title="Accept">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setShareModal({ entityType: 'proposal', entityId: p.id })} aria-label="Share proposal" className="p-1.5 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--accent-ink,var(--accent))] hover:bg-[var(--accent-bg)] transition-colors" title="Share">
                        <Share2 size={14} />
                      </button>
                    </>
                  )}
                  {p.status === 'expired' && (
                    <button onClick={() => handleResend(p)} aria-label="Resend proposal" className="p-1.5 rounded-sm text-[var(--accent-ink,var(--accent))] hover:bg-[var(--accent-bg)] transition-colors" title="Resend">
                      <Send size={14} />
                    </button>
                  )}
                  <div className="relative" ref={exportDropdown === p.id ? dropdownRef : undefined}>
                    <button onClick={() => setExportDropdown(exportDropdown === p.id ? null : p.id)} aria-label="Export proposal" className="p-1.5 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Export">
                      <Download size={14} />
                    </button>
                    {exportDropdown === p.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm shadow-lg py-1 z-10 w-28">
                        <button onClick={() => handleExportPDF(p)} className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">PDF</button>
                        <button onClick={() => handleExportDOCX(p)} className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">DOCX</button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} aria-label="View proposal body" className={`p-1.5 rounded-sm transition-colors ${expanded === p.id ? 'text-[var(--accent-ink,var(--accent))] bg-[var(--accent-bg)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`} title="View body">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => handleDuplicate(p)} aria-label="Duplicate proposal" className="p-1.5 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Duplicate">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => setConfirmDelete({ id: p.id, title: p.title })} aria-label="Delete proposal" className="p-1.5 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                ))()}
              </div>
              {expanded === p.id && (
                <div className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-3">
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
                    <span>Sent {p.sent_at ? formatDate(p.sent_at) : 'N/A'}</span>
                    <span>·</span>
                    <span>{p.expires_at ? expiryCountdown(p.expires_at, true) : 'Never expires'}</span>
                  </div>
                  {/* Follow-up banner */}
                  {(() => {
                    const fu = pendingFollowUps.find((f) => f.entity_type === 'proposal' && f.entity_id === p.id);
                    if (fu && p.status === 'sent') {
                      const client = getClient(p.client_id);
                      const { daysElapsed, draft, subject } = buildProposalFollowUpDraft(
                        p,
                        client,
                        profile,
                        followUpSettings,
                      );
                      const hasEmail = !!client?.email;
                      return (
                        <div className="px-3 py-2.5 rounded-sm bg-[var(--accent-bg)]/30 border border-[var(--accent)]/20">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Bell size={12} className="text-[var(--accent-ink,var(--accent))]" />
                            <span className="text-[10px] font-semibold text-[var(--accent-ink,var(--accent))]">Follow-up Draft · Stage {fu.stage}</span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">{daysElapsed}d since sent</span>
                            {!hasEmail && (
                              <span className="text-[10px] text-[var(--warning-text)]">No email</span>
                            )}
                          </div>
                          <textarea
                            value={draft}
                            readOnly
                            rows={5}
                            title="Draft preview · copy it to your mail app to edit and send"
                            className="w-full px-2.5 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] resize-none leading-relaxed mb-2"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={async () => {
                                if (!client?.email) {
                                  addToast('No email on file for this client', 'error');
                                  return;
                                }
                                try {
                                  await openMailTo(client.email, subject, draft);
                                  addToast('Email opened in your default mail client', 'success');
                                } catch { addToast('Failed to open email client', 'error'); }
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium btn-accent rounded-xs transition-colors"
                            >
                              <Mail size={10} /> Open in Email
                            </button>
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(draft);
                                addToast('Copied to clipboard', 'success');
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xs hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                              <Copy size={10} /> Copy
                            </button>
                            <button
                              onClick={async () => { await updateFollowUpStatus(fu.id, 'sent', 'sent'); addToast('Marked as sent', 'success'); }}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xs hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                              <Check size={10} /> Mark Sent
                            </button>
                            <button
                              onClick={async () => { await updateFollowUpStatus(fu.id, 'dismissed', 'dismissed'); addToast('Follow-up dismissed', 'info'); }}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xs hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                              <X size={10} /> Dismiss
                            </button>
                            <button
                              onClick={async () => { await updateFollowUpStatus(fu.id, 'responded', 'responded_to'); addToast('Marked as responded', 'success'); }}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--accent-ink,var(--accent))] hover:bg-[var(--accent-bg)] rounded-xs transition-colors ml-auto"
                            >
                              <Check size={10} /> Mark Responded
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {p.body && (
                    <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{htmlToPlainText(p.body)}</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
        <MoreRows total={pagedProposals.total} shown={pagedProposals.visible.length} hasMore={pagedProposals.hasMore} showMore={pagedProposals.showMore} />
        </>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Proposal"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
      {shareModal && (
        <ShareModal
          open={!!shareModal}
          onClose={() => setShareModal(null)}
          entityType={shareModal.entityType}
          entityId={shareModal.entityId}
        />
      )}
      <ArchetypeFeatureTabs screen="proposals" />
    </div>
  );
}
