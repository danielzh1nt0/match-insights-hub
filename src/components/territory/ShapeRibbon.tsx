
import React from 'react';

type Point = {
  t: number;             // seconds from kick-off
  length: number;        // block length metres
  width: number;         // block width metres
};

type Props = {
  teamColour: string;
  timeline: Point[];
  durationSeconds: number;
  currentTime: number;
  onSeek: (t: number) => void;
  medianLength: number;
};

export function ShapeRibbon({ teamColour, timeline, durationSeconds, currentTime, onSeek, medianLength }: Props) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const maxLength = Math.max(...timeline.map((p) => p.length), 60);

  const toPath = (key: 'length' | 'width', thickness: number) => {
    const points = timeline.map((p, i) => {
      const x = (p.t / durationSeconds) * 340;
      const yTop = 60 - (p[key] / maxLength) * 30;
      const yBot = 60 + (p[key] / maxLength) * 30;
      return { x, yTop, yBot };
    });
    const top = points.map((p) => `${p.x},${p.yTop}`).join(' L');
    const bot = points.slice().reverse().map((p) => `${p.x},${p.yBot}`).join(' L');
    return `M${top} L${bot} Z`;
  };

  const innerLine = timeline.map((p, i) => {
    const x = (p.t / durationSeconds) * 340;
    const y = 60 - (p.width / maxLength) * 20;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  return (
    <div style={{ margin: '14px 16px 0', border: '1px solid var(--wire)', borderRadius: '14px', background: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 6px' }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '17px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cream)' }}>
          How compact were we?
        </div>
      </div>
      <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', padding: '0 16px 12px' }}>
        Thicker ribbon = we were stretched further front-to-back. The thin inner line is width.
      </div>

      <div ref={trackRef} role="button" tabIndex={0} aria-label="Seek using compactness timeline" onClick={(event) => { const rect = trackRef.current?.getBoundingClientRect(); if (rect) onSeek(((event.clientX - rect.left) / rect.width) * durationSeconds); }} onKeyDown={(event) => { if (event.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 15)); if (event.key === 'ArrowRight') onSeek(Math.min(durationSeconds, currentTime + 15)); }} style={{ padding: '0 16px 12px', position: 'relative', cursor: 'pointer' }}>
        <svg viewBox="0 0 340 120" preserveAspectRatio="none" style={{ width: '100%', height: '60px' }}>
          <line x1="0" y1="60" x2="340" y2="60" stroke="var(--wire)" strokeWidth="1" />
          <path d={toPath('length', 30)} fill={teamColour} fillOpacity="0.4" />
          <path d={innerLine} fill="none" stroke="rgba(237,230,214,0.7)" strokeWidth="1.5" />
        </svg>
        <div style={{ position: 'absolute', top: 0, bottom: '12px', left: `calc(16px + ${(currentTime / durationSeconds) * 100}% * (100% - 32px) / 100%)`, width: '2px', background: 'var(--cream)', pointerEvents: 'none' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-faint)', fontWeight: 600, padding: '0 16px' }}>
        <span>0'</span><span>15'</span><span>30'</span><span>45'</span><span>60'</span><span>75'</span><span>90'</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--wire-2)', marginTop: '12px', fontSize: '10.5px', color: 'var(--text-faint)', fontWeight: 500 }}>
        <div>Whole match</div>
        <div>Median {medianLength} m long</div>
      </div>
    </div>
  );
}
