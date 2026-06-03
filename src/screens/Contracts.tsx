import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Contract } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import RichEditor from '../components/ui/RichEditor';
import { htmlToPlainText } from '../utils/htmlToText';
import { ensureHtml } from '../utils/textToHtml';
import { Plus, Pencil, Trash2, Eye, PenLine } from 'lucide-react';

const statusBadge: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
  draft: 'warning',
  active: 'success',
  completed: 'info',
  cancelled: 'danger',
};

export default function Contracts() {
  const { contracts, loadContracts, clients, loadClients, addContract, updateContract, removeContract } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ client_id: '', title: '', body: '' });

  useEffect(() => {
    loadContracts();
    loadClients();
  }, [loadContracts, loadClients]);

  const openNew = () => {
    setEditing(null);
    setForm({ client_id: '', title: '', body: '' });
    setShowModal(true);
  };

  const openEdit = (c: Contract) => {
    setEditing(c);
    setForm({ client_id: c.client_id, title: c.title, body: ensureHtml(c.body || '') });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.client_id) return;
    setSaving(true);
    try {
      if (editing) {
        await updateContract({ ...editing, ...form, body: form.body || '' });
      } else {
        await addContract({ ...form, body: form.body || '', status: 'draft' });
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (c: Contract) => {
    await updateContract({ ...c, status: 'active' as const });
  };

  const handleComplete = async (c: Contract) => {
    await updateContract({ ...c, status: 'completed' as const });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this contract?')) {
      await removeContract(id);
    }
  };

  const getClientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name || 'Unknown';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1C1C1A]">Contracts</h2>
          <p className="text-sm text-[#6B6B67] mt-0.5">
            {contracts.filter((c) => c.status === 'active').length} active, {contracts.length} total
          </p>
        </div>
        <Button onClick={openNew} size="sm" disabled={clients.length === 0}>
          <Plus size={14} />
          New Contract
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card className="mb-4 border-[#FAEEDA] bg-[#FAEEDA]/50">
          <p className="text-sm text-[#854F0B]">
            Add at least one client before creating a contract.
          </p>
        </Card>
      ) : contracts.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <PenLine size={40} className="text-[#A3A39E] mb-4" />
          <h3 className="text-[15px] font-medium text-[#6B6B67] mb-1.5">No contracts yet</h3>
          <p className="text-[13px] text-[#A3A39E] max-w-xs mb-5">Convert a proposal to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[#1C1C1A]">{c.title}</h3>
                    <Badge variant={statusBadge[c.status]}>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-[#6B6B67] mb-1">{getClientName(c.client_id)}</p>
                  {c.signed_at && (
                    <p className="text-xs text-[#A3A39E]">
                      Signed {new Date(c.signed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  {c.status === 'draft' && (
                    <button
                      onClick={() => handleActivate(c)}
                      className="text-xs text-[#1D9E75] hover:underline px-1"
                    >
                      Activate
                    </button>
                  )}
                  {c.status === 'active' && (
                    <button
                      onClick={() => handleComplete(c)}
                      className="text-xs text-[#1D9E75] hover:underline px-1"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    className={`p-1.5 rounded-[8px] transition-colors ${expanded === c.id ? 'text-[#1D9E75] bg-[#E6F5EE]' : 'text-[#A3A39E] hover:text-[#1C1C1A] hover:bg-[#F2F2F0]'}`}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-[8px] text-[#A3A39E] hover:text-[#1C1C1A] hover:bg-[#F2F2F0] transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-[8px] text-[#A3A39E] hover:text-[#A32D2D] hover:bg-[#FCEBEB] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {expanded === c.id && c.body && (
                <div className="mt-3 pt-3 border-t border-[#E5E5E3]">
                  <p className="text-xs text-[#1C1C1A] whitespace-pre-wrap leading-relaxed">{htmlToPlainText(c.body)}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Contract' : 'New Contract'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Client *</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Contract title"
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
              autoFocus
            />
          </div>
           <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Contract Body</label>
            <RichEditor
              content={form.body}
              onChange={(html) => setForm({ ...form, body: html })}
              placeholder="Write the contract terms..."
              minHeight={240}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} size="sm">Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.title.trim() || !form.client_id} size="sm">
              {editing ? 'Save Changes' : 'Create Contract'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
