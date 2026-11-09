import { useSyncExternalStore } from 'react';

/**
 * Shared open state for the mobile navigation drawer. The drawer lives in
 * Sidebar while its trigger sits in the Topbar, so both need the same state
 * without prop-drilling through the app shell.
 */
let open = false;
const listeners = new Set<() => void>();

export function setMobileNavOpen(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((listener) => listener());
}

export function useMobileNavOpen() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
    () => false,
  );
}
