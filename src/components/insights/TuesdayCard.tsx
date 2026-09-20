type Props = {
  headline: string;
  target?: string;
  today?: string;
  isPositive?: boolean;
  onAction: () => void;
  actionLabel: string;
};

export function TuesdayCard({ headline, target, today, isPositive, onAction, actionLabel }: Props) {
  return (
    <div style={{ border: '1px solid var(--wire)', borderRadius: '16px', background: 'var(--surface)', padding: '20px', margin: '14px 16px 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: isPositive ? 'var(--reaction-good)' : 'var(--cream)' }} />
      <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 700, marginBottom: '14px' }}>The one thing</div>
      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontStyle: 'italic', fontSize: '28px', lineHeight: 1.1, letterSpacing: '0.005em', textTransform: 'uppercase', color: 'var(--cream)', marginBottom: '14px' }}>{headline}</div>
      {(target || today) && (
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--wire-2)' }}>
          {target && <div><span style={{ color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.06em', display: 'block', marginBottom: '2px' }}>Target</span><span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontStyle: 'italic', fontSize: '20px', color: 'var(--cream)' }}>{target}</span></div>}
          {today && <div><span style={{ color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.06em', display: 'block', marginBottom: '2px' }}>Today</span><span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontStyle: 'italic', fontSize: '20px', color: isPositive ? 'var(--cream)' : 'var(--reaction-bad)' }}>{today}</span></div>}
        </div>
      )}
      <button type="button" onClick={onAction} style={{ display: 'block', width: '100%', minHeight: '44px', padding: '14px', borderRadius: '12px', background: 'var(--cream)', color: '#111', fontFamily: 'Inter, sans-serif', fontSize: '13.5px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>{actionLabel}</button>
    </div>
  );
}
