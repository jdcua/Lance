import { NavLink } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface SideLinkProps {
  to: string;
  end?: boolean;
  tour?: string;
  title: string;
  icon: LucideIcon;
  /** Hidden when the rail is collapsed */
  label?: string;
  expanded: boolean;
  badge?: ReactNode;
  className?: string;
}

/**
 * Sidebar link with a shared-element active pill (Motion layoutId):
 * the highlight physically travels between sections.
 */
export default function SideLink({
  to,
  end,
  tour,
  title,
  icon: Icon,
  label,
  expanded,
  badge,
  className = '',
}: SideLinkProps) {
  const reduce = useReducedMotion();
  return (
    <NavLink
      to={to}
      end={end}
      data-tour={tour}
      title={title}
      className={({ isActive }) =>
        `relative flex items-center gap-2.5 px-3 h-[44px] text-[13.5px] font-medium transition-colors duration-150 rounded-[10px] ${
          !expanded ? 'justify-center px-0' : ''
        } ${isActive ? 'text-[var(--sb-text-active)]' : 'text-[var(--sb-text)] hover:text-[var(--sb-text-active)] hover:bg-[var(--sb-bg-hover)]'} ${className}`
      }
      style={{ fontFamily: "'Syne', sans-serif" }}
    >
      {({ isActive }) => (
        <>
          {isActive &&
            (reduce ? (
              <span className="absolute inset-0 rounded-[10px] bg-[var(--sb-bg-active)]" />
            ) : (
              <motion.span
                layoutId="sb-active-pill"
                className="absolute inset-0 rounded-[10px] bg-[var(--sb-bg-active)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                transition={{ type: 'spring', stiffness: 480, damping: 38 }}
              />
            ))}
          <span
            className={`relative z-10 flex items-center gap-2.5 flex-1 min-w-0 ${
              !expanded ? 'justify-center' : ''
            } ${isActive ? '[&>svg]:text-[var(--accent)]' : ''}`}
          >
            <Icon size={16} className="flex-shrink-0" />
            {expanded && label && <span className="flex-1 truncate">{label}</span>}
            {expanded && badge}
          </span>
        </>
      )}
    </NavLink>
  );
}
