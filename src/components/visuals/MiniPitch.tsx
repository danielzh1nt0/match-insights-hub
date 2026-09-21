import { useId } from "react";
export type PitchDot = { x: number; y: number; team: "A" | "B"; bold?: boolean };
export type PitchArrow = { from: [number, number]; to: [number, number]; team: "A" | "B"; dashed?: boolean };
export type PitchHeat = { x: number; y: number; r: number; team: "A" | "B"; intensity: number };
type Props = { dots?: PitchDot[]; arrows?: PitchArrow[]; heat?: PitchHeat[]; attackLabel?: string; aspectRatio?: string; ariaLabel?: string };
export function MiniPitch({ dots = [], arrows = [], heat = [], attackLabel, aspectRatio = "3 / 2", ariaLabel = "Football pitch evidence" }: Props) {
  const marker = useId().replaceAll(":", "");
  return <div className="relative overflow-hidden rounded-[10px] border border-wire bg-pitch-insight" style={{ aspectRatio }} role="img" aria-label={ariaLabel}>
    {heat.map((spot, i) => <span key={i} className={spot.team === "A" ? "heat-blob-a" : "heat-blob-b"} style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.r * 2}%`, opacity: spot.intensity }} />)}
    <svg viewBox="0 0 100 66" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs><marker id={`${marker}a`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="var(--team-a)" /></marker><marker id={`${marker}b`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="var(--team-b)" /></marker></defs>
      <rect x="4" y="4" width="92" height="58" rx="1" fill="none" stroke="var(--cream)" strokeOpacity=".28" />
      <line x1="50" x2="50" y1="4" y2="62" stroke="var(--cream)" strokeOpacity=".28" />
      <line x1="33.33" x2="33.33" y1="4" y2="62" stroke="var(--cream)" strokeOpacity=".12" strokeDasharray="2 2" />
      <line x1="66.66" x2="66.66" y1="4" y2="62" stroke="var(--cream)" strokeOpacity=".12" strokeDasharray="2 2" />
      <circle cx="50" cy="33" r="7" fill="none" stroke="var(--cream)" strokeOpacity=".28" />
      {arrows.map((arrow, i) => <line key={i} x1={arrow.from[0]} y1={arrow.from[1]} x2={arrow.to[0]} y2={arrow.to[1]} stroke={arrow.team === "A" ? "var(--team-a)" : "var(--team-b)"} strokeWidth=".8" strokeDasharray={arrow.dashed ? "2 1.5" : undefined} markerEnd={`url(#${marker}${arrow.team.toLowerCase()})`} />)}
      {dots.map((dot, i) => <circle key={i} cx={dot.x} cy={dot.y} r={dot.bold ? 2.1 : 1.5} fill={dot.team === "A" ? "var(--team-a)" : "var(--team-b)"} stroke="var(--ink)" strokeWidth=".7" />)}
    </svg>
    {attackLabel && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 font-display text-[9px] font-bold uppercase text-cream/65">{attackLabel}</span>}
  </div>;
}
