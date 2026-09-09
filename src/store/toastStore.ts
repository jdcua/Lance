import { useStore } from './index';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'unlock';
export type ToastAction = { label: string; onClick: () => void };
export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  actions?: ToastAction[];
};

const toastStore = {
  get toasts() { return useStore.getState().toasts; },
  add: (message: string, type: ToastType = 'info', duration?: number, actions?: ToastAction[]): string =>
    useStore.getState().addToast(message, type, duration, actions),
  remove: (id: string) => useStore.getState().removeToast(id),
  update: (id: string, message: string) => useStore.getState().updateToast(id, message),
  pause: (id: string) => useStore.getState().pauseToast(id),
  resume: (id: string) => useStore.getState().resumeToast(id),
};

export interface ToastSlice {
  toasts: Toast[];
  add: (message: string, type?: ToastType, duration?: number, actions?: ToastAction[]) => string;
  remove: (id: string) => void;
  update: (id: string, message: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
}
export function useToasts(): ToastSlice;
export function useToasts<T>(selector: (state: ToastSlice) => T): T;
export function useToasts(selector?: (state: ToastSlice) => unknown) {
  const bundle = useStore();
  if (selector) {
    return selector({
      toasts: bundle.toasts,
      add: bundle.addToast,
      remove: bundle.removeToast,
      update: bundle.updateToast,
      pause: bundle.pauseToast,
      resume: bundle.resumeToast,
    });
  }
  return {
    toasts: bundle.toasts,
    add: bundle.addToast,
    remove: bundle.removeToast,
    update: bundle.updateToast,
    pause: bundle.pauseToast,
    resume: bundle.resumeToast,
  };
}

export { toastStore };
