/**
 * Analysis Phase Tracker · Data Analyst feature.
 * Thin wrapper around PhaseTracker with analysis-specific default phases.
 */
import PhaseTracker from './PhaseTracker';

const ANALYSIS_PHASES = [
  'Data Acquisition',
  'Cleaning',
  'Exploration',
  'Analysis',
  'Visualization',
  'Reporting',
];

export default function AnalysisPhaseTracker({ projectId }: { projectId: string }) {
  return <PhaseTracker projectId={projectId} defaultPhases={ANALYSIS_PHASES} />;
}
