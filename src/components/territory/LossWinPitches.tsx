
import React from 'react';

export type Point = { x: number; y: number; t: number; high?: boolean };

type Props = {
  teamColour: string;
  losses: Point[];
  wins: Point[];
  onDotTap: (p: Point) => void;
};

function MiniPitch({ points, teamColour, highBold, onDotTap }: { points: Point[]; teamColour: string; highBold?: boolean; onDotTap: (p: Point) => void }) {
  return (
    <div style={{ aspectRatio: '3/2', borderRadius: '10px', background: 'linear-gradient(180deg, #1a2f1c 0%, #0f2314 100%)', border: '1px solid var(--wire)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: '4%', border: '1px solid rgba(237,230,214,0.28)', borderRadius: '2px' }} />
      <div style={{ position: 'absolute', top: '4%', bottom: '4%', left: '50%', width: 0, borderLeft: '1px solid rgba(237,230,214,0.28)' }} />
      {points.map((p, i) => (
        <button type="button" aria-label={`Open moment at ${Math.round(p.t)} seconds`} key={i} onClick={() => onDotTap(p)} style={{ position: 'absolute', left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: highBold && p.high ? '14px' : '10px', height: highBold && p.high ? '14px' : '10px', minWidth: '44px', minHeight: '44px', borderRadius: '50%', background: 'transparent', border: 'none', transform: 'translate(-50%, -50%)', cursor: 'pointer', padding: 0 }}><span style={{ display: 'block', margin: 'auto', width: highBold && p.high ? '14px' : '10px', height: highBold && p.high ? '14px' : '10px', borderRadius: '50%', background: teamColour, border: '2px solid #111' }} /></button>
      ))}
    </div>
  );
}

export function LossWinPitches({ teamColour, losses, wins, onDotTap }: Props) {
  return (
    <div style={{ margin: '14px 16px 0', border: '1px solid var(--wire)', borderRadius: '14px', background: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 6px' }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '17px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cream)' }}>
          Where did we lose it — and where did we win it?
        </div>
      </div>
      <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', padding: '0 16px 12px' }}>
        Left is losses, right is recoveries. Bold recoveries won the ball in their final third.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '0 16px 12px' }}>
        <div>
          <MiniPitch points={losses} teamColour={teamColour} onDotTap={onDotTap} />
          <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '8px', lineHeight: 1.5 }}>Each dot is one time we lost the ball.</div>
        </div>
        <div>
          <MiniPitch points={wins} teamColour={teamColour} highBold onDotTap={onDotTap} />
          <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '8px', lineHeight: 1.5 }}>Bold dots = won the ball in their final third.</div>
        </div>
      </div>
    </div>
  );
}
