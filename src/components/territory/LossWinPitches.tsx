import { cn } from "@/lib/utils";

/** Tracking coordinates should be 0–1; a stray one must not escape the pitch. */
const pc = (v: number) => `${Math.min(Math.max(v, 0), 1) * 100}%`;

export type Point = { x: number; y: number; t: number; high?: boolean };

type Props = {
  teamColour: string;
  losses: Point[];
  wins: Point[];
  onDotTap: (p: Point) => void;
};

function MiniPitch({ points, teamColour, highBold, onDotTap, label }: {
  points: Point[];
  teamColour: string;
  highBold?: boolean;
  onDotTap: (p: Point) => void;
  label: string;
}) {
  return (
    <div
      className="relative aspect-[3/2] overflow-hidden rounded-[10px] border border-wire bg-pitch-insight"
      role="group"
      aria-label={label}
    >
      <div className="absolute inset-[4%] rounded-[2px] border border-cream/[0.28]" aria-hidden="true" />
      <div className="absolute bottom-[4%] left-1/2 top-[4%] border-l border-cream/[0.28]" aria-hidden="true" />
      {points.map((p, i) => {
        const bold = Boolean(highBold && p.high);
        return (
          <button
            type="button"
            key={`${p.t}-${i}`}
            aria-label={`Open moment at ${Math.round(p.t)} seconds`}
            onClick={() => onDotTap(p)}
            className="absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center p-0"
            style={{ left: pc(p.x), top: pc(p.y) }}
          >
            <span
              className={cn("block rounded-full border-2 border-ink", bold ? "h-3.5 w-3.5" : "h-2.5 w-2.5")}
              style={{ background: teamColour }}
            />
          </button>
        );
      })}
    </div>
  );
}

export function LossWinPitches({ teamColour, losses, wins, onDotTap }: Props) {
  return (
    <div className="mx-4 mt-3.5 overflow-hidden rounded-[14px] border border-wire bg-surface">
      <div className="px-4 pb-1.5 pt-3.5">
        <h2 className="display text-[17px] uppercase text-cream">Where did we lose it — and where did we win it?</h2>
      </div>
      <p className="px-4 pb-3 text-[11.5px] text-text-faint">
        Left is losses, right is recoveries. Bold recoveries won the ball in their final third.
      </p>
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-3">
        <div>
          <MiniPitch points={losses} teamColour={teamColour} onDotTap={onDotTap} label="Where we lost the ball" />
          <p className="mt-2 text-[11px] leading-normal text-text-faint">Each dot is one time we lost the ball.</p>
        </div>
        <div>
          <MiniPitch points={wins} teamColour={teamColour} highBold onDotTap={onDotTap} label="Where we won the ball" />
          <p className="mt-2 text-[11px] leading-normal text-text-faint">Bold dots = won the ball in their final third.</p>
        </div>
      </div>
    </div>
  );
}
