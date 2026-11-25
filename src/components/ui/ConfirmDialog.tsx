import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';
import { useDialogFocus } from './useDialogFocus';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, open);

  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      };
      document.addEventListener('keydown', handler);
      // Initial focus goes to Cancel (first button) via the shared hook —
      // destructive confirms must not invite an accidental Enter.
      return () => document.removeEventListener('keydown', handler);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative glass rounded-[20px] w-full max-w-sm mx-4 animate-fade-scale-in"
        onKeyDown={(e) => {
          // Escape and Tab MUST reach the document handlers (dismiss + the
          // shared focus trap); Cmd/Ctrl chords stay available to chrome.
          // Same policy as Modal — a blanket stopPropagation here would
          // silently disable the trap.
          if (e.key === 'Escape' || e.key === 'Tab') return;
          if (e.metaKey || e.ctrlKey) return;
          e.stopPropagation();
        }}
      >
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            {variant === 'danger' && (
              <div className="w-10 h-10 rounded-full bg-[var(--danger-bg)] flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-[var(--danger)]" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} size="sm" disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} size="sm" loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
