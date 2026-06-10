import { useState, useEffect } from 'react';
import { useToasts } from '../../store/toastStore';
import { X, CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  unlock: Sparkles,
};

const colors = {
  success: 'bg-[#E6F5EE] text-[#1D9E75] border-[#1D9E75]/20',
  error: 'bg-[#FCEBEB] text-[#A32D2D] border-[#A32D2D]/20',
  info: 'bg-[#E6F1FB] text-[#185FA5] border-[#185FA5]/20',
  unlock: 'bg-[#1D9E75] text-white border-[#1D9E75]',
};

export default function ToastContainer() {
  const { toasts, remove } = useToasts();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-[8px] border shadow-lg text-sm max-w-sm animate-slide-in ${colors[toast.type]}`}
        >
          {(() => {
            const Icon = icons[toast.type];
            return <Icon size={16} className="flex-shrink-0" />;
          })()}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => remove(toast.id)} className="opacity-50 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
