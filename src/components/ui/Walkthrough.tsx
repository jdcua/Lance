import { Rocket } from 'lucide-react';
import Button from './Button';
import { useStore } from '../../store';
import { getTourPlan, loadDrive } from '../../tour/voice';
import { speak } from '../../tour/copy';

interface WalkthroughProps {
  open: boolean;
  onClose: () => void;
  /** Begin the hands-on spotlight tour. */
  onStartTour: () => void;
}

/**
 * Tour intro card. One personalized greeting in the coach's voice, then
 * either the hands-on spotlight tour or free exploration.
 */
export default function Walkthrough({ open, onClose, onStartTour }: WalkthroughProps) {
  const profile = useStore((s) => s.profile);
  if (!open) return null;

  const plan = getTourPlan(profile?.profession || 'default', loadDrive());
  const invite = speak(plan.voice.tempo, {
    terse: 'Sixty seconds. Your loop, then your first win.',
    warm: 'Let me show you around personally. About a minute.',
    steady: 'A one-minute hands-on tour of your workspace.',
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[var(--bg-card)] rounded-[16px] shadow-2xl w-full max-w-lg mx-4 animate-fade-scale-in overflow-hidden" role="dialog" aria-modal="true" aria-label="Welcome tour">
        <div className="px-8 pt-10 pb-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mb-5 ring-4 ring-[var(--accent)]/10">
              <Rocket size={28} className="text-[var(--accent-ink,var(--accent))]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              {plan.greeting}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mb-1">
              {plan.subgreeting}
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm">
              {invite}
            </p>
          </div>
        </div>

        <div className="px-8 pb-6 flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Explore on my own
          </Button>
          <Button size="sm" onClick={onStartTour}>
            Take the tour
          </Button>
        </div>
      </div>
    </div>
  );
}
