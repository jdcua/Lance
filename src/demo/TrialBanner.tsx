import { useState } from 'react';
import { exportTrialFile, resetTrial } from './trialExport';
import VerifyPanel from './VerifyPanel';

/**
 * Trial banner: what this is, where data lives, how to keep it.
 * One component, three actions, no network. Handwritten for reviewability.
 */
export default function TrialBanner() {
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [showVerify, setShowVerify] = useState(false);

  async function runExport() {
    setBusy('export');
    setNote('');
    try {
      const { filename, filesStayBehind } = await exportTrialFile();
      setNote(
        `Saved ${filename}. Import it on desktop via Settings.` +
          (filesStayBehind ? ' Attached file contents stay in this browser.' : ''),
      );
    } catch {
      setNote('That failed in this browser. Try again or use a different browser.');
    }
    setBusy('');
  }

  async function runReset() {
    setBusy('reset');
    setNote('');
    try {
      await resetTrial();
      setNote('Done.');
    } catch {
      setNote('That failed in this browser. Try again or use a different browser.');
    }
    setBusy('');
  }

  function downloadDesktop() {
    const ua = navigator.userAgent || '';
    if (/Mac/i.test(ua)) window.location.href = '/api/download/mac';
    else if (/Windows/i.test(ua)) window.location.href = '/api/download/win';
    else window.location.href = '/api/download/linux';
  }

  const btn =
    'text-xs font-medium px-2.5 py-1 rounded-[6px] border border-[var(--border-color)] ' +
    'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] ' +
    'disabled:opacity-50 transition-colors';

  return (
    <div
      role="status"
      aria-label="Trial mode"
      className="border-b border-[var(--border-color)] bg-[var(--accent-bg)] px-6 py-2 print:hidden"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
        <span className="text-[var(--text-primary)]">
          <strong>Trial — runs 100% in this browser.</strong>
          <span className="text-[var(--text-secondary)]">
            {' '}
            Saved in localStorage on this device only, survives refresh, never sent anywhere.
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={btn} disabled={busy !== ''} onClick={runExport}>
            {busy === 'export' ? 'Exporting…' : 'Export trial data'}
          </button>
          <button type="button" className={btn} disabled={busy !== ''} onClick={runReset}>
            {busy === 'reset' ? 'Resetting…' : 'Reset demo'}
          </button>
          <button type="button" className={btn} onClick={downloadDesktop}>
            Download desktop app
          </button>
          <button
            type="button"
            className={btn}
            aria-expanded={showVerify}
            onClick={() => setShowVerify((v) => !v)}
          >
            {showVerify ? 'Hide proof' : 'Prove it'}
          </button>
        </span>
      </div>
      {note ? <div className="mt-1 text-xs text-[var(--text-secondary)]">{note}</div> : null}
      {showVerify ? (
        <div className="mt-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-[13px]">
          <VerifyPanel />
        </div>
      ) : null}
    </div>
  );
}
