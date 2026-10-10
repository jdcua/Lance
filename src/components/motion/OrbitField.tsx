import BrandLogo from '../ui/BrandLogo';
import { FileText, Receipt, Clock, Users, FolderKanban, BarChart3, PenLine, Lightbulb } from 'lucide-react';

const INNER = [FileText, Receipt, Clock, Users];
const OUTER = [FolderKanban, BarChart3, PenLine, Lightbulb];

/**
 * Onboarding-only orbit visual: profession tools circling the Lance mark on
 * two rings. CSS transforms only, slow (36s/60s), ambient-motion gated so
 * calm intensity and reduced-motion collapse it to the static mark.
 * Never used in the app — orbit stays on landing + onboarding.
 */
export default function OrbitField() {
  return (
    <div
      className="relative mx-auto my-2 h-44 w-44"
      role="img"
      aria-label="Your freelance tools orbiting Lance"
    >
      <div className="absolute inset-0 grid place-items-center">
        <BrandLogo size={44} className="text-[var(--accent)]" />
      </div>
      <div className="ambient-motion absolute inset-4 animate-orbit-slow">
        {INNER.map((Icon, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${i * 90}deg) translateX(52px) rotate(${-i * 90}deg)` }}
          >
            <span className="grid place-items-center w-8 h-8 -ml-4 -mt-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-[var(--card-shadow)]">
              <Icon size={14} className="text-[var(--accent-ink,var(--accent))]" />
            </span>
          </span>
        ))}
      </div>
      <div className="ambient-motion absolute inset-0 animate-orbit-slower" style={{ animationDirection: 'reverse' }}>
        {OUTER.map((Icon, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${i * 90 + 45}deg) translateX(84px) rotate(${-i * 90 - 45}deg)` }}
          >
            <span className="grid place-items-center w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              <Icon size={12} className="text-[var(--text-secondary)]" />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
