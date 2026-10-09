import type { TeamIdentity } from "@/components/team/TeamToken";
import { Crest } from "@/components/ip/touchline";

export type FlowGoal = {
  /** Seconds from kick-off. */
  t: number;
  team: "A" | "B";
  /** "1–0" as it stood after this goal. */
  score: string;
};

export type FlowWindow = {
  fromS: number;
  toS: number;
  label: string;
};

/**
 * The match as one line.
 *
 * Above the axis we had the ball, below it they did, and the line is drawn
 * from the same tracked moments as every number on the page. A coach reads two
 * things off it in a second: when the game turned, and whether the goals came
 * from the run of play or against it. That is the whole purpose — the figures
 * further down are ninety-minute averages, and an average hides a swing.
 */
export function MatchFlow({
  momentum,
  durationS,
  goals,
  turnovers,
  window,
  teamA,
  teamB,
  confirmed,
  detected,
  halfTimeS,
}: {
  /** −1…1 per slice of the match, ours positive. */
  momentum: number[];
  durationS: number;
  /** Video second of the interval between the halves, from the periods; null when unknown. */
  halfTimeS?: number | null;
  goals: FlowGoal[];
  /** Seconds at which we lost the ball — the dots along the axis. */
  turnovers: number[];
  /** The stretch the analysis singled out, if there is one. */
  window?: FlowWindow | undefined;
  teamA: TeamIdentity;
  teamB: TeamIdentity;
  confirmed: number;
  detected: number;
}) {
  const W = 1000;
  const H = 150;
  const mid = H / 2;
  const duration = Math.max(durationS, 1);
  const xOf = (t: number) => Math.max(0, Math.min(1, t / duration)) * W;

  // A smooth curve, so a run of play reads as a swell rather than a bar chart.
  const points = momentum.map((v, i) => {
    const x = ((i + 0.5) / Math.max(momentum.length, 1)) * W;
    return { x, y: mid - Math.max(-1, Math.min(1, v)) * (mid - 12) };
  });
  const curve = smooth(points);
  const minuteOf = (t: number) => Math.round(t / 60);

  return (
    <section aria-labelledby="match-flow" className="border border-wire bg-surface">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 p-4 sm:p-5">
        <div>
          <p className="label-sm text-text-faint">Match flow</p>
          <h2
            id="match-flow"
            className="mt-1 text-[17px] font-semibold text-text-bright sm:text-[19px]"
          >
            The match in one line
          </h2>
        </div>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Key swatch={<Crest team={teamA} size={16} />}>{teamA.shortCode} on the ball</Key>
          <Key swatch={<Crest team={teamB} size={16} />}>{teamB.shortCode} on the ball</Key>
          <Key swatch={<span className="h-2 w-2 rounded-full bg-positive" />}>
            Confirmed turnover ({confirmed})
          </Key>
          <Key swatch={<span className="h-2 w-2 rounded-full bg-text-faint" />}>
            Detected ({detected})
          </Key>
        </ul>
      </header>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[150px] w-full sm:h-[190px]"
          role="img"
          aria-label={`Who had the ball through the match. ${goals.length} goals.`}
        >
          {/* Their half of the chart, filled; ours is drawn as a line, because
              the two kits must not both become blocks of colour. */}
          <defs>
            <clipPath id="flow-above">
              <rect x="0" y="0" width={W} height={mid} />
            </clipPath>
            <clipPath id="flow-below">
              <rect x="0" y={mid} width={W} height={mid} />
            </clipPath>
          </defs>

          {window && (
            <rect
              x={xOf(window.fromS)}
              y="0"
              width={Math.max(xOf(window.toS) - xOf(window.fromS), 2)}
              height={H}
              fill="var(--reaction-bad)"
              opacity="0.09"
            />
          )}

          <line x1="0" y1={mid} x2={W} y2={mid} stroke="var(--wire)" strokeWidth="1" />
          {momentum.length === 0 && (
            <text x={W / 2} y={mid - 14} textAnchor="middle" fontSize="22" fill="var(--text-faint)">
              Who had the ball was not tracked reliably enough in this match to draw.
            </text>
          )}

          {momentum.length > 0 && (
            <path
              d={`${curve} L ${W} ${mid} L 0 ${mid} Z`}
              fill={teamA.kitColour}
              opacity="0.14"
              clipPath="url(#flow-above)"
            />
          )}
          {momentum.length > 0 && (
            <path
              d={`${curve} L ${W} ${mid} L 0 ${mid} Z`}
              fill={teamB.kitColour}
              opacity="0.5"
              clipPath="url(#flow-below)"
            />
          )}
          <path
            d={momentum.length > 0 ? curve : `M 0 ${mid}`}
            fill="none"
            stroke="var(--cream)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Half-time, where the periods put it; the halves are never equal. */}
          {halfTimeS != null && (
            <line
              x1={xOf(halfTimeS)}
              y1="0"
              x2={xOf(halfTimeS)}
              y2={H}
              stroke="var(--text-faint)"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {turnovers.map((t, i) => (
            <circle
              key={`${t}-${i}`}
              cx={xOf(t)}
              cy={mid}
              r="3"
              fill="var(--text-faint)"
              stroke="var(--kit-outline)"
              strokeWidth="1"
            />
          ))}

          {goals.map((goal, i) => (
            <line
              key={`g-${goal.t}-${i}`}
              x1={xOf(goal.t)}
              y1={goal.team === "A" ? 10 : mid}
              x2={xOf(goal.t)}
              y2={goal.team === "A" ? mid : H - 10}
              stroke="var(--text-bright)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Goals and the named window ride above the chart in HTML, so their
            labels stay upright and legible at any width. */}
        <div className="relative mt-2 h-7">
          {goals.map((goal, i) => (
            <span
              key={`label-${goal.t}-${i}`}
              className="absolute top-0 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap border border-wire bg-bg px-1.5 py-1"
              style={{ left: `${clampPct(goal.t, duration)}%` }}
            >
              <Crest team={goal.team === "A" ? teamA : teamB} size={14} />
              <span className="num-flat text-[11px] text-text-bright">
                {minuteOf(goal.t)}&apos; {goal.score}
              </span>
            </span>
          ))}
        </div>

        {/* Video minutes, like every clip time in the app; half-time sits
            where the periods put it rather than at the middle of the clock. */}
        <div className="relative mt-1 h-5 border-t border-wire pt-2">
          <span className="num-flat absolute left-0 text-[10.5px] text-text-faint">0'</span>
          {halfTimeS != null && (
            <span
              className="num-flat absolute -translate-x-1/2 text-[10.5px] text-text-faint"
              style={{ left: `${Math.max(0, Math.min(1, halfTimeS / duration)) * 100}%` }}
            >
              Half-time
            </span>
          )}
          <span className="num-flat absolute right-0 text-[10.5px] text-text-faint">
            {minuteOf(duration)}' Full time
          </span>
        </div>

        {window && (
          <p className="mt-3 text-[12.5px] text-text-dim">
            <span className="label-xs mr-2 border border-wire px-1.5 py-1 text-text">
              {window.label}
            </span>
            {minuteOf(window.fromS)}&apos;–{minuteOf(window.toS)}&apos;
          </p>
        )}
      </div>
    </section>
  );
}

function Key({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5 text-[11.5px] text-text-dim">
      <span className="flex shrink-0 items-center" aria-hidden="true">
        {swatch}
      </span>
      {children}
    </li>
  );
}

function clampPct(t: number, duration: number) {
  return Math.max(3, Math.min(97, (t / duration) * 100));
}

/** A Catmull-Rom curve through the slice midpoints, as an SVG path. */
function smooth(points: { x: number; y: number }[]) {
  if (points.length === 0) return "M 0 0";
  if (points.length < 3) return `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(i - 1, 0)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(i + 2, points.length - 1)]!;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}
