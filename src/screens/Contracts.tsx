import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Contract, ContractTemplate, ShareToken } from '../types';
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
import { getUnlockedAchievementKeys } from '../achievements/checker';
import { relativeDate } from '../utils/format';
import { Plus, Pencil, Trash2, Eye, PenLine, Search, Copy, FileText, Share2, Link } from 'lucide-react';
import ShareModal from '../components/ShareModal';

const statusBadge: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
  draft: 'warning',
  active: 'success',
  completed: 'info',
  cancelled: 'danger',
};

const PREBUILT_TEMPLATES: Omit<ContractTemplate, 'id' | 'created_at'>[] = [
  {
    name: 'Service Agreement',
    category: 'General',
    body: '<h2>Service Agreement</h2>\n<p>This Service Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Service Provider").</p>\n<h3>1. Services</h3>\n<p>Service Provider agrees to perform the following services: {scope}</p>\n<h3>2. Compensation</h3>\n<p>Client agrees to pay Service Provider $ {rate} per {rate_type}. Payment terms: Net {payment_terms} days from invoice date.</p>\n<h3>3. Term & Termination</h3>\n<p>This Agreement shall commence on {start_date} and continue until {end_date}, unless earlier terminated by either party with {notice_period} days written notice.</p>\n<h3>4. Independent Contractor</h3>\n<p>Service Provider is an independent contractor, not an employee of Client.</p>\n<h3>5. Governing Law</h3>\n<p>This Agreement shall be governed by the laws of {jurisdiction}.</p>',
    variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{rate}', '{rate_type}', '{payment_terms}', '{start_date}', '{end_date}', '{notice_period}', '{jurisdiction}'],
  },
  {
    name: 'Retainer Agreement',
    category: 'Retainer',
    body: '<h2>Retainer Agreement</h2>\n<p>This Retainer Agreement is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Service Provider").</p>\n<h3>1. Monthly Retainer</h3>\n<p>Client agrees to retain Service Provider on a monthly basis for a fixed retainer of $ {monthly_retainer} per month.</p>\n<h3>2. Included Hours</h3>\n<p>The monthly retainer includes up to {hours_included} hours of services per month. Any hours beyond this will be charged at the overage rate of $ {overage_rate} per hour.</p>\n<h3>3. Scope of Work</h3>\n<p>{scope}</p>\n<h3>4. Payment Terms</h3>\n<p>Retainer invoices will be sent on the 1st of each month and are due Net {payment_terms} days.</p>\n<h3>5. Term</h3>\n<p>Initial term of {term_months} months, auto-renewing unless terminated with {notice_period} days notice.</p>',
    variables: ['{client_name}', '{freelancer_name}', '{date}', '{monthly_retainer}', '{hours_included}', '{overage_rate}', '{scope}', '{payment_terms}', '{term_months}', '{notice_period}'],
  },
  {
    name: 'Mutual NDA',
    category: 'Legal',
    body: '<h2>Mutual Non-Disclosure Agreement</h2>\n<p>This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of {date} by and between {client_name} and {freelancer_name} (collectively, the "Parties").</p>\n<h3>1. Purpose</h3>\n<p>The Parties wish to explore a potential business relationship regarding: {purpose}.</p>\n<h3>2. Confidential Information</h3>\n<p>"Confidential Information" means any information disclosed by one Party to the other, whether orally, in writing, or in any other form, that is designated as confidential or that reasonably should be understood to be confidential.</p>\n<h3>3. Obligations</h3>\n<p>Each Party agrees to: (a) hold Confidential Information in strict confidence; (b) not disclose Confidential Information to any third party; (c) use Confidential Information solely for the Purpose.</p>\n<h3>4. Exclusions</h3>\n<p>Confidential Information does not include information that: (a) is or becomes publicly known; (b) was independently developed; (c) was rightfully received from a third party.</p>\n<h3>5. Term</h3>\n<p>This Agreement shall remain in effect for {term_months} months from the date hereof.</p>',
    variables: ['{client_name}', '{freelancer_name}', '{date}', '{purpose}', '{term_months}'],
  },
  {
    name: 'Work-for-Hire',
    category: 'IP',
    body: '<h2>Work-for-Hire Agreement</h2>\n<p>This Work-for-Hire Agreement is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Creator").</p>\n<h3>1. Work Product</h3>\n<p>Creator agrees to create the following deliverables: {scope}.</p>\n<h3>2. Compensation</h3>\n<p>Client agrees to pay Creator a flat fee of $ {total_fee} for the Work Product.</p>\n<h3>3. Intellectual Property</h3>\n<p>All Work Product created under this Agreement shall be considered "work made for hire" under applicable copyright law. Creator hereby assigns to Client all right, title, and interest in and to the Work Product, including all intellectual property rights.</p>\n<h3>4. No Royalties</h3>\n<p>Creator waives any and all rights to royalties, residuals, or additional compensation beyond the flat fee stated herein.</p>\n<h3>5. Delivery</h3>\n<p>Creator shall deliver the completed Work Product by {delivery_date}.</p>',
    variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{total_fee}', '{delivery_date}'],
  },
  {
    name: 'Licensing Agreement',
    category: 'IP',
    body: '<h2>Licensing Agreement</h2>\n<p>This Licensing Agreement is entered into as of {date} by and between {client_name} ("Licensee") and {freelancer_name} ("Licensor").</p>\n<h3>1. Licensed Work</h3>\n<p>Licensor grants Licensee a non-exclusive license to use: {licensed_work}.</p>\n<h3>2. License Scope</h3>\n<p>Usage is limited to: {usage_scope}. Territory: {territory}. Term: {term_months} months.</p>\n<h3>3. License Fee</h3>\n<p>Licensee shall pay a license fee of $ {license_fee}.</p>\n<h3>4. Restrictions</h3>\n<p>Licensee may not sublicense, resell, or modify the Licensed Work without prior written consent. Licensor retains all intellectual property rights not expressly granted.</p>\n<h3>5. Attribution</h3>\n<p>Licensee shall credit Licensor as follows: "{attribution}"</p>',
    variables: ['{client_name}', '{freelancer_name}', '{date}', '{licensed_work}', '{usage_scope}', '{territory}', '{term_months}', '{license_fee}', '{attribution}'],
  },
  {
    name: 'Collaboration Agreement',
    category: 'Partnership',
    body: '<h2>Collaboration Agreement</h2>\n<p>This Collaboration Agreement is entered into as of {date} by and between {freelancer_name} ("Party A") and {collaborator_name} ("Party B").</p>\n<h3>1. Project</h3>\n<p>The parties agree to collaborate on: {project_name}.</p>\n<h3>2. Roles & Responsibilities</h3>\n<p>Party A: {party_a_role}</p>\n<p>Party B: {party_b_role}</p>\n<h3>3. Revenue Split</h3>\n<p>Revenue from the Project shall be split as follows: Party A receives {party_a_split}% and Party B receives {party_b_split}%.</p>\n<h3>4. Credits</h3>\n<p>Both parties shall be credited equally as: "{credit_line}".</p>\n<h3>5. Term</h3>\n<p>This Agreement shall remain in effect for the duration of the Project and any post-completion obligations.</p>',
    variables: ['{freelancer_name}', '{collaborator_name}', '{date}', '{project_name}', '{party_a_role}', '{party_b_role}', '{party_a_split}', '{party_b_split}', '{credit_line}'],
  },
];

const TEMPLATE_BADGE_COLORS: Record<string, string> = {
  General: 'info',
  Retainer: 'success',
  Legal: 'warning',
  IP: 'purple',
  Partnership: 'amber',
};

export default function Contracts() {
  const { contracts, loadContracts, clients, loadClients, addContract, updateContract, removeContract, contractTemplates, loadContractTemplates, addContractTemplate, removeContractTemplate } = useStore();
  const addToast = useToasts((s) => s.add);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [shareModal, setShareModal] = useState<{ entityType: 'contract'; entityId: string } | null>(null);
  const [shareTokenIds, setShareTokenIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ client_id: '', title: '', body: '' });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'contracts' | 'templates'>('contracts');
  const [showTemplatesTab, setShowTemplatesTab] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  useEffect(() => {
    Promise.all([loadContracts(), loadClients(), loadContractTemplates(), loadShareTokens()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadContracts, loadClients, loadContractTemplates]);

  const loadShareTokens = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const tokens = await invoke<ShareToken[]>('get_all_share_tokens');
      const ids = new Set(tokens.filter(t => t.entity_type === 'contract').map(t => t.entity_id));
      setShareTokenIds(ids);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    getUnlockedAchievementKeys().then((keys) => {
      setShowTemplatesTab(new Set(keys).has('first_contract'));
    });
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ client_id: '', title: '', body: '' });
    setShowModal(true);
  };

  const openNewFromTemplate = (template: ContractTemplate) => {
    setEditing(null);
    setForm({ client_id: '', title: '', body: template.body });
    setShowModal(true);
    setShowTemplatePicker(false);
    if (tab === 'templates') setTab('contracts');
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

  const handleSaveAsTemplate = async (c: Contract) => {
    try {
      await addContractTemplate({
        name: c.title || 'Untitled Template',
        category: 'Custom',
        body: c.body || '',
        variables: [],
      });
      addToast('Contract saved as template', 'success');
    } catch { /* template save is non-critical */
      addToast('Failed to save template', 'error');
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

  const handleDeleteTemplate = async (id: string) => {
    try {
      await removeContractTemplate(id);
      addToast('Template deleted', 'info');
    } catch { /* template delete is non-critical */
      addToast('Failed to delete template', 'error');
    }
  };

  const getClientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name || 'Unknown';

  const filtered = contracts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (c.title || '').toLowerCase().includes(q) || (getClientName(c.client_id) || '').toLowerCase().includes(q);
  });

  const allTemplates = [...PREBUILT_TEMPLATES.map((t) => ({ ...t, id: `prebuilt:${t.name}`, created_at: '' })), ...contractTemplates];

  if (loading) return (
    <div className="p-6">
      <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-1.5" />
      <div className="h-4 w-32 bg-[var(--bg-secondary)] rounded skeleton-pulse mb-6" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[var(--bg-secondary)] rounded-[8px] skeleton-pulse mb-3" />)}
    </div>
  );

  const TabBar = () => (
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={() => setTab('contracts')}
        className={`text-sm font-medium pb-1.5 border-b-2 transition-colors ${
          tab === 'contracts'
            ? 'text-[var(--text-primary)] border-[var(--accent)]'
            : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
        }`}
      >
        Contracts
      </button>
      {showTemplatesTab && (
        <button
          onClick={() => setTab('templates')}
          className={`text-sm font-medium pb-1.5 border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'templates'
              ? 'text-[var(--text-primary)] border-[var(--accent)]'
              : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
          }`}
        >
          <FileText size={14} />
          Templates
        </button>
      )}
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
        {tab === 'contracts' && (
          <div className="flex items-center gap-2">
            {showTemplatesTab && (
              <Button onClick={() => setShowTemplatePicker(true)} size="sm" variant="secondary" disabled={clients.length === 0}>
                <Copy size={14} />
                Start from template
              </Button>
            )}
            <Button onClick={openNew} size="sm" disabled={clients.length === 0}>
              <Plus size={14} />
              New Contract
            </Button>
          </div>
        )}
      </div>

      <TabBar />

      {tab === 'contracts' ? (
        <>
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
            <Card className="mb-4 border-[var(--warning-bg)] bg-[var(--warning-bg)]/50">
              <p className="text-sm text-[var(--warning-text)]">
                Add at least one client before creating a contract.
              </p>
            </Card>
          ) : contracts.length === 0 ? (
            <Card className="text-center py-16 flex flex-col items-center">
              <PenLine size={40} className="text-[var(--text-tertiary)] mb-4" />
              <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">No contracts yet</h3>
              <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs mb-5">Convert a proposal or create a contract directly.</p>
              {clients.length > 0 && (
                <Button onClick={openNew} size="sm" variant="secondary"><Plus size={14} /> New Contract</Button>
              )}
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
                        {shareTokenIds.has(c.id) && (
                          <Link size={12} className="text-[var(--accent)] flex-shrink-0" />
                        )}
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
                      {(c.status === 'draft' || c.status === 'active') && (
                        <button
                          onClick={() => setShareModal({ entityType: 'contract', entityId: c.id })}
                          aria-label="Share contract"
                          className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-colors"
                          title="Share"
                        >
                          <Share2 size={14} />
                        </button>
                      )}
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
                      {c.status !== 'active' && (
                        <button
                          onClick={() => handleSaveAsTemplate(c)}
                          aria-label="Save as template"
                          className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-colors"
                          title="Save as template"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete({ id: c.id, title: c.title })}
                        aria-label="Delete contract"
                        className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
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
        </>
      ) : (
        /* ── Templates tab ── */
        <div className="space-y-3">
          {allTemplates.length === 0 ? (
            <Card className="text-center py-16 flex flex-col items-center">
              <FileText size={40} className="text-[var(--text-tertiary)] mb-4" />
              <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">No templates yet</h3>
              <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs">Save a contract as a template or use one of the pre-built options.</p>
            </Card>
          ) : (
            allTemplates.map((t) => {
              const isPrebuilt = t.id.startsWith('prebuilt:');
              return (
                <Card key={t.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</h3>
                        {t.category && (
                          <Badge variant={TEMPLATE_BADGE_COLORS[t.category] as 'info' || 'info'}>
                            {t.category}
                          </Badge>
                        )}
                        {isPrebuilt && <Badge variant="success">Pre-built</Badge>}
                      </div>
                      {t.variables && t.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {t.variables.map((v) => (
                            <code key={v} className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[var(--text-tertiary)]">
                              {v}
                            </code>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                        {htmlToPlainText(t.body || '').substring(0, 200)}...
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      {clients.length > 0 ? (
                        <button
                          onClick={() => openNewFromTemplate(t)}
                          className="text-xs text-[var(--accent)] hover:underline px-1"
                        >
                          Use template
                        </button>
                      ) : (
                        <span className="text-[10px] text-[var(--text-tertiary)]">Add a client first</span>
                      )}
                      {!isPrebuilt && (
                        <button
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
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

      {/* Template picker modal */}
      {showTemplatesTab && (
        <Modal open={showTemplatePicker} onClose={() => setShowTemplatePicker(false)} title="Start from Template" size="md">
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {allTemplates.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] py-8 text-center">No templates available.</p>
            ) : (
              allTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openNewFromTemplate(t)}
                  className="w-full text-left p-3 rounded-[8px] border border-[var(--border-color)] hover:border-[var(--accent)] hover:bg-[var(--accent-bg)]/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{t.name}</span>
                    {t.category && <Badge variant={TEMPLATE_BADGE_COLORS[t.category] as 'info' || 'info'}>{t.category}</Badge>}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                    {htmlToPlainText(t.body || '').substring(0, 120)}
                  </p>
                </button>
              ))
            )}
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Contract"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This cannot be undone.`}
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
    </div>
  );
}
