/**
 * Storage proof for the trial.
 *
 * Everything the trial stores lives under these localStorage keys and
 * nowhere else. This module only READS sizes — it never sends anything.
 * Keep each function under 5 branches for easy review.
 */

/** Every key the trial may write: the store tables plus profile, prefs,
 *  onboarding, achievements, caches. Same universe wipeTrialKeys removes,
 *  so the panel and the wipe button never disagree. */
function isTrialKey(key: string): boolean {
  return key.startsWith('lance:') || key.startsWith('lance_');
}

export interface StorageEntry {
  key: string;
  bytes: number;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function sizeOfKey(key: string): StorageEntry | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  return { key, bytes: byteLength(raw) };
}

function listTrialKeys(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isTrialKey(key)) out.push(key);
    }
  } catch {
    return out;
  }
  return out.sort();
}

export function trialStorageEntries(): StorageEntry[] {
  const found: StorageEntry[] = [];
  for (const key of listTrialKeys()) {
    const entry = sizeOfKey(key);
    if (entry) found.push(entry);
  }
  return found;
}

export function trialStorageBytes(): number {
  let total = 0;
  for (const entry of trialStorageEntries()) total += entry.bytes;
  return total;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
