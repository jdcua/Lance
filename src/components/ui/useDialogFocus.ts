import { useEffect, type RefObject } from 'react';

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
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

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
      const active = document.activeElement;
      const movedElsewhere =
        active instanceof HTMLElement &&
        active !== document.body &&
        !el.contains(active);
      if (opts?.returnFocus !== false && previouslyFocused && !movedElsewhere) {
        previouslyFocused.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
