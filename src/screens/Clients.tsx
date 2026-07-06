import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Client, Communication, MetricDefinition, MetricValue } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Sparkline from '../components/ui/Sparkline';
import { Plus, Pencil, Trash2, Mail, Phone, Building2, MessageSquare, PhoneCall, MailOpen, Users, X, Check, FileText, FolderKanban, Receipt, Clock, Search, BarChart3, Star, Copy, Upload } from 'lucide-react';
import { useToasts } from '../store/toastStore';
import ArchetypeFeatureTabs from '../components/features/ArchetypeFeatureTabs';
import ClientImportModal from '../components/ui/ClientImportModal';
import { formatCurrency, relativeDate } from '../utils/format';
import { getCurrencySymbol, CURRENCIES } from '../lib/currency';
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COUNTRY_OPTIONS = [
  { code: 'US', label: 'United States', dialCode: '+1' },
  { code: 'CA', label: 'Canada', dialCode: '+1' },
  { code: 'GB', label: 'United Kingdom', dialCode: '+44' },
  { code: 'AU', label: 'Australia', dialCode: '+61' },
  { code: 'IE', label: 'Ireland', dialCode: '+353' },
  { code: 'DE', label: 'Germany', dialCode: '+49' },
  { code: 'FR', label: 'France', dialCode: '+33' },
  { code: 'AF', label: 'Afghanistan', dialCode: '+93' },
  { code: 'AL', label: 'Albania', dialCode: '+355' },
  { code: 'DZ', label: 'Algeria', dialCode: '+213' },
  { code: 'AR', label: 'Argentina', dialCode: '+54' },
  { code: 'AM', label: 'Armenia', dialCode: '+374' },
  { code: 'AT', label: 'Austria', dialCode: '+43' },
  { code: 'AZ', label: 'Azerbaijan', dialCode: '+994' },
  { code: 'BH', label: 'Bahrain', dialCode: '+973' },
  { code: 'BD', label: 'Bangladesh', dialCode: '+880' },
  { code: 'BY', label: 'Belarus', dialCode: '+375' },
  { code: 'BE', label: 'Belgium', dialCode: '+32' },
  { code: 'BJ', label: 'Benin', dialCode: '+229' },
  { code: 'BO', label: 'Bolivia', dialCode: '+591' },
  { code: 'BA', label: 'Bosnia & Herzegovina', dialCode: '+387' },
  { code: 'BR', label: 'Brazil', dialCode: '+55' },
  { code: 'BG', label: 'Bulgaria', dialCode: '+359' },
  { code: 'KH', label: 'Cambodia', dialCode: '+855' },
  { code: 'CM', label: 'Cameroon', dialCode: '+237' },
  { code: 'CL', label: 'Chile', dialCode: '+56' },
  { code: 'CN', label: 'China', dialCode: '+86' },
  { code: 'CO', label: 'Colombia', dialCode: '+57' },
  { code: 'CR', label: 'Costa Rica', dialCode: '+506' },
  { code: 'HR', label: 'Croatia', dialCode: '+385' },
  { code: 'CU', label: 'Cuba', dialCode: '+53' },
  { code: 'CY', label: 'Cyprus', dialCode: '+357' },
  { code: 'CZ', label: 'Czech Republic', dialCode: '+420' },
  { code: 'DK', label: 'Denmark', dialCode: '+45' },
  { code: 'DO', label: 'Dominican Republic', dialCode: '+1' },
  { code: 'EC', label: 'Ecuador', dialCode: '+593' },
  { code: 'EG', label: 'Egypt', dialCode: '+20' },
  { code: 'SV', label: 'El Salvador', dialCode: '+503' },
  { code: 'EE', label: 'Estonia', dialCode: '+372' },
  { code: 'ET', label: 'Ethiopia', dialCode: '+251' },
  { code: 'FI', label: 'Finland', dialCode: '+358' },
  { code: 'GE', label: 'Georgia', dialCode: '+995' },
  { code: 'GR', label: 'Greece', dialCode: '+30' },
  { code: 'GT', label: 'Guatemala', dialCode: '+502' },
  { code: 'HK', label: 'Hong Kong', dialCode: '+852' },
  { code: 'HU', label: 'Hungary', dialCode: '+36' },
  { code: 'IS', label: 'Iceland', dialCode: '+354' },
  { code: 'IN', label: 'India', dialCode: '+91' },
  { code: 'ID', label: 'Indonesia', dialCode: '+62' },
  { code: 'IR', label: 'Iran', dialCode: '+98' },
  { code: 'IQ', label: 'Iraq', dialCode: '+964' },
  { code: 'IL', label: 'Israel', dialCode: '+972' },
  { code: 'IT', label: 'Italy', dialCode: '+39' },
  { code: 'JM', label: 'Jamaica', dialCode: '+1' },
  { code: 'JP', label: 'Japan', dialCode: '+81' },
  { code: 'JO', label: 'Jordan', dialCode: '+962' },
  { code: 'KZ', label: 'Kazakhstan', dialCode: '+7' },
  { code: 'KE', label: 'Kenya', dialCode: '+254' },
  { code: 'KW', label: 'Kuwait', dialCode: '+965' },
  { code: 'LV', label: 'Latvia', dialCode: '+371' },
  { code: 'LB', label: 'Lebanon', dialCode: '+961' },
  { code: 'LI', label: 'Liechtenstein', dialCode: '+423' },
  { code: 'LT', label: 'Lithuania', dialCode: '+370' },
  { code: 'LU', label: 'Luxembourg', dialCode: '+352' },
  { code: 'MO', label: 'Macau', dialCode: '+853' },
  { code: 'MY', label: 'Malaysia', dialCode: '+60' },
  { code: 'MT', label: 'Malta', dialCode: '+356' },
  { code: 'MX', label: 'Mexico', dialCode: '+52' },
  { code: 'MC', label: 'Monaco', dialCode: '+377' },
  { code: 'MA', label: 'Morocco', dialCode: '+212' },
  { code: 'NP', label: 'Nepal', dialCode: '+977' },
  { code: 'NL', label: 'Netherlands', dialCode: '+31' },
  { code: 'NZ', label: 'New Zealand', dialCode: '+64' },
  { code: 'NG', label: 'Nigeria', dialCode: '+234' },
  { code: 'NO', label: 'Norway', dialCode: '+47' },
  { code: 'OM', label: 'Oman', dialCode: '+968' },
  { code: 'PK', label: 'Pakistan', dialCode: '+92' },
  { code: 'PA', label: 'Panama', dialCode: '+507' },
  { code: 'PY', label: 'Paraguay', dialCode: '+595' },
  { code: 'PE', label: 'Peru', dialCode: '+51' },
  { code: 'PH', label: 'Philippines', dialCode: '+63' },
  { code: 'PL', label: 'Poland', dialCode: '+48' },
  { code: 'PT', label: 'Portugal', dialCode: '+351' },
  { code: 'PR', label: 'Puerto Rico', dialCode: '+1' },
  { code: 'QA', label: 'Qatar', dialCode: '+974' },
  { code: 'RO', label: 'Romania', dialCode: '+40' },
  { code: 'RU', label: 'Russia', dialCode: '+7' },
  { code: 'SA', label: 'Saudi Arabia', dialCode: '+966' },
  { code: 'RS', label: 'Serbia', dialCode: '+381' },
  { code: 'SG', label: 'Singapore', dialCode: '+65' },
  { code: 'SK', label: 'Slovakia', dialCode: '+421' },
  { code: 'SI', label: 'Slovenia', dialCode: '+386' },
  { code: 'ZA', label: 'South Africa', dialCode: '+27' },
  { code: 'KR', label: 'South Korea', dialCode: '+82' },
  { code: 'ES', label: 'Spain', dialCode: '+34' },
  { code: 'LK', label: 'Sri Lanka', dialCode: '+94' },
  { code: 'SE', label: 'Sweden', dialCode: '+46' },
  { code: 'CH', label: 'Switzerland', dialCode: '+41' },
  { code: 'TW', label: 'Taiwan', dialCode: '+886' },
  { code: 'TZ', label: 'Tanzania', dialCode: '+255' },
  { code: 'TH', label: 'Thailand', dialCode: '+66' },
  { code: 'TN', label: 'Tunisia', dialCode: '+216' },
  { code: 'TR', label: 'Turkey', dialCode: '+90' },
  { code: 'UG', label: 'Uganda', dialCode: '+256' },
  { code: 'UA', label: 'Ukraine', dialCode: '+380' },
  { code: 'AE', label: 'United Arab Emirates', dialCode: '+971' },
  { code: 'UY', label: 'Uruguay', dialCode: '+598' },
  { code: 'UZ', label: 'Uzbekistan', dialCode: '+998' },
  { code: 'VE', label: 'Venezuela', dialCode: '+58' },
  { code: 'VN', label: 'Vietnam', dialCode: '+84' },
  { code: 'YE', label: 'Yemen', dialCode: '+967' },
  { code: 'ZW', label: 'Zimbabwe', dialCode: '+263' },
];

const countryCodeToFlag = (code: string) =>
  String.fromCodePoint(...code.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65));

function detectCountry(): string {
  try {
    const locale = navigator.language || (navigator as any).userLanguage || '';
    const parts = locale.split('-');
    if (parts.length > 1 && parts[1].length === 2) return parts[1].toUpperCase();
  } catch { /* non-critical */ }
  return 'US';
}

export default function Clients() {
  const {
    clients, loadClients, addClient, updateClient, removeClient,
    communications, loadCommunications, addCommunication, removeCommunication,
    projects, loadProjects,
    proposals, loadProposals,
    invoices, loadInvoices,
    profile, loadProfile,
    metricDefs, loadMetricDefs, addMetricDef, updateMetricDef, removeMetricDef,
    metricValues, loadMetricValues, logMetricValue, removeMetricValue,
    metricTemplates, loadMetricTemplates, saveMetricTemplate, applyMetricTemplate, removeMetricTemplate,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '', preferred_currency: '' });
  const [formErrors, setFormErrors] = useState<{ email?: string }>({});
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ type: 'note' as Communication['type'], date: new Date().toISOString().split('T')[0], summary: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [hoveredComm, setHoveredComm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics'>('overview');
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [editingMetric, setEditingMetric] = useState<MetricDefinition | null>(null);
  const [metricForm, setMetricForm] = useState({ name: '', metric_type: 'number' as MetricDefinition['metric_type'], unit_label: '', is_headline: false });
  const [showValueForm, setShowValueForm] = useState<string | null>(null);
  const [valueForm, setValueForm] = useState({ value: '', period: new Date().toISOString().split('T')[0], notes: '' });
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState(detectCountry);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (selectedId) {
      loadMetricDefs(selectedId);
    }
  }, [selectedId, loadMetricDefs]);

  useEffect(() => {
    loadMetricTemplates();
  }, [loadMetricTemplates]);

  const selectedClient = clients.find((c) => c.id === selectedId);
  const selectedCountry = useMemo(() => COUNTRY_OPTIONS.find((country) => country.code === phoneCountry) || COUNTRY_OPTIONS[0], [phoneCountry]);

  useEffect(() => {
    if (!showCountryDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCountryDropdown]);

  const getClientStatus = (clientId: string) => {
    const hasActive = projects.some((p) => p.client_id === clientId && p.status === 'active');
    const hasProposal = proposals.some((p) => p.client_id === clientId && (p.status === 'sent' || p.status === 'draft'));
    if (hasActive) return 'bg-[var(--accent)]';
    if (hasProposal) return 'bg-[var(--warning-text)]';
    return 'bg-[var(--neutral-border)]';
  };

  const getOverview = (clientId: string) => {
    const clientProjects = projects.filter((p) => p.client_id === clientId);
    const clientProposals = proposals.filter((p) => p.client_id === clientId);
    const clientInvoices = invoices.filter((i) => i.client_id === clientId);
    const lifetime = clientInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const outstanding = clientInvoices.filter((i) => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    const lastComm = (communications[clientId] || [])[0];
    return { projectCount: clientProjects.length, proposalCount: clientProposals.length, lifetime, outstanding, lastComm };
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(search.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', company: '', notes: '', preferred_currency: '' });
    setPhoneCountry('US');
    setFormErrors({});
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
      preferred_currency: client.preferred_currency || '',
    });
    const inferredCountry = COUNTRY_OPTIONS.find((country) => (client.phone || '').includes(country.dialCode))?.code || 'US';
    setPhoneCountry(inferredCountry);
    setFormErrors({});
    setShowModal(true);
  };

  const handleSaveClient = async () => {
    if (!form.name.trim()) return;
    if (form.email && !EMAIL_REGEX.test(form.email)) {
      setFormErrors({ email: 'Please enter a valid email address' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateClient({ ...editing, name: form.name, email: form.email || undefined, phone: form.phone || undefined, company: form.company || undefined, notes: form.notes || undefined, preferred_currency: form.preferred_currency || undefined });
      } else {
        const c = await addClient({ name: form.name, email: form.email || undefined, phone: form.phone || undefined, company: form.company || undefined, notes: form.notes || undefined, preferred_currency: form.preferred_currency || undefined });
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

  const handleDelete = async () => {
    if (!confirmDialog) return;
    setDeleting(true);
    try {
      await removeClient(confirmDialog.id);
      if (selectedId === confirmDialog.id) setSelectedId(null);
      setConfirmDialog(null);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to delete client', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveLog = async () => {
    if (!selectedId || !logForm.summary.trim()) return;
    setSaving(true);
    try {
      await addCommunication({
        id: crypto.randomUUID(),
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

  const handleSaveMetricDef = async () => {
    if (!selectedId || !metricForm.name.trim()) return;
    setSaving(true);
    try {
      const defs = metricDefs[selectedId] || [];
      if (editingMetric) {
        await updateMetricDef({
          id: editingMetric.id,
          name: metricForm.name,
          metric_type: metricForm.metric_type,
          unit_label: metricForm.unit_label || undefined,
          is_headline: metricForm.is_headline,
          sort_order: editingMetric.sort_order,
        });
      } else {
        await addMetricDef({
          client_id: selectedId,
          name: metricForm.name,
          metric_type: metricForm.metric_type,
          unit_label: metricForm.unit_label || undefined,
          is_headline: metricForm.is_headline,
          sort_order: defs.length,
        });
        if (defs.length === 0) {
          setShowTemplatePrompt(true);
        }
      }
      setShowMetricForm(false);
      setEditingMetric(null);
      setMetricForm({ name: '', metric_type: 'number', unit_label: '', is_headline: false });
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save metric', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogValue = async (definitionId: string) => {
    if (!selectedId || !valueForm.value.trim()) return;
    try {
      await logMetricValue({
        definition_id: definitionId,
        client_id: selectedId,
        value: valueForm.value,
        period: valueForm.period,
        notes: valueForm.notes || undefined,
      });
      setShowValueForm(null);
      setValueForm({ value: '', period: new Date().toISOString().split('T')[0], notes: '' });
      await loadMetricValues(definitionId);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to log value', 'error');
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!selectedId || !templateName.trim()) return;
    const defs = metricDefs[selectedId] || [];
    if (defs.length === 0) return;
    try {
      await saveMetricTemplate(templateName, defs.map(d => ({
        name: d.name,
        metric_type: d.metric_type,
        unit_label: d.unit_label,
        is_headline: d.is_headline,
        sort_order: d.sort_order,
      })));
      setShowTemplateModal(false);
      setTemplateName('');
      addToast(`Template "${templateName}" saved`, 'success');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save template', 'error');
    }
  };

  const handleApplyTemplate = async (templateName: string) => {
    if (!selectedId) return;
    try {
      await applyMetricTemplate(templateName, selectedId);
      await loadMetricDefs(selectedId);
      addToast(`Template "${templateName}" applied`, 'success');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to apply template', 'error');
    }
  };

  const clientComms = (communications[selectedId || ''] || []);

  if (loading) return (
    <div className="flex h-full">
      <div className="w-[240px] border-r border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0">
        <div className="px-4 py-3 border-b border-[var(--border-color)]">
          <div className="h-4 w-16 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
        </div>
        <div className="py-2 space-y-1 px-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-[var(--bg-secondary)] rounded-[6px] skeleton-pulse" />)}
        </div>
      </div>
      <div className="flex-1 p-6 space-y-4">
        <div className="h-6 w-48 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[var(--bg-secondary)] rounded-[8px] skeleton-pulse" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Left panel — client list */}
      <div className="w-[240px] border-r border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0 flex flex-col">
        <div className="px-4 py-3 border-b border-[var(--border-color)] space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Clients</h3>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter..."
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] bg-[var(--bg-secondary)]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {filteredClients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-colors ${
                selectedId === c.id
                  ? 'bg-[var(--accent-bg)] border-l-2 border-[var(--accent)]'
                  : 'hover:bg-[var(--bg-secondary)] border-l-2 border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getClientStatus(c.id)}`} title={projects.some(p => p.client_id === c.id && p.status === 'active') ? 'Active project' : proposals.some(p => p.client_id === c.id && (p.status === 'sent' || p.status === 'draft')) ? 'Proposal open' : 'No activity'} />
              <span className={`text-xs truncate ${selectedId === c.id ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-primary)]'}`}>
                {c.name}
              </span>
            </button>
          ))}
          {filteredClients.length === 0 && search && (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-4">No clients match "{search}"</p>
          )}
          <button
            onClick={openNew}
            className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-xs text-[var(--accent)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Plus size={12} />
            Add client
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Upload size={12} />
            Import
          </button>
        </div>
      </div>

      {/* Right panel — detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedClient ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users size={40} className="text-[var(--neutral-border)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">Select a client or add a new one.</p>
            </div>
          </div>
        ) : (() => {
          const overview = getOverview(selectedClient.id);
          return (
            <>
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
                    aria-label="Edit client"
                    className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    title="Edit client"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDialog({ id: selectedClient.id, name: selectedClient.name })}
                    aria-label="Delete client"
                    className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                    title="Delete client"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {selectedClient.notes && (
                <p className="text-xs text-[var(--text-tertiary)] mb-4">{selectedClient.notes}</p>
              )}

              {/* Tabs */}
              <div className="flex items-center gap-1 mb-4 border-b border-[var(--border-color)]">
                {(['overview', 'metrics'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                      activeTab === tab
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    }`}
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {tab === 'overview' ? 'Overview' : 'Metrics'}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Overview tab */}
              {activeTab === 'overview' && (
                <>
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
                          {overview.lastComm ? relativeDate(overview.lastComm.date) : 'No interactions'}
                        </span>
                      </div>
                      {overview.outstanding > 0 && (
                        <div className="col-span-4 mt-1 pt-2 border-t border-[var(--border-color)]">
                          <span className="text-xs text-[var(--warning-text)]">{formatCurrency(overview.outstanding, profile?.currency)} outstanding</span>
                        </div>
                      )}
                    </div>
                  </Card>

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
                                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
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
                                  {commLabels[comm.type]} &middot; {relativeDate(comm.date)}
                                </p>
                                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{comm.summary}</p>
                              </div>
                              {hoveredComm === comm.id && (
                                <div className="flex-shrink-0">
                                  {isConfirming ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-[var(--danger)]">Delete?</span>
                                      <button onClick={() => handleDeleteComm(comm.id)} aria-label="Confirm delete" className="text-[var(--danger)] hover:text-[var(--danger-hover)]">
                                        <Check size={14} />
                                      </button>
                                      <button onClick={() => setDeleteConfirm(null)} aria-label="Cancel delete" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button onClick={() => handleDeleteComm(comm.id)} aria-label="Delete communication" className="text-[var(--text-tertiary)] hover:text-[var(--danger)]">
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
              )}

              {/* Metrics tab */}
              {activeTab === 'metrics' && selectedId && (
                <div className="space-y-6">
                  {/* Template prompt */}
                  {showTemplatePrompt && (
                    <div className="px-4 py-3 rounded-[10px] bg-[var(--accent-bg)] border border-[var(--accent)]/20 flex items-center justify-between">
                      <p className="text-xs text-[var(--text-primary)]">Save this metric set as a template for future clients?</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setShowTemplatePrompt(false); setShowTemplateModal(true); }}
                          className="text-xs text-[var(--accent)] font-medium hover:underline"
                        >
                          Save template
                        </button>
                        <button onClick={() => setShowTemplatePrompt(false)} className="p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Templates */}
                  {metricTemplates.length > 0 && (metricDefs[selectedId] || []).length === 0 && (
                    <Card>
                      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                        Apply a template
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {metricTemplates.map((tpl) => (
                          <button
                            key={tpl.id}
                            onClick={() => handleApplyTemplate(tpl.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-secondary)]"
                          >
                            <Copy size={12} />
                            {tpl.name}
                          </button>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Metric definitions + values */}
                  <div className="space-y-4">
                    {(metricDefs[selectedId] || []).map((def) => {
                      const values = metricValues[def.id] || [];
                      const numericValues = values
                        .map((v) => parseFloat(v.value))
                        .filter((v) => !isNaN(v));
                      const isLoaded = !!metricValues[def.id];

                      return (
                        <Card key={def.id} className="!p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {def.name}
                              </span>
                              {def.unit_label && (
                                <span className="text-[10px] text-[var(--text-tertiary)]">{def.unit_label}</span>
                              )}
                              {def.is_headline && (
                                <Star size={12} className="text-[var(--accent)]" />
                              )}
                              <Badge variant="default">
                                {def.metric_type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingMetric(def);
                                  setMetricForm({
                                    name: def.name,
                                    metric_type: def.metric_type,
                                    unit_label: def.unit_label || '',
                                    is_headline: def.is_headline,
                                  });
                                  setShowMetricForm(true);
                                }}
                                className="p-1 rounded-[6px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={async () => {
                                  await removeMetricDef(def.id, selectedId);
                                }}
                                className="p-1 rounded-[6px] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Values */}
                          {!isLoaded ? (
                            <button
                              onClick={() => loadMetricValues(def.id)}
                              className="text-[10px] text-[var(--accent)] hover:underline"
                            >
                              Load history
                            </button>
                          ) : values.length === 0 ? (
                            <p className="text-[10px] text-[var(--text-tertiary)]">No values logged yet.</p>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Sparkline values={numericValues} width={100} height={28} />
                              <div>
                                <span className="text-sm font-semibold text-[var(--text-primary)]">
                                  {def.metric_type === 'currency' ? `$${numericValues[numericValues.length - 1]?.toFixed(2) || '—'}` :
                                   def.metric_type === 'percentage' ? `${numericValues[numericValues.length - 1]?.toFixed(1) || '—'}%` :
                                   values[values.length - 1]?.value || '—'}
                                </span>
                                <p className="text-[10px] text-[var(--text-tertiary)]">{values.length} entries</p>
                              </div>
                            </div>
                          )}

                          {/* Log value form */}
                          {showValueForm === def.id ? (
                            <div className="flex items-end gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
                              <div className="flex-1">
                                <input
                                  type={def.metric_type === 'text' ? 'text' : 'number'}
                                  value={valueForm.value}
                                  onChange={(e) => setValueForm({ ...valueForm, value: e.target.value })}
                                  placeholder={`Value${def.unit_label ? ` (${def.unit_label})` : ''}`}
                                  className="w-full px-2.5 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogValue(def.id); }}
                                  autoFocus
                                />
                              </div>
                              <div>
                                <input
                                  type="date"
                                  value={valueForm.period}
                                  onChange={(e) => setValueForm({ ...valueForm, period: e.target.value })}
                                  className="w-full px-2.5 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                />
                              </div>
                              <Button size="sm" onClick={() => handleLogValue(def.id)}>Log</Button>
                              <button onClick={() => setShowValueForm(null)} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setShowValueForm(def.id);
                                setValueForm({ value: '', period: new Date().toISOString().split('T')[0], notes: '' });
                                if (!isLoaded) loadMetricValues(def.id);
                              }}
                              className="mt-2 text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1"
                            >
                              <Plus size={10} /> Log value
                            </button>
                          )}
                        </Card>
                      );
                    })}

                    {/* Add metric button */}
                    {!showMetricForm && (
                      <button
                        onClick={() => {
                          setEditingMetric(null);
                          setMetricForm({ name: '', metric_type: 'number', unit_label: '', is_headline: false });
                          setShowMetricForm(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-3 border border-dashed border-[var(--border-color)] rounded-[10px] text-xs text-[var(--text-tertiary)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)] transition-colors"
                      >
                        <Plus size={14} /> Add metric
                      </button>
                    )}

                    {/* New metric definition form */}
                    {showMetricForm && (
                      <Card className="!p-4">
                        <div className="space-y-3">
                          <div>
                            <input
                              type="text"
                              value={metricForm.name}
                              onChange={(e) => setMetricForm({ ...metricForm, name: e.target.value })}
                              placeholder="Metric name (e.g. CPM, ROAS, Story Points)"
                              className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMetricDef(); }}
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={metricForm.metric_type}
                              onChange={(e) => setMetricForm({ ...metricForm, metric_type: e.target.value as MetricDefinition['metric_type'] })}
                              className="px-2.5 py-1.5 text-xs border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                            >
                              <option value="number">Number</option>
                              <option value="percentage">Percentage</option>
                              <option value="currency">Currency</option>
                              <option value="text">Text</option>
                            </select>
                            <input
                              type="text"
                              value={metricForm.unit_label}
                              onChange={(e) => setMetricForm({ ...metricForm, unit_label: e.target.value })}
                              placeholder="Unit (e.g. per 1000)"
                              className="flex-1 px-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                            />
                            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={metricForm.is_headline}
                                onChange={(e) => setMetricForm({ ...metricForm, is_headline: e.target.checked })}
                                className="rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                              />
                              Headline
                            </label>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setShowMetricForm(false); setEditingMetric(null); }}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveMetricDef} loading={saving} disabled={!metricForm.name.trim()}>
                              {editingMetric ? 'Save' : 'Add'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              )}
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
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormErrors({}); }}
                placeholder="email@example.com"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
              {formErrors.email && (
                <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Phone</label>
              <div className="flex gap-2 relative">
                <div ref={countryDropdownRef} className="relative w-[160px]">
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="w-full px-2 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 flex items-center gap-1.5 bg-[var(--bg-card)]"
                  >
                    <span>{countryCodeToFlag(selectedCountry.code)}</span>
                    <span className="truncate flex-1 text-left">{selectedCountry.label}</span>
                    <svg className="w-3 h-3 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {showCountryDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] shadow-lg z-50 max-h-[200px] overflow-y-auto">
                      <div className="p-1 border-b border-[var(--border-color)]">
                        <input
                          type="text"
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          placeholder="Search country..."
                          className="w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] bg-[var(--bg-secondary)]"
                          autoFocus
                        />
                      </div>
                      {COUNTRY_OPTIONS.filter(c => c.label.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase())).map((country) => (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => { setPhoneCountry(country.code); setShowCountryDropdown(false); setCountrySearch(''); }}
                          className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-colors ${phoneCountry === country.code ? 'bg-[var(--accent-bg)]' : ''}`}
                        >
                          <span>{countryCodeToFlag(country.code)}</span>
                          <span>{country.label}</span>
                          <span className="text-[var(--text-tertiary)] ml-auto">{country.dialCode}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="555-0000"
                  className="flex-1 px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
                />
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{countryCodeToFlag(selectedCountry.code)} {selectedCountry.label} · {selectedCountry.dialCode}</p>
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
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Preferred currency</label>
            <select
              value={form.preferred_currency}
              onChange={(e) => setForm({ ...form, preferred_currency: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
            >
              <option value="">Use profile default ({profile?.currency || 'CAD'})</option>
              {[...CURRENCIES].map((c) => (
                <option key={c} value={c}>{getCurrencySymbol(c)} {c}</option>
              ))}
            </select>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Used when creating invoices for this client</p>
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

      {/* Save Template Modal */}
      <Modal open={showTemplateModal} onClose={() => setShowTemplateModal(false)} title="Save Metric Template" size="sm">
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-secondary)]">
            Save this metric configuration so you can apply it to other clients with one click.
          </p>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name (e.g. Paid Ads Client)"
            className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAsTemplate(); }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveAsTemplate} disabled={!templateName.trim()}>Save Template</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleDelete}
        title="Delete Client"
        message={`Are you sure you want to delete "${confirmDialog?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
      {selectedId && (
        <ArchetypeFeatureTabs screen="clients" context={{ clientId: selectedId }} />
      )}
      <ClientImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
