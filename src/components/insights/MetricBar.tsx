type Props = { value: number; target: number; variant?: 'bad' | 'good' | 'warn' };

export function MetricBar({ value, target, variant = 'bad' }: Props) {
  const fillColor = variant === 'good' ? 'var(--reaction-good)' : variant === 'warn' ? 'var(--reaction-warn)' : 'var(--reaction-bad)';
  return <div role="img" aria-label={`Current value ${value}; target ${target}`} style={{ height: '6px', background: 'var(--wire)', borderRadius: '3px', position: 'relative', marginBottom: '12px' }}><div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(Math.max(value, 0), 100)}%`, background: fillColor, borderRadius: '3px' }} /><div style={{ position: 'absolute', top: '-3px', bottom: '-3px', left: `${Math.min(Math.max(target, 0), 100)}%`, width: '2px', background: 'var(--text-dim)' }} /></div>;
}
