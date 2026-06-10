import type { ReactNode, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-b from-[#1FAD80] to-[#1D9E75] text-white hover:bg-gradient-to-b hover:from-[#1D9E75] hover:to-[#178F68] active:from-[#178F68] active:to-[#137A56]',
  secondary: 'bg-[#F7F6F2] text-[#1C1C1A] border border-[#E5E5E3] hover:bg-[#EFEEEA]',
  ghost: 'bg-transparent text-[#6B6B67] hover:bg-[#F2F2F0]',
  danger: 'bg-[#A32D2D] text-white hover:bg-[#8B2525]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-[8px]',
  md: 'px-4 py-2 text-sm rounded-[8px]',
  lg: 'px-6 py-3 text-base rounded-[8px]',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium tracking-[0.1px] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/40 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
