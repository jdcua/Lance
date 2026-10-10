import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import type { Client, Communication, MetricDefinition } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { getEmptyCopy } from '../components/ui/emptyCopy';
import Timeline, { type TimelineItem } from '../components/ui/Timeline';
import SharedView from '../components/motion/SharedView';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Sparkline from '../components/ui/Sparkline';
import { Plus, Pencil, Trash2, Mail, Phone, Building2, MessageSquare, PhoneCall, MailOpen, Users, X, Check, FileText, FolderKanban, Receipt, Clock, Search, Star, Copy, Upload } from 'lucide-react';
import { useToasts } from '../store/toastStore';
import ArchetypeFeatureTabs from '../components/features/ArchetypeFeatureTabs';
import ClientImportModal from '../components/ui/ClientImportModal';
import LoadError from '../components/ui/LoadError';
import { useVisibleList, MoreRows } from '../components/ui/useVisibleList';
import { formatCurrency, relativeDate, todayLocalISO } from '../utils/format';
import { getCurrencySymbol, CURRENCIES } from '../lib/currency';
import { checkAndNotify } from '../achievements/notify';
import { sanitizeInput, sanitizePhone, MAX_LENGTHS } from '../utils/sanitize';

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

function detectCountry(): string {
  try {
    const lang = navigator.language;
    if (lang) {
      const parts = lang.split('-');
      if (parts.length > 1) return parts[parts.length - 1].toUpperCase();
      const match = navigator.languages?.find((l) => l.includes('-'));
      if (match) return match.split('-')[1].toUpperCase();
    }
  } catch { /* non-critical */ }
  return 'US';
}

export default function Clients() {
  const clientsError = useStore((s) => s.errors.clients);
  const {
    clients, loadClients, addClient, updateClient, removeClient,
    communications, loadCommunications, addCommunication, updateCommunication, removeCommunication,
    projects, loadProjects,
    proposals, loadProposals,
    invoices, loadInvoices,
    contracts, loadContracts,
    payments, loadPayments,
    portalActivity, loadPortalActivity,
    profile, loadProfile,
    metricDefs, loadMetricDefs, addMetricDef, updateMetricDef, removeMetricDef, removeMetricValue,
    metricValues, loadMetricValues, logMetricValue,
    metricTemplates, loadMetricTemplates, saveMetricTemplate, applyMetricTemplate, removeMetricTemplate,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '', preferred_currency: '' });
  const [formErrors, setFormErrors] = useState<{ email?: string; name?: string }>({});
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ type: 'note' as Communication['type'], date: todayLocalISO(), summary: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [hoveredComm, setHoveredComm] = useState<string | null>(null);
  const [metricDeleteConfirm, setMetricDeleteConfirm] = useState<string | null>(null);
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [editCommText, setEditCommText] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'timeline'>('overview');
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [editingMetric, setEditingMetric] = useState<MetricDefinition | null>(null);
  const [metricForm, setMetricForm] = useState({ name: '', metric_type: 'number' as MetricDefinition['metric_type'], unit_label: '', is_headline: false });
  const [showValueForm, setShowValueForm] = useState<string | null>(null);
  const [valueForm, setValueForm] = useState({ value: '', period: todayLocalISO(), notes: '' });
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState(detectCountry);

  /** Persist the displayed dial code with the number (skip if already international). */
  const normalizePhone = (raw: string, dialCode: string): string => {
    const clean = sanitizePhone(sanitizeInput(raw));
    if (/^\+/.test(clean)) return clean;
    return `${dialCode}${clean.replace(/^[0\s]+/, '')}`;
  };

  useEffect(() => {
    Promise.all([loadClients(), loadProjects(), loadProposals(), loadInvoices(), loadContracts(), loadPayments(), loadProfile()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadClients, loadProjects, loadProposals, loadInvoices, loadContracts, loadPayments, loadProfile, addToast]);

  useEffect(() => {
    if (clients.length > 0 && !selectedId) {
      setSelectedId(clients[0].id);
    }
  }, [clients, selectedId]);

  // Deep links (search results) can pre-select a record: /clients?selected=<id>
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const sel = searchParams.get('selected');
    if (sel && clients.some((c) => c.id === sel)) {
      setSelectedId(sel);
    }
  }, [searchParams, clients]);

  useEffect(() => {
    loadCommunications();
    loadPortalActivity();
  }, [loadCommunications, loadPortalActivity]);

  useEffect(() => {
    loadMetricDefs();
    loadMetricValues();
  }, [loadMetricDefs, loadMetricValues]);

  useEffect(() => {
    loadMetricTemplates();
  }, [loadMetricTemplates]);

  const selectedClient = clients.find((c) => c.id === selectedId);

  /** Relationship timeline: real entities only, newest first in Timeline. */
  const clientTimeline: TimelineItem[] = useMemo(() => {
    if (!selectedId) return [];
    const items: TimelineItem[] = [];
    for (const p of proposals.filter((x) => x.client_id === selectedId)) {
      items.push({
        id: `proposal-${p.id}`, kind: 'proposal', date: p.sent_at || p.created_at,
        title: p.title, sub: `Proposal · ${p.status}`, to: '/proposals',
      });
    }
    for (const c of contracts.filter((x) => x.client_id === selectedId)) {
      items.push({
        id: `contract-${c.id}`, kind: 'contract', date: c.signed_at || c.created_at,
        title: c.title, sub: `Contract · ${c.status}`, to: '/contracts',
      });
    }
    for (const i of invoices.filter((x) => x.client_id === selectedId)) {
      items.push({
        id: `invoice-${i.id}`, kind: 'invoice', date: i.created_at,
        title: `Invoice ${i.invoice_number}`, sub: `${formatCurrency(i.total, profile?.currency)} · ${i.status}`,
        to: '/invoices',
      });
    }
    for (const pay of payments) {
      const inv = invoices.find((x) => x.id === pay.invoice_id);
      if (!inv || inv.client_id !== selectedId) continue;
      items.push({
        id: `payment-${pay.id}`, kind: 'payment', date: pay.payment_date,
        title: `${formatCurrency(pay.amount, profile?.currency)} payment`,
        sub: `${inv.invoice_number} · ${pay.payment_method}`, to: '/invoices',
      });
    }
    for (const m of communications.filter((x) => x.client_id === selectedId)) {
      items.push({
        id: `message-${m.id}`, kind: 'message', date: m.date || m.created_at,
        title: m.type.charAt(0).toUpperCase() + m.type.slice(1), detail: m.summary,
      });
    }
    for (const a of portalActivity) {
      const entity =
        a.entity_type === 'proposal'
          ? proposals.find((x) => x.id === a.entity_id)
          : a.entity_type === 'contract'
            ? contracts.find((x) => x.id === a.entity_id)
            : undefined;
      if (!entity || entity.client_id !== selectedId) continue;
      items.push({
        id: `portal-${a.token}-${a.timestamp}`, kind: 'portal', date: a.timestamp,
        title: a.activity, sub: entity.title,
        to: a.entity_type === 'proposal' ? '/proposals' : '/contracts',
      });
    }
    return items;
  }, [selectedId, proposals, contracts, invoices, payments, communications, portalActivity, profile?.currency]);
  const selectedCountry = useMemo(() => COUNTRY_OPTIONS.find((country) => country.code === phoneCountry) || COUNTRY_OPTIONS[0], [phoneCountry]);

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
    const lastComm = communications.find((c) => c.client_id === clientId);
    return { projectCount: clientProjects.length, proposalCount: clientProposals.length, lifetime, outstanding, lastComm };
  };

  const filteredClients = clients.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );
  const pagedClients = useVisibleList(filteredClients, search);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', company: '', notes: '', preferred_currency: '' });
    setPhoneCountry('US');
    setFormErrors({});
    setShowModal(true);
  };

  // External triggers for the new-client modal: the walkthrough finale CTA
  // and the Cmd/Ctrl+N shortcut dispatched from App.tsx. (The shortcut was
  // previously dispatched here but nothing listened.)
  useEffect(() => {
    const handler = () => openNew();
    document.addEventListener('lance:add-client', handler);
    return () => document.removeEventListener('lance:add-client', handler);
  }, []);

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
    const sanitizedName = sanitizeInput(form.name).trim();
    if (!sanitizedName) {
      setFormErrors({ name: 'Name is required' });
      return;
    }
    if (form.email && !EMAIL_REGEX.test(form.email)) {
      setFormErrors({ email: 'Please enter a valid email address' });
      return;
    }
    setSaving(true);
    try {
      const sanitized = {
        name: sanitizedName.slice(0, MAX_LENGTHS.name),
        email: form.email ? sanitizeInput(form.email).slice(0, MAX_LENGTHS.email) : undefined,
        phone: form.phone ? normalizePhone(form.phone, selectedCountry.dialCode).slice(0, MAX_LENGTHS.phone) : undefined,
        company: form.company ? sanitizeInput(form.company).slice(0, MAX_LENGTHS.company) : undefined,
        notes: form.notes ? sanitizeInput(form.notes).slice(0, MAX_LENGTHS.notes) : undefined,
        preferred_currency: form.preferred_currency || undefined,
      };
      if (editing) {
        await updateClient({ ...editing, ...sanitized });
      } else {
        const c = await addClient(sanitized);
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
        summary: sanitizeInput(logForm.summary).trim().slice(0, MAX_LENGTHS.notes),
        date: logForm.date,
        created_at: new Date().toISOString(),
      });
      setLogForm({ type: 'note', date: todayLocalISO(), summary: '' });
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

  const handleSaveCommEdit = async (id: string) => {
    if (!editCommText.trim()) return;
    try {
      await updateCommunication(id, sanitizeInput(editCommText).trim().slice(0, MAX_LENGTHS.notes));
      setEditingCommId(null);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to update communication', 'error');
    }
  };

  const handleSaveMetricDef = async () => {
    if (!selectedId || !metricForm.name.trim()) return;
    setSaving(true);
    try {
      const defs = metricDefs.filter((d) => d.client_id === selectedId);
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
    const def = metricDefs.find((d) => d.id === definitionId);
    if (def && def.metric_type !== 'text') {
      // Non-numeric strings would poison SQL averages (AVG('abc') = 0 in
      // SQLite); display code filters NaN, aggregates often don't.
      const n = Number(valueForm.value);
      if (!isFinite(n)) {
        addToast('Enter a number for this metric', 'error');
        return;
      }
      if (n < 0) {
        addToast('Metric value cannot be negative', 'error');
        return;
      }
    }
    try {
      await logMetricValue({
        definition_id: definitionId,
        client_id: selectedId,
        value: valueForm.value,
        period: valueForm.period,
        notes: valueForm.notes || undefined,
      });
      setShowValueForm(null);
      setValueForm({ value: '', period: todayLocalISO(), notes: '' });
      await loadMetricValues(definitionId);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to log value', 'error');
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!selectedId || !templateName.trim()) return;
    const defs = metricDefs.filter((d) => d.client_id === selectedId);
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
      await loadMetricDefs();
      addToast(`Template "${templateName}" applied`, 'success');
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to apply template', 'error');
    }
  };

  const clientComms = communications.filter((c) => c.client_id === selectedId);

  if (loading) return (
    <div className="flex flex-col md:flex-row h-full">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[var(--bg-secondary)] rounded-[8px] skeleton-pulse" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Left panel · client list */}
      <div className="w-full md:w-[240px] border-b md:border-b-0 md:border-r border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0 flex flex-col max-h-[38vh] md:max-h-none">
        <div className="px-4 py-3 border-b border-[var(--border-color)] space-y-2">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Clients</h2>
          <LoadError error={clientsError} onRetry={() => loadClients()} />
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
          {pagedClients.visible.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-colors ${
                selectedId === c.id
                  ? 'bg-[var(--accent-bg)] border-l-2 border-[var(--accent)]'
                  : 'hover:bg-[var(--bg-secondary)] border-l-2 border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getClientStatus(c.id)}`} title={projects.some(p => p.client_id === c.id && p.status === 'active') ? 'Active project' : proposals.some(p => p.client_id === c.id && (p.status === 'sent' || p.status === 'draft')) ? 'Proposal open' : communications.some(co => co.client_id === c.id) ? 'Has communication log' : 'No activity'} />
              <span className={`text-xs truncate ${selectedId === c.id ? 'text-[var(--accent-ink,var(--accent))] font-medium' : 'text-[var(--text-primary)]'}`}>
                <SharedView layoutId={`client-name-${c.id}`}>{c.name}</SharedView>
              </span>
            </button>
          ))}
          {filteredClients.length === 0 && search && (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-4">No clients match "{search}"</p>
          )}
          <MoreRows total={pagedClients.total} shown={pagedClients.visible.length} hasMore={pagedClients.hasMore} showMore={pagedClients.showMore} />
          <button
            onClick={openNew}
            className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-xs text-[var(--accent-ink,var(--accent))] hover:bg-[var(--bg-secondary)] transition-colors"
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

      {/* Right panel · detail */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
        {!selectedClient ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-16">
              <Users size={40} className="text-[var(--text-tertiary)] mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-[var(--text-primary)]">{clients.length === 0 ? getEmptyCopy('clients').headline : 'Select a client or add a new one.'}</p>
              {clients.length === 0 && (
                <>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1 mb-4">{getEmptyCopy('clients').sub}</p>
                  <button onClick={openNew} className="text-xs font-medium px-3 py-1.5 rounded-sm bg-[var(--accent)] text-[var(--accent-on)] hover:opacity-90">Add your first client</button>
                </>
              )}
            </div>
          </div>
        ) : (() => {
          const overview = getOverview(selectedClient.id);
          return (
            <>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <SharedView layoutId={`client-name-${selectedClient.id}`}>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selectedClient.name}</h2>
                  </SharedView>
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
                {(['overview', 'metrics', 'timeline'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                      activeTab === tab
                        ? 'text-[var(--accent-ink,var(--accent))]'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    }`}
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {tab === 'overview' ? 'Overview' : tab === 'metrics' ? 'Metrics' : 'Timeline'}
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
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                          {overview.lastComm ? relativeDate(overview.lastComm.created_at || overview.lastComm.date) : 'No interactions'}
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
                        onClick={() => { setShowLogForm(!showLogForm); setLogForm({ type: 'note', date: todayLocalISO(), summary: '' }); }}
                        className="text-xs text-[var(--accent-ink,var(--accent))] hover:underline flex items-center gap-1"
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
                                      ? 'bg-[var(--accent)] text-[var(--accent-on)]'
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
                                  {commLabels[comm.type]} &middot; {relativeDate(comm.created_at || comm.date)}
                                </p>
                                {editingCommId === comm.id ? (
                                  <div>
                                    <textarea
                                      value={editCommText}
                                      onChange={(e) => setEditCommText(e.target.value)}
                                      rows={2}
                                      className="w-full px-2 py-1.5 text-[13px] border border-[var(--accent)] rounded-[6px] focus:outline-none resize-none"
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-1.5 mt-1.5">
                                      <button onClick={() => setEditingCommId(null)} aria-label="Cancel edit" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                                        <X size={14} />
                                      </button>
                                      <button onClick={() => handleSaveCommEdit(comm.id)} aria-label="Save edit" disabled={!editCommText.trim()} className="text-[var(--accent-ink,var(--accent))] hover:text-[var(--accent-hover)] disabled:opacity-40">
                                        <Check size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{comm.summary}</p>
                                )}
                              </div>
                              {hoveredComm === comm.id && editingCommId !== comm.id && (
                                <div className="flex-shrink-0 flex items-center gap-1">
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
                                    <>
                                      <button onClick={() => { setEditingCommId(comm.id); setEditCommText(comm.summary); setDeleteConfirm(null); }} aria-label="Edit communication" className="text-[var(--text-tertiary)] hover:text-[var(--accent-ink,var(--accent))]">
                                        <Pencil size={13} />
                                      </button>
                                      <button onClick={() => handleDeleteComm(comm.id)} aria-label="Delete communication" className="text-[var(--text-tertiary)] hover:text-[var(--danger)]">
                                        <X size={13} />
                                      </button>
                                    </>
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
                          className="text-xs text-[var(--accent-ink,var(--accent))] font-medium hover:underline"
                        >
                          Save template
                        </button>
                        <button
                          aria-label="Close"
                          onClick={() => setShowTemplatePrompt(false)} className="p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Templates */}
                  {metricTemplates.length > 0 && metricDefs.filter((d) => d.client_id === selectedId).length === 0 && (
                    <Card>
                      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                        Apply a template
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {metricTemplates.map((tpl) => (
                          <span
                            key={tpl.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-secondary)]"
                          >
                                <button
                                  onClick={() => handleApplyTemplate(tpl.name)}
                                  className="flex items-center gap-1.5"
                                >
                                  <Copy size={12} />
                                  {tpl.name}
                                </button>
                                {metricDeleteConfirm === `tpl:${tpl.id}` ? (
                                  <>
                                    <button
                                      onClick={async () => { await removeMetricTemplate(tpl.id); setMetricDeleteConfirm(null); }}
                                      aria-label={`Confirm delete template ${tpl.name}`}
                                      className="text-[var(--danger)] hover:text-[var(--danger-hover)]"
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button
                                      onClick={() => setMetricDeleteConfirm(null)}
                                      aria-label="Cancel delete"
                                      className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                    >
                                      <X size={12} />
                                    </button>
                                  </>
                                ) : (
                                <button
                                  onClick={() => setMetricDeleteConfirm(`tpl:${tpl.id}`)}
                                  aria-label={`Delete template ${tpl.name}`}
                                  className="text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                                >
                                  <X size={12} />
                                </button>
                                )}
                          </span>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Metric definitions + values */}
                  <div className="space-y-4">
                    {metricDefs.filter((d) => d.client_id === selectedId).map((def) => {
                      const values = metricValues.filter((v) => v.definition_id === def.id);
                      const numericValues = values
                        .map((v) => parseFloat(v.value))
                        .filter((v) => !isNaN(v));

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
                                <Star size={12} className="text-[var(--accent-ink,var(--accent))]" />
                              )}
                              <Badge variant="default">
                                {def.metric_type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <button aria-label="Edit clients"
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
                              {metricDeleteConfirm === def.id ? (
                                <>
                                  <button
                                    onClick={async () => { await removeMetricDef(def.id, selectedId); setMetricDeleteConfirm(null); }}
                                    aria-label="Confirm delete metric"
                                    className="p-1 rounded-[6px] text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => setMetricDeleteConfirm(null)}
                                    aria-label="Cancel delete metric"
                                    className="p-1 rounded-[6px] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </>
                              ) : (
                              <button aria-label="Delete clients"
                                onClick={() => setMetricDeleteConfirm(def.id)}
                                className="p-1 rounded-[6px] text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                              )}
                            </div>
                          </div>

                      {/* Values */}
                      {values.length === 0 ? (
                        <p className="text-[10px] text-[var(--text-tertiary)]">No values logged yet.</p>
                      ) : (
                            <div className="flex items-center gap-3">
                              <Sparkline values={[...numericValues].reverse()} width={100} height={28} />
                              <div>
                                <span className="text-sm font-semibold text-[var(--text-primary)]">
                                  {def.metric_type === 'currency' ? (numericValues[0] != null ? formatCurrency(numericValues[0], profile?.currency) : '--') :
                                   def.metric_type === 'percentage' ? `${numericValues[0]?.toFixed(1) || '--'}%` :
                                   values[0]?.value || '--'}
                                </span>
                                <p className="text-[10px] text-[var(--text-tertiary)]">{values.length} entries</p>
                              </div>
                            </div>
                          )}
                      {values.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer select-none">
                            Value history
                          </summary>
                          <div className="mt-1.5 space-y-1">
                            {values.map((v) => (
                              <div key={v.id} className="flex items-center justify-between px-2 py-1 rounded-[6px] hover:bg-[var(--bg-secondary)] text-xs group/val">
                                <span className="text-[var(--text-secondary)] tabular-nums">
                                  {v.value}{def.unit_label ? ` ${def.unit_label}` : ''} · <span className="text-[var(--text-tertiary)]">{v.period || relativeDate(v.created_at)}</span>
                                </span>
                                {metricDeleteConfirm === `val:${v.id}` ? (
                                  <span className="flex items-center gap-1">
                                    <button
                                      onClick={async () => { await removeMetricValue(v.id, def.id); setMetricDeleteConfirm(null); }}
                                      aria-label={`Confirm delete value ${v.value}`}
                                      className="text-[var(--danger)] hover:text-[var(--danger-hover)]"
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button
                                      onClick={() => setMetricDeleteConfirm(null)}
                                      aria-label="Cancel delete"
                                      className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ) : (
                                <button
                                  onClick={() => setMetricDeleteConfirm(`val:${v.id}`)}
                                  aria-label={`Delete value ${v.value}`}
                                  className="text-[var(--text-tertiary)] hover:text-[var(--danger)] opacity-0 group-hover/val:opacity-100 transition-opacity"
                                >
                                  <X size={12} />
                                </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                          {/* Log value form */}
                          {showValueForm === def.id ? (
                            <div className="flex items-end gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
                              <div className="flex-1">
                                <input
                                  type={def.metric_type === 'text' ? 'text' : 'number'}
                                  min={def.metric_type === 'text' ? undefined : 0}
                                  value={valueForm.value}
                                  onChange={(e) => { const v = e.target.value; if (def.metric_type !== 'text' && Number(v) < 0) return; setValueForm({ ...valueForm, value: v }); }}
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
                              <button
                                aria-label="Close"
                                onClick={() => setShowValueForm(null)} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setShowValueForm(def.id);
                                setValueForm({ value: '', period: todayLocalISO(), notes: '' });
                              }}
                              className="mt-2 text-[10px] text-[var(--accent-ink,var(--accent))] hover:underline flex items-center gap-1"
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
                        className="w-full flex items-center justify-center gap-1.5 py-3 border border-dashed border-[var(--border-color)] rounded-[10px] text-xs text-[var(--text-tertiary)] hover:border-[var(--accent)]/30 hover:text-[var(--accent-ink,var(--accent))] transition-colors"
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
                            <select aria-label="Metric type"
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
                                className="rounded border-[var(--border-color)] text-[var(--accent-ink,var(--accent))] focus:ring-[var(--accent)]"
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

              {/* Timeline tab */}
              {activeTab === 'timeline' && selectedId && (
                <Timeline items={clientTimeline} />
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
              maxLength={MAX_LENGTHS.name}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              autoFocus
            />
            {formErrors.name && (
              <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormErrors({}); }}
                placeholder="email@example.com"
                maxLength={MAX_LENGTHS.email}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
              />
              {formErrors.email && (
                <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Phone</label>
              <div className="flex items-center gap-0">
                <span className="px-3 py-2 text-sm border border-r-0 border-[var(--border-color)] rounded-l-[8px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] whitespace-nowrap">{selectedCountry.dialCode}</span>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="555-0000"
                  maxLength={MAX_LENGTHS.phone}
                  className="flex-1 px-3 py-2 text-sm border border-[var(--border-color)] rounded-r-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Company</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company name"
              maxLength={MAX_LENGTHS.company}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Preferred currency</label>
            <select aria-label="Preferred currency"
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
              maxLength={MAX_LENGTHS.notes}
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
