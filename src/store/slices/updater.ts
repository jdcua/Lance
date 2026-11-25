/**
 * Updater slice: update-check state and actions.
 */
import type { Update } from '@tauri-apps/plugin-updater';

export type UpdaterSlice = {
  updateAvailable: boolean;
  updateData: Update | null;
  isDownloading: boolean;
  downloadProgressMB: string | null;
  setUpdateAvailable: (data: Update) => void;
  setDownloading: (val: boolean) => void;
  setDownloadProgress: (mb: string) => void;
  dismissUpdate: () => void;
};

type SetUpdater = (
  partial: Partial<UpdaterSlice> | ((state: UpdaterSlice) => Partial<UpdaterSlice>),
  replace?: boolean,
) => void;

export function createUpdaterSlice(set: SetUpdater): UpdaterSlice {
  return {
    updateAvailable: false,
    updateData: null,
    isDownloading: false,
    downloadProgressMB: null,
    setUpdateAvailable: (data) => set({ updateAvailable: true, updateData: data }),
    setDownloading: (val) => set({ isDownloading: val }),
    setDownloadProgress: (mb) => set({ downloadProgressMB: mb }),
    dismissUpdate: () =>
      set({
        updateAvailable: false,
        updateData: null,
        isDownloading: false,
        downloadProgressMB: null,
      }),
  };
}
