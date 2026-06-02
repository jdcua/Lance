import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'warning' | 'danger' | 'info' | 'success';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#F2F2F0] text-[#6B6B67]',
  warning: 'bg-[#FAEEDA] text-[#854F0B]',
  danger: 'bg-[#FCEBEB] text-[#A32D2D]',
  info: 'bg-[#E6F1FB] text-[#185FA5]',
  success: 'bg-[#E6F5EE] text-[#1D9E75]',
};

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
