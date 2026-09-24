import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

/**
 * Motion-Primitives AnimatedNumber: spring-physics count-up,
 * tabular numerals, instant under reduced motion.
 */
export default function AnimatedNumber({
  value,
  format = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—'),
  className,
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 20 });
  const text = useTransform(spring, (v) => format(v));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    mv.set(0);
    const raf = requestAnimationFrame(() => mv.set(value));
    return () => cancelAnimationFrame(raf);
  }, [value, mv, reduce]);

  if (reduce) return <span className={className}>{format(value)}</span>;
  return <motion.span className={className}>{text}</motion.span>;
}
