
import React from 'react';

type Window = {
  t: number;              // seconds from kick-off
  tiltA: number;         // 0–1, share of possession in A's attacking half
};

type Props = {
  windows: Window[];       // one per 15-second window
  events: { t: number; type: 'goal' | 'turnover'; team: 'A' | 'B' }[];
  durationSeconds: number;
  currentTime: number;
  onSeek: (t: number) => void;
};

export function MomentumStrip({ windows, events, durationSeconds, currentTime, onSeek }: Props) {
  const trackRef = React.useRef<HTMLDivElement>(null);

  const handleTap = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(durationSeconds, pct * durationSeconds)));
  };

  return (
    <div style={{ margin: '12px 16px 0', border: '1px solid var(--wire)', borderRadius: '14px', background: 'var(--surface)', padding: '12px' }}>
      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: '8px' }}>
        Field tilt over time
      </div>

      <div
        ref={trackRef}
        onClick={handleTap}
        style={{ height: '32px', borderRadius: '6px', overflow: 'hidden', display: 'flex', position: 'relative', background: 'var(--wire)', cursor: 'pointer' }}
      >
        {windows.map((w, i) => {
          const nextT = windows[i + 1]?.t ?? durationSeconds;
          const widthPct = ((nextT - w.t) / durationSeconds) * 100;
          return (
            <div
              key={i}
              style={{
                width: `${widthPct}%`,
                height: '100%',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${w.tiltA * 50}%`, background: 'var(--team-a)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(1 - w.tiltA) * 50}%`, background: 'var(--team-b)' }} />
            </div>
          );
        })}

        {events.map((e, i) => {
          const left = (e.t / durationSeconds) * 100;
          if (e.type === 'goal') {
            return (
              <div
                key={i}
                style={{ position: 'absolute', top: '50%', left: `${left}%`, width: '10px', height: '10px', background: 'var(--cream)', border: '1.5px solid #111', borderRadius: '2px', transform: 'translate(-50%, -50%) rotate(45deg)' }}
              />
            );
          }
          return (
            <div
              key={i}
              style={{ position: 'absolute', top: '4px', bottom: '4px', left: `${left}%`, width: '2px', background: 'rgba(0,0,0,0.5)' }}
            />
          );
        })}

        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(currentTime / durationSeconds) * 100}%`, width: '2px', background: 'var(--cream)', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}
