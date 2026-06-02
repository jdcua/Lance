import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import type { Invoice, LineItem } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import MetricCard from '../components/ui/MetricCard';
import { exportInvoicePDF, exportInvoiceDOCX } from '../export';
import { formatCurrency } from '../utils/format';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'warning',
  sent: 'info',
  paid: 'success',
  overdue: 'danger',
};

export default function Invoices() {
  const { invoices, loadInvoices, clients, loadClients, addInvoice, updateInvoice, removeInvoice, profile, loadProfile } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportDropdown, setExportDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({
    client_id: '',
    invoice_number: '',
    due_date: '',
    notes: '',
    tax_rate: '',
    status: 'draft' as Invoice['status'],
  });
  const [items, setItems] = useState<Omit<LineItem, 'id'>[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 },
  ]);

  useEffect(() => {
    loadInvoices();
    loadClients();
    loadProfile();
  }, [loadInvoices, loadClients, loadProfile]);

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

  const openNew = () => {
    setEditing(null);
    setForm({
      client_id: '',
      invoice_number: `INV-${String(invoices.length + 1).padStart(4, '0')}`,
      due_date: '',
      notes: '',
      tax_rate: '',
      status: 'draft',
    });
    setItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
    setShowModal(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      client_id: inv.client_id,
      invoice_number: inv.invoice_number,
      due_date: inv.due_date || '',
      notes: inv.notes || '',
      tax_rate: inv.tax_rate?.toString() || '',
      status: inv.status,
    });
    setItems(inv.line_items.map((li) => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price, total: li.total })));
    setShowModal(true);
  };

  const updateItem = (index: number, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const newItem = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        newItem.total = newItem.quantity * newItem.unit_price;
      }
      return newItem;
    });
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const taxRate = form.tax_rate ? parseFloat(form.tax_rate) : 0;
  const total = subtotal + subtotal * (taxRate / 100);

  const handleSave = async () => {
    if (!form.client_id) return;
    setSaving(true);
    try {
      const lineItems: LineItem[] = items.map((i) => ({
        ...i,
        id: crypto.randomUUID(),
      }));
      const invoiceData = {
        client_id: form.client_id,
        invoice_number: form.invoice_number,
        status: form.status,
        line_items: lineItems,
        subtotal,
        tax_rate: taxRate || undefined,
        total,
        due_date: form.due_date || undefined,
        notes: form.notes || undefined,
      };
      if (editing) {
        await updateInvoice({ ...editing, ...invoiceData });
      } else {
        await addInvoice(invoiceData);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this invoice?')) {
      await removeInvoice(id);
    }
  };

  const handleMarkPaid = async (inv: Invoice) => {
    await updateInvoice({ ...inv, status: 'paid' as const });
  };

  const handleMarkSent = async (inv: Invoice) => {
    await updateInvoice({ ...inv, status: 'sent' as const });
  };

  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);
  const getClientName = (clientId: string) => getClient(clientId)?.name || 'Unknown';

  const handleExportPDF = (inv: Invoice) => {
    const client = getClient(inv.client_id);
    if (client && profile) {
      exportInvoicePDF(inv, client, profile);
    }
    setExportDropdown(null);
  };

  const handleExportDOCX = (inv: Invoice) => {
    const client = getClient(inv.client_id);
    if (client && profile) {
      exportInvoiceDOCX(inv, client, profile);
    }
    setExportDropdown(null);
  };

  const totalOutstanding = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.total, 0);

  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard label="Outstanding" value={formatCurrency(totalOutstanding)} subtext={`${invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').length} invoices`} />
        <MetricCard label="Paid" value={formatCurrency(totalPaid)} subtext={`${invoices.filter((i) => i.status === 'paid').length} invoices`} trend="up" />
        <MetricCard label="Overdue" value={formatCurrency(invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total, 0))} subtext="needs attention" trend={invoices.filter((i) => i.status === 'overdue').length > 0 ? 'down' : 'neutral'} />
      </div>

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-[#1C1C1A]">All Invoices</h3>
        <Button onClick={openNew} size="sm" disabled={clients.length === 0}>
          <Plus size={14} />
          New Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card className="text-center py-12">
          <h3 className="text-sm font-medium text-[#6B6B67] mb-1">No invoices yet</h3>
          <p className="text-xs text-[#A3A39E] mb-4">Create your first invoice to get paid.</p>
          <Button onClick={openNew} size="sm" variant="secondary" disabled={clients.length === 0}>
            <Plus size={14} />
            New Invoice
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-[#E5E5E3] rounded-[8px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-[#1C1C1A]">{inv.invoice_number}</span>
                  <span className="text-xs text-[#6B6B67]">{getClientName(inv.client_id)}</span>
                  <Badge variant={statusBadge[inv.status]}>{inv.status}</Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#A3A39E]">
                  <span>{formatCurrency(inv.total)}</span>
                  {inv.due_date && <span>Due: {new Date(inv.due_date).toLocaleDateString()}</span>}
                  {inv.paid_at && <span>Paid: {new Date(inv.paid_at).toLocaleDateString()}</span>}
                  <span>{inv.line_items.length} item{inv.line_items.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {inv.status === 'draft' && (
                  <button onClick={() => handleMarkSent(inv)} className="text-[10px] text-[#1D9E75] hover:underline px-1">
                    Mark Sent
                  </button>
                )}
                {(inv.status === 'sent' || inv.status === 'overdue') && (
                  <button onClick={() => handleMarkPaid(inv)} className="text-[10px] text-[#1D9E75] hover:underline px-1">
                    Mark Paid
                  </button>
                )}
                <div className="relative" ref={exportDropdown === inv.id ? dropdownRef : undefined}>
                  <button
                    onClick={() => setExportDropdown(exportDropdown === inv.id ? null : inv.id)}
                    className="p-1 text-[#A3A39E] hover:text-[#1C1C1A] hover:bg-[#F2F2F0] rounded-[8px]"
                    title="Export"
                  >
                    <Download size={13} />
                  </button>
                  {exportDropdown === inv.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-[#E5E5E3] rounded-[8px] shadow-lg py-1 z-10 w-28">
                      <button
                        onClick={() => handleExportPDF(inv)}
                        className="w-full text-left px-3 py-1.5 text-xs text-[#1C1C1A] hover:bg-[#F2F2F0] transition-colors"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleExportDOCX(inv)}
                        className="w-full text-left px-3 py-1.5 text-xs text-[#1C1C1A] hover:bg-[#F2F2F0] transition-colors"
                      >
                        DOCX
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => openEdit(inv)} className="p-1 text-[#A3A39E] hover:text-[#1C1C1A] hover:bg-[#F2F2F0] rounded-[8px]">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(inv.id)} className="p-1 text-[#A3A39E] hover:text-[#A32D2D] rounded-[8px]">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Invoice' : 'New Invoice'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Client *</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75]"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Invoice #</label>
              <input
                type="text"
                value={form.invoice_number}
                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[#6B6B67]">Line Items</label>
              <button onClick={addItem} className="text-xs text-[#1D9E75] hover:underline">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 px-2 py-1.5 text-xs border border-[#E5E5E3] rounded-[6px] focus:outline-none focus:border-[#1D9E75]"
                  />
                  <input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                    placeholder="Qty"
                    className="w-16 px-2 py-1.5 text-xs border border-[#E5E5E3] rounded-[6px] focus:outline-none focus:border-[#1D9E75]"
                  />
                  <input
                    type="number"
                    value={item.unit_price || ''}
                    onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    placeholder="Rate"
                    className="w-24 px-2 py-1.5 text-xs border border-[#E5E5E3] rounded-[6px] focus:outline-none focus:border-[#1D9E75]"
                  />
                  <span className="text-xs text-[#6B6B67] w-20 text-right">{formatCurrency(item.total)}</span>
                  <button onClick={() => removeItem(i)} className="text-[#A3A39E] hover:text-[#A32D2D]">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E5E5E3] pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[#6B6B67]">Subtotal</span><span className="text-[#1C1C1A] font-medium">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-[#6B6B67]">Tax Rate (%)</span>
              <input
                type="number"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
                placeholder="0"
                className="w-20 px-2 py-1 text-xs text-right border border-[#E5E5E3] rounded-[6px] focus:outline-none focus:border-[#1D9E75]"
              />
            </div>
            <div className="flex justify-between pt-1 border-t border-[#E5E5E3]">
              <span className="font-medium text-[#1C1C1A]">Total</span>
              <span className="font-semibold text-[#1C1C1A]">{formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Invoice notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} size="sm">Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.client_id} size="sm">
              {editing ? 'Save Changes' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
