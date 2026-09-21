import { cn } from "@/lib/utils";

export type MomentumSegment = { start: number; end: number; team: "A" | "B" | "even" };
export type MomentumMarker = { t: number; type: "goal" | "turnover"; team: "A" | "B" };

type Props = { segments: MomentumSegment[]; markers: MomentumMarker[]; durationSeconds: number; currentTime: number; onSeek: (t: number) => void };

export function MomentumStrip({ segments, markers, durationSeconds, currentTime, onSeek }: Props) {
  const duration = Math.max(durationSeconds, 1);
  return <div className="relative h-[34px] overflow-hidden rounded-[8px] bg-wire" role="img" aria-label="Match momentum by phase" onClick={(event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(duration, ((event.clientX - rect.left) / rect.width) * duration)));
  }}>
    {segments.map((segment, index) => <span key={`${segment.start}-${index}`} className={cn("absolute inset-y-0 border-r-2 border-wire", segment.team === "A" ? "bg-team-a" : segment.team === "B" ? "bg-team-b" : "bg-graphite")} style={{ left: `${segment.start / duration * 100}%`, width: `${(segment.end - segment.start) / duration * 100}%` }} />)}
    {markers.map((marker, index) => marker.type === "goal"
      ? <span key={`${marker.t}-${index}`} className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-cream" style={{ left: `${marker.t / duration * 100}%` }} />
      : <span key={`${marker.t}-${index}`} className={cn("absolute inset-y-1.5 w-px", marker.team === "A" ? "bg-team-a" : "bg-team-b")} style={{ left: `${marker.t / duration * 100}%` }} />)}
    <span className="absolute inset-y-0 w-0.5 bg-cream" style={{ left: `${currentTime / duration * 100}%` }} />
  </div>;
}
