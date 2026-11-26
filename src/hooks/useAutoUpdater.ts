import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store';
import { useUpdaterStore } from '../store/updaterStore';

const LATER_KEY = 'lance_update_deferred_until';
const SEEN_KEY = 'lance:updater-highwater';
const CHECK_INTERVAL = 4 * 60 * 60 * 1000;
const INITIAL_DELAY = 3000;

/**
 * Remember the highest version this install has ever been offered, and refuse
 * anything lower.
 *
 * Tauri already refuses a manifest that is not NEWER than the running build, so
 * this is not about protecting against the obvious case. It covers the other one:
 * the manifest has no signature of its own, and its bundles are signed with a key
 * that is genuinely valid. So anyone who can influence the manifest (by editing a
 * release, or by writing the worker's assets) can advertise an OLD version that
 * WAS legitimately signed. The signature verifies, because it is a real signature.
 * That is a rollback to a build with a known vulnerability, and without a
 * high-water mark the client has no memory to notice it.
 */
export function parseVersionPart(p: string): number | null {
  return /^\d+$/.test(p) ? parseInt(p, 10) : null;
}

function comparePreReleasePart(x: number | null | undefined, y: number | null | undefined): number {
  if (x === undefined) return -1; // fewer fields sorts first
  if (y === undefined) return 1;
  if (x === null || y === null) {
    // At least one non-numeric: fall back to string order for that pair.
    const sx = String(x ?? '');
    const sy = String(y ?? '');
    if (sx !== sy) return sx < sy ? -1 : 1;
    return 0;
  }
  if (x !== y) return x < y ? -1 : 1;
  return 0;
}

function comparePreRelease(a: string, b: string): number {
  const ap = a.split('.').map(parseVersionPart);
  const bp = b.split('.').map(parseVersionPart);
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const result = comparePreReleasePart(ap[i], bp[i]);
    if (result !== 0) return result;
  }
  return 0;
}

function compareVersions(a: string, b: string): number {
  // Semver-ish: numeric core, then a pre-release suffix. Enough for versions like
  // 0.9.9-1 without pulling in a semver dependency.
  const norm = (v: string) => {
    const [core = '', pre = ''] = String(v ?? '')
      .trim()
      .replace(/^v/, '')
      .split('-');
    const nums = core.split('.').map((n) => parseInt(n, 10) || 0);
    while (nums.length < 3) nums.push(0);
    return { nums, pre };
  };
  const A = norm(a);
  const B = norm(b);
  for (let i = 0; i < 3; i++) {
    if (A.nums[i] !== B.nums[i]) return A.nums[i] < B.nums[i] ? -1 : 1;
  }
  if (A.pre === B.pre) return 0;
  // A pre-release sorts BELOW its release: 0.9.9-1 < 0.9.9.
  if (!A.pre) return 1;
  if (!B.pre) return -1;

  // Compare pre-release parts piece by piece, numerically where they are numbers.
  // Comparing the whole suffix as a string put '10' before '2', which would let
  // 0.9.9-10 be served to an install that had already seen 0.9.9-2.
  return comparePreRelease(A.pre, B.pre);
}

function readHighWater(): string {
  try {
    return localStorage.getItem(SEEN_KEY) || '';
  } catch {
    return '';
  }
}

function writeHighWater(version: string): void {
  try {
    const current = readHighWater();
    if (!current || compareVersions(version, current) > 0) {
      localStorage.setItem(SEEN_KEY, version);
    }
  } catch {
    /* private mode: we simply keep no memory */
  }
}

export function useAutoUpdater() {
  const setUpdateAvailable = useUpdaterStore((s) => s.setUpdateAvailable);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const doCheck = useCallback(async () => {
    try {
      if (!useStore.getState().networkChecksEnabled) return;
      const deferredUntil = localStorage.getItem(LATER_KEY);
      if (deferredUntil && Date.now() < parseInt(deferredUntil, 10)) return;

      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) return;

      // Refuse a rollback before it can ever be offered to the user.
      const offered = update.version || '';
      const seen = readHighWater();
      if (seen && offered && compareVersions(offered, seen) < 0) {
        console.warn(
          `[updater] refusing rollback: manifest offers ${offered}, already saw ${seen}`,
        );
        return;
      }

      if (offered) writeHighWater(offered);
      setUpdateAvailable(update);
    } catch {
      /* silent */
    }
  }, [setUpdateAvailable]);

  useEffect(() => {
    timerRef.current = setTimeout(doCheck, INITIAL_DELAY);
    intervalRef.current = setInterval(doCheck, CHECK_INTERVAL);
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    };
  }, [doCheck]);
}

/** Exported for tests. */
export { compareVersions };
