import { useStore } from './index';

export function useUpdaterStore() {
  const s = useStore();
  return {
    updateAvailable: s.updateAvailable,
    updateData: s.updateData,
    isDownloading: s.isDownloading,
    downloadProgressMB: s.downloadProgressMB,
    setUpdateAvailable: s.setUpdateAvailable,
    setDownloading: s.setDownloading,
    setDownloadProgress: s.setDownloadProgress,
    dismiss: s.dismissUpdate,
  };
}
