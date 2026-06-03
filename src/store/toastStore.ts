import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

interface ToastState {
  toasts: Toast[];
  add: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts.slice(-2), { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  remove: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
