/**
 * Dataset Log · Data Analyst / AI Engineer feature.
 * Lists datasets with metadata (source, size, format, license).
 *
 * Rebuilt on the generic RecordTracker (src/components/ui/RecordTracker.tsx)
 * instead of hand-rolled CRUD — one fix behind every tracker of this shape.
 */
import { useStore } from '../../store';
import RecordTracker from '../ui/RecordTracker';
import { Database } from 'lucide-react';

function formatSize(bytes?: number): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)}MB`;
  return `${(bytes / 1073741824).toFixed(1)}GB`;
}

export default function DatasetLog({ projectId }: { projectId: string }) {
  const { datasets, loadDatasets, addDataset, removeDataset } = useStore();

  return (
    <RecordTracker
      entity="dataset"
      title="Datasets"
      icon={Database}
      list={datasets}
      load={loadDatasets}
      create={(data) => addDataset(data as Parameters<typeof addDataset>[0])}
      remove={(id) => removeDataset(id, projectId)}
      fields={[
        { key: 'dataset_name', label: 'Dataset name', type: 'text' },
        { key: 'source', label: 'Source / URL', type: 'text' },
        { key: 'size_bytes', label: 'Size (bytes)', type: 'number' },
        {
          key: 'format_type',
          label: 'Format',
          type: 'text',
          placeholder: 'e.g. CSV, JSON, Parquet',
        },
        { key: 'license_type', label: 'License type', type: 'text' },
      ]}
      columns={[
        { key: 'dataset_name', label: 'Dataset' },
        { key: 'source', label: 'Source' },
        { key: 'size_bytes', label: 'Size' },
        { key: 'format_type', label: 'Format' },
      ]}
      rowValue={(d, key) =>
        key === 'size_bytes'
          ? formatSize((d as Record<string, unknown>)[key] as number | undefined)
          : String((d as Record<string, unknown>)[key] ?? '')
      }
      addLabel="Add Dataset"
      filterBy={(d) => d.project_id === projectId}
      emptyMessage="No datasets logged yet."
    />
  );
}
