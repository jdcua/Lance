import { useState } from 'react';
import { trialStorageEntries, trialStorageBytes, formatBytes } from './storageProof';
import { wipeTrialKeys } from './trialExport';

/**
 * Auditable-privacy panel. Read-only proof a non-technical user can follow:
 * 1. Network stays silent (see HOW below). 2. Data is visible here.
 * 3. Airplane mode keeps working. 4. Wipe removes everything.
 */
export default function VerifyPanel() {
  const [wiped, setWiped] = useState(false);
  const entries = wiped ? [] : trialStorageEntries();
  const total = wiped ? 0 : trialStorageBytes();

  function wipe() {
    wipeTrialKeys();
    setWiped(true);
  }

  return (
    <section aria-label="Privacy proof">
      <h2>Verify it yourself</h2>
      <ol>
        <li>Open DevTools → Network, refresh: only the page loads, then silence.</li>
        <li>Open DevTools → Application → Local Storage: your data is the keys below.</li>
        <li>Turn on airplane mode and keep working: invoices, timers, PDFs still work.</li>
        <li>Export to keep it, Wipe to remove it. No account, no server copy.</li>
      </ol>
      <p>
        Stored in this browser: <strong>{formatBytes(total)}</strong> across {entries.length} keys.
      </p>
      <ul>
        {entries.slice(0, 20).map((e) => (
          <li key={e.key}>
            {e.key} · {formatBytes(e.bytes)}
          </li>
        ))}
      </ul>
      {entries.length > 20 ? <p>…and {entries.length - 20} more.</p> : null}
      <button type="button" onClick={wipe} disabled={wiped}>
        {wiped ? 'Wiped — refresh to start fresh' : 'Wipe trial data'}
      </button>
    </section>
  );
}
