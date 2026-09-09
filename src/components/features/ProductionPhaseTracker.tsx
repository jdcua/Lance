/**
 * Production Phase Tracker · Filmmaker feature.
 * Thin wrapper around PhaseTracker with filmmaker defaults.
 */
import PhaseTracker from './PhaseTracker';

export default function ProductionPhaseTracker({ projectId }: { projectId: string }) {
  return <PhaseTracker projectId={projectId} defaultPhases={['Pre-production', 'Production', 'Post-production', 'Delivery']} />;
}
