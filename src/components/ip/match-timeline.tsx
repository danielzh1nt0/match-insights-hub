import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, ChevronDown, ArrowRight } from "lucide-react";
import type { StatsTeamIdentity } from "@/components/ip/stats-team-selector";
import {
  barHalves,
  buildStory,
  keyMoments,
  storyLine,
  halves,
  playedScale,
  type MatchTimeline,
  type Point,
  type SpellTone,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";

/** Green on top, amber even, red losing it. One meaning each. */
const TONE: Record<SpellTone, string> = {
  strong: "bg-positive",
  even: "bg-text-dim",
  lost: "bg-reaction-bad",
};

function minute(seconds: number) {
  return `${Math.round(seconds / 60)}'`;
}

type Row = {
  key: string;
  /** What it is, in a coach's words. */
  label: string;
  first: number | null;
  second: number | null;
  /** How to write the numbers. */
  unit: "pct" | "count" | "metres";
  /** Which direction is good for us. */
  goodWhen: "up" | "down" | "neither";
  series: Point[];
};

function show(value: number | null, unit: Row["unit"]) {
  if (value === null) return "—";
  if (unit === "pct") return `${Math.round(value * 100)}%`;
  if (unit === "metres") return `${Math.round(value)} m`;
  return `${Math.round(value)}`;
}

/**
 * Where the play was, as a pitch.
 *
 * "Share of final-third play at their end: 53%" is a sentence a coach has to
 * decode. A pitch with the busier end shaded is the same fact in a shape he has
 * read ten thousand times. Our goal is on the left, so weight to the right is a
 * team playing in the other half.
 */
function TerritoryPitch({
  share,
  teamA,
  teamB,
}: {
  share: number;
  teamA: StatsTeamIdentity;
  teamB: StatsTeamIdentity;
}) {
  const theirs = Math.max(0, Math.min(1, share));
  const edge = theirs * 100;
  return (
    <div>
      <svg
        viewBox="0 0 100 62"
        className="block w-full"
        role="img"
        aria-label={`${Math.round(theirs * 100)} per cent of the final-third play was in their third`}
      >
        <rect x="0" y="0" width="100" height="62" fill="var(--pitch-top)" />
        {/* Territory as a length, not a tint. Two shades of the same colour at
            68% and at 50% look alike at a glance, which defeats the point of
            drawing a pitch at all; an edge sitting clear of the halfway line
            does not. Our colour reaches as far up the pitch as we played. */}
        <rect x="0" y="0" width={edge} height="62" fill={teamA.kitColour} fillOpacity={0.68} />
        <rect
          x={edge}
          y="0"
          width={100 - edge}
          height="62"
          fill={teamB.kitColour}
          fillOpacity={0.34}
        />
        <g stroke="var(--cream)" fill="none">
          <g strokeOpacity="0.45" strokeWidth="0.6">
            <rect x="1" y="1" width="98" height="60" />
            <circle cx="50" cy="31" r="8" />
            <rect x="1" y="16" width="12" height="30" />
            <rect x="87" y="16" width="12" height="30" />
          </g>
          {/* The halfway line is what the edge is read against, so it stays
              brighter than the rest of the markings. */}
          <line x1="50" y1="1" x2="50" y2="61" strokeOpacity="0.85" strokeWidth="0.7" />
          <line
            x1="33"
            y1="1"
            x2="33"
            y2="61"
            strokeDasharray="2 2"
            strokeOpacity="0.3"
            strokeWidth="0.5"
          />
          <line
            x1="67"
            y1="1"
            x2="67"
            y2="61"
            strokeDasharray="2 2"
            strokeOpacity="0.3"
            strokeWidth="0.5"
          />
          <line x1={edge} y1="0" x2={edge} y2="62" strokeWidth="1.1" />
        </g>
      </svg>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className="text-[12px] text-text-faint">our end</span>
        <span className="num text-[17px] leading-none text-text-bright">
          {Math.round(theirs * 100)}% in their half
        </span>
        <span className="text-[12px] text-text-faint">their end</span>
      </div>
    </div>
  );
}

/** A thumbnail of the shape, no axes — it is there to be glanced at. */
function Spark({ points, colour }: { points: Point[]; colour: string }) {
  const known = points.filter((p) => p.value !== null) as { t: number; value: number }[];
  if (known.length < 3) return <span className="h-6 w-full" />;
  const lo = Math.min(...known.map((p) => p.value));
  const hi = Math.max(...known.map((p) => p.value));
  const span = hi - lo || 1;
  const t0 = known[0]!.t;
  const t1 = known.at(-1)!.t || 1;
  const d = known
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${(((p.t - t0) / (t1 - t0 || 1)) * 100).toFixed(1)} ${(
          100 -
          ((p.value - lo) / span) * 100
        ).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-6 w-full" aria-hidden="true">
      <path d={d} fill="none" stroke={colour} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * The match over time, answer first.
 *
 * The honest version of this was six charts sharing a clock, and it was
 * useless: a coach gets about five seconds, and six unlabelled lines in five
 * seconds is nothing. What he actually reads a match in is halves — what we
 * did, and what changed after the break — so that is what leads. One row per
 * thing, the two numbers that make the point, the direction marked, and a
 * thumbnail of the shape beside it.
 *
 * The full possession chart stays underneath for anyone who wants to find the
 * minute it turned, with the goals and the playhead on it. Everything is still
 * one clock with half-time closed up.
 */
export function MatchTimelineCard({
  timeline,
  teamA,
  teamB,
  matchId,
  clockS,
  ours = "A",
}: {
  timeline: MatchTimeline;
  teamA: StatsTeamIdentity;
  teamB: StatsTeamIdentity;
  matchId: string;
  clockS?: number | undefined;
  /** The team the series belong to; teamA/teamB stay the literal sides. */
  ours?: "A" | "B";
}) {
  const navigate = useNavigate();
  // The series are the selected team's, so "above the line" and the team
  // colour must follow the selection, while a goal keeps its real side.
  const own = ours === "B" ? teamB : teamA;
  const other = ours === "B" ? teamA : teamB;
  const at = playedScale(timeline);
  // A coach opens this to know what happened. Everything an analyst would want
  // is still here, one tap away, rather than in front of the answer.
  const [detailed, setDetailed] = useState(false);
  const [open, setOpen] = useState(false);

  if (timeline.empty)
    return (
      <section className="border border-wire bg-surface p-4 sm:p-5">
        <h3 className="text-[15px] font-semibold text-text-bright">How the match changed</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-text-dim">
          This match file carries no per-window figures yet, so there is nothing to lay out over the
          clock. The totals on the tabs below are unaffected.
        </p>
      </section>
    );

  const story = buildStory(timeline);
  const moments = keyMoments(timeline, story);
  const possession = halves(timeline.possession, timeline.spans);
  const tilt = halves(timeline.tilt, timeline.spans);
  // The whole match, every window weighted the same, rather than the mean of
  // two half figures (a 44-minute half and a 51-minute half are not equal).
  const tiltKnown = timeline.tilt.filter(
    (p): p is { t: number; value: number } => p.value !== null,
  );
  const tiltMatch = tiltKnown.length
    ? tiltKnown.reduce((sum, p) => sum + p.value, 0) / tiltKnown.length
    : null;
  const pressing = barHalves(timeline.pressure, timeline.spans, "a");
  const length = halves(timeline.length.a, timeline.spans);

  const rows: Row[] = [
    {
      key: "ball",
      label: "Ball",
      first: possession.first,
      second: possession.second,
      unit: "pct",
      goodWhen: "up",
      series: timeline.possession,
    },
    {
      key: "press",
      label: "Pressures applied",
      first: pressing.first,
      second: pressing.second,
      unit: "count",
      goodWhen: "up",
      series: timeline.possession.map((p) => ({ t: p.t, value: null })),
    },
    {
      key: "length",
      label: "Length, back to front",
      first: length.first,
      second: length.second,
      unit: "metres",
      goodWhen: "down",
      series: timeline.length.a,
    },
  ].filter((row) => row.first !== null || row.second !== null) as Row[];

  const headline = storyLine(story);

  const secondsAt = (fraction: number) => {
    const spans = timeline.spans.length
      ? timeline.spans
      : [{ fromS: timeline.startS, toS: timeline.endS }];
    const total = spans.reduce((sum, s) => sum + (s.toS - s.fromS), 0);
    let want = fraction * total;
    for (const span of spans) {
      const len = span.toS - span.fromS;
      if (want <= len) return span.fromS + want;
      want -= len;
    }
    return timeline.endS;
  };

  const jump = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const t = secondsAt(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
    void navigate({
      to: "/match/$matchId/match",
      params: { matchId },
      search: { t: Math.round(t * 10) / 10 },
    });
  };

  const d = (() => {
    const known = timeline.possession.filter((p) => p.value !== null);
    if (known.length < 2) return null;
    const line = known
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${at(p.t).toFixed(2)} ${(100 - p.value! * 100).toFixed(2)}`,
      )
      .join(" ");
    return {
      line,
      fill: `${line} L${at(known.at(-1)!.t).toFixed(2)} 50 L${at(known[0]!.t).toFixed(2)} 50 Z`,
    };
  })();

  return (
    <section className="border border-wire bg-surface" aria-labelledby="match-timeline">
      <header className="p-4 pb-3 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center border border-wire text-accent-sea">
            <Activity size={17} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 id="match-timeline" className="text-[15px] font-semibold text-text-bright">
              The match story
            </h3>
            <p className="mt-1 text-[13.5px] leading-snug text-text">{headline}</p>
          </div>
          <div
            className={cn("ml-auto shrink-0 border border-wire", open ? "flex" : "hidden")}
            role="group"
            aria-label="How much detail"
          >
            {(
              [
                ["Quick", false],
                ["Detailed", true],
              ] as const
            ).map(([label, on]) => (
              <button
                key={label}
                type="button"
                aria-pressed={detailed === on}
                onClick={() => setDetailed(on)}
                className={cn(
                  "min-h-9 border-l border-wire px-2.5 text-[11.5px] font-bold transition-colors first:border-l-0",
                  detailed === on
                    ? "bg-accent-sea text-ink"
                    : "text-text-dim hover:bg-surface-2 hover:text-text",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* The shape of the match as one ribbon. This is the part that stays on
          screen when the card is shut: it is a glance, not a read, and the
          spell list behind it is what a coach opens once he wants the minutes.
          Each band jumps the video to where that spell began. */}
      {story.length > 0 && (
        <div className="px-4 pb-4 sm:px-5">
          <div className="flex h-3 gap-[2px]">
            {story.map((spell, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/match/$matchId/match",
                    params: { matchId },
                    search: { t: Math.round(spell.fromS * 10) / 10 },
                  })
                }
                className={cn("block", TONE[spell.tone])}
                style={{ flexGrow: Math.max(spell.toS - spell.fromS, 1) }}
                title={`${spell.title} ${minute(spell.fromS)}–${minute(spell.toS)}`}
                aria-label={`${spell.title}, ${minute(spell.fromS)} to ${minute(spell.toS)}`}
              />
            ))}
          </div>
          <div className="num-flat mt-1 flex justify-between text-[10.5px] text-text-faint">
            <span>{minute(story[0]!.fromS)}</span>
            <span>{minute(story.at(-1)!.toS)}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-10 w-full items-center justify-center gap-1.5 border-t border-wire text-[12px] text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
      >
        {open
          ? "Hide the detail"
          : `Spell by spell${moments.length > 0 ? ` · ${moments.length} worth watching` : ""}`}
        <ChevronDown
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {/* The two or three worth opening, before anything that needs reading. */}
      {open && moments.length > 0 && (
        <div className="border-t border-wire px-4 py-3 sm:px-5">
          <p className="label-xs mb-2 text-text-faint">Worth watching</p>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {moments.map((moment, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/match/$matchId/match",
                    params: { matchId },
                    search: { t: Math.round(Math.max(0, moment.t - 5) * 10) / 10 },
                  })
                }
                className="flex min-w-[112px] flex-1 flex-col gap-1 border border-wire bg-surface-2 p-3 text-left transition-colors hover:border-accent-sea"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", TONE[moment.tone])}
                    aria-hidden="true"
                  />
                  <span className="num text-[15px] leading-none text-text-bright">
                    {minute(moment.t)}
                  </span>
                </span>
                <span className="text-[13px] font-semibold leading-snug text-text-bright">
                  {moment.label}
                </span>
                <span className="text-[11.5px] text-text-faint">{moment.note}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The spells, in the words a coach would use telling someone about the
          match. Each one opens the video where it started. */}
      {open && story.length > 0 && (
        <ul className="rule-y border-t border-wire">
          {story.map((spell, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/match/$matchId/match",
                    params: { matchId },
                    search: { t: Math.round(spell.fromS * 10) / 10 },
                  })
                }
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 sm:px-5"
              >
                <span
                  className={cn("mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full", TONE[spell.tone])}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="text-[14.5px] font-semibold text-text-bright">
                      {spell.title}
                    </span>
                    <span className="num-flat text-[12px] text-text-faint">
                      {minute(spell.fromS)}–{minute(spell.toS)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[13px] text-text-dim">
                    {spell.headline}
                    {spell.detail ? ` · ${spell.detail}` : ""}
                  </span>
                </span>
                <span className="num-flat shrink-0 self-center text-[11.5px] text-accent-sea">
                  Watch
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* First half against second, one row each. The numbers are the answer;
          the thumbnail beside them is how it got there. */}
      {open && detailed && (
        <div className="rule-y border-y border-wire">
          <div className="grid grid-cols-[1fr_auto_auto_auto_72px] items-center gap-x-3 px-4 py-2 sm:px-5">
            <span className="label-xs text-text-faint">&nbsp;</span>
            <span className="label-xs text-right text-text-faint">1st</span>
            <span />
            <span className="label-xs text-right text-text-faint">2nd</span>
            <span />
          </div>
          {rows.map((row) => {
            const moved =
              row.first !== null && row.second !== null && row.first !== 0
                ? (row.second - row.first) / Math.abs(row.first)
                : 0;
            const better =
              row.goodWhen === "neither" || Math.abs(moved) < 0.05
                ? null
                : moved > 0 === (row.goodWhen === "up");
            return (
              <div
                key={row.key}
                className="grid min-h-12 grid-cols-[1fr_auto_auto_auto_72px] items-center gap-x-3 px-4 sm:px-5"
              >
                <span className="text-[13.5px] text-text-bright">{row.label}</span>
                <span className="num text-right text-[17px] leading-none text-text-dim">
                  {show(row.first, row.unit)}
                </span>
                <ArrowRight size={13} aria-hidden="true" className="text-text-faint" />
                <span
                  className={cn(
                    "num text-right text-[19px] leading-none",
                    better === null
                      ? "text-text-bright"
                      : better
                        ? "text-positive"
                        : "text-reaction-bad",
                  )}
                >
                  {show(row.second, row.unit)}
                </span>
                <Spark points={row.series} colour={own.kitColour} />
              </div>
            );
          })}
        </div>
      )}

      {/* The one chart worth keeping: when the ball changed hands, against the
          goals, with a way into the video. */}
      {open && detailed && tiltMatch !== null && (
        <div className="border-t border-wire px-4 py-4 sm:px-5">
          <h4 className="text-[13px] font-semibold text-text-bright">Where did we play?</h4>
          <p className="mb-3 mt-0.5 text-[11.5px] text-text-faint">
            Of the play in either final third, how much was in theirs. Our goal on the left.
          </p>
          <TerritoryPitch share={tiltMatch} teamA={own} teamB={other} />
        </div>
      )}

      {open && detailed && d && (
        <div className="border-t border-wire px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h4 className="text-[13px] font-semibold text-text-bright">
              Who had the ball, minute by minute
            </h4>
            <p className="text-[11.5px] text-text-faint">
              {own.shortCode} above the line, {other.shortCode} below
            </p>
          </div>
          <div
            className="relative mt-2 cursor-pointer"
            onClick={jump}
            role="presentation"
            title="Open the video here"
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="block h-[96px] w-full"
              role="img"
              aria-label="Possession through the match"
            >
              <defs>
                <clipPath id="tl-top">
                  <rect x="0" y="0" width="100" height="50" />
                </clipPath>
                <clipPath id="tl-bottom">
                  <rect x="0" y="50" width="100" height="50" />
                </clipPath>
              </defs>
              <rect x="0" y="0" width="100" height="100" fill="var(--surface-2)" />
              <path d={d.fill} fill={own.kitColour} fillOpacity={0.6} clipPath="url(#tl-top)" />
              <path
                d={d.fill}
                fill={other.kitColour}
                fillOpacity={0.55}
                clipPath="url(#tl-bottom)"
              />
              <path
                d={d.line}
                fill="none"
                stroke="var(--text-bright)"
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1="0"
                y1="50"
                x2="100"
                y2="50"
                stroke="var(--text-faint)"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {timeline.spans.length >= 2 && (
              <span
                className="pointer-events-none absolute inset-y-0 w-px bg-wire"
                style={{ left: `${at(timeline.spans[0]!.toS)}%` }}
                aria-hidden="true"
              />
            )}
            {timeline.goals.map((goal, i) => (
              <span
                key={i}
                className="pointer-events-none absolute -top-1.5 flex h-[calc(100%+12px)] flex-col items-center"
                style={{ left: `${at(goal.t)}%`, transform: "translateX(-50%)" }}
                aria-hidden="true"
              >
                <span
                  className="num-flat rounded-sm px-1 text-[9.5px] font-bold text-ink"
                  style={{ background: goal.team === "A" ? teamA.kitColour : teamB.kitColour }}
                >
                  {goal.score}
                </span>
                <span
                  className="w-px flex-1"
                  style={{ background: goal.team === "A" ? teamA.kitColour : teamB.kitColour }}
                />
              </span>
            ))}
            {clockS !== undefined && (
              <span
                className="pointer-events-none absolute inset-y-0 w-[1.5px] bg-cream"
                style={{ left: `${at(clockS)}%` }}
                aria-hidden="true"
              />
            )}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-text-faint">
            <span>{minute(timeline.startS)}</span>
            <span>half-time</span>
            <span>{minute(timeline.endS)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
