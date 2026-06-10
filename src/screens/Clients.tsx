import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Client, Communication } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Plus, Pencil, Trash2, Mail, Phone, Building2, MessageSquare, PhoneCall, MailOpen, Users, X, Check, FileText, FolderKanban, Receipt, Clock } from 'lucide-react';
import { useToasts } from '../store/toastStore';
import { formatCurrency } from '../utils/format';
import { checkAndNotify } from '../achievements/notify';

const commIcons: Record<string, typeof MessageSquare> = {
  note: MessageSquare,
  call: PhoneCall,
  email: MailOpen,
  meeting: Users,
};

const commLabels: Record<string, string> = {
  note: 'Note',
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
};

export default function Clients() {
  const {
    clients, loadClients, addClient, updateClient, removeClient,
    communications, loadCommunications, addCommunication, removeCommunication,
    projects, loadProjects,
    proposals, loadProposals,
    invoices, loadInvoices,
    profile, loadProfile,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '' });
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ type: 'note' as Communication['type'], date: new Date().toISOString().split('T')[0], summary: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hoveredComm, setHoveredComm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadClients(), loadProjects(), loadProposals(), loadInvoices(), loadProfile()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadClients, loadProjects, loadProposals, loadInvoices, loadProfile]);

  useEffect(() => {
    if (clients.length > 0 && !selectedId) {
      setSelectedId(clients[0].id);
    }
  }, [clients, selectedId]);

  useEffect(() => {
    if (selectedId && !communications[selectedId]) {
      loadCommunications(selectedId);
    }
  }, [selectedId, communications, loadCommunications]);

  const selectedClient = clients.find((c) => c.id === selectedId);

  // Status dot for client list
  const getClientStatus = (clientId: string) => {
    const hasActive = projects.some((p) => p.client_id === clientId && p.status === 'active');
    const hasProposal = proposals.some((p) => p.client_id === clientId && (p.status === 'sent' || p.status === 'draft'));
    if (hasActive) return 'bg-[var(--accent)]';
    if (hasProposal) return 'bg-[#854F0B]';
    return 'bg-[#D4D4D2]';
  };

  // Overview stats for selected client
  const getOverview = (clientId: string) => {
    const clientProjects = projects.filter((p) => p.client_id === clientId);
    const clientProposals = proposals.filter((p) => p.client_id === clientId);
    const clientInvoices = invoices.filter((i) => i.client_id === clientId);
    const lifetime = clientInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const outstanding = clientInvoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    const lastComm = (communications[clientId] || [])[0];
    return { projectCount: clientProjects.length, proposalCount: clientProposals.length, lifetime, outstanding, lastComm };
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', company: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleSaveClient = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateClient({ ...editing, name: form.name, email: form.email || undefined, phone: form.phone || undefined, company: form.company || undefined, notes: form.notes || undefined });
      } else {
        const c = await addClient({ name: form.name, email: form.email || undefined, phone: form.phone || undefined, company: form.company || undefined, notes: form.notes || undefined });
        setSelectedId(c.id);
      }
      setShowModal(false);
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save client', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this client? This cannot be undone.')) {
      try {
        await removeClient(id);
        if (selectedId === id) setSelectedId(null);
      } catch (err) {
        addToast(err?.toString?.() || 'Failed to delete client', 'error');
      }
    }
  };

  const handleSaveLog = async () => {
    if (!selectedId || !logForm.summary.trim()) return;
    setSaving(true);
    try {
      await addCommunication({
        id: '',
        client_id: selectedId,
        type: logForm.type,
        summary: logForm.summary,
        date: logForm.date,
        created_at: new Date().toISOString(),
      });
      setLogForm({ type: 'note', date: new Date().toISOString().split('T')[0], summary: '' });
      setShowLogForm(false);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to log communication', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComm = async (id: string) => {
    if (!selectedId) return;
    if (deleteConfirm === id) {
      try {
        await removeCommunication(id, selectedId);
        setDeleteConfirm(null);
      } catch (err) {
        addToast(err?.toString?.() || 'Failed to delete communication', 'error');
      }
    } else {
      setDeleteConfirm(id);
    }
  };

  const clientComms = (communications[selectedId || ''] || []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" /></div>

  return (
    <div className="flex h-full">
      {/* Left panel — client list */}
      <div className="w-[240px] border-r border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0 flex flex-col">
        <div className="px-4 py-3 border-b border-[var(--border-color)]">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Clients</h3>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-colors ${
                selectedId === c.id
                  ? 'bg-[var(--accent-bg)] border-l-2 border-[var(--accent)]'
                  : 'hover:bg-[var(--bg-secondary)] border-l-2 border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getClientStatus(c.id)}`} />
              <span className={`text-xs truncate ${selectedId === c.id ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-primary)]'}`}>
                {c.name}
              </span>
            </button>
          ))}
          <button
            onClick={openNew}
            className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-xs text-[var(--accent)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Plus size={12} />
            Add client
          </button>
        </div>
      </div>

      {/* Right panel — detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedClient ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users size={40} className="text-[#D4D4D2] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">Select a client or add a new one.</p>
            </div>
          </div>
        ) : (() => {
          const overview = getOverview(selectedClient.id);
          return (
            <>
              {/* Client header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selectedClient.name}</h2>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
                    {selectedClient.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} />
                        {selectedClient.email}
                      </span>
                    )}
                    {selectedClient.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} />
                        {selectedClient.phone}
                      </span>
                    )}
                    {selectedClient.company && (
                      <span className="flex items-center gap-1">
                        <Building2 size={12} />
                        {selectedClient.company}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(selectedClient)}
                    className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    title="Edit client"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(selectedClient.id)}
                    className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[#A32D2D] hover:bg-[#FCEBEB] transition-colors"
                    title="Delete client"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {selectedClient.notes && (
                <p className="text-xs text-[var(--text-tertiary)] mb-4">{selectedClient.notes}</p>
              )}

              {/* Overview */}
              <Card className="mb-6">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Overview</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FolderKanban size={13} className="text-[var(--text-tertiary)]" />
                      <span className="text-xs text-[var(--text-secondary)]">Projects</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{overview.projectCount}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FileText size={13} className="text-[var(--text-tertiary)]" />
                      <span className="text-xs text-[var(--text-secondary)]">Proposals</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{overview.proposalCount}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Receipt size={13} className="text-[var(--text-tertiary)]" />
                      <span className="text-xs text-[var(--text-secondary)]">Lifetime</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(overview.lifetime, profile?.currency)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Clock size={13} className="text-[var(--text-tertiary)]" />
                      <span className="text-xs text-[var(--text-secondary)]">Last contact</span>
                    </div>
                    <span className="text-xs text-[var(--text-primary)]">
                      {overview.lastComm ? new Date(overview.lastComm.date).toLocaleDateString() : 'No interactions'}
                    </span>
                  </div>
                  {overview.outstanding > 0 && (
                    <div className="col-span-4 mt-1 pt-2 border-t border-[var(--border-color)]">
                      <span className="text-xs text-[#854F0B]">{formatCurrency(overview.outstanding, profile?.currency)} outstanding</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Communication log */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Communication log</h3>
                  <button
                    onClick={() => { setShowLogForm(!showLogForm); setLogForm({ type: 'note', date: new Date().toISOString().split('T')[0], summary: '' }); }}
                    className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Log interaction
                  </button>
                </div>

                {/* Log form */}
                {showLogForm && (
                  <Card className="mb-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {(['note', 'call', 'email', 'meeting'] as Communication['type'][]).map((t) => {
                          const Icon = commIcons[t];
                          return (
                            <button
                              key={t}
                              onClick={() => setLogForm({ ...logForm, type: t })}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-[6px] text-xs transition-colors ${
                                logForm.type === t
                                  ? 'bg-[var(--accent)] text-white'
                                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[#E3E2DB]'
                              }`}
                            >
                              <Icon size={12} />
                              {commLabels[t]}
                            </button>
                          );
                        })}
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-tertiary)] mb-1">Date</label>
                        <input
                          type="date"
                          value={logForm.date}
                          onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                      <div>
                        <textarea
                          value={logForm.summary}
                          onChange={(e) => setLogForm({ ...logForm, summary: e.target.value })}
                          placeholder="What happened?"
                          rows={3}
                          className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                          autoFocus
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setShowLogForm(false)} size="sm">Cancel</Button>
                        <Button onClick={handleSaveLog} loading={saving} disabled={!logForm.summary.trim()} size="sm">Save</Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Log entries */}
                {clientComms.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)]">No interactions logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {clientComms.map((comm) => {
                      const Icon = commIcons[comm.type] || MessageSquare;
                      const isConfirming = deleteConfirm === comm.id;
                      return (
                        <div
                          key={comm.id}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[var(--bg-secondary)] transition-colors group"
                          onMouseEnter={() => setHoveredComm(comm.id)}
                          onMouseLeave={() => { setHoveredComm(null); setDeleteConfirm(null); }}
                        >
                          <Icon size={14} className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-[var(--text-tertiary)] mb-0.5">
                              {commLabels[comm.type]} &middot; {new Date(comm.date).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{comm.summary}</p>
                          </div>
                          {hoveredComm === comm.id && (
                            <div className="flex-shrink-0">
                              {isConfirming ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-[#A32D2D]">Delete?</span>
                                  <button onClick={() => handleDeleteComm(comm.id)} className="text-[#A32D2D] hover:text-[#7A2222]">
                                    <Check size={14} />
                                  </button>
                                  <button onClick={() => setDeleteConfirm(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => handleDeleteComm(comm.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* Client add/edit modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Client' : 'New Client'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Client name"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 000-0000"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Company</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company name"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any notes about this client..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSaveClient} loading={saving} disabled={!form.name.trim()} size="sm">
              {editing ? 'Save Changes' : 'Add Client'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
