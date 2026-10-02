import { Link } from "@tanstack/react-router";
import { Play, Scissors } from "lucide-react";
import { actionLinkClass } from "@/components/ip/touchline";
import { cn } from "@/lib/utils";

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * The moments behind the verdict, as a strip you can open one tap from the top
 * of the page.
 *
 * This is the thing a coach actually came for. When an analyst joins a club the
 * supply of clips roughly doubles while the supply of statistics barely moves
 * — clips are what gets made the moment anyone has capacity, and coaches hand
 * analysts lists of them rather than asking for data. Burying them three
 * sections down behind a link made the page a report; putting them here makes
 * it the deliverable.
 *
 * Each tile is a real tracked moment with its own timestamp, so the workspace
 * opens at that second rather than at the start of the half.
 */
export function ClipStrip({
  matchId,
  timestamps,
  total,
  label,
}: {
  matchId: string;
  /** Seconds from kick-off, in match order. */
  timestamps: number[];
  /** How many moments the finding rests on in all. */
  total: number;
  label: string;
}) {
  const shown = timestamps.slice(0, 8);
  if (shown.length === 0) return null;
  const more = Math.max(total - shown.length, 0);

  return (
    <section className="border border-wire bg-surface" aria-labelledby="verdict-clips">
      <header className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b border-wire px-4 py-3 sm:px-5">
        <h2 id="verdict-clips" className="text-[14px] font-semibold text-text-bright">
          The {total} {total === 1 ? "moment" : "moments"} behind it
        </h2>
        <span className="text-[12px] text-text-faint">{label}</span>
      </header>

      <ul className="flex gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shown.map((t, i) => (
          <li key={`${t}-${i}`} className={cn("shrink-0", i > 0 && "border-l border-wire")}>
            <Link
              to="/match/$matchId/match"
              params={{ matchId }}
              search={{ t: Math.round(t * 10) / 10 }}
              className="group flex w-[116px] flex-col gap-2 p-3 transition-colors hover:bg-surface-2 sm:w-[132px]"
            >
              {/* No frame grab is available here, so the tile shows the clock
                  rather than a placeholder image pretending to be the video. */}
              <span className="grid h-[58px] place-items-center border border-wire bg-surface-2 text-text-dim transition-colors group-hover:border-accent-sea group-hover:text-accent-sea sm:h-[66px]">
                <Play size={18} aria-hidden="true" />
              </span>
              <span className="num-flat text-[12.5px] text-text-bright">{clock(t)}</span>
              <span className="label-xs text-text-faint">Clip {i + 1}</span>
            </Link>
          </li>
        ))}

        {more > 0 && (
          <li className="flex shrink-0 items-center border-l border-wire px-4">
            <span className="num-flat text-[12px] text-text-faint">+{more} more</span>
          </li>
        )}
      </ul>

      <footer className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-wire px-4 py-3 sm:px-5">
        <Link
          to="/match/$matchId/reel"
          params={{ matchId }}
          className={cn(actionLinkClass(), "inline-flex items-center gap-1.5")}
        >
          <Scissors size={13} aria-hidden="true" />
          Cut these into a reel to share
        </Link>
        <span className="text-[11.5px] text-text-faint">Each clip opens at its own second</span>
      </footer>
    </section>
  );
}
