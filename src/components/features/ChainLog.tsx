/**
 * Chain Log · Blockchain feature.
 * Simple event log, most recent first.
 *
 * Rebuilt on the generic RecordTracker (src/components/ui/RecordTracker.tsx)
 * instead of hand-rolled CRUD — one fix behind every tracker of this shape.
 */
import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../db';
import RecordTracker from '../ui/RecordTracker';
import { Link2 } from 'lucide-react';

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

  const load = useCallback(async () => {
    const db = await getDb();
    const rows = await db.select<ChainEvent[]>(
      'SELECT id, project_id, chain_name, event_type, tx_hash, block_number, notes, created_at FROM chain_logs WHERE project_id = ? ORDER BY created_at DESC',
      [projectId],
    );
    setEvents(rows);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (data: Partial<ChainEvent>) => {
    const item: ChainEvent = {
      id: crypto.randomUUID(),
      project_id: projectId,
      chain_name: data.chain_name as string | undefined,
      event_type: data.event_type as string | undefined,
      tx_hash: data.tx_hash as string | undefined,
      block_number: data.block_number as string | undefined,
      notes: data.notes as string | undefined,
      created_at: new Date().toISOString(),
    };
    const db = await getDb();
    await db.execute(
      'INSERT INTO chain_logs (id, project_id, chain_name, event_type, tx_hash, block_number, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        item.id,
        projectId,
        item.chain_name || null,
        item.event_type || null,
        item.tx_hash || null,
        item.block_number || null,
        item.notes || null,
        item.created_at,
      ],
    );
    setEvents((prev) => [item, ...prev]);
    return item;
  };

  const remove = async (id: string) => {
    const db = await getDb();
    await db.execute('DELETE FROM chain_logs WHERE id = ?', [id]);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <RecordTracker
      entity="chain event"
      title="Chain Log"
      icon={Link2}
      list={events}
      load={load}
      create={create}
      remove={remove}
      fields={[
        { key: 'chain_name', label: 'Chain name', type: 'text' },
        { key: 'event_type', label: 'Event type', type: 'text' },
        { key: 'tx_hash', label: 'TX hash', type: 'text' },
        { key: 'block_number', label: 'Block number', type: 'text' },
        { key: 'notes', label: 'Notes', type: 'text' },
      ]}
      columns={[
        { key: 'chain_name', label: 'Chain' },
        { key: 'event_type', label: 'Event' },
        { key: 'tx_hash', label: 'TX' },
        { key: 'block_number', label: 'Block' },
      ]}
      rowValue={(e, key) => {
        const value = (e as Record<string, unknown>)[key];
        if (key === 'tx_hash') return value ? `${String(value).slice(0, 8)}...` : '';
        if (key === 'block_number') return value ? `#${value}` : '';
        return String(value ?? '');
      }}
      addLabel="Log Event"
      showCount
      emptyMessage="No chain events logged yet. Add your first event."
    />
  );
}
