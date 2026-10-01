import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import { useStore } from '../../store';
import { getTourPlan, loadDrive } from '../../tour/voice';
import { buildSteps } from '../../tour/copy';

interface SpotlightTourProps {
  open: boolean;
  onClose: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function rectOf(anchor: string): Rect | null {
  const el = document.querySelector(`[data-tour="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function SpotlightTour({ open, onClose }: SpotlightTourProps) {
  const navigate = useNavigate();
  const profile = useStore((s) => s.profile);
  const plan = useMemo(
    () => getTourPlan(profile?.profession || 'default', loadDrive()),
    [profile?.profession],
  );
  const steps = useMemo(() => buildSteps(plan), [plan]);
  const [idx, setIdx] = useState(0);
  const [spot, setSpot] = useState<Rect | null>(null);

  useEffect(() => {
    if (open) {
      setIdx(0);
      setSpot(null);
    }
  }, [open]);

  const step = steps[Math.min(idx, steps.length - 1)];
  const isLast = idx >= steps.length - 1;

  // Visit the step's route, then measure the anchor.
  useEffect(() => {
    if (!open || !step) return;
    if (step.path) navigate(step.path);
    const measure = () => setSpot(step.anchor ? rectOf(step.anchor) : null);
    const frame = requestAnimationFrame(() => setTimeout(measure, 60));
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step, navigate]);

  const next = useCallback(() => {
    if (isLast) onClose();
    else setIdx((i) => i + 1);
  }, [isLast, onClose]);

  const runAction = useCallback(() => {
    if (!step?.action) {
      next();
      return;
    }
    const target = step.action.action;
    if (target.startsWith('/')) navigate(target);
    else document.dispatchEvent(new CustomEvent(`lance:${target}`));
    next();
  }, [step, navigate, next]);

  // Keyboard: Escape skips; arrows move between slides for keyboard users.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose, next]);

  if (!open || !step) return null;

  const pad = 8;
  const cardStyle =
    spot && window.innerWidth > 768
      ? {
          top: Math.max(16, Math.min(spot.top, window.innerHeight - 320)),
          left: Math.min(spot.left + spot.width + 16, window.innerWidth - 356),
        }
      : undefined;

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label="Hands-on tour"
    >
      {/* Dim + cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tour-spot-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="#FFFFFF" />
            {spot && (
              <rect
                x={spot.left - pad}
                y={spot.top - pad}
                width={spot.width + pad * 2}
                height={spot.height + pad * 2}
                rx="10"
                fill="#000000"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#tour-spot-mask)"
        />
        {spot && (
          <rect
            x={spot.left - pad}
            y={spot.top - pad}
            width={spot.width + pad * 2}
            height={spot.height + pad * 2}
            rx="10"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Coach card */}
      <div
        className={`absolute bg-[var(--bg-card)] rounded-[14px] shadow-2xl p-5 w-[340px] max-w-[calc(100vw-32px)] ${
          cardStyle ? '' : 'left-1/2 -translate-x-1/2 bottom-6'
        }`}
        style={cardStyle}
      >
        <div className="flex items-start justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[var(--accent-ink,var(--accent))]">
            Step {idx + 1} of {steps.length}
          </p>
          <button
            onClick={onClose}
            aria-label="Skip tour"
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        </div>
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{step.title}</h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{step.body}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === idx ? 'step' : undefined}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-[var(--accent)]' : 'bg-[var(--border-color)] hover:bg-[var(--text-tertiary)]'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setIdx((i) => i - 1)}>
                <ChevronLeft size={14} /> Back
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Skip
            </Button>
            {step.kind === 'action' ? (
              <Button size="sm" onClick={runAction}>
                {step.cta || 'Try it'} <ChevronRight size={14} />
              </Button>
            ) : (
              <Button size="sm" onClick={next}>
                {step.cta || 'Next'} <ChevronRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
