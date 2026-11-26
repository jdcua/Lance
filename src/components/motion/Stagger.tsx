import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}

/**
 * Motion-Primitives AnimatedGroup: children wrapped in <StaggerItem>
 * rise in sequence when scrolled into view.
 */
export function StaggerGroup({
  children,
  className,
  stagger = 0.07,
  delay = 0,
}: StaggerGroupProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      // Hero cap (tokens.motion.dur.hero = 450ms): entrances never exceed it.
      // No blur: filter animation repaints every frame; opacity + transform
      // stay on the compositor (see Fade).
      transition: { duration: 0.45, ease: [...EASE] },
    },
  };
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
