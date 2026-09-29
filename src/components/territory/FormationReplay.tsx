import { cn } from "@/lib/utils";

type Player = {
  id: string;
  num: string;
  x: number;
  y: number;
  isGK?: boolean;
};

type Snapshot = {
  t: number;
  players: Player[];
};

type Props = {
  teamColour: string;
  attackLabel: string;
  players: Player[];
  centroid: { x: number; y: number };
  hullPoints: string; // SVG path
  phase: "with" | "without";
  onPhaseChange: (p: "with" | "without") => void;
  sliderValue: number;
  onSliderChange: (v: number) => void;
  snapshots: Snapshot[];
  onSnapshotTap: (t: number) => void;
  currentTime: number;
};

/** Tracking coordinates should be 0–1; a stray one must not escape the pitch. */
const pc = (v: number) => `${Math.min(Math.max(v, 0), 1) * 100}%`;

const clock = (t: number) => `${Math.floor(t / 60)}:${(Math.floor(t) % 60).toString().padStart(2, "0")}`;

export function FormationReplay({
  teamColour, attackLabel, players, centroid, hullPoints,
  phase, onPhaseChange, sliderValue, onSliderChange,
  snapshots, onSnapshotTap, currentTime,
}: Props) {
  return (
    <div className="mx-4 mt-3.5 overflow-hidden rounded-[14px] border border-wire bg-surface">
      <div className="px-4 pb-1.5 pt-3.5">
        <h2 className="display text-[17px] uppercase text-cream">How did our shape change?</h2>
      </div>
      <p className="px-4 pb-3 text-[11.5px] text-text-faint">
        Watch the team&apos;s shape move. Snapshots below every 30 seconds.
      </p>

      <div className="px-4 pb-3">
        <div className="mb-2.5 grid grid-cols-2 gap-[3px] rounded-[10px] border border-wire bg-surface-2 p-[3px]" role="group" aria-label="Phase">
          {(["with", "without"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={phase === key}
              onClick={() => onPhaseChange(key)}
              className={cn(
                "min-h-11 rounded-[10px] p-2 text-[11px] font-semibold transition-colors",
                phase === key ? "border border-wire bg-surface-3 text-cream" : "text-text-faint hover:text-text",
              )}
            >
              {key === "with" ? "With ball" : "Without ball"}
            </button>
          ))}
        </div>

        <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] border border-wire bg-pitch-insight">
          <div className="absolute inset-[4%] rounded-[2px] border border-cream/[0.28]" aria-hidden="true" />
          <div className="absolute bottom-[4%] left-1/2 top-[4%] border-l border-cream/[0.28]" aria-hidden="true" />

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0" aria-hidden="true">
            <path d={hullPoints} fill="var(--cream)" fillOpacity="0.05" stroke="var(--cream)" strokeOpacity="0.35" strokeWidth="0.5" strokeDasharray="2 2" />
          </svg>

          {/* Centroid */}
          <div
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2"
            style={{ left: pc(centroid.x), top: pc(centroid.y) }}
            aria-hidden="true"
          >
            <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-cream" />
            <span className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-cream" />
          </div>

          {players.map((p) => (
            <div
              key={p.id}
              className={cn(
                "display-i absolute grid h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-[9px]",
                p.isGK ? "text-ink" : "text-white",
              )}
              style={{
                left: pc(p.x),
                top: pc(p.y),
                background: p.isGK ? "var(--team-gk, #eab308)" : teamColour,
                transition: "left 400ms cubic-bezier(0.2, 0.8, 0.2, 1), top 400ms cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
            >
              {p.num}
            </div>
          ))}

          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-text-faint">
            ↑ {attackLabel}
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sliderValue}
          aria-label="Scrub the shape replay"
          onChange={(e) => onSliderChange(parseFloat(e.target.value))}
          className="mt-2.5 w-full accent-cream"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-wire-2 px-4 pb-3 pt-2.5">
        {snapshots.map((s, i) => (
          <button
            type="button"
            key={`${s.t}-${i}`}
            aria-label={`Show snapshot at ${clock(s.t)}`}
            aria-current={Math.abs(s.t - currentTime) < 1}
            onClick={() => onSnapshotTap(s.t)}
            className={cn(
              "relative aspect-[3/2] w-20 shrink-0 rounded-[10px] border bg-pitch-insight p-0",
              Math.abs(s.t - currentTime) < 1 ? "border-cream" : "border-wire",
            )}
          >
            <span className="absolute inset-[4%] rounded-[2px] border border-cream/[0.28]" aria-hidden="true" />
            <span className="display absolute bottom-1 left-1 rounded-[6px] bg-ink/50 px-1 text-[10px] text-white">
              {clock(s.t)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
