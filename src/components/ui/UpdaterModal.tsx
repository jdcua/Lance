import { useUpdaterStore } from '../../store/updaterStore';
import Modal from './Modal';
import Button from './Button';
import { relaunch } from '@tauri-apps/plugin-process';
import type { DownloadEvent } from '@tauri-apps/plugin-updater';
import { Download, Sparkles } from 'lucide-react';
import { getDb } from '../../db';

const DEFER_DURATION = 24 * 60 * 60 * 1000;
const LATER_KEY = 'lance_update_deferred_until';

async function logAppEvent(eventType: string, payload?: Record<string, unknown>): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      'INSERT INTO app_events (event_type, payload) VALUES ($1, $2)',
      [eventType, payload ? JSON.stringify(payload) : null]
    );
  } catch {
    /* event logging is best-effort */
  }
}

export default function UpdaterModal() {
  const { updateAvailable, updateData, isDownloading, downloadProgressMB, setDownloading, setDownloadProgress, dismiss } = useUpdaterStore();

  if (!updateAvailable || !updateData) return null;

  const handleUpdate = async () => {
    setDownloading(true);
    try {
      const fromVersion = updateData.currentVersion;
      await updateData.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === 'Progress') {
          const mb = (event.data.chunkLength / (1024 * 1024)).toFixed(1);
          setDownloadProgress(mb);
        }
      });
      // Log update event for audit trail
      await logAppEvent('update_applied', {
        from_version: fromVersion,
        to_version: updateData.version,
        timestamp: new Date().toISOString(),
      });
      await relaunch();
    } catch {
      setDownloading(false);
    }
  };

  const handleLater = () => {
    localStorage.setItem(LATER_KEY, String(Date.now() + DEFER_DURATION));
    dismiss();
  };

  return (
    <Modal open={updateAvailable} onClose={isDownloading ? () => {} : handleLater} title="Software Update Available" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          <Sparkles size={18} className="text-[var(--accent-ink,var(--accent))] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Lance {updateData.version} is here</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              A new version of Lance is ready to be installed. We recommend updating to get the latest features and bug fixes.
            </p>
          </div>
        </div>

        {updateData.body && (
          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] p-3 rounded-[8px] max-h-40 overflow-y-auto whitespace-pre-wrap">
            {updateData.body}
          </div>
        )}

        {isDownloading && (
          <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[var(--accent-bg)] border border-[var(--accent)]/30">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--accent)] border-t-transparent flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--accent-ink,var(--accent))]">Downloading update...</p>
              {downloadProgressMB && <p className="text-[10px] text-[var(--accent-ink,var(--accent))]/80 mt-0.5">{downloadProgressMB} MB downloaded</p>}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
          <Button variant="secondary" onClick={handleLater} disabled={isDownloading} size="sm">Remind me later</Button>
          <Button variant="primary" onClick={handleUpdate} disabled={isDownloading} loading={isDownloading} size="sm">
            <Download size={14} />
            {isDownloading ? 'Installing...' : 'Install Update'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
