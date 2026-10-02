import { Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { Play, Scissors } from "lucide-react";
import { ClipPlayer } from "@/components/insights/ClipPlayer";
import { actionLinkClass } from "@/components/ip/touchline";
import { useClipPosters } from "@/hooks/use-clip-posters";
import { useOnScreen } from "@/hooks/use-on-screen";
import { cn } from "@/lib/utils";

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Tiles on show before the strip is expanded, and how many each expansion adds. */
const FIRST_PAGE = 8;
const PAGE = 16;
/** Frames are grabbed for this many tiles; past it the tiles keep clock faces. */
const POSTER_LIMIT = 24;

/**
 * The moments behind the verdict, playable where they sit.
 *
 * This is the thing a coach actually came for. When an analyst joins a club the
 * supply of clips roughly doubles while the supply of statistics barely moves
 * — clips are what gets made the moment anyone has capacity, and coaches hand
 * analysts lists of them rather than asking for data.
 *
 * So the tiles are not links out. Each one holds a real frame grabbed from the
 * match video at its own second, and clicking it plays that moment here, with
 * the finding it proves still on screen. The workspace is still one click away
 * for anyone who wants the full timeline and the overlays.
 */
export function ClipStrip({
  matchId,
  timestamps,
  total,
  label,
  bare = false,
  videoUrl,
}: {
  matchId: string;
  /** Seconds from kick-off, in match order. */
  timestamps: number[];
  /** How many moments the finding rests on in all. */
  total: number;
  label: string;
  /** Inside a drawer the section already has its own frame and heading. */
  bare?: boolean;
  /** Absent until the match video is signed — the tiles then link out instead. */
  videoUrl?: string | undefined;
}) {
  const headingId = useId();
  const [shownCount, setShownCount] = useState(FIRST_PAGE);
  const [active, setActive] = useState<number | null>(null);
  const { ref, seen } = useOnScreen<HTMLElement>();
  const railRef = useRef<HTMLUListElement | null>(null);

  // Stepping through moments in the player should bring the matching tile with
  // it, so the strip always shows where you are in the list.
  useEffect(() => {
    if (active === null) return;
    railRef.current
      ?.querySelector(`[data-clip="${active}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  const shown = timestamps.slice(0, shownCount);
  const more = Math.max(total - shown.length, 0);
  const posters = useClipPosters(videoUrl, shown.slice(0, POSTER_LIMIT), seen && Boolean(videoUrl));
  if (shown.length === 0) return null;

  const open = (index: number) => {
    setActive(index);
    // Reaching a later moment through the player should not leave the strip
    // showing only the first page.
    if (index >= shownCount) setShownCount(Math.min(timestamps.length, index + PAGE));
  };

  return (
    <section
      ref={ref}
      className={bare ? "" : "border border-wire bg-surface"}
      aria-labelledby={headingId}
    >
      {!bare && (
        <header className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b border-wire px-4 py-3 sm:px-5">
          <h2 id={headingId} className="text-[14px] font-semibold text-text-bright">
            The {total} {total === 1 ? "moment" : "moments"} behind it
          </h2>
          <span className="text-[12px] text-text-faint">{label}</span>
        </header>
      )}

      {videoUrl && active !== null && (
        <ClipPlayer
          videoUrl={videoUrl}
          timestamps={timestamps}
          index={active}
          onIndex={open}
          onClose={() => setActive(null)}
          matchId={matchId}
          label={label}
        />
      )}

      <ul
        ref={railRef}
        className="flex gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {shown.map((t, i) => {
          const poster = posters[t];
          const current = active === i;
          // The frame, the clock and the number are the same whichever way the
          // tile behaves; only what a click does changes.
          const face = (
            <>
              <span
                className={cn(
                  "relative grid h-[58px] place-items-center overflow-hidden border bg-surface-2 transition-colors sm:h-[66px]",
                  current
                    ? "border-accent-sea text-accent-sea"
                    : "border-wire text-text-dim group-hover:border-accent-sea group-hover:text-accent-sea",
                )}
              >
                {poster && (
                  <img
                    src={poster}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <span
                  className={cn(
                    "relative grid h-7 w-7 place-items-center",
                    poster && "bg-black/55 text-white",
                  )}
                >
                  <Play size={15} aria-hidden="true" />
                </span>
              </span>
              <span
                className={cn(
                  "num-flat text-[12.5px]",
                  current ? "text-accent-sea" : "text-text-bright",
                )}
              >
                {clock(t)}
              </span>
              <span className="label-xs text-text-faint">Clip {i + 1}</span>
            </>
          );
          const shape =
            "group flex w-[116px] flex-col gap-2 p-3 text-left transition-colors hover:bg-surface-2 sm:w-[132px]";

          return (
            <li
              key={`${t}-${i}`}
              data-clip={i}
              className={cn("shrink-0", i > 0 && "border-l border-wire")}
            >
              {videoUrl ? (
                <button
                  type="button"
                  onClick={() => open(i)}
                  aria-pressed={current}
                  className={cn(shape, current && "bg-surface-2")}
                >
                  {face}
                </button>
              ) : (
                <Link
                  to="/match/$matchId/match"
                  params={{ matchId }}
                  search={{ t: Math.round(t * 10) / 10 }}
                  className={shape}
                >
                  {face}
                </Link>
              )}
            </li>
          );
        })}

        {more > 0 && (
          <li className="flex shrink-0 items-center border-l border-wire">
            <button
              type="button"
              onClick={() => setShownCount((n) => Math.min(timestamps.length, n + PAGE))}
              className="flex h-full flex-col justify-center gap-1 px-4 text-left transition-colors hover:bg-surface-2"
            >
              <span className="num-flat text-[12.5px] text-text-bright">+{more}</span>
              <span className="label-xs text-text-faint">Show more</span>
            </button>
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
        <span className="text-[11.5px] text-text-faint">
          {videoUrl
            ? "Each clip plays here, four seconds before the moment"
            : "Each clip opens at its own second"}
        </span>
      </footer>
    </section>
  );
}
