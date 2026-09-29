import { Chip } from "@/components/ip/primitives";
import { cn } from "@/lib/utils";

type HeatBlob = {
  x: number; // 0–1 pitch coordinates
  y: number;
  r: number; // radius as fraction of pitch width
  intensity: number; // 0–1
};

type Props = {
  teamColour: string;
  attackLabel: string;
  teamBlobs: HeatBlob[];
  playerBlobs?: HeatBlob[];
  activePlayer?: string | null;
  players: { id: string; num: string }[];
  onPlayerTap: (id: string) => void;
  sliderValue: number; // 0–1
  onSliderChange: (v: number) => void;
  reliabilityLabel: string;
  frameCount: number;
};

function Blobs({ blobs, teamColour, alpha }: { blobs: HeatBlob[]; teamColour: string; alpha: number }) {
  return (
    <>
      {blobs.map((b, i) => (
        <div
          key={`${b.x}-${b.y}-${i}`}
          className="pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full blur-[10px]"
          style={{
            left: `${b.x * 100}%`,
            top: `${b.y * 100}%`,
            width: `${b.r * 200}%`,
            background: `radial-gradient(circle, ${teamColour}${Math.round(b.intensity * alpha).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

export function TeamHeatMap({
  teamColour, attackLabel, teamBlobs, playerBlobs, activePlayer,
  players, onPlayerTap, sliderValue, onSliderChange,
  reliabilityLabel, frameCount,
}: Props) {
  const showPlayerOnly = activePlayer !== null && activePlayer !== undefined;

  return (
    <div className="mx-4 mt-3.5 overflow-hidden rounded-[14px] border border-wire bg-surface">
      <div className="flex items-start justify-between gap-3 px-4 pb-1.5 pt-3.5">
        <h2 className="display text-[17px] uppercase leading-tight text-cream">
          {showPlayerOnly ? `Where did #${activePlayer} play?` : "Where did we play?"}
        </h2>
      </div>

      <p className="px-4 pb-3 text-[11.5px] leading-normal text-text-faint">
        {showPlayerOnly
          ? "Team heat dimmed. This is only the places this player was."
          : "Brighter = the team spent more time there. Drag the slider to see it change."}
      </p>

      <div className="px-4 pb-3">
        <div className="relative aspect-[2/3] overflow-hidden rounded-[10px] border border-wire bg-pitch-insight">
          <div className="absolute inset-[4%] rounded-[2px] border border-cream/[0.28]" aria-hidden="true" />
          <div className="absolute bottom-[4%] left-1/2 top-[4%] border-l border-cream/[0.28]" aria-hidden="true" />
          <div className="absolute left-[4%] right-[4%] top-1/3 border-t border-dashed border-cream/[0.12]" aria-hidden="true" />
          <div className="absolute left-[4%] right-[4%] top-2/3 border-t border-dashed border-cream/[0.12]" aria-hidden="true" />

          <div className={cn("absolute inset-0 transition-opacity duration-200", showPlayerOnly && "opacity-20")}>
            <Blobs blobs={teamBlobs} teamColour={teamColour} alpha={90} />
          </div>

          {showPlayerOnly && playerBlobs && (
            <div className="absolute inset-0">
              <Blobs blobs={playerBlobs} teamColour={teamColour} alpha={220} />
            </div>
          )}

          <div className="absolute bottom-[8%] left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-text-faint">
            ↑ {attackLabel}
          </div>
        </div>
      </div>

      <div className="border-t border-wire-2 px-4 pb-3 pt-2.5">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sliderValue}
          aria-label="Scrub through the match"
          onChange={(e) => onSliderChange(parseFloat(e.target.value))}
          className="w-full accent-cream"
        />
        <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-text-faint">
          <span>0:00</span><span>1st half</span><span>2nd half</span><span>Full</span>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-t border-wire-2 px-4 py-2.5" role="group" aria-label="Filter by player">
        <Chip active={!showPlayerOnly} onClick={() => onPlayerTap("all")} className="shrink-0">All</Chip>
        {players.map((p) => (
          <Chip key={p.id} active={activePlayer === p.id} onClick={() => onPlayerTap(p.id)} className="shrink-0">
            {p.num}
          </Chip>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-wire-2 px-4 pb-3 pt-2 text-[10.5px] text-text-faint">
        <span>{reliabilityLabel}</span>
        <span>n = {players.length} players · {frameCount.toLocaleString()} frames</span>
      </div>
    </div>
  );
}
