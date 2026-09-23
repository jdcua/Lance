import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { TOKENS } from '../../theme/tokens';

// Simplified product mock — panes animate via frame, not screenshots,
// so text stays crisp at 1080p. Real shots live in public/shots/ for cutaways.
const ROWS: Record<string, Array<[string, string, string]>> = {
  Proposals: [
    ['Brand Refresh', 'Acme Corp · $4,500', 'Sent'],
    ['Web Retainer', 'Studio 12 · $2,200/mo', 'Viewed'],
    ['Landing Page', 'Northside · $85/hr', 'Draft'],
  ],
  Time: [
    ['Brand Refresh', 'Acme Corp · 2:14:32', '● live'],
    ['Northside Web', 'Landing Page · 1:20:00', 'logged'],
    ['Studio 12 Consult', 'Web Retainer · 3:45:00', 'logged'],
  ],
  Invoices: [
    ['INV-003', 'Acme Corp · Due Oct 1', 'Sent'],
    ['INV-002', 'Studio 12 · Due Sep 15', 'Late'],
    ['INV-001', 'Northside · Paid', 'Paid'],
  ],
};

export const MockApp: React.FC<{ pane: keyof typeof ROWS; accent?: string }> = ({
  pane,
  accent = TOKENS.green,
}) => {
  const frame = useCurrentFrame();
  const rows = ROWS[pane];
  return (
    <div
      style={{
        width: 900,
        borderRadius: 24,
        background: TOKENS.s1,
        border: `1px solid ${TOKENS.bd}`,
        padding: 36,
        fontFamily: TOKENS.fontB,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: TOKENS.t1 }}>{pane}</span>
        <span
          style={{
            fontFamily: TOKENS.fontM,
            fontSize: 20,
            color: '#08150E',
            background: accent,
            borderRadius: 999,
            padding: '6px 18px',
          }}
        >
          {rows.length} active
        </span>
      </div>
      {rows.map(([n, m, chip], i) => {
        const t = interpolate(frame - i * 8, [0, 20], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={n}
            style={{
              opacity: t,
              transform: `translateY(${(1 - t) * 24}px)`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              marginBottom: 14,
              borderRadius: 16,
              background: TOKENS.s2,
              border: `1px solid ${TOKENS.bd}`,
            }}
          >
            <div>
              <div style={{ fontSize: 26, fontWeight: 600, color: TOKENS.t1 }}>{n}</div>
              <div style={{ fontFamily: TOKENS.fontM, fontSize: 19, color: TOKENS.t2 }}>{m}</div>
            </div>
            <span
              style={{
                fontFamily: TOKENS.fontM,
                fontSize: 19,
                color: chip === 'Late' ? '#f87171' : accent,
                border: `1px solid ${TOKENS.bd}`,
                borderRadius: 999,
                padding: '6px 16px',
              }}
            >
              {chip}
            </span>
          </div>
        );
      })}
    </div>
  );
};
