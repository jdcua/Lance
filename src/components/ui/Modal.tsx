import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  full: 'w-screen h-screen max-w-none max-h-none rounded-none mx-0',
};

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  useEffect(() => {
    if (open) {
      const el = modalRef.current;
      if (!el) return;

      const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape' && e.key !== 'Tab') return;
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCloseRef.current();
          return;
        }
        if (e.key === 'Tab') {
          const focusable = el.querySelectorAll<HTMLElement>(focusableSelector);
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      requestAnimationFrame(() => {
        const focusable = el.querySelectorAll<HTMLElement>(focusableSelector);
        if (focusable.length > 0) focusable[0].focus();
      });

      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onCloseRef.current(); }} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative bg-[var(--bg-card)] shadow-xl w-full ${sizeClasses[size]} ${size === 'full' ? 'mx-0 max-h-none rounded-none' : 'mx-4 max-h-[85vh] rounded-[12px]'} flex flex-col animate-fade-scale-in`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`${size === 'full' ? 'flex-1 overflow-hidden' : 'px-6 py-4 overflow-y-auto flex-1'}`}>{children}</div>
      </div>
    </div>
  );
}
