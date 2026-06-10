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
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info', duration) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts.slice(-2), { id, message, type, duration }],
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration || (type === 'unlock' ? 4000 : 3000));
  },
  remove: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
