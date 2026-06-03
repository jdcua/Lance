import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-[12px] shadow-xl w-full ${sizeClasses[size]} mx-4 max-h-[85vh] flex flex-col animate-fade-scale-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E3]">
          <h2 className="text-base font-semibold text-[#1C1C1A]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-[8px] text-[#A3A39E] hover:text-[#1C1C1A] hover:bg-[#F2F2F0] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
