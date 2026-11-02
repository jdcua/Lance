interface PrefToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}

/** Reusable Settings on/off row. Input carries aria-label for a11y. */
export default function PrefToggle({ checked, onChange, label, hint }: PrefToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm text-[var(--text-primary)]">{label}</p>
        {hint && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{hint}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-colors peer-checked:bg-[var(--accent)]" />
      </label>
    </div>
  );
}
