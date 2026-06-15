import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Contract } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ClientSelect from '../components/ui/ClientSelect';
import RichEditor from '../components/ui/RichEditor';
import { htmlToPlainText } from '../utils/htmlToText';
import { ensureHtml } from '../utils/textToHtml';
import { useToasts } from '../store/toastStore';
import { checkAndNotify } from '../achievements/notify';
import { relativeDate } from '../utils/format';
import { Plus, Pencil, Trash2, Eye, PenLine, Search } from 'lucide-react';

const statusBadge: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
  draft: 'warning',
  active: 'success',
  completed: 'info',
  cancelled: 'danger',
};

export default function Contracts() {
  const { contracts, loadContracts, clients, loadClients, addContract, updateContract, removeContract } = useStore();
  const addToast = useToasts((s) => s.add);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ client_id: '', title: '', body: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadContracts(), loadClients()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
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
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (c: Contract) => {
    try {
      await updateContract({ ...c, status: 'active' as const });
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to activate', 'error');
    }
  };

  const handleComplete = async (c: Contract) => {
    try {
      await updateContract({ ...c, status: 'completed' as const });
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to complete', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await removeContract(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getClientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name || 'Unknown';

  const filtered = contracts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || getClientName(c.client_id).toLowerCase().includes(q);
  });

  if (loading) return (
    <div className="p-6">
      <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-1.5" />
      <div className="h-4 w-32 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-6" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[var(--bg-secondary)] rounded-[8px] skeleton-pulse mb-3" />)}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Contracts</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {contracts.filter((c) => c.status === 'active').length} active, {contracts.length} total
          </p>
        </div>
        <Button onClick={openNew} size="sm" disabled={clients.length === 0}>
          <Plus size={14} />
          New Contract
        </Button>
      </div>

      {clients.length > 0 && contracts.length > 0 && (
        <div className="mb-4 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contracts..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] bg-[var(--bg-card)]"
          />
        </div>
      )}

      {clients.length === 0 ? (
        <Card className="mb-4 border-[#FAEEDA] bg-[#FAEEDA]/50">
          <p className="text-sm text-[#854F0B]">
            Add at least one client before creating a contract.
          </p>
        </Card>
      ) : contracts.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <PenLine size={40} className="text-[var(--text-tertiary)] mb-4" />
          <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">No contracts yet</h3>
          <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs mb-5">Convert a proposal to get started.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <Search size={40} className="text-[var(--text-tertiary)] mb-4" />
          <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">No contracts match</h3>
          <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs">Try a different search term.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{c.title}</h3>
                    <Badge variant={statusBadge[c.status]}>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{getClientName(c.client_id)}</p>
                  {c.signed_at && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Signed {relativeDate(c.signed_at)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  {c.status === 'draft' && (
                    <button
                      onClick={() => handleActivate(c)}
                      className="text-xs text-[var(--accent)] hover:underline px-1"
                    >
                      Activate
                    </button>
                  )}
                  {c.status === 'active' && (
                    <button
                      onClick={() => handleComplete(c)}
                      className="text-xs text-[var(--accent)] hover:underline px-1"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    aria-label="View contract body"
                    className={`p-1.5 rounded-[8px] transition-colors ${expanded === c.id ? 'text-[var(--accent)] bg-[var(--accent-bg)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    aria-label="Edit contract"
                    className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                   <button
                    onClick={() => setConfirmDelete({ id: c.id, title: c.title })}
                    aria-label="Delete contract"
                    className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[#A32D2D] hover:bg-[#FCEBEB] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {expanded === c.id && c.body && (
                <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{htmlToPlainText(c.body)}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Contract' : 'New Contract'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Client *</label>
            <ClientSelect
              clients={clients}
              value={form.client_id}
              onChange={(clientId) => setForm({ ...form, client_id: clientId })}
              placeholder="Select a client..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Contract title"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              autoFocus
            />
          </div>
           <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Contract Body</label>
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

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Contract"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
