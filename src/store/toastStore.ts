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
