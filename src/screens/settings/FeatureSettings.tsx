import Card from '../../components/ui/Card';
import { SectionHead, type SettingsBag } from './shared';
import { FEATURE_COMPONENT_NAMES } from '../../components/features/registry';

export default function FeatureSettings({ bag }: { bag: SettingsBag }) {
  const { features, setFeatures } = bag;

  const isEnabled = (name: string) => features[name] !== false; // default on

  const toggle = (name: string) => {
    setFeatures((prev) => ({ ...prev, [name]: !isEnabled(name) }));
  };

  const enableAll = () => {
    const next: Record<string, boolean> = {};
    for (const n of FEATURE_COMPONENT_NAMES) next[n] = true;
    setFeatures(next);
  };

  const disableAll = () => {
    const next: Record<string, boolean> = {};
    for (const n of FEATURE_COMPONENT_NAMES) next[n] = false;
    setFeatures(next);
  };

  return (
    <Card className="mb-6">
      <SectionHead title="Features" isSaved={false} />
      <p className="text-xs text-[var(--text-tertiary)] mb-3">
        Toggle which feature panels are available. Changes apply immediately.
      </p>
      <div className="flex gap-2 mb-3">
        <button
          onClick={enableAll}
          className="text-xs px-2 py-1 border border-[var(--border-color)] rounded-sm hover:bg-[var(--bg-secondary)] transition-colors"
        >
          Enable all
        </button>
        <button
          onClick={disableAll}
          className="text-xs px-2 py-1 border border-[var(--border-color)] rounded-sm hover:bg-[var(--bg-secondary)] transition-colors"
        >
          Disable all
        </button>
      </div>
      <div className="max-h-[420px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1">
        {FEATURE_COMPONENT_NAMES.map((name) => (
          <label
            key={name}
            className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-[var(--bg-secondary)] cursor-pointer text-xs"
          >
            <input
              type="checkbox"
              checked={isEnabled(name)}
              onChange={() => toggle(name)}
              className="accent-[var(--accent)]"
            />
            <span className="text-[var(--text-primary)] truncate">{name}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}
