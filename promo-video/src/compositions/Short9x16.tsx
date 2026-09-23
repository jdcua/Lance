import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TOKENS } from '../theme/tokens';
import { BlurIn } from '../components/gallery/BlurIn';
import { MockApp } from '../components/gallery/MockApp';
import { ShimmerButton } from '../components/gallery/ShimmerButton';

// 9:16 cutdown for TikTok/Reels/Shorts — hook, demo, payoff, CTA.
export const Short9x16: React.FC<{ hook?: string; cta?: string; accent?: string }> = ({
  hook = 'Stop losing money to late invoices.',
  cta = 'Free Download — link in bio',
  accent = TOKENS.green,
}) => {
  return (
    <AbsoluteFill
      style={{ background: TOKENS.bg, alignItems: 'center', justifyContent: 'center', gap: 40 }}
    >
      <BlurIn>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: TOKENS.t1,
            textAlign: 'center',
            maxWidth: 860,
            padding: '0 40px',
          }}
        >
          {hook}
        </div>
      </BlurIn>
      <div style={{ transform: 'scale(0.85)' }}>
        <MockApp pane="Invoices" accent={accent} />
      </div>
      <BlurIn delay={30}>
        <div style={{ fontSize: 40, color: TOKENS.t2 }}>Offline. No subscriptions. Free forever.</div>
      </BlurIn>
      <ShimmerButton label={cta} accent={accent} />
    </AbsoluteFill>
  );
};
