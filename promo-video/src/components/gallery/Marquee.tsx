import React from 'react';
import { useCurrentFrame } from 'remotion';
import { TOKENS } from '../../theme/tokens';

// Magic marquee — x = -frame * speed, seamless doubled row.
export const Marquee: React.FC<{ words: string[]; speed?: number }> = ({
  words,
  speed = 3,
}) => {
  const frame = useCurrentFrame();
  const row = [...words, ...words].join('  ·  ');
  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
      <div
        style={{
          display: 'inline-block',
          transform: `translateX(${-frame * speed}px)`,
          fontFamily: TOKENS.fontM,
          fontSize: 28,
          letterSpacing: 4,
          color: TOKENS.t2,
        }}
      >
        {row}
      </div>
    </div>
  );
};
