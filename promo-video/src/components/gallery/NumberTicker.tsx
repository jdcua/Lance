import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

// Magic number-ticker — spring-driven count-up.
export const NumberTicker: React.FC<{
  to: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ to, prefix = '', suffix = '', delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = spring({ fps, frame, delay, config: { damping: 80, stiffness: 120 } });
  return <span style={style}>{`${prefix}${Math.round(v * to).toLocaleString()}${suffix}`}</span>;
};
