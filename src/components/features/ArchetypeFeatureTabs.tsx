/**
 * ArchetypeFeatureTabs — renders archetype-specific feature tabs and panels.
 * Reads the current archetype's features list, filters by injectInto target,
 * and renders tab-based navigation for position: 'tab' items and inline panels for 'panel' items.
 */
import { useState, Suspense } from 'react';
import { useStore } from '../../store';
import { getArchetype } from '../../archetypes';
import { getFeatureComponent } from './registry';
import type { ArchetypeFeatureDef } from '../../archetypes/types';

type Props = {
  screen: string;
  context?: Record<string, string>;
};

export default function ArchetypeFeatureTabs({ screen, context = {} }: Props) {
  const profile = useStore((s) => s.profile);
  const config = getArchetype(profile?.profession || 'default');
  const features = config.archetypeFeatures.filter((f) => f.injectInto === screen);

  if (features.length === 0) return null;

  const tabs = features.filter((f) => f.position === 'tab');
  const panels = features.filter((f) => f.position === 'panel');

  return (
    <div className="mt-4 space-y-3">
      {panels.length > 0 && panels.map((f) => (
        <Suspense key={f.id} fallback={<div className="h-16 bg-[var(--bg-secondary)] rounded skeleton-pulse" />}>
          <FeaturePanel feature={f} context={context} />
        </Suspense>
      ))}
      {tabs.length > 0 && <FeatureTabBar features={tabs} context={context} />}
    </div>
  );
}

function FeaturePanel({ feature, context }: { feature: ArchetypeFeatureDef; context: Record<string, string> }) {
  const Component = getFeatureComponent(feature.component);
  if (!Component) return null;
  const props = resolveProps(feature, context);
  return (
    <div className="p-3 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-color)]">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">{feature.name}</span>
      </div>
      <Component {...props} />
    </div>
  );
}

function FeatureTabBar({ features, context }: { features: ArchetypeFeatureDef[]; context: Record<string, string> }) {
  const [activeTab, setActiveTab] = useState(features[0]?.id || '');

  const activeFeature = features.find((f) => f.id === activeTab) || features[0];
  const Component = activeFeature ? getFeatureComponent(activeFeature.component) : null;

  return (
    <div>
      <div className="flex gap-0 border-b border-[var(--border-color)] mb-3">
        {features.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveTab(f.id)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === f.id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>
      {Component && (
        <Suspense fallback={<div className="h-16 bg-[var(--bg-secondary)] rounded skeleton-pulse" />}>
          <Component {...resolveProps(activeFeature!, context)} />
        </Suspense>
      )}
    </div>
  );
}

function resolveProps(feature: ArchetypeFeatureDef, context: Record<string, string>): Record<string, string> {
  const component = feature.component;
  // Map component types to their expected prop keys
  if (['RenderLog', 'RenderLogWidget', 'BuildLog', 'BuildLogWidget', 'ShootLog', 'ShootLogWidget', 'RevisionTracker', 'RevisionTrackerWidget', 'RevisionCounter', 'DatasetLog', 'DatasetLogWidget'].includes(component)) {
    return { projectId: context.projectId || '' };
  }
  if (['KeywordTracker', 'KeywordTrackerWidget'].includes(component)) {
    return { clientId: context.clientId || '' };
  }
  if (['SessionLog', 'SessionNoteLog', 'SessionNoteWidget', 'SessionPrepLog', 'SessionPrep'].includes(component)) {
    return { clientId: context.clientId || '', projectId: context.projectId || '' };
  }
  return {};
}
