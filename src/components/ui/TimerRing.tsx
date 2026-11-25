/**
 * Live timer ring. SVG stroke ring with the elapsed time centered; the ring
 * shows hour-progress (elapsed minutes mod 60) and *breathes* — a slow scale
 * pulse — only while a timer runs. Renders nothing when idle. Breathe is
 * ambient-motion: calm intensity and reduced-motion disable it.
 */
export default function TimerRing({
  elapsedMinutes,
  label,
}: {
  elapsedMinutes: number;
  label: string;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = (((elapsedMinutes % 60) + 60) % 60) / 60;
  const h = Math.floor(elapsedMinutes / 60);
  const m = Math.floor(elapsedMinutes % 60);
  const text = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return (
    <div
      className="ambient-motion timer-breathe inline-flex items-center gap-3"
      role="timer"
      aria-live="off"
      aria-label={`Timer running: ${text} on ${label}`}
    >
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth="7" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 42 42)"
          style={{ transition: 'stroke-dashoffset 150ms linear' }}
        />
      </svg>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-[var(--text-primary)] tnum leading-tight">
          {text}
        </p>
        <p className="text-[11px] text-[var(--text-secondary)] truncate">{label}</p>
      </div>
    </div>
  );
}
