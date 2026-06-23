/**
 * Feature Component Registry
 * Maps archetype feature component string names to React components.
 * Used by ArchetypeFeatureTabs et al. to resolve feature injections at runtime.
 */
import { lazy, type ComponentType } from 'react';

const FeatureComponents: Record<string, ComponentType<any>> = {
  // ── Render / Build ──
  RenderLog: lazy(() => import('./RenderLog')),
  RenderLogWidget: lazy(() => import('./RenderLog')),
  BuildLog: lazy(() => import('./BuildLog')),
  BuildLogWidget: lazy(() => import('./BuildLog')),

  // ── Shoot / Photo ──
  ShootLog: lazy(() => import('./ShootLog')),
  ShootLogWidget: lazy(() => import('./ShootLog')),

  // ── Revisions ──
  RevisionTracker: lazy(() => import('./RevisionTracker')),
  RevisionTrackerWidget: lazy(() => import('./RevisionTracker')),
  RevisionCounter: lazy(() => import('./RevisionTracker')),

  // ── Keywords ──
  KeywordTracker: lazy(() => import('./KeywordTracker')),
  KeywordTrackerWidget: lazy(() => import('./KeywordTracker')),

  // ── Datasets ──
  DatasetLog: lazy(() => import('./DatasetLog')),
  DatasetLogWidget: lazy(() => import('./DatasetLog')),

  // ── Sessions ──
  SessionLog: lazy(() => import('./SessionLog')),
  SessionNoteLog: lazy(() => import('./SessionLog')),
  SessionNoteWidget: lazy(() => import('./SessionLog')),
  SessionPrepLog: lazy(() => import('./SessionLog')),
  SessionPrep: lazy(() => import('./SessionLog')),
};

export function getFeatureComponent(name: string): ComponentType<any> | null {
  return FeatureComponents[name] || null;
}

export function hasFeatureComponent(name: string): boolean {
  return name in FeatureComponents;
}
