/**
 * Service Blueprint · service design components with frontstage/backstage mapping.
 *
 * Rebuilt on the generic RecordTracker (src/components/ui/RecordTracker.tsx)
 * instead of hand-rolled CRUD — one fix behind every tracker of this shape.
 */
import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../db';
import RecordTracker from '../ui/RecordTracker';
import { Layers } from 'lucide-react';

type BlueprintItem = {
  id: string;
  project_id: string;
  component?: string;
  frontstage?: string;
  backstage?: string;
  support_process?: string;
  notes?: string;
};

export default function ServiceBlueprint({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<BlueprintItem[]>([]);

  const load = useCallback(async () => {
    const db = await getDb();
    const rows = await db.select<BlueprintItem[]>(
      'SELECT id, project_id, component, frontstage, backstage, support_process, notes FROM service_blueprints WHERE project_id = ? ORDER BY id ASC',
      [projectId],
    );
    setItems(rows);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (data: Partial<BlueprintItem>) => {
    const item: BlueprintItem = {
      id: crypto.randomUUID(),
      project_id: projectId,
      component: data.component as string | undefined,
      frontstage: data.frontstage as string | undefined,
      backstage: data.backstage as string | undefined,
      support_process: data.support_process as string | undefined,
      notes: data.notes as string | undefined,
    };
    const db = await getDb();
    await db.execute(
      'INSERT INTO service_blueprints (id, project_id, component, frontstage, backstage, support_process, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        item.id,
        projectId,
        item.component || null,
        item.frontstage || null,
        item.backstage || null,
        item.support_process || null,
        item.notes || null,
      ],
    );
    setItems((prev) => [...prev, item]);
    return item;
  };

  const remove = async (id: string) => {
    const db = await getDb();
    await db.execute('DELETE FROM service_blueprints WHERE id = ?', [id]);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <RecordTracker
      entity="blueprint component"
      title="Service Blueprint"
      icon={Layers}
      list={items}
      load={load}
      create={create}
      remove={remove}
      fields={[
        { key: 'component', label: 'Component name', type: 'text' },
        { key: 'frontstage', label: 'Frontstage (what the client sees)', type: 'text' },
        { key: 'backstage', label: 'Backstage (what happens behind)', type: 'text' },
        { key: 'support_process', label: 'Support process', type: 'text' },
        { key: 'notes', label: 'Notes', type: 'text' },
      ]}
      columns={[
        { key: 'component', label: 'Component' },
        { key: 'frontstage', label: 'Front' },
        { key: 'backstage', label: 'Back' },
        { key: 'support_process', label: 'Support' },
        { key: 'notes', label: 'Notes' },
      ]}
      addLabel="Add Component"
      showCount
      emptyMessage="No blueprint components yet. Add your first component."
    />
  );
}
