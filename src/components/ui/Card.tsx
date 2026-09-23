import type { ReactNode, KeyboardEvent } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[16px] py-5 px-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),var(--card-shadow)] transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-[var(--card-hover-shadow)] hover:-translate-y-[1px] hover:border-[var(--text-tertiary)]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
