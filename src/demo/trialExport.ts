/**
 * Trial continuity: export what you made, wipe what you don't want.
 *
 * Uses the same backup envelope the desktop app imports
 * (fetchBackupTables + createExportEnvelope), so a trial file opens
 * cleanly via Settings > Backup > Import on desktop.
 * Browser path downloads a Blob. No server involved.
 */

import { fetchBackupTables, createExportEnvelope } from '../utils/backup';
import { getRuntimeVersion } from '../lib/version';
import { seedSampleData } from '../utils/seedData';
import { clearAssetFiles } from './assetStore';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function trialFilename(version: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `lance-trial-${version}-${date}.json`;
}

/** Export the whole trial (including seeded rows) as a desktop-ready file.
 *  Attachment bytes ride along when small (see backup.ts caps); anything
 *  bigger stays in this browser and the UI says so honestly. */
export async function exportTrialFile(): Promise<{ filename: string; filesStayBehind: boolean }> {
  const { fetchAttachmentBlobs, ATTACHMENT_BLOB_TABLE } = await import('../utils/backup');
  const data = await fetchBackupTables();
  const { blobs, skipped } = await fetchAttachmentBlobs();
  if (blobs.length > 0) data[ATTACHMENT_BLOB_TABLE] = blobs;
  const version = await getRuntimeVersion().catch(() => '0.0.0');
  // Same lazy import as backup.ts: keeps the Tauri SQL plugin out of the
  // trial's initial bundle and matches whatever the desktop build expects.
  const { getCurrentSchemaVersion } = await import('../db');
  const envelope = createExportEnvelope(data, version, getCurrentSchemaVersion());
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const filename = trialFilename(version);
  downloadBlob(blob, filename);
  return { filename, filesStayBehind: skipped > 0 || trialHasUnportableFiles(data, blobs) };
}

/** Start over with a fresh seeded business. Removes everything the trial
 *  stored (seeds AND anything created while trying), keeps profile and
 *  prefs, then reloads so the store re-reads from a clean slate. */
export async function resetTrial(): Promise<void> {
  removeTrialDataKeys();
  const { clearAssetFiles } = await import('./assetStore');
  await clearAssetFiles();
  await seedSampleData();
  window.location.reload();
}

/** All trial DATA keys: store tables, seed markers, achievements, template
 *  flags. Profile, onboarding, theme and follow-up prefs are left alone. */
function removeTrialDataKeys(): void {
  const victims: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith('lance:store:') ||
        key === 'lance:seeded' ||
        key === 'lance:seeded-ids' ||
        key === 'lance:seeded-toast-shown' ||
        key === 'lance:achievements' ||
        key === 'lance:achievements-pre-seed' ||
        key === 'lance:templates-seeded'
      ) {
        victims.push(key);
      }
    }
  } catch {
    return;
  }
  for (const key of victims) {
    try {
      localStorage.removeItem(key);
    } catch {
      continue;
    }
  }
}

/** True when some idb: attachment row has no exported bytes to carry it. */
export function trialHasUnportableFiles(
  data: Record<string, unknown[]>,
  exported: { id: string }[] = [],
): boolean {
  const attachments = data.attachments;
  if (!Array.isArray(attachments)) return false;
  const carried = new Set(exported.map((b) => b.id));
  return attachments.some(
    (row) =>
      row &&
      typeof row === 'object' &&
      typeof (row as Record<string, unknown>).file_path === 'string' &&
      ((row as Record<string, unknown>).file_path as string).startsWith('idb:') &&
      !carried.has((row as Record<string, unknown>).id as string),
  );
}

/** Every storage surface the trial writes to, and the prefix that marks it. */
const STORAGE_PREFIXES = ['lance:', 'lance_', 'lance-'];

function isLanceKey(key: string): boolean {
  return STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * Remove every trial key so the next visit starts blank.
 *
 * This used to be localStorage-only, which made the in-app "Wipe trial data"
 * button an active lie: it reported success while the attachment bytes stayed
 * in IndexedDB and sessionStorage keys survived. `lance-inv-tool` (the free
 * invoice generator's draft, real client names and line items) was missed
 * entirely because the predicate only matched `lance:` and `lance_`.
 *
 * Async because IndexedDB deletion is a real await. Callers must await it.
 */
export async function wipeTrialKeys(): Promise<void> {
  const victims: string[] = [];
  for (const store of [localStorage, sessionStorage]) {
    try {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && isLanceKey(key)) victims.push(`${store === localStorage ? 'l' : 's'}:${key}`);
      }
    } catch {
      /* private mode or storage disabled */
    }
  }
  for (const victim of victims) {
    const [scope, key] = victim.split(':');
    try {
      (scope === 'l' ? localStorage : sessionStorage).removeItem(key as string);
    } catch {
      /* already gone */
    }
  }
  await clearAssetFiles();
}
