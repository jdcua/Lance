import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

interface FadeProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}

/**
 * Entrance: rise + fade, fired once in view. Transform/opacity only —
 * blur() was dropped: animating backdrop filters repaints every frame and
 * janks on dense screens (dashboard grids, long lists). Honors
 * prefers-reduced-motion via the root MotionConfig.
 */
export default function Fade({ children, delay = 0, y = 14, className, once = true }: FadeProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-40px' }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
