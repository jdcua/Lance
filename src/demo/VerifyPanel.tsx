import { useEffect, useState } from 'react';
import { trialStorageEntries, trialStorageBytes, formatBytes } from './storageProof';
import { wipeTrialKeys } from './trialExport';
import { assetBytes, countAssetFiles } from './assetStore';

/**
 * Auditable-privacy panel. Read-only proof a non-technical user can follow.
 *
 * The honesty rule here is that this panel must not claim more than it did. An
 * earlier version said "your data is the keys below" and "Wipe to remove it"
 * while enumerating only localStorage, attachment bytes lived in IndexedDB,
 * sessionStorage keys survived, and `lance-inv-tool` (a real client name and
 * invoice draft from the free invoice generator) was missed because the
 * predicate matched only `lance:` and `lance_`. A user testing the privacy
 * promise on a shared machine would have been told the wrong thing.
 *
 * So: every storage surface is listed separately, and the wipe awaits IndexedDB
 * before it claims success.
 */
export default function VerifyPanel() {
  const [wiped, setWiped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<{ count: number; bytes: number }>({ count: 0, bytes: 0 });

  const entries = wiped ? [] : trialStorageEntries();
  const total = wiped ? 0 : trialStorageBytes();

  useEffect(() => {
    let live = true;
    Promise.all([countAssetFiles(), assetBytes()])
      .then(([count, bytes]) => {
        if (live) setFiles({ count, bytes });
      })
      .catch(() => {
        /* IndexedDB unavailable: report zero rather than hanging */
      });
    return () => {
      live = false;
    };
  }, [wiped]);

  async function wipe() {
    setBusy(true);
    try {
      await wipeTrialKeys();
      setWiped(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Privacy proof">
      <h2>Verify it yourself</h2>
      <ol>
        <li>Open DevTools → Network, refresh: only the page loads, then silence.</li>
        <li>Open DevTools → Application → Storage: your data is the list below.</li>
        <li>Turn on airplane mode and keep working: invoices, timers, PDFs still work.</li>
        <li>Export to keep it, Wipe to remove it. No account, no server copy.</li>
      </ol>
      <p>
        Text and rows in this browser: <strong>{formatBytes(total)}</strong> across {entries.length}{' '}
        keys.
      </p>
      <ul>
        {entries.slice(0, 20).map((e) => (
          <li key={e.key}>
            {e.key} · {formatBytes(e.bytes)}
          </li>
        ))}
      </ul>
      {entries.length > 20 ? <p>…and {entries.length - 20} more.</p> : null}
      <p>
        Files you attached: <strong>{formatBytes(files.bytes)}</strong> across {files.count} files.
      </p>
      {wiped ? (
        <p role="status">
          Wiped, local storage, session storage, and attached files. Refresh to start fresh.
        </p>
      ) : (
        <button type="button" onClick={wipe} disabled={busy}>
          {busy ? 'Wiping…' : 'Wipe trial data'}
        </button>
      )}
    </section>
  );
}
