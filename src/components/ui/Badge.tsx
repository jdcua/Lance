import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'warning' | 'danger' | 'info' | 'success' | 'dark';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger)]',
  info: 'bg-[var(--info-bg)] text-[var(--info-ink,var(--info))]',
  success: 'bg-[var(--accent-bg)] text-[var(--accent)]',
  dark: 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--neutral-border)]',
};

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
