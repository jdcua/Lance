import { useToasts } from '../../store/toastStore';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Sparkles } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
  unlock: Sparkles,
};

const colors = {
  success: 'bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent)]/20',
  error: 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/20',
  info: 'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info)]/20',
  warning: 'bg-[var(--medium-conf-bg)] text-[var(--medium-conf-text)] border-[var(--medium-conf-text)]/20',
  unlock: 'bg-[var(--accent)] text-white border-[var(--accent)]',
};

export default function ToastContainer() {
  const { toasts, remove, pause, resume } = useToasts();

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          onMouseEnter={() => pause(toast.id)}
          onMouseLeave={() => resume(toast.id)}
          className={`pointer-events-auto flex flex-col gap-2 px-4 py-3 rounded-[8px] border shadow-lg text-sm max-w-sm animate-slide-in ${colors[toast.type]}`}
        >
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = icons[toast.type];
              return <Icon size={16} className="flex-shrink-0" />;
            })()}
            <span className="flex-1 text-[var(--text-primary)]">{toast.message}</span>
            <button onClick={() => remove(toast.id)} aria-label="Dismiss notification" className="opacity-50 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
          {toast.actions && toast.actions.length > 0 && (
            <div className="flex gap-2 justify-end">
              {toast.actions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => { remove(toast.id); action.onClick(); }}
                  className="px-3 py-1 rounded-[4px] border border-current/20 hover:bg-current/10 text-xs font-medium"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
