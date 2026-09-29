import type { ReviewedEvent } from "@/lib/event-reviews";

export function MomentumStrip({ events, duration, colours }: { events: ReviewedEvent[]; duration: number; colours: { A: string; B: string } }) {
  const moments = events.filter((event) => ["goal", "shot", "turnover_won", "high_turnover"].includes(event.type));
  return <section aria-labelledby="momentum-title">
    <div className="mb-2 flex items-end justify-between gap-3"><div><h2 id="momentum-title" className="display text-[18px] uppercase text-text">When did the game turn?</h2><p className="mt-1 text-[11.5px] text-text-faint">Attacking moments across the match.</p></div><span className="text-[10.5px] text-text-faint">{moments.length} moments</span></div>
    <div className="relative h-14 overflow-hidden rounded-[14px] border border-wire bg-surface" role="img" aria-label={`Match momentum with ${moments.length} attacking moments`}>
      <span className="absolute inset-x-4 top-1/2 h-px bg-wire" />
      {moments.map((event) => <span key={event.id} className="absolute top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full" style={{ left: `${Math.min(98, Math.max(2, event.t / Math.max(duration, 1) * 100))}%`, background: event.team === "B" ? colours.B : colours.A }} title={event.title} />)}
      <span className="absolute bottom-1 left-3 text-[9px] text-text-faint">0'</span><span className="absolute bottom-1 right-3 text-[9px] text-text-faint">90'</span>
    </div>
  </section>;
}