/**
 * Storage proof for the trial.
 *
 * This module only READS sizes, it never sends anything.
 *
 * Scope, stated precisely: these are the localStorage and sessionStorage TEXT
 * keys. Attachment BYTES live in IndexedDB (demo/assetStore.ts) and the app
 * shell lives in Cache Storage (public/trial-sw.js). Neither is counted here ,
 * the panel reports them as separate lines rather than pretending they are part
 * of this total. An earlier version of this file claimed the key list was
 * "everything the trial stores … and nowhere else", which made the wipe button
 * and the storage display agree with each other and both be wrong.
 *
 * The prefix list matches wipeTrialKeys exactly, including `lance-`, which is
 * what the free invoice generator uses.
 */
function isTrialKey(key: string): boolean {
  return key.startsWith('lance:') || key.startsWith('lance_') || key.startsWith('lance-');
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
  // Both text stores. sessionStorage held the import-classification banner,
  // which the wipe missed entirely.
  for (const store of [localStorage, sessionStorage]) {
    try {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && isTrialKey(key)) out.push(key);
      }
    } catch {
      /* private mode: this store contributes nothing */
    }
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
