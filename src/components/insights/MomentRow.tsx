type Props = { time: string; label: string; confirmed?: boolean; checked: boolean; onCheck: () => void; onPlay: () => void; onConfirm?: () => void; onDelete?: () => void };

export function MomentRow({ time, label, confirmed, checked, onCheck, onPlay, onConfirm, onDelete }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '20px 60px 1fr 28px 28px', gap: '10px', alignItems: 'center', padding: '8px 10px', border: '1px solid var(--wire)', borderRadius: '8px', marginBottom: '6px', background: 'var(--surface)' }}>
      <button type="button" aria-label={checked ? `Remove ${time} from reel` : `Add ${time} to reel`} aria-pressed={checked} onClick={onCheck} style={{ width: '20px', height: '20px', borderRadius: '4px', border: checked ? '1.5px solid var(--cream)' : '1.5px solid var(--wire)', background: checked ? 'var(--cream)' : 'var(--surface-2)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#111', fontSize: '12px', fontWeight: 800 }}>{checked ? '✓' : ''}</button>
      <button type="button" onClick={onPlay} style={{ minHeight: '44px', border: 0, padding: 0, background: 'transparent', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="var(--cream)"><polygon points="8,5 19,12 8,19" /></svg>{time}</button>
      <div style={{ fontSize: '11.5px', color: confirmed ? 'var(--reaction-good)' : 'var(--text-faint)', fontWeight: 500 }}>{label}</div>
      {onConfirm ? <button type="button" aria-label={`Confirm ${time}`} onClick={onConfirm} style={{ width: '28px', height: '44px', borderRadius: '6px', border: '1px solid var(--wire)', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '12px' }}>✓</button> : <span />}
      {onDelete ? <button type="button" aria-label={`Delete ${time}`} onClick={onDelete} style={{ width: '28px', height: '44px', borderRadius: '6px', border: '1px solid var(--wire)', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '12px' }}>✕</button> : <span />}
    </div>
  );
}
