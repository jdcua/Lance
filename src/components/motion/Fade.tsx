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
 * Motion-Primitives style entrance: blur + rise + fade, fired once in view.
 * Honors prefers-reduced-motion via the root MotionConfig.
 */
export default function Fade({ children, delay = 0, y = 14, className, once = true }: FadeProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, margin: '-40px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
