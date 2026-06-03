import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Expense } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../utils/format';
import { Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';

const categories = ['Software', 'Equipment', 'Office', 'Travel', 'Marketing', 'Taxes', 'Other'];

export default function Finance() {
  const { expenses, loadExpenses, addExpense, updateExpense, removeExpense, invoices, loadInvoices } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: 'Other', description: '', amount: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    loadExpenses();
    loadInvoices();
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
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this expense?')) {
      await removeExpense(id);
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

  return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Revenue (Paid)" value={formatCurrency(totalPaid)} />
        <MetricCard label="Expenses" value={formatCurrency(totalExpenses)} />
        <MetricCard
          label="Profit"
          value={formatCurrency(profit)}
          trend={profit >= 0 ? 'up' : 'down'}
          subtext={profit >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard label="Outstanding" value={formatCurrency(totalOutstanding)} subtext="unpaid invoices" />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-[#1C1C1A] mb-3">Monthly Overview</h3>
          {allMonths.length === 0 ? (
            <p className="text-xs text-[#A3A39E]">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {allMonths.map((month) => {
                const expense = monthlyExpenses[month] || 0;
                const income = monthlyPaid[month] || 0;
                const net = income - expense;
                return (
                  <div key={month} className="flex items-center justify-between text-xs">
                    <span className="text-[#6B6B67]">{month}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-[#1D9E75]">+{formatCurrency(income)}</span>
                      <span className="text-[#A32D2D]">-{formatCurrency(expense)}</span>
                      <span className={`font-medium ${net >= 0 ? 'text-[#1D9E75]' : 'text-[#A32D2D]'}`}>
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
          <h3 className="text-sm font-semibold text-[#1C1C1A] mb-3">Expenses by Category</h3>
          {expensesByCategory.length === 0 ? (
            <p className="text-xs text-[#A3A39E]">No expenses recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {expensesByCategory.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#1D9E75]" />
                    <span className="text-xs text-[#1C1C1A]">{cat.category}</span>
                  </div>
                  <span className="text-xs font-medium text-[#1C1C1A]">{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#1C1C1A]">Expenses</h3>
        <Button onClick={openNew} size="sm">
          <Plus size={14} />
          Add Expense
        </Button>
      </div>

      {expenses.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <BarChart3 size={40} className="text-[#A3A39E] mb-4" />
          <h3 className="text-[15px] font-medium text-[#6B6B67] mb-1.5">No expenses yet</h3>
          <p className="text-[13px] text-[#A3A39E] max-w-xs mb-5">Add an expense or mark an invoice paid to see your numbers.</p>
          <Button onClick={openNew} size="sm" variant="secondary">Add Expense</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => (
            <div key={exp.id} className="flex items-center gap-3 px-4 py-2.5 bg-white border border-[#E5E5E3] rounded-[8px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-[#1C1C1A]">{exp.description}</span>
                  <span className="text-[10px] text-[#A3A39E]">&mdash;</span>
                  <span className="text-[10px] text-[#6B6B67]">{exp.category}</span>
                </div>
                <span className="text-[10px] text-[#A3A39E]">{formatDate(exp.date)}</span>
              </div>
              <span className="text-xs font-medium text-[#A32D2D] flex-shrink-0">-{formatCurrency(exp.amount)}</span>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button onClick={() => openEdit(exp)} className="p-1 text-[#A3A39E] hover:text-[#1C1C1A] rounded-[8px]">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(exp.id)} className="p-1 text-[#A3A39E] hover:text-[#A32D2D] rounded-[8px]">
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
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Description *</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What was this expense for?"
              className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75]"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Amount *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] placeholder:text-[#A3A39E] focus:outline-none focus:border-[#1D9E75]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E5E3] rounded-[8px] focus:outline-none focus:border-[#1D9E75]"
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
    </div>
  );
}
