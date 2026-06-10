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
      className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[12px] py-5 px-6 shadow-[var(--card-shadow)] transition-all duration-150 ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-px' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
