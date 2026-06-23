import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'unlock';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  actions?: ToastAction[];
};

interface ToastState {
  toasts: Toast[];
  add: (message: string, type?: ToastType, duration?: number, actions?: ToastAction[]) => string;
  remove: (id: string) => void;
  update: (id: string, message: string) => void;
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
  add: (message, type = 'info', duration, actions) => {
    const id = crypto.randomUUID();
    const ms = duration || (actions ? 0 : type === 'unlock' ? 4000 : 3000);
    set((state) => ({
      toasts: [...state.toasts.slice(-2), { id, message, type, duration, actions }],
    }));
    if (ms === 0) return id;
    const timeoutId = setTimeout(() => {
      toastTimers.delete(id);
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, ms);
    toastTimers.set(id, { timeoutId, startedAt: Date.now(), duration: ms });
    return id;
  },
  remove: (id) => {
    clearTimer(id);
    toastTimers.delete(id);
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  update: (id, message) => {
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, message } : t)),
    }));
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
