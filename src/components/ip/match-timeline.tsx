import { useNavigate } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import type { ReactNode } from "react";
import type { StatsTeamIdentity } from "@/components/ip/stats-team-selector";
import { playedScale, type Bar, type MatchTimeline, type Point } from "@/lib/timeline";
import { cn } from "@/lib/utils";

function minute(seconds: number) {
  return `${Math.round(seconds / 60)}'`;
}

/**
 * The match as it ran, not as it finished.
 *
 * Every strip below shares one clock, with half-time closed up so the drawn
 * width is time actually played. That is the whole point of stacking them: the
 * minute the team stopped having the ball is the same place on the chart as the
 * minute they stopped pressing, and a coach can see the two line up without
 * being told to.
 *
 * Goals are marked on every strip, so any shape can be read against the score.
 * Tapping anywhere opens the video there.
 */
export function MatchTimelineCard({
  timeline,
  teamA,
  teamB,
  matchId,
  clockS,
}: {
  timeline: MatchTimeline;
  teamA: StatsTeamIdentity;
  teamB: StatsTeamIdentity;
  matchId: string;
  /** Where the video is, if it is open. */
  clockS?: number | undefined;
}) {
  const navigate = useNavigate();
  const at = playedScale(timeline);

  if (timeline.empty)
    return (
      <section className="border border-wire bg-surface p-4 sm:p-5">
        <h3 className="text-[15px] font-semibold text-text-bright">The match over time</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-text-dim">
          This match file carries no per-window figures yet, so there is nothing to lay out over the
          clock. The totals on the tabs below are unaffected.
        </p>
      </section>
    );

  /** Seconds at a fraction across the drawn width, for taps. */
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

  /** One strip: the chart, the goals on top of it, and the playhead. */
  const Strip = ({
    label,
    hint,
    children,
  }: {
    label: string;
    hint?: string;
    children: ReactNode;
  }) => (
    <div className="border-t border-wire px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-[13px] font-semibold text-text-bright">{label}</h4>
        {hint && <p className="text-[11.5px] text-text-faint">{hint}</p>}
      </div>
      <div
        className="relative mt-2 cursor-pointer"
        onClick={jump}
        role="presentation"
        title="Open the video here"
      >
        {children}
        {/* Half-time, as a real gap rather than an implied one. */}
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
            className="pointer-events-none absolute -top-1 h-[calc(100%+8px)] w-px"
            style={{
              left: `${at(goal.t)}%`,
              background: goal.team === "A" ? teamA.kitColour : teamB.kitColour,
              opacity: 0.75,
            }}
            aria-hidden="true"
          />
        ))}
        {clockS !== undefined && (
          <span
            className="pointer-events-none absolute inset-y-0 w-[1.5px] bg-cream"
            style={{ left: `${at(clockS)}%` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );

  const area = (points: Point[], lo = 0, hi = 1) => {
    if (points.length === 0) return null;
    const span = hi - lo || 1;
    const y = (v: number) => 100 - ((Math.max(lo, Math.min(hi, v)) - lo) / span) * 100;
    const d = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${at(p.t).toFixed(2)} ${y(p.value ?? lo).toFixed(2)}`)
      .join(" ");
    return {
      line: d,
      fill: `${d} L${at(points.at(-1)!.t).toFixed(2)} 50 L${at(points[0]!.t).toFixed(2)} 50 Z`,
    };
  };

  const possession = area(timeline.possession);
  const tilt = area(timeline.tilt, 0.25, 0.75);

  const barMax = (bars: Bar[]) => Math.max(1, ...bars.map((b) => Math.max(b.a, b.b)));

  return (
    <section className="border border-wire bg-surface" aria-labelledby="match-timeline">
      <header className="flex items-start gap-3 p-4 sm:p-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center border border-wire text-accent-sea">
          <Activity size={17} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 id="match-timeline" className="text-[15px] font-semibold text-text-bright">
            The match over time
          </h3>
          <p className="mt-1 text-[12.5px] leading-snug text-text-dim">
            One clock, half-time closed up. Goal lines run through every strip. Tap anywhere to open
            the video there.
          </p>
        </div>
      </header>

      {possession && (
        <Strip
          label="Who had the ball"
          hint={`${teamA.shortCode} above the line, ${teamB.shortCode} below`}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="block h-[84px] w-full"
            role="img"
            aria-label="Possession through the match"
          >
            {/* The same area drawn twice and clipped to each half, so the side
                that is on top of the game is the side that is coloured. One
                colour across the midline reads as one team all match. */}
            <defs>
              <clipPath id="tl-top">
                <rect x="0" y="0" width="100" height="50" />
              </clipPath>
              <clipPath id="tl-bottom">
                <rect x="0" y="50" width="100" height="50" />
              </clipPath>
            </defs>
            <rect x="0" y="0" width="100" height="100" fill="var(--surface-2)" />
            <path
              d={possession.fill}
              fill={teamA.kitColour}
              fillOpacity={0.55}
              clipPath="url(#tl-top)"
            />
            <path
              d={possession.fill}
              fill={teamB.kitColour}
              fillOpacity={0.5}
              clipPath="url(#tl-bottom)"
            />
            <path
              d={possession.line}
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
        </Strip>
      )}

      {timeline.possessionBars.length > 0 && (
        <Strip label="Five minutes at a time" hint={`${teamA.shortCode} share of the ball`}>
          {/* Height is the share, so a glance gives the shape and the number
              is there for anyone who wants it. */}
          <div className="flex h-[64px] items-end gap-[3px]">
            {timeline.possessionBars.map((bar, i) => (
              <span key={i} className="relative flex-1 bg-surface-2" style={{ height: "100%" }}>
                <span
                  className="absolute inset-x-0 bottom-0"
                  style={{ height: `${bar.a}%`, background: teamA.kitColour, opacity: 0.85 }}
                />
                <span
                  className="absolute inset-x-0 text-center text-[9.5px] font-bold text-text-bright"
                  style={{ bottom: `calc(${bar.a}% + 2px)` }}
                >
                  {bar.a}
                </span>
              </span>
            ))}
          </div>
        </Strip>
      )}

      {tilt && (
        <Strip label="Where the play was" hint="Share of final-third play at their end">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="block h-[56px] w-full"
            role="img"
            aria-label="Field tilt through the match"
          >
            <rect x="0" y="0" width="100" height="100" fill="var(--surface-2)" />
            <path d={tilt.fill} fill="var(--accent-sea)" fillOpacity={0.5} />
            <path
              d={tilt.line}
              fill="none"
              stroke="var(--accent-sea)"
              strokeWidth={1.6}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke="var(--wire)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </Strip>
      )}

      {timeline.pressure.some((b) => b.a + b.b > 0) && (
        <Strip label="Pressing" hint="Pressures applied per five minutes">
          <div className="flex h-[58px] items-end gap-[3px]">
            {timeline.pressure.map((bar, i) => {
              const max = barMax(timeline.pressure);
              const high = timeline.highTurnovers[i];
              return (
                <span key={i} className="relative flex h-full flex-1 items-end gap-[2px]">
                  <span
                    className="flex-1"
                    style={{
                      height: `${Math.max((bar.a / max) * 100, 3)}%`,
                      background: teamA.kitColour,
                      opacity: 0.9,
                    }}
                  />
                  <span
                    className="flex-1"
                    style={{
                      height: `${Math.max((bar.b / max) * 100, 3)}%`,
                      background: teamB.kitColour,
                      opacity: 0.65,
                    }}
                  />
                  {high && high.a > 0 && (
                    <span
                      className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-positive"
                      title={`${high.a} won high`}
                    />
                  )}
                </span>
              );
            })}
          </div>
        </Strip>
      )}

      {timeline.length.a.length > 0 && (
        <Strip label="How long the team was" hint="Back to front, per minute">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="block h-[56px] w-full"
            role="img"
            aria-label="Team length through the match"
          >
            <rect x="0" y="0" width="100" height="100" fill="var(--surface-2)" />
            {(
              [
                ["a", teamA.kitColour],
                ["b", teamB.kitColour],
              ] as const
            ).map(([side, colour]) => {
              const series = timeline.length[side];
              if (series.length === 0) return null;
              const max = Math.max(...series.map((p) => p.value ?? 0), 50);
              return (
                <path
                  key={side}
                  d={series
                    .map(
                      (p, i) =>
                        `${i === 0 ? "M" : "L"}${at(p.t).toFixed(2)} ${(100 - ((p.value ?? 0) / max) * 100).toFixed(2)}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={colour}
                  strokeWidth={1.3}
                  strokeOpacity={side === "a" ? 1 : 0.55}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
        </Strip>
      )}

      {timeline.sequences.length > 0 && (
        <Strip label="Who had it" hint="Each block is one spell on the ball">
          <div className="relative h-[18px] bg-surface-2">
            {timeline.sequences.map((seq, i) => (
              <span
                key={i}
                className="absolute inset-y-0"
                style={{
                  left: `${at(seq.fromS)}%`,
                  width: `${Math.max(at(seq.toS) - at(seq.fromS), 0.2)}%`,
                  background: seq.team === "A" ? teamA.kitColour : teamB.kitColour,
                  opacity: seq.team === "A" ? 0.85 : 0.5,
                }}
              />
            ))}
          </div>
        </Strip>
      )}

      {/* The clock, once, under everything it applies to. */}
      <div className="flex justify-between border-t border-wire px-4 py-2 text-[11px] text-text-faint sm:px-5">
        <span>{minute(timeline.startS)}</span>
        <span>half-time</span>
        <span>{minute(timeline.endS)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-wire px-4 py-3 text-[11.5px] text-text-faint sm:px-5">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5"
            style={{ background: teamA.kitColour }}
            aria-hidden="true"
          />
          {teamA.name}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5"
            style={{ background: teamB.kitColour }}
            aria-hidden="true"
          />
          {teamB.name}
        </span>
        <span className={cn("flex items-center gap-1.5")}>
          <span className="h-3 w-px bg-cream" aria-hidden="true" /> goal
        </span>
      </div>
    </section>
  );
}
