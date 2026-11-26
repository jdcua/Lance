/**
 * Placement Log · Recruiter feature.
 * Track placements with candidate name, role, company, fee, and status.
 * Shows total fees at top.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, DollarSign, Briefcase } from 'lucide-react';

type Placement = {
  id: string;
  client_id: string;
  candidate_name: string;
  role: string;
  company: string;
  start_date: string;
  fee: number;
  status: string;
};

const STATUS_OPTIONS = ['placed', 'pending', 'failed'] as const;

const statusBadgeClasses: Record<string, string> = {
  placed: 'bg-[#16A34A]/15 text-[#16A34A]',
  pending: 'bg-[#D97706]/15 text-[#D97706]',
  failed: 'bg-[#DC2626]/15 text-[#DC2626]',
};

export default function PlacementLog({ clientId }: { clientId: string }) {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    candidate_name: '',
    role: '',
    company: '',
    start_date: '',
    fee: '',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  const loadPlacements = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Placement & Record<string, unknown>)[]>(
        'SELECT * FROM placements WHERE client_id = ? ORDER BY start_date DESC',
        [clientId],
      );
      setPlacements(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          candidate_name: r.candidate_name as string,
          role: r.role as string,
          company: r.company as string,
          start_date: r.start_date as string,
          fee: r.fee as number,
          status: r.status as string,
        })),
      );
    } catch (e) {
      console.error('[PlacementLog] loadPlacements failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadPlacements();
  }, [clientId, loadPlacements]);

  const handleAdd = async () => {
    if (!form.candidate_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const fee = parseFloat(form.fee) || 0;
      await db.execute(
        'INSERT INTO placements (id, client_id, candidate_name, role, company, start_date, fee, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.candidate_name.trim(),
          form.role.trim() || null,
          form.company.trim() || null,
          form.start_date || null,
          fee,
          form.status,
        ],
      );
      const item: Placement = {
        id,
        client_id: clientId,
        candidate_name: form.candidate_name.trim(),
        role: form.role.trim() || '',
        company: form.company.trim() || '',
        start_date: form.start_date || '',
        fee,
        status: form.status,
      };
      setPlacements((prev) => [item, ...prev]);
      setForm({
        candidate_name: '',
        role: '',
        company: '',
        start_date: '',
        fee: '',
        status: 'pending',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[PlacementLog] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM placements WHERE id = ?', [id]);
      setPlacements((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('[PlacementLog] delete failed:', e);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE placements SET status = ? WHERE id = ?', [status, id]);
      setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    } catch (e) {
      console.error('[PlacementLog] status update failed:', e);
    }
  };

  const totalFees = placements.reduce((sum, p) => sum + (p.fee || 0), 0);
  const placedCount = placements.filter((p) => p.status === 'placed').length;
  const pendingCount = placements.filter((p) => p.status === 'pending').length;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';
  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Placements</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Placements ({placements.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Placement
        </Button>
      </div>

      {placements.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 glass border border-[var(--border-color)] rounded-xs text-xs">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Briefcase size={12} className="text-[var(--accent-ink,var(--accent))]" />
            <span>
              {placedCount} placed · {pendingCount} pending
            </span>
          </div>
          <div className="h-4 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
            <DollarSign size={12} className="text-[#16A34A]" />
            <span>${totalFees.toLocaleString()} total fees</span>
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Candidate name"
            value={form.candidate_name}
            onChange={(e) => setForm({ ...form, candidate_name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Fee ($)"
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value })}
              className={inputClass}
              step="0.01"
            />
          </div>
          <select
            aria-label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              loading={saving}
              disabled={!form.candidate_name.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {placements.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No placements logged yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">
                  Candidate
                </th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">
                  Role
                </th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">
                  Company
                </th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">
                  Start
                </th>
                <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">
                  Fee
                </th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)]">
                  Status
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {placements.map((placement) => (
                <tr
                  key={placement.id}
                  className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)]"
                >
                  <td className="py-1.5 px-2 font-medium text-[var(--text-primary)]">
                    {placement.candidate_name}
                  </td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)]">
                    {placement.role || '--'}
                  </td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)]">
                    {placement.company || '--'}
                  </td>
                  <td className="py-1.5 px-2 text-[var(--text-tertiary)]">
                    {placement.start_date || '--'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-medium text-[var(--text-primary)]">
                    ${(placement.fee || 0).toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2">
                    <select
                      aria-label="Placement.status"
                      value={placement.status}
                      onChange={(e) => handleStatusChange(placement.id, e.target.value)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border-none cursor-pointer ${statusBadgeClasses[placement.status] || ''}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-2">
                    <button
                      aria-label="Delete placement log"
                      onClick={() => handleDelete(placement.id)}
                      className="text-[var(--text-tertiary)] hover:text-[#A32D2D]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
