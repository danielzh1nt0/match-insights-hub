type Props = { values: number[]; width?: number; height?: number; colour?: string };
export function Sparkline({ values, width = 50, height = 12, colour = "var(--cream)" }: Props) {
  if (values.length < 2) return <span className="text-text-faint">—</span>;
  const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(max - min, 1);
  const points = values.map((value, index) => `${index / (values.length - 1) * width},${height - ((value - min) / range * height)}`).join(" ");
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Last five values: ${values.join(", ")}`}><polyline points={points} fill="none" stroke={colour} strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}
