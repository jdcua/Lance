/**
 * Dataset Versioning · AI Engineer feature.
 * Changelog-style list of dataset versions, most recent first.
 *
 * Rebuilt on the generic RecordTracker (src/components/ui/RecordTracker.tsx)
 * instead of hand-rolled CRUD — one fix behind every tracker of this shape.
 */
import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../db';
import RecordTracker from '../ui/RecordTracker';
import { GitBranch } from 'lucide-react';

type DatasetVersion = {
  id: string;
  project_id: string;
  dataset_id: string;
  version: string;
  description?: string;
  created_at: string;
};

export default function DatasetVersioning({ projectId }: { projectId: string }) {
  const [versions, setVersions] = useState<DatasetVersion[]>([]);

  const load = useCallback(async () => {
    const db = await getDb();
    const rows = await db.select<DatasetVersion[]>(
      'SELECT id, project_id, dataset_id, version, description, created_at FROM dataset_versions WHERE project_id = ? ORDER BY created_at DESC',
      [projectId],
    );
    setVersions(rows);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (data: Partial<DatasetVersion>) => {
    const item: DatasetVersion = {
      id: crypto.randomUUID(),
      project_id: projectId,
      dataset_id: (data.dataset_id as string) || '',
      version: (data.version as string) || '',
      description: data.description as string | undefined,
      created_at: new Date().toISOString(),
    };
    const db = await getDb();
    await db.execute(
      'INSERT INTO dataset_versions (id, project_id, dataset_id, version, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        item.id,
        projectId,
        item.dataset_id,
        item.version,
        item.description || null,
        item.created_at,
      ],
    );
    setVersions((prev) => [item, ...prev]);
    return item;
  };

  const remove = async (id: string) => {
    const db = await getDb();
    await db.execute('DELETE FROM dataset_versions WHERE id = ?', [id]);
    setVersions((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <RecordTracker
      entity="dataset version"
      title="Dataset Versions"
      icon={GitBranch}
      list={versions}
      load={load}
      create={create}
      remove={remove}
      fields={[
        { key: 'dataset_id', label: 'Dataset ID', type: 'text' },
        { key: 'version', label: 'Version', type: 'text', placeholder: 'e.g. v1.2' },
        { key: 'description', label: 'Description', type: 'text', placeholder: 'Changelog entry' },
      ]}
      columns={[
        { key: 'dataset_id', label: 'Dataset' },
        { key: 'version', label: 'Version' },
        { key: 'description', label: 'Description' },
        { key: 'created_at', label: 'Created' },
      ]}
      rowValue={(v, key) => {
        const value = (v as Record<string, unknown>)[key];
        return key === 'created_at'
          ? new Date(String(value ?? '')).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : String(value ?? '');
      }}
      addLabel="New Version"
      showCount
      emptyMessage="No dataset versions tracked yet."
    />
  );
}
