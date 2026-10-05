/**
 * Commission Queue · Illustrator feature.
 * Ordered commission list with status tracking, payment status, and reordering.
 */
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';

type Commission = {
  id: string;
  client_id: string;
  title: string;
  brief?: string;
  deadline?: string;
  payment_status: string;
  sort_order: number;
  status: string;
};

export default function CommissionQueue({ clientId }: { clientId?: string }) {
  const { clients, loadClients } = useStore();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_id: clientId || '',
    title: '',
    brief: '',
    deadline: '',
    payment_status: 'unpaid',
    status: 'queued',
  });
  const [saving, setSaving] = useState(false);

  const loadCommissions = useCallback(async () => {
    try {
      const db = await getDb();
      let rows: (Commission & Record<string, unknown>)[];
      if (clientId) {
        rows = await db.select<(Commission & Record<string, unknown>)[]>(
          'SELECT id, client_id, title, brief, deadline, payment_status, sort_order, status FROM commissions WHERE client_id = ? ORDER BY sort_order ASC, id ASC',
          [clientId]
        );
      } else {
        rows = await db.select<(Commission & Record<string, unknown>)[]>(
          'SELECT id, client_id, title, brief, deadline, payment_status, sort_order, status FROM commissions ORDER BY client_id ASC, sort_order ASC, id ASC'
        );
      }
      setCommissions(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          title: r.title as string,
          brief: r.brief as string | undefined,
          deadline: r.deadline as string | undefined,
          payment_status: r.payment_status as string,
          sort_order: r.sort_order as number,
          status: r.status as string,
        }))
      );
    } catch (e) {
      console.error('[CommissionQueue] loadCommissions failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadCommissions();
    loadClients();
  }, [clientId, loadClients, loadCommissions]);

  const sorted = [...commissions];
  const maxSort = sorted.length > 0 ? Math.max(...sorted.map((c) => c.sort_order)) : 0;

  const handleSave = async () => {
    if (!form.title.trim() || !form.client_id) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const sortOrder = maxSort + 1;
      const db = await getDb();
      await db.execute(
        'INSERT INTO commissions (id, client_id, title, brief, deadline, payment_status, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          form.client_id,
          form.title.trim(),
          form.brief || null,
          form.deadline || null,
          form.payment_status,
          sortOrder,
          form.status,
        ]
      );
      const item: Commission = {
        id,
        client_id: form.client_id,
        title: form.title.trim(),
        brief: form.brief || undefined,
        deadline: form.deadline || undefined,
        payment_status: form.payment_status,
        sort_order: sortOrder,
        status: form.status,
      };
      setCommissions((prev) => {
        const next = [...prev, item];
        next.sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
        return next;
      });
      setForm({
        client_id: clientId || '',
        title: '',
        brief: '',
        deadline: '',
        payment_status: 'unpaid',
        status: 'queued',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[CommissionQueue] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM commissions WHERE id = ?', [id]);
      setCommissions((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('[CommissionQueue] handleDelete failed:', e);
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const a = sorted[index];
    const b = sorted[targetIndex];
    try {
      const db = await getDb();
      await db.execute('UPDATE commissions SET sort_order = ? WHERE id = ?', [b.sort_order, a.id]);
      await db.execute('UPDATE commissions SET sort_order = ? WHERE id = ?', [a.sort_order, b.id]);
      setCommissions((prev) => {
        const next = prev.map((c) => {
          if (c.id === a.id) return { ...c, sort_order: b.sort_order };
          if (c.id === b.id) return { ...c, sort_order: a.sort_order };
          return c;
        });
        next.sort((x, y) => x.sort_order - y.sort_order || x.id.localeCompare(y.id));
        return next;
      });
    } catch (e) {
      console.error('[CommissionQueue] handleReorder failed:', e);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      queued: 'bg-[#3498DB]/20 text-[#3498DB]',
      in_progress: 'bg-amber-500/20 text-amber-500',
      revision: 'bg-[#9B59B6]/20 text-[#9B59B6]',
      delivered: 'bg-[#2ECC71]/20 text-[#2ECC71]',
    };
    return (
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          colors[status] || 'bg-[var(--border-color)] text-[var(--text-tertiary)]'
        }`}
      >
        {status.replace('_', ' ')}
      </span>
    );
  };

  const paymentBadge = (status: string) => {
    const colors: Record<string, string> = {
      unpaid: 'bg-[#E74C3C]/20 text-[#E74C3C]',
      deposit: 'bg-amber-500/20 text-amber-500',
      paid: 'bg-[#2ECC71]/20 text-[#2ECC71]',
    };
    return (
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          colors[status] || 'bg-[var(--border-color)] text-[var(--text-tertiary)]'
        }`}
      >
        {status}
      </span>
    );
  };

  const getClientName = (cId: string) => clients.find((cl) => cl.id === cId)?.name || cId;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Commission Queue
          </h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Queue ({sorted.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Commission
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          {!clientId && (
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className={inputClass}
              autoFocus
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="Commission title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus={!!clientId}
          />
          <textarea
            placeholder="Brief / description"
            value={form.brief}
            onChange={(e) => setForm({ ...form, brief: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className={inputClass}
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
            >
              <option value="queued">Queued</option>
              <option value="in_progress">In Progress</option>
              <option value="revision">Revision</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <select
            value={form.payment_status}
            onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
            className={inputClass}
          >
            <option value="unpaid">Unpaid</option>
            <option value="deposit">Deposit</option>
            <option value="paid">Paid</option>
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.title.trim() || (!clientId && !form.client_id)}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No commissions yet. Add your first commission.
        </p>
      ) : (
        <div className="space-y-1">
          {sorted.map((c, i) => (
            <div key={c.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)] w-4 text-right">
                    {i + 1}
                  </span>
                  <button aria-label="Next"
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronRight
                      size={10}
                      className={`transition-transform ${expanded === c.id ? 'rotate-90' : ''}`}
                    />
                  </button>
                  <span className="font-medium text-[var(--text-primary)] truncate">{c.title}</span>
                  {!clientId && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {getClientName(c.client_id)}
                    </span>
                  )}
                  {statusBadge(c.status)}
                  {paymentBadge(c.payment_status)}
                  {c.deadline && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {new Date(c.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 ml-2">
                  <button aria-label="Move up"
                    onClick={() => handleReorder(i, 'up')}
                    disabled={i === 0}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button aria-label="Move down"
                    onClick={() => handleReorder(i, 'down')}
                    disabled={i === sorted.length - 1}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    <ChevronDown size={12} />
                  </button>
                  <button aria-label="Delete commission queue"
                    onClick={() => handleDelete(c.id)}
                    className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {expanded === c.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-[6px] text-xs space-y-1">
                  {c.brief && <p className="text-[var(--text-secondary)]">{c.brief}</p>}
                  {c.deadline && (
                    <p className="text-[var(--text-tertiary)]">
                      Deadline: {new Date(c.deadline).toLocaleDateString()}
                    </p>
                  )}
                  {!c.brief && !c.deadline && (
                    <p className="text-[var(--text-tertiary)] italic">No additional details.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
