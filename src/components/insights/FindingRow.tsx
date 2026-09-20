import type { CSSProperties, ReactNode } from 'react';

type Result = 'on' | 'off' | 'critical';

type Props = { icon: ReactNode; headline: string; result: Result; expanded: boolean; onToggle: () => void };

export function FindingRow({ icon, headline, result, expanded, onToggle }: Props) {
  const pillStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' };
  const resultLabel = result === 'on' ? 'On track' : result === 'off' ? 'Off target' : 'Critical';
  const resultIcon = result === 'on' ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6L9 17l-5-5" /></svg> : result === 'off' ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg> : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 6l12 12M18 6L6 18" /></svg>;
  const pillStyles: Record<Result, CSSProperties> = {
    on: { background: 'var(--cream)', color: '#111' },
    off: { background: 'rgba(186,117,23,0.15)', border: '1px solid rgba(186,117,23,0.5)', color: '#fcd34d' },
    critical: { background: 'var(--surface-3)', border: '1px solid var(--wire)', color: 'var(--text-faint)' },
  };
  return (
    <button type="button" aria-expanded={expanded} onClick={onToggle} style={{ width: '100%', minHeight: '68px', display: 'grid', gridTemplateColumns: '40px minmax(0,1fr) auto auto', gap: '12px', alignItems: 'center', padding: '14px 16px', border: 0, borderBottom: expanded ? 'none' : '1px solid var(--wire-2)', cursor: 'pointer', background: 'transparent', textAlign: 'left' }}>
      <span style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1.5px solid var(--wire)', display: 'grid', placeItems: 'center', background: 'var(--surface)' }}>{icon}</span>
      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>{headline}</span>
      <span style={{ ...pillStyle, ...pillStyles[result] }}>{resultIcon}{resultLabel}</span>
      <span aria-hidden="true" style={{ color: 'var(--text-faint)', fontSize: '10px', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms ease-out' }}>▼</span>
    </button>
  );
}
