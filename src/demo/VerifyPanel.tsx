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
      {/* Full key list sits behind a disclosure: the proof stays one click
          away, and reads as designed UI rather than a devtools panel. */}
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-[8px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="text-[10px] text-[var(--text-tertiary)] transition-transform group-open:rotate-90">▶</span>
          Show all {entries.length} keys · {formatBytes(total)}
        </summary>
        <ul className="mt-2 max-h-[220px] space-y-1 overflow-y-auto rounded-[8px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2">
          {entries.map((e) => (
            <li
              key={e.key}
              className="flex items-center justify-between gap-2 rounded-[6px] bg-[var(--bg-card)] px-2 py-1"
            >
              <code className="truncate font-mono text-[11px] text-[var(--text-primary)]">
                {e.key}
              </code>
              <span className="shrink-0 rounded-full bg-[var(--accent-bg)] px-1.5 py-px text-[10px] font-semibold text-[var(--accent-ink,var(--accent))]">
                {formatBytes(e.bytes)}
              </span>
            </li>
          ))}
        </ul>
      </details>
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
