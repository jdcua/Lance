import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Proposal, Contract } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { exportProposalPDF, exportProposalDOCX } from '../export';
import { formatCurrency, formatDate } from '../utils/format';
import { htmlToPlainText } from '../utils/htmlToText';
import { useToasts } from '../store/toastStore';
import { checkAndNotify, tryUnlock } from '../achievements/notify';
import { Plus, Pencil, Trash2, Send, Eye, Download, FileText } from 'lucide-react';

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'warning',
  sent: 'info',
  accepted: 'success',
  declined: 'danger',
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
    'SERVICE AGREEMENT',
    '',
    `This agreement is between ${freelancerName} ("Contractor") and ${clientName} ("Client").`,
    '',
    'PROJECT',
    proposalTitle,
    '',
    'SCOPE OF WORK',
    scope,
    '',
    'TIMELINE',
    timeline || 'As agreed upon by both parties.',
    '',
    'COMPENSATION',
    formattedRate,
    'Payment is due within 14 days of invoice.',
    '',
    'REVISIONS',
    'This agreement includes up to 2 rounds of revisions. Additional revisions will be quoted separately.',
    '',
    'KILL FEE',
    'If the Client cancels the project after work has begun, a kill fee of 25% of the total project value is due immediately.',
    '',
    'INTELLECTUAL PROPERTY',
    'All intellectual property created under this agreement transfers to the Client upon receipt of final payment.',
    '',
    'CONFIDENTIALITY',
    'Both parties agree to keep the terms of this agreement and any shared materials confidential.',
    '',
    'Agreed by:',
    '',
    `${freelancerName}                    ${clientName}`,
    'Date: ___________                   Date: ___________',
  ].join('\n');
}

export default function Proposals() {
  const { proposals, loadProposals, clients, loadClients, updateProposal, removeProposal, profile, loadProfile, addContract } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exportDropdown, setExportDropdown] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Promise.all([loadProposals(), loadClients(), loadProfile()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadProposals, loadClients, loadProfile]);

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

  const handleSend = async (p: Proposal) => {
    try {
      await updateProposal({ ...p, status: 'sent' as const });
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to send', 'error');
    }
  };

  const handleExportPDF = (p: Proposal) => {
    const client = getClient(p.client_id);
    if (client && profile) {
      exportProposalPDF(p, client, profile);
      tryUnlock('first_export', addToast);
    }
    setExportDropdown(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this proposal?')) {
      try {
        await removeProposal(id);
      } catch (err) {
        addToast(err?.toString?.() || 'Failed to delete', 'error');
      }
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
      const freelancerName = profile.name || 'Freelancer';
      const rateStr = p.rate
        ? formatCurrency(p.rate, profile.currency) + (p.rate_type === 'hourly' ? ' per hour' : ' flat project fee')
        : 'TBD';
      const body = generateContractBody(
        freelancerName,
        client.name,
        p.title,
        p.scope || '',
        p.timeline || '',
        rateStr
      );
      await addContract({
        client_id: p.client_id,
        proposal_id: p.id,
        title: `Contract \u2014 ${p.title}`,
        status: 'draft',
        body,
      });
      navigate('/contracts');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to convert to contract', 'error');
    } finally {
      setConvertingId(null);
    }
  };


  const handleExportDOCX = (p: Proposal) => {
    const client = getClient(p.client_id);
    if (client && profile) {
      exportProposalDOCX(p, client, profile);
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

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" /></div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Proposals</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {proposals.filter((p) => p.status === 'draft').length} drafts, {proposals.length} total
          </p>
        </div>
        <Button onClick={() => navigate('/proposals/new')} size="sm" disabled={clients.length === 0}>
          <Plus size={14} />
          New Proposal
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card className="mb-4 border-[#FAEEDA] bg-[#FAEEDA]/50">
          <p className="text-sm text-[#854F0B]">
            Add at least one client before creating a proposal.
          </p>
        </Card>
      ) : proposals.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <FileText size={40} className="text-[var(--text-tertiary)] mb-4" />
          <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">No proposals yet</h3>
          <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs mb-5">Create your first proposal to start winning work.</p>
          <Button onClick={() => navigate('/proposals/new')} size="sm" variant="secondary">New Proposal</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{p.title}</h3>
                    <Badge variant={statusBadge[p.status]}>{p.status}</Badge>
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
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-3 py-1.5 rounded-[8px] transition-colors disabled:opacity-50"
                    >
                      <FileText size={13} />
                      {convertingId === p.id ? 'Creating...' : 'Convert to contract'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  {p.status === 'draft' && (
                    <button
                      onClick={() => handleSend(p)}
                      className="p-1.5 rounded-[8px] text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-colors"
                      title="Send"
                    >
                      <Send size={14} />
                    </button>
                  )}
                  {p.status === 'sent' && (
                    <button
                      onClick={() => handleAccept(p)}
                      className="p-1.5 rounded-[8px] text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-colors"
                      title="Accept"
                    >
                      <Send size={14} />
                    </button>
                  )}
                  <div className="relative" ref={exportDropdown === p.id ? dropdownRef : undefined}>
                    <button
                      onClick={() => setExportDropdown(exportDropdown === p.id ? null : p.id)}
                      className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                      title="Export"
                    >
                      <Download size={14} />
                    </button>
                    {exportDropdown === p.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[8px] shadow-lg py-1 z-10 w-28">
                        <button
                          onClick={() => handleExportPDF(p)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleExportDOCX(p)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          DOCX
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className={`p-1.5 rounded-[8px] transition-colors ${expanded === p.id ? 'text-[var(--accent)] bg-[var(--accent-bg)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                    title="View body"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[#A32D2D] hover:bg-[#FCEBEB] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {expanded === p.id && p.body && (
                <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{htmlToPlainText(p.body)}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
