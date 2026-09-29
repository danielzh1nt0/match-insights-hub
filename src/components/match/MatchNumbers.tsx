import type { StatIconName } from "./StatIcon";
import { StatIcon } from "./StatIcon";
import { cn } from "@/lib/utils";

export type MatchNumberTile = {
  icon: StatIconName;
  label: string;
  valueA: number;
  valueB: number;
  unit?: string;
  unreliable?: boolean;
};

/**
 * The headline numbers under the player, each one a filter for the event list.
 *
 * Both teams' values sit side by side in their kit colours, so this keeps its
 * own tile rather than using the shared StatTiles, which carries one value and
 * does not tap through.
 */
export function MatchNumbers({ tiles, onTileTap }: {
  tiles: MatchNumberTile[];
  onTileTap: (label: string) => void;
}) {
  return (
    <section aria-labelledby="match-numbers-title" className="mt-4">
      <h2 id="match-numbers-title" className="display px-4 pb-2 text-[18px] uppercase text-text">
        Match in numbers
      </h2>
      <div className="grid grid-cols-3 gap-2 px-4">
        {tiles.map((tile) => {
          const bothZero = tile.valueA === 0 && tile.valueB === 0;
          const inactive = tile.unreliable || bothZero;
          return (
            <button
              key={tile.label}
              type="button"
              onClick={() => onTileTap(tile.label)}
              aria-label={`Open ${tile.label.toLowerCase()} details`}
              className="min-h-[132px] rounded-[12px] border border-wire bg-surface px-2.5 py-3.5 text-left transition-colors hover:border-cream/30"
            >
              <div className={cn("mb-2.5", inactive && "opacity-35")}>
                <StatIcon name={tile.icon} size={24} />
              </div>
              <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-faint">{tile.label}</div>
              <div className={cn("display-i num text-[22px] leading-none", bothZero ? "text-text-faint" : "text-cream")}>
                {bothZero ? (
                  "—"
                ) : (
                  <>
                    <span className="text-team-a">{tile.valueA}</span> : <span className="text-team-b">{tile.valueB}</span>
                    {tile.unit ?? ""}
                  </>
                )}
              </div>
              {tile.unreliable && (
                <span className="mt-1.5 inline-block rounded-[6px] border border-reaction-warn/50 bg-reaction-warn/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-reaction-warn">
                  Unreliable
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
