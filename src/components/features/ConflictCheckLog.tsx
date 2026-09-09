/**
 * Conflict Check Log · Legal feature.
 * List of conflict checks with result badges.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Shield, ShieldAlert, ShieldOff } from 'lucide-react';

type ConflictCheck = {
  id: string;
  client_id: string;
  party_name?: string;
  check_date?: string;
  result: string;
  notes?: string;
};

const RESULTS = ['clear', 'conflict', 'flagged'] as const;

const resultBadgeClasses: Record<string, string> = {
  clear: 'bg-[#16A34A]/15 text-[#16A34A]',
  conflict: 'bg-[#DC2626]/15 text-[#DC2626]',
  flagged: 'bg-[#D97706]/15 text-[#D97706]',
};

const ResultIcon: Record<string, typeof Shield> = {
  clear: Shield,
  conflict: ShieldOff,
  flagged: ShieldAlert,
};

export default function ConflictCheckLog({ clientId }: { clientId: string }) {
  const [checks, setChecks] = useState<ConflictCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ party_name: '', check_date: new Date().toISOString().split('T')[0], result: 'clear', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadChecks = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ConflictCheck & Record<string, unknown>)[]>(
        'SELECT id, client_id, party_name, check_date, result, notes FROM conflict_checks WHERE client_id = ? ORDER BY check_date DESC, id DESC',
        [clientId]
      );
      setChecks(rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        party_name: r.party_name as string | undefined,
        check_date: r.check_date as string | undefined,
        result: r.result as string,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[ConflictCheckLog] load failed:', e); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadChecks(); }, [clientId, loadChecks]);

  const handleAdd = async () => {
    if (!form.party_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO conflict_checks (id, client_id, party_name, check_date, result, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [id, clientId, form.party_name.trim(), form.check_date || null, form.result, form.notes.trim() || null]
      );
      const check: ConflictCheck = { id, client_id: clientId, party_name: form.party_name.trim(), check_date: form.check_date || undefined, result: form.result, notes: form.notes.trim() || undefined };
      setChecks(prev => [check, ...prev].sort((a, b) => (b.check_date || '').localeCompare(a.check_date || '')));
      setForm({ party_name: '', check_date: new Date().toISOString().split('T')[0], result: 'clear', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[ConflictCheckLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM conflict_checks WHERE id = ?', [id]);
      setChecks(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error('[ConflictCheckLog] delete failed:', e); }
  };

  const conflictCount = checks.filter(c => c.result === 'conflict').length;
  const flaggedCount = checks.filter(c => c.result === 'flagged').length;

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Conflict Checks</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Conflict Checks ({checks.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Run Check
        </Button>
      </div>

      {checks.length > 0 && (
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Shield size={11} className="text-[#16A34A]" />
            <span className="font-medium">{checks.filter(c => c.result === 'clear').length}</span> clear
          </span>
          {flaggedCount > 0 && (
            <span className="flex items-center gap-1 text-[#D97706]">
              <ShieldAlert size={11} />
              <span className="font-medium">{flaggedCount}</span> flagged
            </span>
          )}
          {conflictCount > 0 && (
            <span className="flex items-center gap-1 text-[#DC2626]">
              <ShieldOff size={11} />
              <span className="font-medium">{conflictCount}</span> conflict
            </span>
          )}
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Party name" value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.check_date} onChange={(e) => setForm({ ...form, check_date: e.target.value })} className={inputClass} />
            <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} className={inputClass}>
              {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.party_name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {checks.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No conflict checks yet. Add your first check.</p>
      ) : (
        <div className="space-y-1">
          {checks.map((check) => {
            const Icon = ResultIcon[check.result] || Shield;
            return (
              <div key={check.id} className={`flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs border-l-[3px] ${check.result === 'conflict' ? 'border-l-[#DC2626]' : check.result === 'flagged' ? 'border-l-[#D97706]' : 'border-l-[#16A34A]'}`}>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <Icon size={12} className={check.result === 'clear' ? 'text-[#16A34A]' : check.result === 'conflict' ? 'text-[#DC2626]' : 'text-[#D97706]'} />
                  <span className="font-medium text-[var(--text-primary)] truncate">{check.party_name || '--'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${resultBadgeClasses[check.result] || ''}`}>
                    {check.result}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-auto">{check.check_date || '--'}</span>
                </div>
                <button onClick={() => handleDelete(check.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
