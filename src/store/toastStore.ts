import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'unlock';

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

interface ToastState {
  toasts: Toast[];
  add: (message: string, type?: ToastType, duration?: number) => void;
  remove: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
}

const toastTimers = new Map<string, { timeoutId: ReturnType<typeof setTimeout>; startedAt: number; duration: number }>();

function clearTimer(id: string) {
  const timer = toastTimers.get(id);
  if (timer) {
    clearTimeout(timer.timeoutId);
  }
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info', duration) => {
    const id = crypto.randomUUID();
    const ms = duration || (type === 'unlock' ? 4000 : 3000);
    set((state) => ({
      toasts: [...state.toasts.slice(-2), { id, message, type, duration }],
    }));
    const timeoutId = setTimeout(() => {
      toastTimers.delete(id);
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, ms);
    toastTimers.set(id, { timeoutId, startedAt: Date.now(), duration: ms });
  },
  remove: (id) => {
    clearTimer(id);
    toastTimers.delete(id);
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  pause: (id) => {
    const timer = toastTimers.get(id);
    if (!timer) return;
    clearTimeout(timer.timeoutId);
    const elapsed = Date.now() - timer.startedAt;
    timer.duration = Math.max(0, timer.duration - elapsed);
    timer.startedAt = 0;
  },
  resume: (id) => {
    const timer = toastTimers.get(id);
    if (!timer) return;
    const ms = timer.duration;
    const startedAt = Date.now();
    const timeoutId = setTimeout(() => {
      toastTimers.delete(id);
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, ms);
    toastTimers.set(id, { timeoutId, startedAt, duration: ms });
  },
}));
