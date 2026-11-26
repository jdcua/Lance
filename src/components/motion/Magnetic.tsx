import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';
import type { ReactNode, MouseEvent } from 'react';

interface MagneticProps {
  children: ReactNode;
  strength?: number;
  className?: string;
}

/**
 * Motion-Primitives Magnetic: the wrapper leans toward the cursor
 * with spring physics, then settles back on leave.
 */
export default function Magnetic({ children, strength = 0.25, className }: MagneticProps) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 14, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 180, damping: 14, mass: 0.4 });

  if (reduce) return <div className={className}>{children}</div>;

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}
