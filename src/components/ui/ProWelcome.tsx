import { useEffect, useState } from 'react';
import { Sparkles, Crown, X } from 'lucide-react';
import Button from './Button';

const PRO_FEATURES = [
  { title: 'All themes, unlocked', body: 'Studio, Terminal, Craft, Motion, Lens, Scale — every palette, instantly.' },
  { title: 'Unlimited clients & projects', body: 'No caps. Run your whole book of business in one place.' },
  { title: 'Finance & runway', body: 'Cash-flow forecast, runway scrubber, money-flow and affordability banner.' },
  { title: 'Intel & risk', body: 'At-risk revenue, per-client payment behavior, reconciliation of bank deposits.' },
  { title: 'Depth tools', body: 'Archetype deposit hints, terms, and richer invoice/proposal builders.' },
  { title: 'Priority updates', body: 'New Pro features land here first.' },
];

export default function ProWelcome({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isLast = step === PRO_FEATURES.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-[var(--bg-card)] rounded-[16px] shadow-2xl w-full max-w-lg mx-4 animate-fade-scale-in overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Lance Pro"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="px-8 pt-10 pb-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mb-5 mx-auto ring-4 ring-[var(--accent)]/10">
            <Crown size={28} className="text-[var(--accent-ink,var(--accent))]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Welcome to Lance Pro
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
            Here is everything your license just unlocked.
          </p>
        </div>

        <div className="px-8 pb-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            <Sparkles size={12} />
            <span>
              Feature {step + 1} of {PRO_FEATURES.length}
            </span>
          </div>
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] p-4 min-h-[92px]">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              {PRO_FEATURES[step].title}
            </h4>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {PRO_FEATURES[step].body}
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {PRO_FEATURES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-[var(--accent)]' : 'w-1.5 bg-[var(--border)]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-8 pb-6 flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Explore on my own
          </Button>
          <Button
            size="sm"
            onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
          >
            {isLast ? 'Get started' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
