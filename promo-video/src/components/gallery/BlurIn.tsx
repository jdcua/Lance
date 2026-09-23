import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';

// Motion text-effect "blur" preset — frame-driven (no CSS transitions).
export const BlurIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  y?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, y = 16, style }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        opacity: t,
        filter: `blur(${(1 - t) * 10}px)`,
        transform: `translateY(${(1 - t) * y}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
