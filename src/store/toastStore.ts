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

export function useToasts(selector?: (state: any) => any) {
  const state = useStore();
  if (selector) return selector(state);
  return {
    toasts: state.toasts,
    add: state.addToast,
    remove: state.removeToast,
    update: state.updateToast,
    pause: state.pauseToast,
    resume: state.resumeToast,
  };
}

export { toastStore };
