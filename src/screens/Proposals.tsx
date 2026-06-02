import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Proposal } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { exportProposalPDF, exportProposalDOCX } from '../export';
import { Plus, Pencil, Trash2, Send, Eye, Download } from 'lucide-react';

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'warning',
  sent: 'info',
  accepted: 'success',
  declined: 'danger',
};

export default function Proposals() {
  const { proposals, loadProposals, clients, loadClients, updateProposal, removeProposal, profile, loadProfile } = useStore();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exportDropdown, setExportDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadProposals();
    loadClients();
    loadProfile();
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
    await updateProposal({ ...p, status: 'sent' as const });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this proposal?')) {
      await removeProposal(id);
    }
  };

  const handleAccept = async (p: Proposal) => {
    await updateProposal({ ...p, status: 'accepted' as const });
  };

  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);
  const getClientName = (clientId: string) => getClient(clientId)?.name || 'Unknown';

  const handleExportPDF = (p: Proposal) => {
    const client = getClient(p.client_id);
    if (client && profile) {
      exportProposalPDF(p, client, profile);
    }
    setExportDropdown(null);
  };

  const handleExportDOCX = (p: Proposal) => {
    const client = getClient(p.client_id);
    if (client && profile) {
      exportProposalDOCX(p, client, profile);
    }
    setExportDropdown(null);
  };

  const formatRate = (p: Proposal) => {
    if (!p.rate) return '';
    const symbol = '$';
    if (p.rate_type === 'hourly') return `${symbol}${p.rate}/hr`;
    return `${symbol}${p.rate.toLocaleString()} flat`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1C1C1A]">Proposals</h2>
          <p className="text-sm text-[#6B6B67] mt-0.5">
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
        <Card className="text-center py-12">
          <h3 className="text-sm font-medium text-[#6B6B67] mb-1">No proposals yet</h3>
          <p className="text-xs text-[#A3A39E] mb-4">Create your first proposal to start winning work.</p>
          <Button onClick={() => navigate('/proposals/new')} size="sm" variant="secondary">
            <Plus size={14} />
            New Proposal
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[#1C1C1A]">{p.title}</h3>
                    <Badge variant={statusBadge[p.status]}>{p.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#6B6B67] mb-2">
                    <span>{getClientName(p.client_id)}</span>
                    {formatRate(p) && <span>{formatRate(p)}</span>}
                    {p.timeline && <span>{p.timeline}</span>}
                  </div>
                  {p.scope && (
                    <p className="text-xs text-[#A3A39E] line-clamp-2 mb-2">{p.scope}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  {p.status === 'draft' && (
                    <button
                      onClick={() => handleSend(p)}
                      className="p-1.5 rounded-[8px] text-[#1D9E75] hover:bg-[#E6F5EE] transition-colors"
                      title="Send"
                    >
                      <Send size={14} />
                    </button>
                  )}
                  {p.status === 'sent' && (
                    <button
                      onClick={() => handleAccept(p)}
                      className="p-1.5 rounded-[8px] text-[#1D9E75] hover:bg-[#E6F5EE] transition-colors"
                      title="Accept"
                    >
                      <Send size={14} />
                    </button>
                  )}
                  <div className="relative" ref={exportDropdown === p.id ? dropdownRef : undefined}>
                    <button
                      onClick={() => setExportDropdown(exportDropdown === p.id ? null : p.id)}
                      className="p-1.5 rounded-[8px] text-[#A3A39E] hover:text-[#1C1C1A] hover:bg-[#F2F2F0] transition-colors"
                      title="Export"
                    >
                      <Download size={14} />
                    </button>
                    {exportDropdown === p.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-[#E5E5E3] rounded-[8px] shadow-lg py-1 z-10 w-28">
                        <button
                          onClick={() => handleExportPDF(p)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#1C1C1A] hover:bg-[#F2F2F0] transition-colors"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleExportDOCX(p)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#1C1C1A] hover:bg-[#F2F2F0] transition-colors"
                        >
                          DOCX
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className={`p-1.5 rounded-[8px] transition-colors ${expanded === p.id ? 'text-[#1D9E75] bg-[#E6F5EE]' : 'text-[#A3A39E] hover:text-[#1C1C1A] hover:bg-[#F2F2F0]'}`}
                    title="View body"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded-[8px] text-[#A3A39E] hover:text-[#A32D2D] hover:bg-[#FCEBEB] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {expanded === p.id && p.body && (
                <div className="mt-3 pt-3 border-t border-[#E5E5E3]">
                  <p className="text-xs text-[#1C1C1A] whitespace-pre-wrap leading-relaxed">{p.body}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
