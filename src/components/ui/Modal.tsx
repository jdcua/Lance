import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from './useDialogFocus';

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

  // Trap + initial focus + focus return live in the shared hook. Escape is
  // handled here (not in the hook) because every dialog dismisses on it.
  useDialogFocus(modalRef, open);

  // Swallow keys so global shortcuts (Cmd+K, Cmd+N, …) don't fire mid-modal.
  // Escape and Tab MUST propagate: document-level handlers implement modal
  // dismiss and the focus trap, and a blanket stopPropagation here made
  // Escape a no-op in every Modal-based dialog whenever focus was inside it
  // (Modal auto-focuses its first button on open, so that was always).
  // Cmd/Ctrl chords also propagate: global chrome (palette, new-item,
  // timer) must stay reachable from inside dialogs.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Tab') return;
    if (e.metaKey || e.ctrlKey) return;
    e.stopPropagation();
  }, []);

  useEffect(() => {
    if (open) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        // Close even when an input is focused
        onCloseRef.current();
      };

      document.addEventListener('keydown', handleKeyDown);

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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onCloseRef.current(); }} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative glass shadow-xl w-full ${sizeClasses[size]} ${size === 'full' ? 'mx-0 max-h-none rounded-none' : 'mx-4 max-h-[85vh] rounded-[24px]'} flex flex-col animate-fade-scale-in`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`${size === 'full' ? 'flex-1 overflow-hidden' : 'px-6 py-4 overflow-y-auto flex-1'}`}>{children}</div>
      </div>
    </div>
  );
}
