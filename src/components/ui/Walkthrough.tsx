import { useState, useEffect, useCallback } from 'react';
import { Rocket, Palette, Command, Zap, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import { getShortcutModifierLabel } from '../../utils/shortcuts';

interface WalkthroughProps {
  open: boolean;
  onClose: () => void;
  /** Optional jump-start action offered on the final slide (anti-churn: first value in one click). */
  onAddFirstClient?: () => void;
}

interface Slide {
  title: string;
  description: string;
  icon: typeof Rocket;
}

const getSlideCopy = (modifier: string): Slide[] => [
  {
    title: 'Welcome to Lance',
    description:
      'Your freelance business, all in one place. From proposals to payments, Lance keeps you organized so you can focus on the work you love.',
    icon: Rocket,
  },
    {
      title: 'Your Workspace',
      description:
        'The sidebar starts with the essentials and reveals more sections as your business grows. Everything is one click away in Search either way. Pick from 7 beautiful themes to make Lance feel like home.',
      icon: Palette,
    },
  {
    title: 'Command Palette',
    description:
      `Press ${modifier}+K to open the command palette. Search for anything and jump anywhere · no mouse required.`,
    icon: Command,
  },
  {
    title: 'Keyboard Shortcuts',
    description:
      `Use ${modifier}+1–8 to switch between sections instantly. Press ${modifier}+N to create new items from anywhere · add your first client, draft a proposal, log time, or send an invoice.`,
    icon: Zap,
  },
  {
    title: 'Getting Paid',
    description:
      'Track projects, send professional invoices, and manage your finances all in one place. Set up recurring invoices, track expenses, and watch your business grow with real-time insights.',
    icon: FileText,
  },
];

export default function Walkthrough({ open, onClose, onAddFirstClient }: WalkthroughProps) {
  const [slide, setSlide] = useState(0);
  const modifier = getShortcutModifierLabel();
  const slides = getSlideCopy(modifier);

  useEffect(() => {
    if (open) setSlide(0);
  }, [open]);

  const isLast = slide === slides.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onClose();
    } else {
      setSlide((s) => s + 1);
    }
  }, [isLast, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowLeft') { setSlide(s => Math.max(0, s - 1)); return; }
      if (e.key === 'ArrowRight') { handleNext(); return; }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose, handleNext]);

  if (!open) return null;

  const Icon = slides[slide].icon;

  const handlePrev = () => setSlide((s) => s - 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[var(--bg-card)] rounded-[16px] shadow-2xl w-full max-w-lg mx-4 animate-fade-scale-in overflow-hidden" role="dialog" aria-modal="true" aria-label="Product Walkthrough">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--border-color)]">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-500 ease-out rounded-r-full"
            style={{ width: `${((slide + 1) / slides.length) * 100}%` }}
          />
        </div>

        {/* Slide content */}
        <div className="px-8 pt-10 pb-8">
          <div className="flex flex-col items-center text-center">
            {/* Icon circle */}
            <div className="w-16 h-16 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mb-5 ring-4 ring-[var(--accent)]/10">
              <Icon size={28} className="text-[var(--accent)]" />
            </div>

            {/* Slide dots */}
            <div className="flex gap-1.5 mb-5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === slide
                      ? 'bg-[var(--accent)] w-6'
                      : 'bg-[var(--border-color)] hover:bg-[var(--text-tertiary)]'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            {/* Title + description */}
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              {slides[slide].title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mb-4">
              {slides[slide].description}
            </p>
            {isLast && (
              <p className="text-xs text-[var(--accent)] mt-2 font-medium">
                Tip: Start by adding a client, then create projects, track time, and send invoices.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 flex items-center justify-between">
          <div>
            {slide > 0 ? (
              <Button variant="secondary" size="sm" onClick={handlePrev}>
                <ChevronLeft size={14} />
                Back
              </Button>
            ) : (
              <span />
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
              {slide + 1} / {slides.length}
            </span>
            {isLast && onAddFirstClient ? (
              <>
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Explore on my own
                </Button>
                <Button size="sm" onClick={onAddFirstClient}>
                  Add your first client
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleNext}>
                {isLast ? 'Get Started' : 'Next'}
                {!isLast && <ChevronRight size={14} />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
