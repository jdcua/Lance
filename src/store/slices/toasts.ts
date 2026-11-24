/**
 * Toasts slice: notification queue state and actions.
 * The toast timer map lives here instead of interleaved with entity CRUD.
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'unlock';

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

export type ToastsSlice = {
  toasts: Toast[];
  addToast: (
    message: string,
    type?: ToastType,
    duration?: number,
    actions?: ToastAction[],
  ) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, message: string) => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;
};

type GetToasts = () => { toasts: Toast[] };
type SetToasts = (partial: Partial<ToastsSlice> | ((s: ToastsSlice) => Partial<ToastsSlice>), replace?: boolean) => void;

const toastTimers = new Map<
  string,
  { timeoutId: ReturnType<typeof setTimeout>; startedAt: number; duration: number }
>();

function clearToastTimer(id: string) {
  const timer = toastTimers.get(id);
  if (timer) clearTimeout(timer.timeoutId);
}

export function createToastsSlice(set: SetToasts, get: GetToasts): ToastsSlice {
  const msFor = (type: ToastType, actions?: ToastAction[], duration?: number): number =>
    duration ?? (actions ? 0 : type === 'unlock' ? 4000 : 3000);

  return {
    toasts: [],
    addToast: (message, type = 'info', duration, actions) => {
      const id = crypto.randomUUID();
      const ms = msFor(type as ToastType, actions, duration);
      if (!actions && ms !== 0) {
        const dupe = get().toasts.find(
          (t: Toast) => t.message === message && t.type === type && !t.actions,
        );
        if (dupe) {
          clearToastTimer(dupe.id);
          toastTimers.delete(dupe.id);
          const timeoutId = setTimeout(() => {
            toastTimers.delete(dupe.id);
            set((s: ToastsSlice) => ({ toasts: s.toasts.filter((t) => t.id !== dupe.id) }));
          }, ms);
          toastTimers.set(dupe.id, { timeoutId, startedAt: Date.now(), duration: ms });
          return dupe.id;
        }
      }
      set((s: ToastsSlice) => ({ toasts: [...s.toasts.slice(-2), { id, message, type: type as any, duration, actions }] }));
      if (ms === 0) return id;
      const timeoutId = setTimeout(() => {
        toastTimers.delete(id);
        set((s: ToastsSlice) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, ms);
      toastTimers.set(id, { timeoutId, startedAt: Date.now(), duration: ms });
      return id;
    },
    removeToast: (id) => {
      clearToastTimer(id);
      toastTimers.delete(id);
      set((s: ToastsSlice) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },
    updateToast: (id, message) => {
      set((s: ToastsSlice) => ({ toasts: s.toasts.map((t: Toast) => (t.id === id ? { ...t, message } : t)) }));
    },
    pauseToast: (id) => {
      const timer = toastTimers.get(id);
      if (!timer) return;
      clearTimeout(timer.timeoutId);
      const elapsed = Date.now() - timer.startedAt;
      timer.duration = Math.max(0, timer.duration - elapsed);
      timer.startedAt = 0;
    },
    resumeToast: (id) => {
      const timer = toastTimers.get(id);
      if (!timer) return;
      const ms = timer.duration;
      const startedAt = Date.now();
      const timeoutId = setTimeout(() => {
        toastTimers.delete(id);
        set((s: ToastsSlice) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, ms);
      toastTimers.set(id, { timeoutId, startedAt, duration: ms });
    },
  };
}
