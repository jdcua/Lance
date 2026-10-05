/**
 * Trial asset bytes: IndexedDB with an in-memory fallback.
 *
 * Attachment ROWS live in localStorage (like everything else); file BYTES
 * live here, keyed by attachment id. file_path values starting with `idb:`
 * resolve through this module into blob: URLs for preview.
 *
 * No IndexedDB (private mode, jsdom) → memory Map: works for the session,
 * lost on reload. Every function degrades, nothing throws.
 */

import { useEffect, useState } from 'react';

export const IDB_PREFIX = 'idb:';
const DB_NAME = 'lance-trial-assets';
const STORE_NAME = 'files';

const memoryFallback = new Map<string, Blob>();
const objectUrlCache = new Map<string, string>();

function idbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(id: string, blob: Blob): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.objectStore(STORE_NAME).put(blob, id);
      }),
  );
}

function idbGet(id: string): Promise<Blob | null> {
  return openDb().then(
    (db) =>
      new Promise<Blob | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => {
          db.close();
          const value = req.result;
          resolve(value instanceof Blob ? value : null);
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      }),
  );
}

function idbDelete(id: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.objectStore(STORE_NAME).delete(id);
      }),
  );
}

/** Store file bytes under an id. Returns the file_path to persist. */
export async function putAssetFile(id: string, file: Blob): Promise<string> {
  if (!idbAvailable()) {
    memoryFallback.set(id, file);
    return `${IDB_PREFIX}${id}`;
  }
  try {
    await idbPut(id, file);
  } catch {
    memoryFallback.set(id, file);
  }
  return `${IDB_PREFIX}${id}`;
}

/** Fetch stored bytes, or null when missing/unavailable. */
export async function getAssetFile(id: string): Promise<Blob | null> {
  if (memoryFallback.has(id)) return memoryFallback.get(id) || null;
  if (!idbAvailable()) return null;
  try {
    const blob = await idbGet(id);
    if (blob) return blob;
  } catch {
    return null;
  }
  return memoryFallback.get(id) || null;
}

/** Remove bytes for an id (row deletion calls this). */
export async function deleteAssetFile(id: string): Promise<void> {
  memoryFallback.delete(id);
  const cached = objectUrlCache.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(id);
  }
  if (!idbAvailable()) return;
  try {
    await idbDelete(id);
  } catch {
    return;
  }
}

/** Remove everything (trial reset calls this). */
export async function clearAssetFiles(): Promise<void> {
  memoryFallback.clear();
  for (const url of objectUrlCache.values()) URL.revokeObjectURL(url);
  objectUrlCache.clear();
  if (!idbAvailable()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.objectStore(STORE_NAME).clear();
    });
  } catch {
    return;
  }
}

/**
 * How many files and how many bytes are stored in IndexedDB.
 *
 * The privacy panel reports these separately from localStorage, because
 * attachment bytes live here and counting only localStorage understates what
 * the trial is keeping, which is how the panel came to claim "0 B across 0
 * keys" while a client's PDF was still on disk.
 */
export async function countAssetFiles(): Promise<number> {
  if (!idbAvailable()) return memoryFallback.size;
  try {
    const db = await openDb();
    return await new Promise<number>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => {
        db.close();
        resolve(req.result);
      };
      req.onerror = () => {
        db.close();
        resolve(memoryFallback.size);
      };
    });
  } catch {
    return 0;
  }
}

export async function assetBytes(): Promise<number> {
  if (!idbAvailable()) {
    let total = 0;
    for (const blob of memoryFallback.values()) total += blob.size;
    return total;
  }
  try {
    const db = await openDb();
    return await new Promise<number>((resolve) => {
      let total = 0;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          db.close();
          resolve(total);
          return;
        }
        const value = cursor.value as Blob | undefined;
        total += value?.size ?? 0;
        cursor.continue();
      };
      req.onerror = () => {
        db.close();
        resolve(total);
      };
    });
  } catch {
    return 0;
  }
}

/**
 * Resolve a stored file_path to something an <img> can use.
 * idb: paths → cached blob: URL (null while loading or when missing).
 * Anything else → the desktop asset:// URL, unchanged behavior.
 */
export function useAssetSrc(filePath: string | undefined): string | null {
  const desktopSrc =
    filePath && !filePath.startsWith(IDB_PREFIX)
      ? `asset://localhost/${encodeURIComponent(filePath)}`
      : null;
  const [src, setSrc] = useState<string | null>(desktopSrc);
  useEffect(() => {
    if (!filePath || !filePath.startsWith(IDB_PREFIX)) {
      setSrc(desktopSrc);
      return;
    }
    const id = filePath.slice(IDB_PREFIX.length);
    const cached = objectUrlCache.get(id);
    if (cached) {
      setSrc(cached);
      return;
    }
    let live = true;
    getAssetFile(id).then((blob) => {
      if (!live || !blob) return;
      const url = URL.createObjectURL(blob);
      objectUrlCache.set(id, url);
      setSrc(url);
    });
    return () => {
      live = false;
    };
  }, [filePath]);
  return src;
}
