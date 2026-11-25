/**
 * Shoot Log · Photographer / Filmmaker feature.
 * Logs photo/video shoots with location, type, camera system, hours.
 *
 * Rebuilt on the generic RecordTracker (src/components/ui/RecordTracker.tsx)
 * instead of hand-rolled CRUD — one fix behind every tracker of this shape.
 */
import { useStore } from '../../store';
import RecordTracker from '../ui/RecordTracker';
import { Camera } from 'lucide-react';

export default function ShootLog({ projectId }: { projectId: string }) {
  const { shoots, loadShoots, addShoot, removeShoot } = useStore();

  return (
    <RecordTracker
      entity="shoot"
      title="Shoots"
      icon={Camera}
      list={shoots}
      load={loadShoots}
      create={(data) => addShoot(data as Parameters<typeof addShoot>[0])}
      remove={(id) => removeShoot(id, projectId)}
      fields={[
        { key: 'shoot_date', label: 'Date', type: 'date' },
        { key: 'location', label: 'Location', type: 'text', placeholder: 'Location' },
        { key: 'shoot_type', label: 'Shoot type', type: 'text' },
        { key: 'camera_system', label: 'Camera system', type: 'text' },
        { key: 'hours_on_location', label: 'Hours on location', type: 'number' },
        { key: 'conditions_notes', label: 'Conditions / notes', type: 'text' },
      ]}
      columns={[
        { key: 'shoot_date', label: 'Date' },
        { key: 'location', label: 'Location' },
        { key: 'shoot_type', label: 'Shoot type' },
        { key: 'camera_system', label: 'Camera system' },
        { key: 'hours_on_location', label: 'Hours' },
      ]}
      rowValue={(s, key) => {
        const value = (s as Record<string, unknown>)[key];
        if (key === 'shoot_date') return String(value ?? '').split('T')[0] || '--';
        if (key === 'hours_on_location') return value != null ? `${value}h` : '';
        return String(value ?? '');
      }}
      addLabel="Log Shoot"
      filterBy={(s) => s.project_id === projectId}
      emptyMessage="No shoots logged yet."
    />
  );
}
