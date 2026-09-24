import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { TOKENS } from '../theme/tokens';
import { BlurIn } from '../components/gallery/BlurIn';
import { ShimmerButton } from '../components/gallery/ShimmerButton';
import { NumberTicker } from '../components/gallery/NumberTicker';
import { Marquee } from '../components/gallery/Marquee';
import { MockApp } from '../components/gallery/MockApp';

export type HeroProps = {
  h1?: string[];
  cta?: string;
  accent?: string;
};

// 30s hero: 0-3 brand+headline, 3-18 product tour, 18-25 privacy, 25-30 CTA.
export const Hero30s: React.FC<HeroProps> = ({
  h1 = ['Win work.', 'Run projects.', 'Get paid.'],
  cta = 'Free Download — No account',
  accent = TOKENS.green,
}) => {
  const { fps } = useVideoConfig();
  const s = (sec: number) => sec * fps;
  return (
    <AbsoluteFill style={{ background: TOKENS.bg, fontFamily: TOKENS.fontB }}>
      <Sequence from={s(0)} durationInFrames={s(3)}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          {h1.map((line, i) => (
            <BlurIn key={line} delay={i * 6}>
              <div style={{ fontSize: 110, fontWeight: 800, color: TOKENS.t1, letterSpacing: -3 }}>
                {line}
              </div>
            </BlurIn>
          ))}
        </AbsoluteFill>
      </Sequence>
      <Sequence from={s(3)} durationInFrames={s(15)}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <Sequence from={0} durationInFrames={s(5)}>
            <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
              <MockApp pane="Proposals" accent={accent} />
            </AbsoluteFill>
          </Sequence>
          <Sequence from={s(5)} durationInFrames={s(5)}>
            <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
              <MockApp pane="Time" accent={accent} />
            </AbsoluteFill>
          </Sequence>
          <Sequence from={s(10)} durationInFrames={s(5)}>
            <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
              <MockApp pane="Invoices" accent={accent} />
            </AbsoluteFill>
          </Sequence>
          <div
            style={{
              position: 'absolute',
              bottom: 90,
              display: 'flex',
              gap: 90,
              fontFamily: TOKENS.fontB,
            }}
          >
            <NumberTicker to={12400} prefix="$" style={{ fontSize: 54, color: TOKENS.t1 }} />
            <NumberTicker to={72} suffix="%" style={{ fontSize: 54, color: TOKENS.t1 }} />
            <NumberTicker to={41} style={{ fontSize: 54, color: TOKENS.t1 }} />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={s(18)} durationInFrames={s(7)}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <BlurIn>
            <div style={{ fontSize: 64, color: TOKENS.t1, maxWidth: 1200, textAlign: 'center' }}>
              Your business lives on your machine. No cloud. No accounts. No one watching.
            </div>
          </BlurIn>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={s(25)} durationInFrames={s(5)}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 30 }}>
          <ShimmerButton label={cta} accent={accent} />
          <Marquee words={['WIN WORK', 'RUN PROJECTS', 'GET PAID', 'LOCAL FIRST', 'FREE FOREVER']} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
