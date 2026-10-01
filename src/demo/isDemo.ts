/**
 * Trial-mode detection.
 *
 * Handwritten, dependency-free, purposefully boring so anyone can audit it.
 * Trial = the same app, served statically, with zero network after load.
 *
 * Active when ANY of these hold:
 * - build flag VITE_TRIAL === '1' (the /try/ build)
 * - URL starts with /try (same bundle served under the trial path)
 * - URL has ?trial=1 (local dev / screenshots)
 */

export function isTrialBuild(): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    if (env && env.VITE_TRIAL === '1') return true;
  } catch {
    return false;
  }
  return false;
}

export function hasTrialQuery(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('trial');
  } catch {
    return false;
  }
}

export function hasTrialPath(): boolean {
  try {
    return window.location.pathname === '/try' || window.location.pathname.startsWith('/try/');
  } catch {
    return false;
  }
}

/** Single entry point. Keep callers to this one function. */
export function isTrial(): boolean {
  if (isTrialBuild()) return true;
  if (hasTrialPath()) return true;
  if (hasTrialQuery()) return true;
  return false;
}
