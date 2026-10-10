import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

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
  // Tick from the previous value, not from zero: replaying the full count-up
  // on every update felt gimmicky on frequently-changing numbers (outstanding
  // totals, timers) and wasted frames. First mount still counts from zero.
  const prev = useRef(0);

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      prev.current = value;
      return;
    }
    mv.set(prev.current);
    const raf = requestAnimationFrame(() => mv.set(value));
    prev.current = value;
    return () => cancelAnimationFrame(raf);
  }, [value, mv, reduce]);

  if (reduce) return <span className={className}>{format(value)}</span>;
  return <motion.span className={className}>{text}</motion.span>;
}
