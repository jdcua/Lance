import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Expense } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate, formatMonth } from '../utils/format';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToasts } from '../store/toastStore';
import { Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';

const categories = ['Software', 'Equipment', 'Office', 'Travel', 'Marketing', 'Taxes', 'Other'];

export default function Finance() {
  const { expenses, loadExpenses, addExpense, updateExpense, removeExpense, invoices, loadInvoices } = useStore();
  const addToast = useToasts((s) => s.add);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; description: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ category: 'Other', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadExpenses(), loadInvoices()])
      .catch(err => addToast(err?.toString?.() || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [loadExpenses, loadInvoices]);

  const openNew = () => {
    setEditing(null);
    setForm({ category: 'Other', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({ category: exp.category, description: exp.description, amount: exp.amount.toString(), date: exp.date });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      const data = {
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
      };
      if (editing) {
        await updateExpense({ ...editing, ...data });
      } else {
        await addExpense(data);
      }
      setShowModal(false);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to save expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await removeExpense(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      addToast(err?.toString?.() || 'Failed to delete expense', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  const totalOutstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + i.total, 0);
  const profit = totalPaid - totalExpenses;

  const expensesByCategory = categories.map((cat) => {
    const total = expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return { category: cat, total };
  }).filter((c) => c.total > 0);

  const monthlyExpenses: Record<string, number> = {};
  expenses.forEach((e) => {
    const month = e.date.substring(0, 7);
    monthlyExpenses[month] = (monthlyExpenses[month] || 0) + e.amount;
  });

  const monthlyPaid: Record<string, number> = {};
  invoices.filter((i) => i.status === 'paid' && i.paid_at).forEach((i) => {
    const month = i.paid_at!.substring(0, 7);
    monthlyPaid[month] = (monthlyPaid[month] || 0) + i.total;
  });

  const allMonths = Array.from(new Set([...Object.keys(monthlyExpenses), ...Object.keys(monthlyPaid)])).sort().reverse().slice(0, 12);

  if (loading) return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />)}
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
        <div className="h-48 rounded-[12px] bg-[var(--bg-secondary)] skeleton-pulse" />
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-3 mb-6">
        <MetricCard label="Revenue (Paid)" value={formatCurrency(totalPaid)} color="green" />
        <MetricCard label="Expenses" value={formatCurrency(totalExpenses)} color="red" />
        <MetricCard
          label="Profit"
          value={formatCurrency(profit)}
          trend={profit >= 0 ? 'up' : 'down'}
          subtext={profit >= 0 ? 'positive' : 'negative'}
          color={profit >= 0 ? 'green' : 'red'}
        />
        <MetricCard label="Outstanding" value={formatCurrency(totalOutstanding)} subtext="unpaid invoices" color="amber" />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Monthly Overview</h3>
          {allMonths.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)]">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {allMonths.map((month) => {
                const expense = monthlyExpenses[month] || 0;
                const income = monthlyPaid[month] || 0;
                const net = income - expense;
                return (
                  <div key={month} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{formatMonth(month)}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-[var(--accent)]">+{formatCurrency(income)}</span>
                      <span className="text-[#A32D2D]">-{formatCurrency(expense)}</span>
                      <span className={`font-medium ${net >= 0 ? 'text-[var(--accent)]' : 'text-[#A32D2D]'}`}>
                        {formatCurrency(net)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Expenses by Category</h3>
          {expensesByCategory.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)]">No expenses recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {expensesByCategory.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                    <span className="text-xs text-[var(--text-primary)]">{cat.category}</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Expenses</h3>
        <Button onClick={openNew} size="sm">
          <Plus size={14} />
          Add Expense
        </Button>
      </div>

      {expenses.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <BarChart3 size={40} className="text-[var(--text-tertiary)] mb-4" />
          <h3 className="text-[15px] font-medium text-[var(--text-secondary)] mb-1.5">No expenses yet</h3>
          <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs mb-5">Add an expense or mark an invoice paid to see your numbers.</p>
          <Button onClick={openNew} size="sm" variant="secondary">Add Expense</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => (
            <div key={exp.id} className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[8px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{exp.description}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">&mdash;</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">{exp.category}</span>
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)]">{formatDate(exp.date)}</span>
              </div>
              <span className="text-xs font-medium text-[#A32D2D] flex-shrink-0">-{formatCurrency(exp.amount)}</span>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button onClick={() => openEdit(exp)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-[8px]">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setConfirmDelete({ id: exp.id, description: exp.description })} className="p-1 text-[var(--text-tertiary)] hover:text-[#A32D2D] rounded-[8px]">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Expense' : 'Add Expense'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description *</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What was this expense for?"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Amount *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} size="sm">Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.description.trim() || !form.amount} size="sm">
              {editing ? 'Save Changes' : 'Add Expense'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete "${confirmDelete?.description}"? This cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
