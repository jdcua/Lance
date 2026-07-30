import { useStore } from './index';

export type ToastType = 'success' | 'error' | 'info' | 'unlock';
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

export function useToasts(): {
  toasts: Toast[];
  add: (message: string, type?: ToastType, duration?: number, actions?: ToastAction[]) => string;
  remove: (id: string) => void;
  update: (id: string, message: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
};
export function useToasts<T>(selector: (state: {
  toasts: Toast[];
  add: (message: string, type?: ToastType, duration?: number, actions?: ToastAction[]) => string;
  remove: (id: string) => void;
  update: (id: string, message: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
}) => T): T;
export function useToasts(selector?: (state: any) => any) {
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
