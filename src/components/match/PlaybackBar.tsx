
import React from 'react';

type Props = {
  playing: boolean;
  currentTime: number;
  duration: number;
  markers: { t: number; team: 'A' | 'B'; kind: 'goal' | 'event' }[];
  onPlayPause: () => void;
  onSeek: (t: number) => void;
  onFullscreen: () => void;
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function PlaybackBar({ playing, currentTime, duration, markers, onPlayPause, onSeek, onFullscreen }: Props) {
  const trackRef = React.useRef<HTMLDivElement>(null);

  const seekFromEvent = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct * duration);
  };

  return (
    <div style={{ margin: '12px 16px 0', background: 'var(--surface)', border: '1px solid var(--wire)', borderRadius: '14px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button type="button" onClick={onPlayPause} aria-label={playing ? 'Pause' : 'Play'} style={{ width: '44px', height: '44px', borderRadius: '10px', border: '1px solid var(--wire)', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer' }}>
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--cream)"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--cream)"><polygon points="8,5 19,12 8,19" /></svg>
        )}
      </button>

      <div ref={trackRef} role="slider" tabIndex={0} aria-label="Playback position" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={currentTime} onClick={seekFromEvent} onKeyDown={(event) => { if (event.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5)); if (event.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5)); }} style={{ flex: 1, height: '44px', background: 'transparent', position: 'relative', cursor: 'pointer' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '19px', height: '6px', background: 'var(--wire)', borderRadius: '3px' }} />
        <div style={{ position: 'absolute', left: 0, top: '19px', height: '6px', width: `${(currentTime / duration) * 100}%`, background: 'var(--cream)', borderRadius: '3px' }} />
        {markers.map((m, i) => {
          const left = (m.t / duration) * 100;
          if (m.kind === 'goal') {
            return <div key={i} style={{ position: 'absolute', top: '50%', left: `${left}%`, width: '12px', height: '12px', background: 'var(--cream)', borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '1.5px solid #111' }} />;
          }
          return <div key={i} style={{ position: 'absolute', top: '50%', left: `${left}%`, width: '10px', height: '10px', background: m.team === 'A' ? 'var(--team-a)' : 'var(--team-b)', borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '1.5px solid #111' }} />;
        })}
        <div style={{ position: 'absolute', top: '50%', left: `${(currentTime / duration) * 100}%`, width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transform: 'translate(-50%, -50%)', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
      </div>

      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--cream)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{fmt(currentTime)}</div>

      <button type="button" onClick={onFullscreen} aria-label="Fullscreen" style={{ width: '44px', height: '44px', borderRadius: '10px', border: '1px solid var(--wire)', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--text-dim)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
      </button>
    </div>
  );
}
