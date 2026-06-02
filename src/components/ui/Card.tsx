import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#E5E5E3] rounded-[12px] p-5 ${onClick ? 'cursor-pointer hover:border-[#D4D4D2] transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
