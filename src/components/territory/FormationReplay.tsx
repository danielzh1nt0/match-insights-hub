
import React from 'react';

type Player = {
  id: string;
  num: string;
  x: number;
  y: number;
  isGK?: boolean;
};

type Snapshot = {
  t: number;
  players: Player[];
};

type Props = {
  teamColour: string;
  attackLabel: string;
  players: Player[];
  centroid: { x: number; y: number };
  hullPoints: string;              // SVG path
  phase: 'with' | 'without';
  onPhaseChange: (p: 'with' | 'without') => void;
  sliderValue: number;
  onSliderChange: (v: number) => void;
  snapshots: Snapshot[];
  onSnapshotTap: (t: number) => void;
  currentTime: number;
};

export function FormationReplay({
  teamColour, attackLabel, players, centroid, hullPoints,
  phase, onPhaseChange, sliderValue, onSliderChange,
  snapshots, onSnapshotTap, currentTime,
}: Props) {
  return (
    <div style={{ margin: '14px 16px 0', border: '1px solid var(--wire)', borderRadius: '14px', background: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 6px' }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '17px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cream)' }}>
          How did our shape change?
        </div>
      </div>
      <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', padding: '0 16px 12px' }}>
        Watch the team's shape move. Snapshots below every 30 seconds.
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', padding: '3px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--wire)', marginBottom: '10px' }}>
          <button type="button" aria-pressed={phase === 'with'} onClick={() => onPhaseChange('with')} style={{ minHeight: '44px', padding: '8px', borderRadius: '7px', border: phase === 'with' ? '1px solid var(--wire)' : 'none', background: phase === 'with' ? 'var(--surface-3)' : 'none', color: phase === 'with' ? 'var(--cream)' : 'var(--text-faint)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>With ball</button>
          <button type="button" aria-pressed={phase === 'without'} onClick={() => onPhaseChange('without')} style={{ minHeight: '44px', padding: '8px', borderRadius: '7px', border: phase === 'without' ? '1px solid var(--wire)' : 'none', background: phase === 'without' ? 'var(--surface-3)' : 'none', color: phase === 'without' ? 'var(--cream)' : 'var(--text-faint)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Without ball</button>
        </div>

        <div style={{ aspectRatio: '16/10', borderRadius: '12px', background: 'linear-gradient(180deg, #1a2f1c 0%, #0f2314 100%)', border: '1px solid var(--wire)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: '4%', border: '1px solid rgba(237,230,214,0.28)', borderRadius: '2px' }} />
          <div style={{ position: 'absolute', top: '4%', bottom: '4%', left: '50%', width: 0, borderLeft: '1px solid rgba(237,230,214,0.28)' }} />

          {/* Hull */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <path d={hullPoints} fill="rgba(237,230,214,0.05)" stroke="rgba(237,230,214,0.35)" strokeWidth="0.5" strokeDasharray="2 2" />
          </svg>

          {/* Centroid cross */}
          <div style={{ position: 'absolute', left: `${centroid.x * 100}%`, top: `${centroid.y * 100}%`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1.5px', background: 'var(--cream)', transform: 'translateY(-50%)' }} />
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1.5px', background: 'var(--cream)', transform: 'translateX(-50%)' }} />
          </div>

          {/* Player dots */}
          {players.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                background: p.isGK ? '#eab308' : teamColour,
                border: '2px solid #fff',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 800,
                fontStyle: 'italic',
                fontSize: '9px',
                color: p.isGK ? '#111' : '#fff',
                transition: 'left 400ms cubic-bezier(0.2, 0.8, 0.2, 1), top 400ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              {p.num}
            </div>
          ))}

          <div style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '9px', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ↑ {attackLabel}
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sliderValue}
          onChange={(e) => onSliderChange(parseFloat(e.target.value))}
          style={{ width: '100%', marginTop: '10px', accentColor: 'var(--cream)' }}
        />
      </div>

      {/* Snapshot strip */}
      <div style={{ display: 'flex', gap: '8px', padding: '10px 16px 12px', borderTop: '1px solid var(--wire-2)', overflowX: 'auto' }}>
        {snapshots.map((s, i) => (
          <button type="button" aria-label={`Show snapshot at ${Math.floor(s.t / 60)}:${(Math.floor(s.t) % 60).toString().padStart(2, '0')}`} key={i} onClick={() => onSnapshotTap(s.t)} style={{ flexShrink: 0, width: '80px', minHeight: '53px', aspectRatio: '3/2', borderRadius: '8px', border: '1px solid' + (Math.abs(s.t - currentTime) < 1 ? ' var(--cream)' : ' var(--wire)'), background: 'linear-gradient(180deg, #1a2f1c 0%, #0f2314 100%)', position: 'relative', cursor: 'pointer', padding: 0 }}>
            <div style={{ position: 'absolute', inset: '4%', border: '1px solid rgba(237,230,214,0.28)', borderRadius: '2px' }} />
            <div style={{ position: 'absolute', bottom: '4px', left: '4px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '1px 4px', borderRadius: '3px' }}>
              {Math.floor(s.t / 60)}:{(Math.floor(s.t) % 60).toString().padStart(2, '0')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
