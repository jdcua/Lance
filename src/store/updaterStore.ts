import { useStore } from './index';
import type { Update } from '@tauri-apps/plugin-updater';

type UpdaterStoreShape = {
  updateAvailable: boolean;
  updateData: Update | null;
  isDownloading: boolean;
  downloadProgressMB: string | null;
  setUpdateAvailable: (data: Update) => void;
  setDownloading: (val: boolean) => void;
  setDownloadProgress: (mb: string) => void;
  dismiss: () => void;
};

export function useUpdaterStore(): UpdaterStoreShape;
export function useUpdaterStore<T>(selector: (s: UpdaterStoreShape) => T): T;
export function useUpdaterStore(selector?: (s: UpdaterStoreShape) => unknown) {
  const s = useStore();
  const bundle = {
    updateAvailable: s.updateAvailable,
    updateData: s.updateData,
    isDownloading: s.isDownloading,
    downloadProgressMB: s.downloadProgressMB,
    setUpdateAvailable: s.setUpdateAvailable,
    setDownloading: s.setDownloading,
    setDownloadProgress: s.setDownloadProgress,
    dismiss: s.dismissUpdate,
  };
  if (selector) return selector(bundle);
  return bundle;
}
