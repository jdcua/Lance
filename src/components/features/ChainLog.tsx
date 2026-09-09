/**
 * Chain Log · Blockchain feature.
 * Simple event log, most recent first.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Link2 } from 'lucide-react';

type ChainEvent = {
  id: string;
  project_id: string;
  chain_name?: string;
  event_type?: string;
  tx_hash?: string;
  block_number?: string;
  notes?: string;
  created_at?: string;
};

export default function ChainLog({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ chain_name: '', event_type: '', tx_hash: '', block_number: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadEvents = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ChainEvent & Record<string, unknown>)[]>(
        'SELECT id, project_id, chain_name, event_type, tx_hash, block_number, notes, created_at FROM chain_logs WHERE project_id = ? ORDER BY created_at DESC',
        [projectId]
      );
      setEvents(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        chain_name: r.chain_name as string | undefined,
        event_type: r.event_type as string | undefined,
        tx_hash: r.tx_hash as string | undefined,
        block_number: r.block_number as string | undefined,
        notes: r.notes as string | undefined,
        created_at: r.created_at as string | undefined,
      })));
    } catch (e) { console.error('[ChainLog] load failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadEvents(); }, [projectId]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const createdAt = new Date().toISOString();
      await db.execute(
        'INSERT INTO chain_logs (id, project_id, chain_name, event_type, tx_hash, block_number, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.chain_name.trim() || null, form.event_type.trim() || null, form.tx_hash.trim() || null, form.block_number.trim() || null, form.notes.trim() || null, createdAt]
      );
      const event: ChainEvent = { id, project_id: projectId, chain_name: form.chain_name.trim() || undefined, event_type: form.event_type.trim() || undefined, tx_hash: form.tx_hash.trim() || undefined, block_number: form.block_number.trim() || undefined, notes: form.notes.trim() || undefined, created_at: createdAt };
      setEvents(prev => [event, ...prev]);
      setForm({ chain_name: '', event_type: '', tx_hash: '', block_number: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[ChainLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM chain_logs WHERE id = ?', [id]);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error('[ChainLog] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Chain Log</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Chain Log ({events.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Event
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Chain name" value={form.chain_name} onChange={(e) => setForm({ ...form, chain_name: e.target.value })} className={inputClass} autoFocus />
            <input type="text" placeholder="Event type" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="TX hash" value={form.tx_hash} onChange={(e) => setForm({ ...form, tx_hash: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Block number" value={form.block_number} onChange={(e) => setForm({ ...form, block_number: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>Add</Button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No chain events logged yet. Add your first event.</p>
      ) : (
        <div className="space-y-1">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Link2 size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                {event.chain_name && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)] flex-shrink-0">{event.chain_name}</span>
                )}
                {event.event_type && (
                  <span className="font-medium text-[var(--text-primary)]">{event.event_type}</span>
                )}
                {event.tx_hash && (
                  <span className="text-[10px] text-[var(--accent)] truncate max-w-[120px] flex-shrink" title={event.tx_hash}>
                    {event.tx_hash.slice(0, 8)}...
                  </span>
                )}
                {event.block_number && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-auto">#{event.block_number}</span>
                )}
              </div>
              <button onClick={() => handleDelete(event.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
