/**
 * Smart Contract Registry · Blockchain feature.
 * List of deployed contracts with clickable address.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ExternalLink } from 'lucide-react';

type Contract = {
  id: string;
  project_id: string;
  name?: string;
  network?: string;
  address?: string;
  status?: string;
  audit_date?: string;
  notes?: string;
};

const NETWORKS = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche', 'solana', 'other'] as const;
const STATUSES = ['active', 'paused', 'deprecated', 'auditing'] as const;

const statusBadgeClasses: Record<string, string> = {
  active: 'bg-[#16A34A]/15 text-[#16A34A]',
  paused: 'bg-[#D97706]/15 text-[#D97706]',
  deprecated: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
  auditing: 'bg-[#2563EB]/15 text-[#2563EB]',
};

export default function SmartContractRegistry({ projectId }: { projectId: string }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', network: 'ethereum', address: '', status: 'active', audit_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadContracts = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Contract & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, network, address, status, audit_date, notes FROM smart_contracts WHERE project_id = ? ORDER BY name ASC',
        [projectId]
      );
      setContracts(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        name: r.name as string | undefined,
        network: r.network as string | undefined,
        address: r.address as string | undefined,
        status: r.status as string | undefined,
        audit_date: r.audit_date as string | undefined,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[SmartContractRegistry] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadContracts(); }, [projectId, loadContracts]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO smart_contracts (id, project_id, name, network, address, status, audit_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.name.trim(), form.network, form.address.trim() || null, form.status, form.audit_date || null, form.notes.trim() || null]
      );
      const contract: Contract = { id, project_id: projectId, name: form.name.trim(), network: form.network, address: form.address.trim() || undefined, status: form.status, audit_date: form.audit_date || undefined, notes: form.notes.trim() || undefined };
      setContracts(prev => [...prev, contract].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setForm({ name: '', network: 'ethereum', address: '', status: 'active', audit_date: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[SmartContractRegistry] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM smart_contracts WHERE id = ?', [id]);
      setContracts(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error('[SmartContractRegistry] delete failed:', e); }
  };

  const handleAddressClick = (address?: string) => {
    if (!address) return;
    const url = address.startsWith('http') ? address : `https://etherscan.io/address/${address}`;
    window.open(url, '_blank');
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Smart Contracts</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Smart Contracts ({contracts.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Contract
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Contract name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} className={inputClass}>
              {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Contract address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.audit_date} onChange={(e) => setForm({ ...form, audit_date: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {contracts.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No smart contracts registered yet. Add your first contract.</p>
      ) : (
        <div className="space-y-1">
          {contracts.map((contract) => (
            <div key={contract.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)] truncate">{contract.name || '--'}</span>
                {contract.network && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)] flex-shrink-0">{contract.network}</span>
                )}
                {contract.status && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${statusBadgeClasses[contract.status] || ''}`}>{contract.status}</span>
                )}
                {contract.address && (
                  <button
                    onClick={() => handleAddressClick(contract.address)}
                    className="text-[var(--accent)] hover:underline flex items-center gap-0.5 truncate max-w-[160px] flex-shrink ml-auto"
                    title={contract.address}
                  >
                    <span className="truncate">{contract.address.slice(0, 10)}...{contract.address.slice(-6)}</span>
                    <ExternalLink size={10} className="flex-shrink-0" />
                  </button>
                )}
              </div>
              <button onClick={() => handleDelete(contract.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
