import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { TOKENS } from '../../theme/tokens';

// Magic shimmer-button — conic spark driven by frame loop (not CSS keyframes).
export const ShimmerButton: React.FC<{ label: string; accent?: string }> = ({
  label,
  accent = TOKENS.green,
}) => {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame % 90, [0, 90], [0, 100]);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '22px 48px',
        borderRadius: 999,
        background: accent,
        color: '#08150E',
        fontSize: 30,
        fontWeight: 700,
        fontFamily: TOKENS.fontB,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(30,201,138,.35)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(100deg, transparent ${sweep - 20}%, rgba(255,255,255,.55) ${sweep}%, transparent ${sweep + 20}%)`,
        }}
      />
      <span style={{ position: 'relative' }}>{label}</span>
    </div>
  );
};
