/**
 * Build Log · Developer / Game Developer / DevOps feature.
 * Tracks software builds with version, platform, notes.
 *
 * Rebuilt on the generic RecordTracker (src/components/ui/RecordTracker.tsx)
 * instead of hand-rolled CRUD — one fix behind every tracker of this shape.
 */
import { useStore } from '../../store';
import RecordTracker from '../ui/RecordTracker';
import { Box } from 'lucide-react';

export default function BuildLog({ projectId }: { projectId: string }) {
  const { builds, loadBuilds, addBuild, removeBuild } = useStore();

  return (
    <RecordTracker
      entity="build"
      title="Builds"
      icon={Box}
      list={builds}
      load={loadBuilds}
      create={(data) => addBuild(data as Parameters<typeof addBuild>[0])}
      remove={(id) => removeBuild(id, projectId)}
      fields={[
        { key: 'version', label: 'Version', type: 'text', placeholder: 'e.g. v1.2.0' },
        { key: 'platform', label: 'Platform', type: 'text', placeholder: 'e.g. win/mac/web' },
        { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Notes…' },
      ]}
      columns={[
        { key: 'version', label: 'Version' },
        { key: 'platform', label: 'Platform' },
        { key: 'notes', label: 'Notes' },
      ]}
      filterBy={(b) => b.project_id === projectId}
      emptyMessage="No builds logged yet."
    />
  );
}
