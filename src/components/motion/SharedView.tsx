import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { motion as tokens } from '../../design/tokens';

interface SharedViewProps {
  /** stable id shared between list card and detail view — drives the morph */
  layoutId: string;
  children: ReactNode;
  className?: string;
}

/**
 * Shared-element list→detail transition. Same layoutId in both places morphs
 * position/size with a spring (transform only); under reduced-motion it is a
 * plain wrapper. Interruptible by design — motion never blocks navigation.
 * (Consumers land in Wave 2: pipeline cards, client rows, invoice rows.)
 */
export default function SharedView({ layoutId, children, className }: SharedViewProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      layoutId={layoutId}
      transition={{
        type: 'spring',
        stiffness: tokens.springs.modal.stiffness,
        damping: tokens.springs.modal.damping,
      }}
    >
      {children}
    </motion.div>
  );
}
