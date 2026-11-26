import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog focus management: initial focus, Tab trap, and focus return.
 * Disabled controls are skipped (focusing them is a no-op that would leak
 * the trap). The element focused before open regains focus on close —
 * without this, keyboard users are dropped on <body> when a dialog
 * unmounts out from under them.
 */
export function useDialogFocus(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
  opts?: { initialSelector?: string; returnFocus?: boolean },
): void {
  // Capture the trigger during render, before any child effect can move focus
  // into the dialog (some dialogs auto-focus their first input on mount).
  const returnTargetRef = useRef<HTMLElement | null>(null);
  if (open && !returnTargetRef.current) {
    const active = document.activeElement;
    returnTargetRef.current = active instanceof HTMLElement ? active : null;
  }

  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const previouslyFocused = returnTargetRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const raf = requestAnimationFrame(() => {
      const target = opts?.initialSelector
        ? el.querySelector<HTMLElement>(opts.initialSelector)
        : null;
      (target || el.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(raf);
      // By cleanup time the focused node is often already detached (focus
      // silently reset to <body>), so "still inside" is the wrong test.
      // Restore unless the user has deliberately moved focus to a live
      // element elsewhere — yanking it back would be rude.
      const target = previouslyFocused;
      // Restore on the next frame: by cleanup time React may have detached the
      // dialog and reset focus to <body>, and focusing a node that is being
      // removed is a no-op.
      requestAnimationFrame(() => {
        if (opts?.returnFocus === false || !target || !document.contains(target)) return;
        const active = document.activeElement;
        const movedElsewhere =
          active instanceof HTMLElement &&
          active !== document.body &&
          active !== target &&
          !el.contains(active);
        if (!movedElsewhere) target.focus();
        returnTargetRef.current = null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
