type Loss = { timeToPress: number | null };
type Props = { losses: Loss[]; targetSeconds?: number; axisSeconds?: number };
export function CounterPressStrip({ losses, targetSeconds = 2, axisSeconds = 8 }: Props) {
  const values = losses.flatMap((loss) => loss.timeToPress === null ? [] : [loss.timeToPress]);
  const ordered = [...values].sort((a, b) => a - b);
  const medianIndex = Math.floor(ordered.length / 2);
  const median = ordered.length ? (ordered[medianIndex] ?? null) : null;
  const position = (value: number | null) => value === null ? 98 : Math.min(98, Math.max(2, value / axisSeconds * 100));
  return <div className="relative h-[86px] overflow-hidden rounded-[10px] border border-wire bg-pitch-insight" role="img" aria-label={`${losses.length} possession losses on a zero to ${axisSeconds} second counter-press axis`}>
    <span className="absolute inset-x-4 top-1/2 h-px bg-wire" />
    <span className="absolute inset-y-2 w-px bg-cream/40" style={{ left: `${position(targetSeconds)}%` }}><span className="absolute -top-0.5 -translate-x-1/2 font-display text-[8px] font-bold text-cream/70">2s</span></span>
    {median !== null && <span className="absolute inset-y-2 w-[1.5px] bg-cream" style={{ left: `${position(median)}%` }} aria-hidden="true" />}
    {losses.map((loss, index) => <span key={index} className={loss.timeToPress === null ? "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-text-faint bg-transparent" : loss.timeToPress < 2 ? "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink bg-reaction-good" : loss.timeToPress <= 5 ? "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink bg-reaction-warn" : "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink bg-reaction-bad"} style={{ left: `${position(loss.timeToPress)}%` }} />)}
    <span className="absolute inset-x-3 bottom-1.5 flex justify-between font-display text-[8px] font-bold text-text-faint"><span>0s</span><span>2s</span><span>4s</span><span>6s</span><span>8s</span></span>
  </div>;
}
