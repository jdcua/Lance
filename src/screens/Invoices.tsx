import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import type { Invoice, LineItem, TimeEntry, RecurringInvoice as RecurringInvoiceType } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import MetricCard from '../components/ui/MetricCard';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ClientSelect from '../components/ui/ClientSelect';
import { exportInvoicePDF, exportInvoiceDOCX } from '../export';
import { formatCurrency, relativeDate } from '../utils/format';
import { generateInvoiceNumber } from '../utils/invoiceNumber';
import { useToasts } from '../store/toastStore';
import { Plus, Pencil, Trash2, Download, Clock, RotateCw, Receipt, Search, ArrowUpDown } from 'lucide-react';
import { checkAndNotify, tryUnlock } from '../achievements/notify';

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'warning',
  sent: 'info',
  paid: 'success',
  overdue: 'danger',
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

type InvSortKey = 'number' | 'client' | 'status' | 'total' | 'date';

export default function Invoices() {
  const {
    invoices, loadInvoices, clients, loadClients, addInvoice, updateInvoice, removeInvoice, profile, loadProfile,
    timeEntries, loadTimeEntries, updateTimeEntry, projects, loadProjects,
    recurringInvoices, loadRecurringInvoices, addRecurringInvoice, updateRecurringInvoice, removeRecurringInvoice,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportDropdown, setExportDropdown] = useState<string | null>(null);
  const [selectedTimeIds, setSelectedTimeIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'recurring'>('all');
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringInvoiceType | null>(null);
  const [riForm, setRiForm] = useState({
    client_id: '', project_id: '', title: '', frequency: 'monthly' as RecurringInvoiceType['frequency'],
    notes: '', tax_rate: '', next_due: new Date().toISOString().split('T')[0],
  });
  const [riItems, setRiItems] = useState<Omit<LineItem, 'id'>[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
  const [form, setForm] = useState({
    client_id: '', project_id: '', invoice_number: '', due_date: '', notes: '', tax_rate: '', status: 'draft' as Invoice['status'],
  });
  const [items, setItems] = useState<Omit<LineItem, 'id'>[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<InvSortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string; type: 'invoice' | 'recurring' } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([loadInvoices(), loadClients(), loadProfile(), loadProjects()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadInvoices, loadClients, loadProfile, loadProjects]);

  useEffect(() => {
    if (activeTab === 'recurring') loadRecurringInvoices();
  }, [activeTab, loadRecurringInvoices]);

  useEffect(() => {
    if (!exportDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setExportDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportDropdown]);

  const openNew = () => {
    const paymentTerms = profile?.payment_terms ?? 14;
    const defaultTax = profile?.tax_rate ? String(profile.tax_rate) : '';
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    setEditing(null);
    setForm({ client_id: '', project_id: '', invoice_number: generateInvoiceNumber(invoices), due_date: dueDate.toISOString().split('T')[0], notes: '', tax_rate: defaultTax, status: 'draft' });
    setItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
    setSelectedTimeIds(new Set());
    setShowModal(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({ client_id: inv.client_id, project_id: inv.project_id || '', invoice_number: inv.invoice_number, due_date: inv.due_date || '', notes: inv.notes || '', tax_rate: inv.tax_rate?.toString() || '', status: inv.status });
    setItems(inv.line_items.map((li) => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price, total: li.total })));
    setShowModal(true);
  };

  const updateItem = (index: number, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newItem = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unit_price') newItem.total = newItem.quantity * newItem.unit_price;
      return newItem;
    }));
  };

  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  const removeItem = (index: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const taxRate = form.tax_rate ? parseFloat(form.tax_rate) : 0;
  const total = subtotal + subtotal * (taxRate / 100);

  const handleSave = async () => {
    if (!form.client_id) return;
    setSaving(true);
    try {
      const lineItems: LineItem[] = items.map((i) => ({ ...i, id: crypto.randomUUID() }));
      const invoiceData = { client_id: form.client_id, invoice_number: form.invoice_number, status: form.status, line_items: lineItems, subtotal, tax_rate: taxRate || undefined, total, due_date: form.due_date || undefined, notes: form.notes || undefined };
      if (editing) await updateInvoice({ ...editing, ...invoiceData });
      else await addInvoice(invoiceData);
      const ids = Array.from(selectedTimeIds);
      const timeUpdates = ids
        .map(id => timeEntries.find((t: { id: string }) => t.id === id))
        .filter((entry): entry is NonNullable<typeof entry> => !!entry)
        .map(entry => updateTimeEntry({ ...entry, invoiced: true }));
      await Promise.allSettled(timeUpdates);
      setShowModal(false);
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save invoice', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'invoice') await removeInvoice(confirmDelete.id);
      else await removeRecurringInvoice(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to delete', 'error');
    } finally { setDeleting(false); }
  };

  const handleMarkPaid = async (inv: Invoice) => {
    try { await updateInvoice({ ...inv, status: 'paid' as const }); checkAndNotify(useStore.getState(), addToast); }
    catch (err) { addToast(err?.toString?.() || 'Failed to mark as paid', 'error'); }
  };

  const handleMarkSent = async (inv: Invoice) => {
    try { await updateInvoice({ ...inv, status: 'sent' as const }); }
    catch (err) { addToast(err?.toString?.() || 'Failed to mark as sent', 'error'); }
  };

  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);
  const getClientName = (clientId: string) => getClient(clientId)?.name || 'Unknown';

  const hourlyRate = profile?.hourly_rate || 0;

  const unbilledTime = timeEntries.filter((t) => {
    if (!t.billable || t.invoiced) return false;
    if (!t.duration_minutes || t.duration_minutes <= 0) return false;
    if (form.project_id && t.project_id !== form.project_id) return false;
    if (form.client_id && t.client_id !== form.client_id) return false;
    return true;
  });

  const toggleTimeSelection = (id: string) => setSelectedTimeIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const importSelectedTime = () => {
    if (hourlyRate <= 0) { addToast('Set your hourly rate in profile to use time import.', 'error'); return; }
    const selected = timeEntries.filter((t) => selectedTimeIds.has(t.id));
    const newItems: Omit<LineItem, 'id'>[] = selected.map((t) => {
      const hours = (t.duration_minutes || 0) / 60;
      const amount = Math.round(hours * hourlyRate * 100) / 100;
      return { description: t.description || `Time entry ${new Date(t.start_time).toLocaleDateString()}`, quantity: 1, unit_price: amount, total: amount };
    });
    const existingItems = items.filter((i) => i.description.trim() !== '' || i.total > 0);
    setItems([...existingItems, ...newItems]);
    addToast(`Imported ${newItems.length} time entr${newItems.length !== 1 ? 'ies' : 'y'}`, 'success');
  };

  // ── Recurring handlers ──
  const openNewRecurring = () => {
    setEditingRecurring(null);
    setRiForm({ client_id: '', project_id: '', title: '', frequency: 'monthly', notes: '', tax_rate: '', next_due: new Date().toISOString().split('T')[0] });
    setRiItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
    setShowRecurringModal(true);
  };
  const openEditRecurring = (ri: RecurringInvoiceType) => {
    setEditingRecurring(ri);
    setRiForm({ client_id: ri.client_id, project_id: ri.project_id || '', title: ri.title, frequency: ri.frequency, notes: ri.notes || '', tax_rate: ri.tax_rate?.toString() || '', next_due: ri.next_due.split('T')[0] });
    setRiItems(ri.line_items.map((li) => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price, total: li.total })));
    setShowRecurringModal(true);
  };
  const updateRiItem = (index: number, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
    setRiItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newItem = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unit_price') newItem.total = newItem.quantity * newItem.unit_price;
      return newItem;
    }));
  };
  const addRiItem = () => setRiItems([...riItems, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  const removeRiItem = (i: number) => { if (riItems.length > 1) setRiItems(riItems.filter((_, idx) => idx !== i)); };
  const riSubtotal = riItems.reduce((s, i) => s + i.total, 0);
  const riTaxRate = riForm.tax_rate ? parseFloat(riForm.tax_rate) : 0;
  const riTotal = riSubtotal + riSubtotal * (riTaxRate / 100);

  const handleSaveRecurring = async () => {
    if (!riForm.title.trim() || !riForm.client_id) return;
    setSaving(true);
    try {
      const lineItems: LineItem[] = riItems.map((i) => ({ ...i, id: crypto.randomUUID() }));
      const data = { client_id: riForm.client_id, project_id: riForm.project_id || undefined, title: riForm.title, frequency: riForm.frequency, line_items: lineItems, subtotal: riSubtotal, tax_rate: riTaxRate || undefined, total: riTotal, notes: riForm.notes || undefined, active: true, next_due: riForm.next_due };
      if (editingRecurring) await updateRecurringInvoice({ ...editingRecurring, ...data, active: editingRecurring.active });
      else await addRecurringInvoice(data);
      setShowRecurringModal(false);
      checkAndNotify(useStore.getState(), addToast);
    } catch (err) { addToast(err?.toString?.() || 'Failed to save recurring invoice', 'error'); } finally { setSaving(false); }
  };

  const handleToggleActive = async (ri: RecurringInvoiceType) => {
    try { await updateRecurringInvoice({ ...ri, active: !ri.active }); }
    catch (err) { addToast(err?.toString?.() || 'Failed to toggle', 'error'); }
  };

  const handleExportPDF = (inv: Invoice) => {
    try { const client = getClient(inv.client_id); if (client && profile) { exportInvoicePDF(inv, client, profile); tryUnlock('first_export', addToast); } }
    catch (err) { addToast(err?.toString?.() || 'Failed to export PDF', 'error'); }
    setExportDropdown(null);
  };
  const handleExportDOCX = (inv: Invoice) => {
    try { const client = getClient(inv.client_id); if (client && profile) { exportInvoiceDOCX(inv, client, profile); tryUnlock('first_export', addToast); } }
    catch (err) { addToast(err?.toString?.() || 'Failed to export DOCX', 'error'); }
    setExportDropdown(null);
  };

  const totalOutstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  const filteredInvoices = invoices.filter(inv => {
    if (!search) return true;
    const s = search.toLowerCase();
    return inv.invoice_number.toLowerCase().includes(s) || getClientName(inv.client_id).toLowerCase().includes(s);
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'number': return dir * a.invoice_number.localeCompare(b.invoice_number);
      case 'client': return dir * getClientName(a.client_id).localeCompare(getClientName(b.client_id));
      case 'status': return dir * a.status.localeCompare(b.status);
      case 'total': return dir * (a.total - b.total);
      case 'date': return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default: return 0;
    }
  });

  const toggleSort = (key: InvSortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filteredRecurring = recurringInvoices.filter(ri => {
    if (!search) return true;
    const s = search.toLowerCase();
    return ri.title.toLowerCase().includes(s) || getClientName(ri.client_id).toLowerCase().includes(s);
  });

  if (loading) return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />)}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-[var(--bg-secondary)] rounded-[8px] skeleton-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricCard label="Outstanding" value={formatCurrency(totalOutstanding)} subtext={`${invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length} invoices`} color="amber" />
        <MetricCard label="Paid" value={formatCurrency(totalPaid)} subtext={`${invoices.filter(i => i.status === 'paid').length} invoices`} trend="up" color="green" />
        <MetricCard label="Overdue" value={formatCurrency(invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0))} subtext="needs attention" trend={invoices.filter(i => i.status === 'overdue').length > 0 ? 'down' : 'neutral'} color={invoices.filter(i => i.status === 'overdue').length > 0 ? 'red' : 'gray'} />
      </div>

      {/* Tab bar + search + sort */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] flex-1 min-w-0">
          <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${activeTab === 'all' ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}>All invoices</button>
          <button onClick={() => setActiveTab('recurring')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${activeTab === 'recurring' ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}>Recurring</button>
        </div>
        <div className="relative max-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter..." className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] bg-[var(--bg-secondary)]" />
        </div>
        {activeTab === 'all' && (
          <>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--text-tertiary)]">Sort:</span>
              {(['date', 'number', 'client', 'status', 'total'] as InvSortKey[]).map(k => (
                <button key={k} onClick={() => toggleSort(k)} className={`text-[10px] px-2 py-0.5 rounded-[4px] transition-colors capitalize ${sortKey === k ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-medium' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>{k}{sortKey === k && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}</button>
              ))}
            </div>
            <Button onClick={openNew} size="sm" disabled={clients.length === 0}><Plus size={14} />New Invoice</Button>
          </>
        )}
        {activeTab === 'recurring' && (
          <Button onClick={openNewRecurring} size="sm"><Plus size={14} />New recurring</Button>
        )}
      </div>

      {activeTab === 'all' ? (
        invoices.length === 0 ? (
          <Card className="text-center py-16 flex flex-col items-center">
            <Receipt size={40} className="text-[var(--text-tertiary)] mb-4" />
            <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">No invoices yet</h3>
            <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs mb-5">Create your first invoice to get paid.</p>
            <Button onClick={openNew} size="sm" variant="secondary">New Invoice</Button>
          </Card>
        ) : filteredInvoices.length === 0 && search ? (
          <Card className="text-center py-12"><p className="text-sm text-[var(--text-tertiary)]">No invoices match "{search}"</p></Card>
        ) : (
          <div className="space-y-2">
            {sortedInvoices.map((inv) => (
              <div key={inv.id} className={`flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border rounded-[8px] ${inv.status === 'overdue' ? 'border-l-[3px] border-l-[#A32D2D] border-[var(--border-color)]' : 'border-[var(--border-color)]'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{inv.invoice_number}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{getClientName(inv.client_id)}</span>
                    <Badge variant={statusBadge[inv.status]}>{inv.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
                    <span>{formatCurrency(inv.total)}</span>
                    {inv.due_date && <span>Due: {relativeDate(inv.due_date)}</span>}
                    {inv.paid_at && <span>Paid: {relativeDate(inv.paid_at)}</span>}
                    <span>{inv.line_items.length} item{inv.line_items.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {inv.status === 'draft' && <button onClick={() => handleMarkSent(inv)} className="text-[10px] text-[var(--accent)] hover:underline px-1">Mark Sent</button>}
                  {(inv.status === 'sent' || inv.status === 'overdue') && <button onClick={() => handleMarkPaid(inv)} className="text-[10px] text-[var(--accent)] hover:underline px-1">Mark Paid</button>}
                  <div className="relative" ref={exportDropdown === inv.id ? dropdownRef : undefined}>
                    <button onClick={() => setExportDropdown(exportDropdown === inv.id ? null : inv.id)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]" title="Export"><Download size={13} /></button>
                    {exportDropdown === inv.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[8px] shadow-lg py-1 z-10 w-28">
                        <button onClick={() => handleExportPDF(inv)} className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">PDF</button>
                        <button onClick={() => handleExportDOCX(inv)} className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">DOCX</button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => openEdit(inv)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]"><Pencil size={14} /></button>
                  <button onClick={() => setConfirmDelete({ id: inv.id, label: inv.invoice_number, type: 'invoice' })} className="p-1 text-[var(--text-tertiary)] hover:text-[#A32D2D] rounded-[8px]"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : recurringInvoices.length === 0 ? (
        <Card className="text-center py-12">
          <RotateCw size={32} className="text-[#D4D4D2] mx-auto mb-3" />
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">No recurring invoices</h3>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">Set up a recurring invoice for retainer clients or subscriptions.</p>
          <Button onClick={openNewRecurring} size="sm" variant="secondary"><Plus size={14} />New recurring</Button>
        </Card>
      ) : filteredRecurring.length === 0 && search ? (
        <Card className="text-center py-12"><p className="text-sm text-[var(--text-tertiary)]">No recurring invoices match "{search}"</p></Card>
      ) : (
        <div className="space-y-3">
          {filteredRecurring.map((ri) => (
            <Card key={ri.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">{ri.title}</h4>
                    <span className="text-xs text-[var(--text-secondary)]">— {getClientName(ri.client_id)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mb-1.5">
                    <span>{formatCurrency(ri.total)}/{ri.frequency === 'monthly' ? 'month' : ri.frequency === 'weekly' ? 'week' : ri.frequency === 'biweekly' ? '2 weeks' : 'quarter'}</span>
                    <span>Next: {relativeDate(ri.next_due)}</span>
                    {ri.last_generated && <span>Last: {relativeDate(ri.last_generated)}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggleActive(ri)} className={`w-2 h-2 rounded-full ${ri.active ? 'bg-[var(--accent)]' : 'bg-[#D4D4D2]'}`} title={ri.active ? 'Active — click to pause' : 'Paused — click to resume'} />
                    <span className={`text-[10px] ${ri.active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}>{ri.active ? 'Active' : 'Paused'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  <button onClick={() => openEditRecurring(ri)} className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"><Pencil size={14} /></button>
                  <button onClick={() => setConfirmDelete({ id: ri.id, label: ri.title, type: 'recurring' })} className="p-1.5 rounded-[8px] text-[var(--text-tertiary)] hover:text-[#A32D2D] hover:bg-[#FCEBEB]"><Trash2 size={14} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Invoice' : 'New Invoice'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Client *</label>
              <ClientSelect clients={clients} value={form.client_id} onChange={(clientId) => setForm({ ...form, client_id: clientId, project_id: '' })} placeholder="Select a client..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project (optional)</label>
              <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]">
                <option value="">None</option>
                {projects.filter(p => !form.client_id || p.client_id === form.client_id).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Invoice #</label>
              <input type="text" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Due Date</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          {!editing && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5"><Clock size={13} /> Import unbilled time</label>
                {selectedTimeIds.size > 0 && <button onClick={importSelectedTime} className="text-xs text-[var(--accent)] hover:underline">Import {selectedTimeIds.size} selected</button>}
              </div>
              {hourlyRate <= 0 ? (
                <p className="text-xs text-[#854F0B] bg-[#FAEEDA] px-3 py-2 rounded-[6px]">Set your hourly rate in profile to use time import.</p>
              ) : unbilledTime.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">No unbilled time entries to import.</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto border border-[var(--border-color)] rounded-[8px] p-1">
                  {unbilledTime.map((t) => {
                    const hours = (t.duration_minutes || 0) / 60;
                    const amount = Math.round(hours * hourlyRate * 100) / 100;
                    return (
                      <label key={t.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-[6px] cursor-pointer text-xs ${selectedTimeIds.has(t.id) ? 'bg-[var(--accent-bg)]' : 'hover:bg-[var(--bg-secondary)]'}`}>
                        <input type="checkbox" checked={selectedTimeIds.has(t.id)} onChange={() => toggleTimeSelection(t.id)} className="w-3.5 h-3.5 rounded border-[#D4D4D2] text-[var(--accent)]" />
                        <span className="flex-1 truncate">{t.description || 'No description'}</span>
                        <span className="text-[var(--text-secondary)] flex-shrink-0">{formatMinutes(t.duration_minutes || 0)}</span>
                        <span className="text-[var(--accent)] font-medium flex-shrink-0 w-16 text-right">{formatCurrency(amount)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Line Items</label>
              <button onClick={addItem} className="text-xs text-[var(--accent)] hover:underline">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Description" className="flex-1 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] focus:outline-none focus:border-[var(--accent)]" />
                  <input type="number" value={item.quantity || ''} onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} placeholder="Qty" className="w-16 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] focus:outline-none focus:border-[var(--accent)]" />
                  <input type="number" value={item.unit_price || ''} onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="Rate" className="w-24 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] focus:outline-none focus:border-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-secondary)] w-20 text-right font-medium tabular-nums">{formatCurrency(item.total)}</span>
                  <button onClick={() => removeItem(i)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[var(--border-color)] pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Subtotal</span><span className="text-[var(--text-primary)] font-medium">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Tax Rate (%)</span>
              <input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} placeholder="0" className="w-20 px-2 py-1 text-xs text-right border border-[var(--border-color)] rounded-[6px] focus:outline-none focus:border-[var(--accent)]" />
            </div>
            <div className="flex justify-between pt-1 border-t border-[var(--border-color)]"><span className="font-medium text-[var(--text-primary)]">Total</span><span className="font-semibold text-[var(--text-primary)]">{formatCurrency(total)}</span></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Invoice notes..." rows={2} className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} size="sm">Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.client_id} size="sm">{editing ? 'Save Changes' : 'Create Invoice'}</Button>
          </div>
        </div>
      </Modal>

      {/* Recurring Invoice Modal */}
      <Modal open={showRecurringModal} onClose={() => setShowRecurringModal(false)} title={editingRecurring ? 'Edit Recurring Invoice' : 'New Recurring Invoice'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Client *</label>
              <ClientSelect clients={clients} value={riForm.client_id} onChange={(clientId) => setRiForm({ ...riForm, client_id: clientId })} placeholder="Select a client..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Frequency</label>
              <select value={riForm.frequency} onChange={(e) => setRiForm({ ...riForm, frequency: e.target.value as RecurringInvoiceType['frequency'] })} className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Starts on</label>
              <input type="date" value={riForm.next_due} onChange={(e) => setRiForm({ ...riForm, next_due: e.target.value })} className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Title *</label>
            <input type="text" value={riForm.title} onChange={(e) => setRiForm({ ...riForm, title: e.target.value })} placeholder="e.g. Monthly retainer" className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Line Items</label>
              <button onClick={addRiItem} className="text-xs text-[var(--accent)] hover:underline">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {riItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={item.description} onChange={(e) => updateRiItem(i, 'description', e.target.value)} placeholder="Description" className="flex-1 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] focus:outline-none focus:border-[var(--accent)]" />
                  <input type="number" value={item.quantity || ''} onChange={(e) => updateRiItem(i, 'quantity', parseFloat(e.target.value) || 0)} placeholder="Qty" className="w-16 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] focus:outline-none focus:border-[var(--accent)]" />
                  <input type="number" value={item.unit_price || ''} onChange={(e) => updateRiItem(i, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="Rate" className="w-24 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] focus:outline-none focus:border-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-secondary)] w-20 text-right font-medium tabular-nums">{formatCurrency(item.total)}</span>
                  <button onClick={() => removeRiItem(i)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[var(--border-color)] pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Subtotal</span><span className="text-[var(--text-primary)] font-medium">{formatCurrency(riSubtotal)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Tax Rate (%)</span>
              <input type="number" value={riForm.tax_rate} onChange={(e) => setRiForm({ ...riForm, tax_rate: e.target.value })} placeholder="0" className="w-20 px-2 py-1 text-xs text-right border border-[var(--border-color)] rounded-[6px] focus:outline-none focus:border-[var(--accent)]" />
            </div>
            <div className="flex justify-between pt-1 border-t border-[var(--border-color)]"><span className="font-medium text-[var(--text-primary)]">Total</span><span className="font-semibold text-[var(--text-primary)]">{formatCurrency(riTotal)}</span></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea value={riForm.notes} onChange={(e) => setRiForm({ ...riForm, notes: e.target.value })} placeholder="Invoice notes..." rows={2} className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] resize-none focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowRecurringModal(false)} size="sm">Cancel</Button>
            <Button onClick={handleSaveRecurring} loading={saving} disabled={!riForm.title.trim() || !riForm.client_id} size="sm">{editingRecurring ? 'Save Changes' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Delete ${confirmDelete?.type === 'invoice' ? 'Invoice' : 'Recurring Invoice'}`}
        message={`Are you sure you want to delete "${confirmDelete?.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
