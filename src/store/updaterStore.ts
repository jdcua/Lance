import { create } from 'zustand';

interface UpdaterState {
  updateAvailable: boolean;
  updateData: any | null;
  isDownloading: boolean;
  downloadProgressMB: string | null;
  setUpdateAvailable: (updateData: any) => void;
  setDownloading: (isDownloading: boolean) => void;
  setDownloadProgress: (mb: string) => void;
  dismiss: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set) => ({
  updateAvailable: false,
  updateData: null,
  isDownloading: false,
  downloadProgressMB: null,
  setUpdateAvailable: (updateData) => set({ updateAvailable: true, updateData }),
  setDownloading: (isDownloading) => set({ isDownloading }),
  setDownloadProgress: (mb) => set({ downloadProgressMB: mb }),
  dismiss: () => set({ updateAvailable: false, updateData: null, isDownloading: false, downloadProgressMB: null })
}));
