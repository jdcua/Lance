import { useStore } from '../store';

/**
 * Unmissable striped banner while test mode is on. Rendered in App whenever
 * the flag is active (the flag itself can only be set from the gated panel).
 */
export default function TestModeBanner() {
  const testMode = useStore((s) => s.testMode);
  const disableTestMode = useStore((s) => s.disableTestMode);
  if (!testMode.active) return null;
  return (
    <div
      role="alert"
      aria-label="Test mode active"
      className="px-6 py-1.5 text-center text-xs font-bold tracking-widest uppercase text-white print:hidden"
      style={{
        background: 'repeating-linear-gradient(-45deg, #7c2d12 0 12px, #111827 12px 24px)',
      }}
    >
      Test mode · testing as <span className="capitalize">{testMode.tier}</span>
      <button
        type="button"
        onClick={() => disableTestMode().then(() => window.location.reload())}
        className="ml-3 underline underline-offset-2 normal-case tracking-normal font-medium"
      >
        Exit &amp; restore
      </button>
    </div>
  );
}
