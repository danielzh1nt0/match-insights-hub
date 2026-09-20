
import React from 'react';

type HeatBlob = {
  x: number;   // 0–1 pitch coordinates
  y: number;
  r: number;   // radius as fraction of pitch width
  intensity: number;  // 0–1
};

type Props = {
  teamColour: string;          // "var(--team-a)"
  attackLabel: string;        // "SFK attack"
  teamBlobs: HeatBlob[];
  playerBlobs?: HeatBlob[];
  activePlayer?: string | null;
  players: { id: string; num: string }[];
  onPlayerTap: (id: string) => void;
  sliderValue: number;         // 0–1
  onSliderChange: (v: number) => void;
  reliabilityLabel: string;   // "13 of 22 in view"
  frameCount: number;         // 8954
};

export function TeamHeatMap({
  teamColour, attackLabel, teamBlobs, playerBlobs, activePlayer,
  players, onPlayerTap, sliderValue, onSliderChange,
  reliabilityLabel, frameCount,
}: Props) {
  const showPlayerOnly = activePlayer !== null && activePlayer !== undefined;

  return (
    <div style={{ margin: '14px 16px 0', border: '1px solid var(--wire)', borderRadius: '14px', background: 'var(--surface)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '17px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cream)', lineHeight: 1.2 }}>
          {showPlayerOnly ? `Where did #${activePlayer} play?` : 'Where did we play?'}
        </div>
        <button type="button" aria-label="Heat map information" style={{ width: '44px', height: '44px', border: 'none', background: 'none', color: 'var(--text-faint)', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}><span style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid var(--wire)', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: '12px', display: 'grid', placeItems: 'center' }}>i</span></button>
      </div>

      <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', padding: '0 16px 12px', lineHeight: 1.5 }}>
        {showPlayerOnly ? 'Team heat dimmed. This is only the places this player was.' : 'Brighter = the team spent more time there. Drag the slider to see it change.'}
      </div>

      {/* Pitch */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ aspectRatio: '2/3', borderRadius: '12px', background: 'linear-gradient(180deg, #1a2f1c 0%, #0f2314 100%)', border: '1px solid var(--wire)', position: 'relative', overflow: 'hidden' }}>
          {/* Pitch lines */}
          <div style={{ position: 'absolute', inset: '4%', border: '1px solid rgba(237,230,214,0.28)', borderRadius: '2px' }} />
          <div style={{ position: 'absolute', top: '4%', bottom: '4%', left: '50%', width: 0, borderLeft: '1px solid rgba(237,230,214,0.28)' }} />
          <div style={{ position: 'absolute', top: '33.33%', left: '4%', right: '4%', height: 0, borderTop: '1px dashed rgba(237,230,214,0.12)' }} />
          <div style={{ position: 'absolute', top: '66.66%', left: '4%', right: '4%', height: 0, borderTop: '1px dashed rgba(237,230,214,0.12)' }} />

          {/* Team heat */}
          <div style={{ position: 'absolute', inset: 0, opacity: showPlayerOnly ? 0.2 : 1, transition: 'opacity 200ms ease-out' }}>
            {teamBlobs.map((b, i) => (
              <div key={i} style={{ position: 'absolute', left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.r * 200}%`, aspectRatio: '1', borderRadius: '50%', background: `radial-gradient(circle, ${teamColour}${Math.round(b.intensity * 90).toString(16).padStart(2, '0')} 0%, transparent 70%)`, transform: 'translate(-50%, -50%)', filter: 'blur(10px)', pointerEvents: 'none' }} />
            ))}
          </div>

          {/* Player heat */}
          {showPlayerOnly && playerBlobs && (
            <div style={{ position: 'absolute', inset: 0 }}>
              {playerBlobs.map((b, i) => (
                <div key={i} style={{ position: 'absolute', left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.r * 200}%`, aspectRatio: '1', borderRadius: '50%', background: `radial-gradient(circle, ${teamColour}${Math.round(b.intensity * 220).toString(16).padStart(2, '0')} 0%, transparent 70%)`, transform: 'translate(-50%, -50%)', filter: 'blur(10px)', pointerEvents: 'none' }} />
              ))}
            </div>
          )}

          <div style={{ position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ↑ {attackLabel}
          </div>
        </div>
      </div>

      {/* Time slider */}
      <div style={{ padding: '10px 16px 12px', borderTop: '1px solid var(--wire-2)' }}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sliderValue}
          onChange={(e) => onSliderChange(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--cream)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-faint)', fontWeight: 600, marginTop: '6px' }}>
          <span>0:00</span><span>1st half</span><span>2nd half</span><span>Full</span>
        </div>
      </div>

      {/* Player chips */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 16px', borderTop: '1px solid var(--wire-2)' }}>
          <button type="button" aria-pressed={!showPlayerOnly}
          onClick={() => onPlayerTap('all')}
          style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--wire)', background: !showPlayerOnly ? 'var(--cream)' : 'var(--surface-2)', color: !showPlayerOnly ? '#111' : 'var(--text-faint)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>All</button>
        {players.map((p) => (
          <button type="button" aria-pressed={activePlayer === p.id} key={p.id} onClick={() => onPlayerTap(p.id)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--wire)', background: activePlayer === p.id ? 'var(--cream)' : 'var(--surface-2)', color: activePlayer === p.id ? '#111' : 'var(--text-faint)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>{p.num}</button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px 12px', borderTop: '1px solid var(--wire-2)', fontSize: '10.5px', color: 'var(--text-faint)', fontWeight: 500 }}>
        <div>{reliabilityLabel}</div>
        <div>n = {players.length} players · {frameCount.toLocaleString()} frames</div>
      </div>
    </div>
  );
}
