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
  primary:
    'bg-[var(--accent)] text-[var(--accent-on)] shadow-[0_1px_2px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.22)] hover:brightness-[1.06] active:brightness-[0.96] active:scale-[0.98]',
  secondary: 'surface text-[var(--text-primary)] hover:-translate-y-[1px] active:scale-[0.98]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] active:scale-[0.98]',
  danger:
    'bg-[var(--danger)] text-white shadow-[0_1px_2px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.18)] hover:brightness-[1.06] active:brightness-[0.96] active:scale-[0.98]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-sm',
  md: 'px-4 py-2 text-sm rounded-sm',
  lg: 'px-6 py-3 text-base rounded-sm',
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
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
