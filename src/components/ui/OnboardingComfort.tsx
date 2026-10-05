import { usePrefs, setPref, type MotionPref, type ContrastPref, type TextScalePref } from '../../lib/prefs';

/**
 * Onboarding Step 1: Comfort. Access needs first so every later step
 * already adapts. Every option also lives in Settings; Auto follows the
 * OS (prefers-reduced-motion / prefers-contrast) on both app and trial.
 */
function Segmented<T extends string>({
  label,
  hint,
  options,
  value,
  onPick,
}: {
  label: string;
  hint: string;
  options: { value: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
      <p className="text-[11px] text-[var(--text-tertiary)] mb-1.5">{hint}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onPick(o.value)}
            className={`text-xs font-medium px-2.5 py-1 rounded-[8px] border transition-colors ${
              value === o.value
                ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function detectOS(): { motion: string; contrast: string; contrastPref: string; motionPref: string } {
  try {
    const mq = (q: string) =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(q).matches
        : false;
    return {
      motion: mq('(prefers-reduced-motion: reduce)') ? 'reduced motion' : 'full motion',
      motionPref: mq('(prefers-reduced-motion: reduce)') ? 'reduced' : 'no-preference',
      contrast: mq('(prefers-contrast: more)') ? 'more contrast' : 'standard contrast',
      contrastPref: mq('(prefers-contrast: more)') ? 'more' : 'no-preference',
    };
  } catch {
    return { motion: 'unknown', motionPref: 'unknown', contrast: 'unknown', contrastPref: 'unknown' };
  }
}

export default function OnboardingComfort() {
  const prefs = usePrefs();
  const os = detectOS();
  const setDensity = (compact: boolean) => {
    try {
      localStorage.setItem('lance:density', compact ? 'compact' : 'comfortable');
    } catch {
      /* private mode */
    }
    document.body.classList.toggle('density-compact', compact);
  };
  const isCompact =
    typeof document !== 'undefined' && document.body.classList.contains('density-compact');

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Make yourself comfortable</h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Set how Lance looks and moves. Auto follows your device settings, on this machine and in
          the browser trial. Change anytime in Settings.
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)]" aria-live="polite">
          Your device right now: {os.motion} · {os.contrast}
          {os.motionPref !== 'no-preference' && <span> · Already set: {os.motionPref}</span>}
          {os.contrastPref !== 'no-preference' && <span> · Already set: {os.contrastPref}</span>}
        </p>
      </div>
      <Segmented<MotionPref>
        label="Motion"
        hint="Auto quiets animation when your OS asks for reduced motion."
        options={[
          { value: 'auto', label: 'Auto (follow device)' },
          { value: 'full', label: 'Full' },
          { value: 'off', label: 'Off' },
        ]}
        value={prefs.motion}
        onPick={(v) => setPref('motion', v)}
      />
      <Segmented<ContrastPref>
        label="Contrast"
        hint="Auto boosts text when your OS asks for more contrast. High targets 7:1 body text."
        options={[
          { value: 'auto', label: 'Auto (follow device)' },
          { value: 'standard', label: 'Standard' },
          { value: 'high', label: 'High' },
        ]}
        value={prefs.contrast}
        onPick={(v) => setPref('contrast', v)}
      />
      <Segmented<TextScalePref>
        label="Text size"
        hint="Scales the whole app. Your browser zoom still works on top."
        options={[
          { value: '100', label: '100%' },
          { value: '112', label: '112%' },
          { value: '125', label: '125%' },
        ]}
        value={prefs.textScale}
        onPick={(v) => setPref('textScale', v)}
      />
      <Segmented<string>
        label="Density"
        hint="Compact fits more rows per screen."
        options={[
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'compact', label: 'Compact' },
        ]}
        value={isCompact ? 'compact' : 'comfortable'}
        onPick={(v) => setDensity(v === 'compact')}
      />
    </div>
  );
}
