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
      className={`surface rounded-[20px] p-6 transition-[transform,box-shadow,border-color] duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-[3px] hover:shadow-[var(--glass-shadow)]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
