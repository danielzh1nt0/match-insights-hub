import { Link } from "@tanstack/react-router";
import { Rows3 } from "lucide-react";
import type { BlockSample, Blocks } from "@/lib/blocks";
import { cn } from "@/lib/utils";

function clock(seconds: number) {
  const m = Math.floor(Math.max(seconds, 0) / 60);
  return `${m}'`;
}

const W = 1000;
const H = 190;

/**
 * The three blocks through the match, and what the gaps cost.
 *
 * Three lines — back, middle, front — drawn up the pitch against time. The
 * distance between them is the thing being measured, so it is drawn as
 * distance: when the team pulls apart the lines visibly separate and the band
 * between them opens up. Nobody has to read a number to see it.
 *
 * Spells past the coach's own ceiling are banded along the top, and the ones
 * that were punished — a shot against, or a ball played through the line,
 * during or just after — carry a mark you can tap through to the video. That is
 * the question this card exists to answer: it happened, and here is whether it
 * mattered.
 */
export function BlockSpacing({
  blocks,
  ceilingM,
  matchId,
  teamName,
}: {
  blocks: Blocks;
  ceilingM: number;
  matchId: string;
  teamName: string;
}) {
  const { samples, stretches, durationS, medianLength, unavailable } = blocks;

  if (unavailable)
    return (
      <section className="border border-wire bg-surface">
        <header className="flex items-start gap-3 border-b border-wire p-4 sm:p-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center border border-wire text-accent-sea">
            <Rows3 size={17} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-text-bright">
              Did our blocks pull apart?
            </h3>
            <p className="mt-1 text-[12.5px] text-text-dim">
              The distance from back line to front, through the match.
            </p>
          </div>
        </header>
        <p className="p-4 text-[13px] leading-relaxed text-text-dim sm:p-5">{unavailable}</p>
      </section>
    );

  /**
   * Binned to a rolling median before drawing.
   *
   * Tracking jitters by a metre or two between frames, and a line drawn
   * straight from the samples fills the panel with a sawtooth — the same thing
   * that made the line-height chart unreadable. The shape of where the blocks
   * sat survives binning; the jitter does not.
   */
  const COLS = 140;
  const drawn = (() => {
    const buckets: BlockSample[][] = Array.from({ length: COLS }, () => []);
    for (const sample of samples) {
      const i = Math.min(COLS - 1, Math.floor((sample.t / durationS) * COLS));
      buckets[i]!.push(sample);
    }
    const mid = (values: number[]) =>
      [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
    return buckets
      .map((group) =>
        group.length === 0
          ? null
          : {
              t: mid(group.map((g) => g.t)),
              def: mid(group.map((g) => g.def)),
              mid: (() => {
                const known = group.map((g) => g.mid).filter((v): v is number => v !== null);
                return known.length ? mid(known) : null;
              })(),
              att: mid(group.map((g) => g.att)),
              length: mid(group.map((g) => g.length)),
            },
      )
      .filter((p): p is BlockSample => p !== null);
  })();

  const maxUp = Math.max(...drawn.map((s) => s.att), 60);
  const x = (t: number) => (t / durationS) * W;
  const y = (m: number) => H - (m / maxUp) * H;
  // A gap in a series lifts the pen, so an unmeasured midfield is a break
  // in the dashed line rather than a line drawn through the middle.
  const path = (pick: (s: BlockSample) => number | null) => {
    let pen = false;
    return drawn
      .map((s) => {
        const v = pick(s);
        if (v === null) {
          pen = false;
          return "";
        }
        const cmd = pen ? "L" : "M";
        pen = true;
        return `${cmd}${x(s.t).toFixed(1)} ${y(v).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");
  };

  const punished = stretches.filter((s) => s.punished);

  return (
    <section className="border border-wire bg-surface" aria-labelledby="block-spacing">
      <header className="flex items-start gap-3 border-b border-wire p-4 sm:p-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center border border-wire text-accent-sea">
          <Rows3 size={17} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 id="block-spacing" className="text-[15px] font-semibold text-text-bright">
            Did our blocks pull apart?
          </h3>
          <p className="mt-1 text-[12.5px] leading-snug text-text-dim">
            {teamName} from back line to front. The gap between the lines is the distance between
            the blocks.
          </p>
        </div>
      </header>

      {/* The headline answer, before the chart. */}
      <div className="rule-x grid grid-cols-3 border-b border-wire">
        <div className="px-3 py-3 sm:px-5">
          <p className="num text-[clamp(22px,5vw,32px)] leading-none text-text-bright">
            {stretches.length}
          </p>
          <p className="label-xs mt-1.5 text-text-faint">times over {Math.round(ceilingM)} m</p>
        </div>
        <div className="px-3 py-3 sm:px-5">
          <p
            className={cn(
              "num text-[clamp(22px,5vw,32px)] leading-none",
              punished.length > 0 ? "text-reaction-bad" : "text-text-bright",
            )}
          >
            {punished.length}
          </p>
          <p className="label-xs mt-1.5 text-text-faint">cost us</p>
        </div>
        <div className="px-3 py-3 sm:px-5">
          <p className="num text-[clamp(22px,5vw,32px)] leading-none text-text-bright">
            {medianLength === null ? "—" : `${Math.round(medianLength)} m`}
          </p>
          <p className="label-xs mt-1.5 text-text-faint">usual length</p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="block h-[180px] w-full sm:h-[210px]"
          role="img"
          aria-label={`Block positions through the match. ${stretches.length} spells longer than ${Math.round(ceilingM)} metres, ${punished.length} of them followed by a shot or a ball through the line.`}
        >
          {/* Spells past the ceiling, shaded behind everything. */}
          {stretches.map((stretch, i) => (
            <rect
              key={i}
              x={x(stretch.fromS)}
              y={0}
              width={Math.max(x(stretch.toS) - x(stretch.fromS), 1.5)}
              height={H}
              fill={stretch.punished ? "var(--reaction-bad)" : "var(--cream)"}
              fillOpacity={stretch.punished ? 0.18 : 0.07}
            />
          ))}

          {/* The band between back and front: the team's length, as an area. */}
          <path
            d={`${path((s) => s.att)} L${x(drawn.at(-1)!.t).toFixed(1)} ${y(drawn.at(-1)!.def).toFixed(1)} ${drawn
              .slice()
              .reverse()
              .map((s) => `L${x(s.t).toFixed(1)} ${y(s.def).toFixed(1)}`)
              .join(" ")} Z`}
            fill="var(--accent)"
            fillOpacity={0.14}
          />

          <path
            d={path((s) => s.att)}
            fill="none"
            stroke="var(--accent-sea)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path((s) => s.mid)}
            fill="none"
            stroke="var(--text-dim)"
            strokeWidth={1.2}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path((s) => s.def)}
            fill="none"
            stroke="var(--cream)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Axis and key. */}
        <div className="mt-1 flex justify-between text-[11px] text-text-faint">
          <span>0&apos;</span>
          <span>{clock(durationS / 2)}</span>
          <span>{clock(durationS)}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-text-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 bg-accent-sea" aria-hidden="true" /> front
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 bg-text-dim" aria-hidden="true" /> midfield
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 bg-cream" aria-hidden="true" /> back line
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-4 bg-reaction-bad/25" aria-hidden="true" /> stretched, and
            punished
          </span>
        </div>
      </div>

      {/* When, and what it cost — each one opens the video there. */}
      {punished.length > 0 && (
        <ul className="rule-y border-t border-wire">
          {punished.slice(0, 6).map((stretch, i) => (
            <li key={i}>
              <Link
                to="/match/$matchId/match"
                params={{ matchId }}
                search={{ t: Math.round(Math.max(0, stretch.fromS - 3) * 10) / 10 }}
                className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 transition-colors hover:bg-surface-2 sm:px-5"
              >
                <span className="flex items-baseline gap-3">
                  <span className="num text-[14px] text-text-bright">{clock(stretch.fromS)}</span>
                  <span className="text-[13px] text-text">
                    {Math.round(stretch.maxM)} m apart, then{" "}
                    {stretch.punished!.kind === "break" ? "played through us" : "a shot against"}
                  </span>
                </span>
                <span className="num-flat text-[11.5px] text-accent-sea">Watch</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-wire px-4 py-3 text-[11.5px] leading-snug text-text-faint sm:px-5">
        {samples.length.toLocaleString()} frames with enough of our outfield in view ·{" "}
        {stretches.length === 0
          ? `never longer than your ${Math.round(ceilingM)} m ceiling`
          : `${punished.length} of ${stretches.length} spells led to a shot or a ball through the line within 12 seconds`}
      </p>
    </section>
  );
}
