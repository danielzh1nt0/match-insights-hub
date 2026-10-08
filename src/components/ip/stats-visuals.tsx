import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CircleDot,
  Flame,
  Footprints,
  Gauge,
  Goal,
  Grid3x3,
  LandPlot,
  Map as MapIcon,
  Move,
  PieChart,
  Repeat,
  Route as RouteIcon,
  Ruler,
  Scissors,
  Shield,
  Target,
  Timer,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createContext, useContext, useId, useState } from "react";
import type { Period } from "./chrome";
import type { ReviewedEvent } from "@/lib/event-reviews";
import { setPieceKind } from "@/lib/match-analysis";
import type {
  LineDefending,
  PlayerStat,
  StatsFile,
  TeamKey,
  Territory,
  Thresholds,
} from "@/lib/match-analysis";
import type { Frame, MatchDataFile } from "@/lib/match-source";
import {
  accuracyOf,
  insidePeriods,
  passCompleted,
  periodWindow,
  shotsOf as contractShots,
  type Periods,
  type Shot,
} from "@/lib/export-contract";
import { cn } from "@/lib/utils";
import {
  PITCH,
  clamp,
  eventPoint,
  finite,
  metresToPct,
  setPitchContext,
  type Point,
} from "@/lib/pitch-coords";
import { BlockSpacing } from "./block-spacing";
import { buildBlocks } from "@/lib/blocks";
import { DeepAnswer, LineBreakHero, LineTimeline } from "./line-break-cards";
import { Button } from "./primitives";
import { StatsTeamPill, type StatsTeamIdentity } from "./stats-team-selector";

type Props = {
  tab: string;
  players: PlayerStat[];
  stats: StatsFile | undefined;
  file: MatchDataFile | undefined;
  events: ReviewedEvent[];
  team: TeamKey;
  scopeBoth: boolean;
  colours: { A: string; B: string };
  matchId: string;
  period: Period;
  territory: Territory | null;
  lineDefending: LineDefending | null;
  thresholds: Thresholds;
  teamA: StatsTeamIdentity;
  teamB: StatsTeamIdentity;
  /** from matches.summary.ball_grade; missing on older matches (then phases are allowed) */
  ballGrade?: { possession_ok?: boolean; events_ok?: boolean } | null;
  /** a full match's tracking is still downloading */
  framesLoading?: boolean;
};

type Pass = Record<string, unknown>;
const teamRow = (stats: StatsFile | undefined, team: TeamKey) =>
  (stats?.teams ?? []).find((row: any) => row?.team === team) as
    Record<string, unknown> | undefined;
const value = (row: Record<string, unknown> | undefined, key: string) => finite(row?.[key]);
const passTeam = (pass: Pass): TeamKey | null =>
  pass["team"] === "A" || pass["team"] === "B" ? pass["team"] : null;
const passTime = (pass: Pass) => finite(pass["t"] ?? pass["time"] ?? pass["start_t"]);
const passPlayer = (pass: Pass, side: "from" | "to") =>
  finite(
    pass[side] ?? pass[`${side}_id`] ?? (side === "from" ? pass["player_id"] : pass["receiver_id"]),
  );
const passPoint = (pass: Pass, side: "start" | "end"): Point | null => {
  const metric = metresToPct(pass[side === "start" ? "from_m" : "to_m"], passTeam(pass));
  if (metric) return metric;
  const x = finite(
    pass[`${side}_x`] ??
      pass[side === "start" ? "x" : "x2"] ??
      pass[side === "start" ? "from_x" : "to_x"],
  );
  const y = finite(
    pass[`${side}_y`] ??
      pass[side === "start" ? "y" : "y2"] ??
      pass[side === "start" ? "from_y" : "to_y"],
  );
  return x === null || y === null ? null : { x: clamp(x), y: clamp(y) };
};

const playerLabel = (id: number) =>
  id >= 100 ? String(id).slice(-2).replace(/^0/, "") || String(id).slice(-2) : String(id);
const periodRange = (file: MatchDataFile | undefined, period: Period) => {
  const end = Math.max(file?.frames.at(-1)?.t ?? 0, file?.events.at(-1)?.t ?? 0, 1);
  return periodWindow(file, period, end);
};
/**
 * Whether a moment belongs to the selected period of the match.
 *
 * Two holes, both of which inflated every count on this page. "Full" is the
 * whole recording rather than the match, so warm-up and half-time moments were
 * counted -- a rondo in the warm-up is a pass, a throw-in before kick-off is a
 * restart, and a team standing around at the interval is maximally stretched.
 * And a null time used to pass, so a moment with no clock landed in every
 * period at once. passSet below was fixed for exactly this; the frames and
 * events path was not.
 */
const inMatch = (time: number | null, range: number[], periods: Periods) =>
  time !== null &&
  time >= (range[0] ?? 0) &&
  time <= (range[1] ?? Infinity) &&
  insidePeriods(time, periods);
/**
 * A measured figure, or a dash.
 *
 * Reading an absent field as 0 is the most expensive mistake on these screens:
 * "0% pressed within 2 s" is a damning number about the team, and it was being
 * printed about the export. A dash says the one true thing instead.
 */
const withheld = (value: number | null | undefined, unit = "") =>
  value === null || value === undefined ? "—" : `${Math.round(value)}${unit}`;

const fmt = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

type Comparison = {
  target?: string;
  opponent?: string;
  last5?: string;
  tones?: [
    "good" | "warn" | "bad" | "neutral",
    "good" | "warn" | "bad" | "neutral",
    "good" | "warn" | "bad" | "neutral",
  ];
};
type StatsCardContextValue = {
  identity: StatsTeamIdentity;
  other: StatsTeamIdentity;
  both: boolean;
};
const StatsCardContext = createContext<StatsCardContextValue | null>(null);

/**
 * Target, opponent and recent form beside the number.
 *
 * A row of three dashes tells the coach nothing and costs him a glance, so when
 * the match file supports none of the three the row does not appear at all.
 */
function ComparisonRow({ comparison }: { comparison?: Comparison }) {
  const given = [comparison?.target, comparison?.opponent, comparison?.last5].filter(
    (value) => value !== undefined && value !== "" && value !== "—",
  );
  if (given.length === 0) return null;

  const cells = [
    ["Target", comparison?.target ?? "—"],
    ["vs Opponent", comparison?.opponent ?? "—"],
    ["vs Last 5", comparison?.last5 ?? "—"],
  ] as const;
  return (
    <div className="rule-x grid grid-cols-3 border-t border-wire" aria-label="Comparison">
      <>
        {cells.map(([label, amount], index) => (
          <div key={label} className="px-3 py-2.5 text-right">
            <span className="label-xs block text-text-faint">{label}</span>
            <strong
              className={cn(
                "num-flat mt-1 block text-[12.5px]",
                comparison?.tones?.[index] === "warn"
                  ? "text-reaction-warn"
                  : comparison?.tones?.[index] === "bad"
                    ? "text-reaction-bad"
                    : "text-text",
              )}
            >
              {amount}
            </strong>
          </div>
        ))}
      </>
    </div>
  );
}

/**
 * One coaching question, answered.
 *
 * Same object as every other module on the app: the question as a title, what
 * it means underneath, the evidence in the middle, and a hairline footer saying
 * what the answer rests on.
 */
function Card({
  question,
  caption,
  children,
  honesty,
  footer,
  comparison,
  icon,
}: {
  question: string;
  caption: string;
  children: React.ReactNode;
  honesty?: string;
  footer?: string;
  comparison?: Comparison;
  /** The mark that says, at a glance, what kind of question this is. */
  icon?: LucideIcon;
}) {
  const context = useContext(StatsCardContext);
  const Icon = icon;
  return (
    <section className="flex min-w-0 flex-col border border-wire bg-surface">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          {context && (
            <StatsTeamPill
              identity={context.identity}
              {...(context.both ? { both: context.other } : {})}
            />
          )}
          {Icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center border border-wire text-accent-sea">
              <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
            </span>
          )}
        </div>
        <h2 className="mt-2.5 text-[16px] font-semibold leading-snug text-text-bright sm:text-[17px]">
          {question}
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-text-dim">{caption}</p>
      </div>
      <div className="flex-1 px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
      <ComparisonRow {...(comparison ? { comparison } : {})} />
      <div className="flex min-h-10 items-center justify-between gap-3 border-t border-wire px-4 py-2.5 text-[12px] text-text-faint sm:px-5">
        <span>{honesty ?? "Source: selected match"}</span>
        {footer && <span className="text-right">{footer}</span>}
      </div>
    </section>
  );
}

/**
 * A chalk pitch.
 *
 * The board is drawn at the real proportions of a full-size pitch — 105 by 68,
 * so 1.544 to 1 — because every distance a coach reads off it is a lie at any
 * other ratio. Lines are chalk on dark turf: full strength for the touchlines,
 * boxes and centre circle, half for the thirds.
 */
function StatsPitch({
  children,
  portrait = false,
  attackLabel,
  ariaLabel,
  chalk = "var(--cream)",
}: {
  children?: React.ReactNode;
  portrait?: boolean;
  attackLabel: string;
  ariaLabel: string;
  chalk?: string;
}) {
  const viewBox = portrait ? "0 0 64 100" : "0 0 100 64";
  return (
    <div className={cn("relative mx-auto w-full", portrait ? "max-w-[300px]" : "max-w-[640px]")}>
      <svg viewBox={viewBox} className="block h-auto w-full" role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={portrait ? "turf-p" : "turf-l"} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pitch-top)" />
            <stop offset="100%" stopColor="var(--pitch-bottom)" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width={portrait ? 64 : 100}
          height={portrait ? 100 : 64}
          fill={`url(#${portrait ? "turf-p" : "turf-l"})`}
        />
        {portrait ? (
          <g stroke={chalk} fill="none">
            <g strokeOpacity=".85" strokeWidth=".5">
              <rect x="2" y="3" width="60" height="94" />
              <rect x="25" y="0.5" width="14" height="2.5" />
              <rect x="25" y="97" width="14" height="2.5" />
              <line x1="2" y1="50" x2="62" y2="50" />
              <circle cx="32" cy="50" r="8" />
              <rect x="14" y="3" width="36" height="12" />
              <rect x="14" y="85" width="36" height="12" />
            </g>
            <g strokeOpacity=".4" strokeWidth=".4">
              <line x1="2" y1="33.3" x2="62" y2="33.3" strokeDasharray="2 2" />
              <line x1="2" y1="66.6" x2="62" y2="66.6" strokeDasharray="2 2" />
            </g>
          </g>
        ) : (
          <g stroke={chalk} fill="none">
            <g strokeOpacity=".85" strokeWidth=".45">
              <rect x="3" y="1.5" width="94" height="60.9" />
              <rect x=".5" y="25" width="2.5" height="14" />
              <rect x="97" y="25" width="2.5" height="14" />
              <line x1="50" y1="1.5" x2="50" y2="62.4" />
              <circle cx="50" cy="31.95" r="8" />
              <rect x="3" y="14" width="12" height="36" />
              <rect x="85" y="14" width="12" height="36" />
            </g>
            <g strokeOpacity=".4" strokeWidth=".35">
              <line x1="34.3" y1="1.5" x2="34.3" y2="62.4" strokeDasharray="2 2" />
              <line x1="65.7" y1="1.5" x2="65.7" y2="62.4" strokeDasharray="2 2" />
            </g>
          </g>
        )}
        {children}
      </svg>
      {attackLabel && (
        <span className="label-xs mt-2 block text-right text-text-faint">
          {portrait ? "↑" : "→"} {attackLabel} attack
        </span>
      )}
    </div>
  );
}

function Pitch({ children }: { children?: React.ReactNode }) {
  const context = useContext(StatsCardContext);
  return (
    <StatsPitch
      attackLabel={context?.identity.shortCode ?? "Selected team"}
      ariaLabel={`${context?.identity.name ?? "Selected team"} pitch evidence`}
    >
      {children}
    </StatsPitch>
  );
}
function PortraitPitch({ children }: { children?: React.ReactNode; arrowLabel?: string }) {
  const context = useContext(StatsCardContext);
  return (
    <StatsPitch
      portrait
      attackLabel={context?.identity.shortCode ?? "Selected team"}
      ariaLabel={`${context?.identity.name ?? "Selected team"} pitch evidence`}
    >
      {children}
    </StatsPitch>
  );
}

function EmptyTab() {
  return (
    <div className="border border-dashed border-wire px-4 py-10 text-center text-[12.5px] text-text-faint">
      There is not enough reliable evidence for this view.
    </div>
  );
}

/** True while a full match's tracking is still downloading, so empty cards say so. */
const FramesLoading = createContext(false);

function EvidenceUnavailable({
  question,
  caption,
  icon,
}: {
  question: string;
  caption: string;
  icon?: LucideIcon;
}) {
  const loading = useContext(FramesLoading);
  return (
    <Card
      question={question}
      caption={caption}
      footer={loading ? "Loading" : "Evidence threshold not met"}
      {...(icon ? { icon } : {})}
    >
      <div className="flex min-h-28 items-center border-l-2 border-text-faint bg-surface-2 px-4">
        <p className="max-w-[460px] text-[12.5px] leading-relaxed text-text-dim">
          {loading
            ? "Loading the tracking for the whole match. This fills in by itself in a few seconds."
            : "This match does not contain enough reliable evidence to answer this coaching question."}
        </p>
      </div>
    </Card>
  );
}

function Control({ stats, team, colours, teamA, teamB, events }: Props) {
  const a = value(teamRow(stats, "A"), "possession_pct");
  const b = value(teamRow(stats, "B"), "possession_pct");
  if (a === null && b === null) return null;
  const own = team === "A" ? a : b;
  const opponent = team === "A" ? b : a;
  const identity = team === "A" ? teamA : teamB;
  const otherIdentity = team === "A" ? teamB : teamA;
  return (
    <Card
      question="Who controlled the ball?"
      icon={PieChart}
      caption="Share of reliable ball-control time for each team."
      comparison={{ opponent: opponent === null ? "—" : `${Math.round(opponent)}%`, last5: "—" }}
      honesty={`${events.filter((event) => event.status === "confirmed").length} confirmed · ${events.length} detected`}
    >
      <strong className="display-i block text-[48px] leading-none text-cream">
        {own === null ? "—" : `${Math.round(own)}%`}
      </strong>
      <p className="mt-1 text-[11px] font-semibold text-text-dim">possession · {identity.name}</p>
      <div
        className="mt-4 flex h-3 overflow-hidden bg-surface-3"
        role="img"
        aria-label={`${identity.name} ${own ?? 0}%, ${otherIdentity.name} ${opponent ?? 0}%`}
      >
        <span style={{ width: `${own ?? 0}%`, background: colours[team] }} />
        <span className="bg-graphite" style={{ width: `${opponent ?? 0}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-semibold text-text-faint">
        <span>
          {identity.shortCode} {Math.round(own ?? 0)}%
        </span>
        <span>
          {otherIdentity.shortCode} {Math.round(opponent ?? 0)}%
        </span>
      </div>
    </Card>
  );
}

/**
 * Where the team actually spent the match.
 *
 * Every tracked frame, every player, dropped into a grid and shaded by how
 * often they were there. It answers a question no table can — whether the
 * shape a coach thinks he plays is the shape the match produced — and it is the
 * one picture every other product in this category leads with.
 *
 * Shaded in the kit colour rather than the usual blue-to-red ramp, because the
 * kit is the thing that says whose heat this is, and a second colour scale
 * would collide with the ones that mean target met and target missed.
 */
function HeatMap({
  frames,
  team,
  colour,
  file,
}: {
  frames: Frame[];
  team: TeamKey;
  colour: string;
  file: MatchDataFile | undefined;
}) {
  const COLS = 16;
  const ROWS = 10;
  const length = Math.max(file?.pitch?.length ?? 105, 1);
  const width = Math.max(file?.pitch?.width ?? 68, 1);

  const { grid, max, samples } = (() => {
    const g = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
    let n = 0;
    for (const frame of frames) {
      for (const player of frame.players) {
        if (player.team !== team || player.state === "stale") continue;
        // The export already writes both halves the same way round, so
        // nothing is flipped here.
        const x = Math.min(0.999, Math.max(0, player.m[0] / length));
        const y = Math.min(0.999, Math.max(0, player.m[1] / width));
        const r = Math.floor(y * ROWS);
        const c = Math.floor(x * COLS);
        g[r]![c] = (g[r]![c] ?? 0) + 1;
        n += 1;
      }
    }
    return { grid: g, max: Math.max(1, ...g.flat()), samples: n };
  })();

  // A handful of positions is a scatter, not a heat map, and shading it would
  // dress up noise as a pattern.
  if (samples < 200)
    return (
      <EvidenceUnavailable
        question="Where did we spend the time?"
        caption="Every tracked position, shaded by how often we were there."
        icon={Flame}
      />
    );

  return (
    <Card
      question="Where did we spend the time?"
      caption="Every tracked position, shaded by how often we were there."
      honesty={`${samples.toLocaleString()} tracked positions`}
      icon={Flame}
    >
      <StatsPitch attackLabel="" ariaLabel="Where the team spent the match">
        {grid.map((row, r) =>
          row.map((count, c) =>
            count === 0 ? null : (
              <rect
                key={`h-${r}-${c}`}
                x={3 + (94 / COLS) * c}
                y={1.5 + (60.9 / ROWS) * r}
                width={94 / COLS}
                height={60.9 / ROWS}
                fill={colour}
                fillOpacity={Math.min(0.8, (count / max) ** 0.65 * 0.8)}
              />
            ),
          ),
        )}
      </StatsPitch>
      <div className="mt-3 flex items-center gap-2">
        <span className="label-xs text-text-faint">Less</span>
        <span className="flex h-2 flex-1">
          {[0.08, 0.2, 0.34, 0.5, 0.65, 0.8].map((o) => (
            <span key={o} className="flex-1" style={{ background: colour, opacity: o }} />
          ))}
        </span>
        <span className="label-xs text-text-faint">More</span>
      </div>
    </Card>
  );
}

function Thirds({ frames, team, colour }: { frames: Frame[]; team: TeamKey; colour: string }) {
  const counts = [0, 0, 0];
  frames.forEach((frame) =>
    frame.players
      .filter((player) => player.team === team && player.state !== "stale")
      .forEach((player) => {
        const index = Math.min(2, Math.floor(clamp(player.m[0], 0, 104.99) / 35));
        counts[index] = (counts[index] ?? 0) + 1;
      }),
  );
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return null;
  return (
    <Card
      question="Which third did we occupy?"
      icon={LandPlot}
      caption="Where our observed players spent their tracked time."
      honesty={`${frames.length} tracked frames`}
    >
      <Pitch>
        <g>
          {counts.map((count, index) => (
            <g key={index}>
              <rect
                x={2 + index * 32}
                y="2"
                width="32"
                height="60"
                fill={colour}
                opacity={0.08 + (count / Math.max(...counts)) * 0.38}
              />
              <text
                x={18 + index * 32}
                y="35"
                textAnchor="middle"
                fill="var(--cream)"
                fontSize="5"
                fontWeight="800"
              >
                {Math.round((count / total) * 100)}%
              </text>
            </g>
          ))}
        </g>
      </Pitch>
      <div className="mt-2 grid grid-cols-3 text-center text-[10px] font-bold uppercase text-text-faint">
        <span>Own third</span>
        <span>Middle</span>
        <span>Final third</span>
      </div>
    </Card>
  );
}

function SequenceLength({ stats, team }: Props) {
  const sequences = (stats?.sequences ?? []).filter(
    (sequence: any) => !sequence?.team || sequence.team === team,
  );
  const lengths = sequences
    .map((sequence: any) => finite(sequence?.passes ?? sequence?.pass_count ?? sequence?.length))
    .filter((n): n is number => n !== null);
  const rowMedian = value(teamRow(stats, team), "passes_per_sequence");
  if (!lengths.length && rowMedian === null) return null;
  const buckets = [
    lengths.filter((n) => n <= 2).length,
    lengths.filter((n) => n >= 3 && n <= 5).length,
    lengths.filter((n) => n >= 6 && n <= 9).length,
    lengths.filter((n) => n >= 10).length,
  ];
  return (
    <Card
      question="How long did we keep it?"
      icon={Timer}
      caption="Possession spells grouped by the number of passes."
      {...(lengths.length ? { honesty: `${lengths.length} sequences` } : {})}
    >
      <strong className="display-i block text-[56px] leading-none text-cream">
        {rowMedian === null ? "—" : Math.round(rowMedian * 10) / 10}
      </strong>
      <span className="text-[11px] font-semibold text-text-faint">passes per spell</span>
      {lengths.length > 0 && (
        <div
          className="mt-5 grid grid-cols-4 items-end gap-2"
          role="img"
          aria-label="Sequence length distribution"
        >
          {buckets.map((count, index) => (
            <div key={index} className="text-center">
              <span className="num text-[11px] text-text-dim">{count}</span>
              <div className="mt-1 h-20 bg-surface-2 flex items-end">
                <span
                  className="block w-full bg-cream/70"
                  style={{ height: `${Math.max(3, (count / Math.max(...buckets)) * 100)}%` }}
                />
              </div>
              <span className="mt-1 block text-[9px] text-text-faint">
                {["1–2", "3–5", "6–9", "10+"][index]}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function deriveRuns(frames: Frame[], team: TeamKey) {
  const runs: { id: number; start: Point; end: Point; speed: number; withBall: boolean }[] = [];
  const step = Math.max(1, Math.round(frames.length / 80));
  for (let i = step; i < frames.length; i += step) {
    const before = frames[i - step];
    const after = frames[i];
    if (!before || !after) continue;
    for (const player of after.players.filter((p) => p.team === team && p.state === "observed")) {
      const previous = before.players.find(
        (p) => p.team === team && p.id === player.id && p.state === "observed",
      );
      if (!previous) continue;
      const distance = Math.hypot(player.m[0] - previous.m[0], player.m[1] - previous.m[1]);
      const dt = Math.max(0.1, after.t - before.t);
      const speed = distance / dt;
      if (speed < 5.5 || distance < 3) continue;
      runs.push({
        id: player.id,
        start: { x: clamp((previous.m[0] / 105) * 100), y: clamp((previous.m[1] / 68) * 100) },
        end: { x: clamp((player.m[0] / 105) * 100), y: clamp((player.m[1] / 68) * 100) },
        speed,
        withBall: after.possession === team && after.carrier === player.id,
      });
    }
  }
  return runs.slice(0, 40);
}

function Runs({ frames, team, colour }: { frames: Frame[]; team: TeamKey; colour: string }) {
  const runs = deriveRuns(frames, team);
  if (!runs.length) return null;
  return (
    <Card
      question="Where did our runs go?"
      icon={Move}
      caption="Five fastest tracked runs. Solid had the ball; dashed were off it."
      honesty={`${runs.length} tracked runs`}
    >
      <PortraitPitch arrowLabel="attack">
        {[...runs]
          .sort((a, b) => b.speed - a.speed)
          .slice(0, 5)
          .map((run, index) => (
            <line
              key={`${run.id}-${index}`}
              x1={(run.start.y / 100) * 64}
              y1={100 - run.start.x}
              x2={(run.end.y / 100) * 64}
              y2={100 - run.end.x}
              stroke={colour}
              strokeWidth={run.withBall ? 1.4 : 0.8}
              strokeDasharray={run.withBall ? undefined : "2 2"}
              opacity={clamp(0.3 + (run.speed - 5.5) / 5, 0.3, 1)}
            />
          ))}
      </PortraitPitch>
    </Card>
  );
}

function Distance({ players, colour }: { players: PlayerStat[]; colour: string }) {
  const ranked = [...players]
    .filter((p) => p.minutes > 0 && p.distanceM > 0)
    .sort((a, b) => b.distanceM / b.minutes - a.distanceM / a.minutes)
    .slice(0, 10);
  if (!ranked.length) return null;
  const max = Math.max(...ranked.map((p) => p.distanceM / p.minutes));
  return (
    <Card
      question="Distance covered (while in camera view)"
      icon={Footprints}
      caption="The camera follows the ball, so a player out of shot is not counted. Sorted by distance per visible minute."
      honesty={`${ranked.length} observed players`}
    >
      <div className="rule-y">
        {ranked.map((player) => {
          const rate = player.distanceM / player.minutes;
          return (
            <div
              key={`${player.team}-${player.id}`}
              className="grid grid-cols-[32px_1fr_62px] items-center gap-2 py-2"
            >
              <span className="num text-center text-[14px]">#{playerLabel(player.id)}</span>
              <div className="relative h-3 overflow-hidden bg-surface-2">
                <span
                  className="absolute inset-y-0 left-0 opacity-30"
                  style={{ width: `${(rate / max) * 100}%`, background: colour }}
                />
                <span
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${(rate / max) * 35}%`, background: colour }}
                />
              </div>
              <span className="num text-right text-[12px]">
                {Math.round(rate)} <small className="text-[9px] text-text-faint">m/min</small>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Within this many metres of the carrier counts as pressure on him. */
/** The pipeline's rule: pressure on the carrier means an opponent within 2 m. */
const PRESS_WITHIN_M = 2;

/**
 * Where the pressure was, both ways round.
 *
 * The Pressing tab already said "where did we press" over a scatter of balls
 * won, which is where pressure *succeeded* — a different and much smaller
 * thing. Pressure itself is in the frames: who had the ball, where it was, and
 * how close the nearest opponent got. A frame where they had it and one of ours
 * was inside five metres is us pressing; the same frame with the sides reversed
 * is them pressing us.
 *
 * Both pitches are drawn the same way round, with our goal on the left, so the
 * pair can be read against each other: mass on the right of the first map is a
 * team that presses high, mass on the left of the second is a team being
 * squeezed in its own build-up.
 *
 * It counts tracked moments, not press actions — a press held for three seconds
 * weighs more than one held for one. That is the right weighting for a heat map
 * and the wrong one for a count, so the figure underneath says moments.
 */
function PressureMap({
  frames,
  team,
  colours,
  file,
  teamA,
  teamB,
}: {
  frames: Frame[];
  team: TeamKey;
  colours: { A: string; B: string };
  file: MatchDataFile | undefined;
  teamA: StatsTeamIdentity;
  teamB: StatsTeamIdentity;
}) {
  const other: TeamKey = team === "A" ? "B" : "A";
  const COLS = 14;
  const ROWS = 9;

  const build = (underPressure: TeamKey) => {
    const grid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
    let samples = 0;
    let measured = 0;
    for (const frame of frames) {
      // The carrier's team comes from players[], never from possession.
      if (frame.carrier == null) continue;
      const carrier = frame.players?.find((p) => p.id === frame.carrier);
      if (!carrier || carrier.team !== underPressure) continue;
      const pressed = (frame as { pressed?: boolean }).pressed;
      const near = frame.pressure_m;
      if (typeof pressed !== "boolean" && (typeof near !== "number" || !Number.isFinite(near)))
        continue;
      measured += 1;
      // The export's own pressed flag where it has one, the five-metre rule
      // where it does not. Plotted at the carrier rather than the ball, and
      // never flipped: the file already writes both halves the same way round.
      if (typeof pressed === "boolean" ? !pressed : (near as number) > PRESS_WITHIN_M) continue;
      const point = metresToPct(carrier.m, team);
      if (!point) continue;
      const c = Math.min(COLS - 1, Math.floor((point.x / 100) * COLS));
      const r = Math.min(ROWS - 1, Math.floor((point.y / 100) * ROWS));
      grid[r]![c] = (grid[r]![c] ?? 0) + 1;
      samples += 1;
    }
    return { grid, samples, measured, max: Math.max(1, ...grid.flat()) };
  };

  const ours = build(other); // they had it, we pressed
  const theirs = build(team); // we had it, they pressed

  // Without a distance to the nearest opponent there is no pressure to map.
  if (ours.measured + theirs.measured === 0)
    return (
      <EvidenceUnavailable
        question="Where was the pressure?"
        icon={Target}
        caption="Where we closed them down, and where they closed us down."
      />
    );

  const panel = (built: ReturnType<typeof build>, title: string, sub: string, colour: string) => (
    <div className="min-w-0">
      <p className="text-[13.5px] font-semibold text-text-bright">{title}</p>
      <p className="mt-0.5 mb-2 text-[11.5px] text-text-faint">{sub}</p>
      <StatsPitch attackLabel="" ariaLabel={title}>
        {built.grid.map((row, r) =>
          row.map((count, c) =>
            count === 0 ? null : (
              <rect
                key={`p-${r}-${c}`}
                x={3 + (94 / COLS) * c}
                y={1.5 + (60.9 / ROWS) * r}
                width={94 / COLS}
                height={60.9 / ROWS}
                fill={colour}
                fillOpacity={Math.min(0.82, (count / built.max) ** 0.65 * 0.82)}
              />
            ),
          ),
        )}
      </StatsPitch>
      <p className="mt-2 text-[11.5px] text-text-faint">
        {built.samples.toLocaleString()} moments under pressure of {built.measured.toLocaleString()}{" "}
        tracked
      </p>
    </div>
  );

  return (
    <Card
      question="Where was the pressure?"
      icon={Target}
      caption={`Inside ${PRESS_WITHIN_M} m of the player on the ball. Both pitches attack right, so they can be read against each other.`}
      honesty={`${(ours.samples + theirs.samples).toLocaleString()} pressured moments`}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {panel(
          ours,
          `${(team === "A" ? teamA : teamB).name} pressing`,
          "Where we closed them down",
          colours[team],
        )}
        {panel(
          theirs,
          `${(team === "A" ? teamB : teamA).name} pressing`,
          "Where they closed us down",
          colours[other],
        )}
      </div>
    </Card>
  );
}

function PressMap({ events, team, matchId, colour, file }: Props & { colour: string }) {
  // A ball won high is also written as a ball won, so counting both put the
  // same moment on the pitch twice. High ones only count when there is no
  // plain record of the balls won.
  const hasWon = events.some((event) => event.team === team && event.type === "turnover_won");
  const types = hasWon
    ? ["pressure", "press", "turnover_won"]
    : ["pressure", "press", "high_turnover"];
  const press = events
    .filter((event) => event.team === team && types.includes(event.type))
    .map((event) => ({ event, point: eventPoint(event, file) }))
    .filter((item): item is { event: ReviewedEvent; point: Point } => item.point !== null);
  if (!press.length) return null;
  return (
    <Card
      question="Where did we win it back?"
      icon={Target}
      caption="Each dot is one ball won, at the position it was won."
      honesty={`${press.filter((p) => p.event.status === "confirmed").length} confirmed · ${press.length} detected`}
    >
      <Pitch>
        {press.map(({ event, point }) => (
          <Link
            key={event.id}
            to="/match/$matchId/match"
            params={{ matchId }}
            search={{ t: event.t }}
            aria-label={`Watch pressure at ${fmt(event.t)}`}
          >
            <circle cx={point.x} cy={(point.y / 100) * 64} r="1.8" fill={colour} opacity=".82" />
          </Link>
        ))}
      </Pitch>
    </Card>
  );
}

function CounterPress({ events, team, stats, matchId, teamA, teamB }: Props) {
  const losses = events.filter((event) => event.team === team && event.type === "turnover_lost");
  const reactions = losses
    .map((event) => ({ event, seconds: finite(event.payload?.["time_to_press"]) }))
    .filter((item): item is { event: ReviewedEvent; seconds: number } => item.seconds !== null);
  if (!reactions.length) return null;
  const sorted = reactions.map((r) => r.seconds).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const row = teamRow(stats, team);
  const identity = team === "A" ? teamA : teamB;
  return (
    <Card
      question="How fast did we react?"
      icon={Gauge}
      caption={`${identity.name} · ${losses.length} losses`}
      comparison={{
        target: "2 s",
        opponent: "—",
        last5: "—",
        tones: [median <= 2 ? "good" : "bad", "neutral", "neutral"],
      }}
      honesty={`${losses.filter((e) => e.status === "confirmed").length} confirmed · ${losses.length} detected`}
    >
      <div
        className="relative h-[108px] border-b border-wire"
        role="img"
        aria-label={`${identity.name} reaction time from zero to eight seconds`}
      >
        <div className="absolute inset-x-0 top-14 h-px bg-wire" />
        <span
          className="absolute top-1 -translate-x-1/2 bg-surface-3 px-1.5 py-1 text-[9px] text-text-dim"
          style={{ left: "25%" }}
        >
          Target 2 s
        </span>
        <span
          className="absolute top-7 -translate-x-1/2 bg-cream px-1.5 py-1 text-[9px] text-ink"
          style={{ left: `${clamp((median / 8) * 100)}%` }}
        >
          Median {Math.round(median * 100) / 100} s
        </span>
        {reactions.map(({ event, seconds }) => (
          <Link
            key={event.id}
            to="/match/$matchId/match"
            params={{ matchId }}
            search={{ t: event.t }}
            aria-label={`Watch ${seconds} second reaction`}
            className="tap absolute top-[33px] -translate-x-1/2"
            style={{ left: `${clamp((seconds / 8) * 100)}%` }}
          >
            <span
              className={cn(
                "block h-3 w-3 rounded-full border border-bg",
                seconds <= 2
                  ? "bg-quality-good"
                  : seconds <= 4
                    ? "bg-quality-risky"
                    : "bg-quality-bad",
              )}
            />
          </Link>
        ))}
        <div className="absolute bottom-1 left-0 right-0 flex justify-between text-[9px] text-text-faint">
          <span>0 s</span>
          <span>2 s</span>
          <span>4 s</span>
          <span>6 s</span>
          <span>8 s</span>
        </div>
      </div>
      <div className="grid grid-cols-3 rule-x border border-wire">
        <Metric value={withheld(value(row, "pressed_within_2s_pct"), "%")} label="within 2 s" />
        <Metric value={withheld(value(row, "regained_within_5s_pct"), "%")} label="back in 5 s" />
        <Metric value={`${Math.round(median * 10) / 10}s`} label="median" />
      </div>
    </Card>
  );
}

/** Where the set pieces were taken from, straight off the event coordinates. */
function SetPieceMap({ events, team, matchId, colour, file }: Props & { colour: string }) {
  const pieces = events
    .filter((event) => event.team === team && event.type === "set_piece")
    .map((event) => ({ event, kind: setPieceKind(event), point: eventPoint(event, file) }));
  const placed = pieces.filter(
    (item): item is { event: ReviewedEvent; kind: string; point: Point } => item.point !== null,
  );
  if (!pieces.length)
    return (
      <EvidenceUnavailable
        question="Where did the set pieces come from?"
        icon={CircleDot}
        caption="No corner, free kick or throw-in in this match file."
      />
    );
  if (!placed.length)
    return (
      <EvidenceUnavailable
        question="Where did the set pieces come from?"
        icon={CircleDot}
        caption={`${pieces.length} set pieces detected, none with a pitch position.`}
      />
    );
  return (
    <Card
      question="Where did the set pieces come from?"
      icon={CircleDot}
      caption="Each mark is one restart, at the position in the match file. Tap to watch it."
      honesty={`${placed.filter((item) => item.event.status === "confirmed").length} confirmed · ${placed.length} placed of ${pieces.length}`}
    >
      <Pitch>
        {placed.map(({ event, point }) => (
          <Link
            key={event.id}
            to="/match/$matchId/match"
            params={{ matchId }}
            search={{ t: event.t }}
            aria-label={`Watch set piece at ${fmt(event.t)}`}
          >
            <circle
              cx={point.x}
              cy={(point.y / 100) * 64}
              r="2"
              fill="none"
              stroke={colour}
              strokeWidth=".8"
            />
          </Link>
        ))}
      </Pitch>
    </Card>
  );
}

/** Corners, free kicks and throw-ins as counts, ours against theirs. */
function SetPieceCounts({ events, team, teamA, teamB }: Props) {
  const other: TeamKey = team === "A" ? "B" : "A";
  const count = (side: TeamKey, kind: string) =>
    events.filter(
      (event) =>
        event.type === "set_piece" && event.team === side && setPieceKind(event).includes(kind),
    ).length;
  const rows = [
    ["Corners", "corner"],
    ["Free kicks", "free"],
    ["Throw-ins", "throw"],
  ] as const;
  const any = rows.some(([, kind]) => count(team, kind) + count(other, kind) > 0);
  if (!any) return null;
  const mine = team === "A" ? teamA : teamB;
  const theirs = team === "A" ? teamB : teamA;
  return (
    <Card
      question="How many restarts did each side get?"
      icon={Repeat}
      caption="Counted from the set pieces in this match file."
      honesty={`${events.filter((event) => event.type === "set_piece").length} set pieces detected`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 text-[9px] font-bold uppercase text-text-faint">
        <span>{mine.shortCode}</span>
        <span />
        <span className="text-right">{theirs.shortCode}</span>
      </div>
      <div className="mt-1 rule-y">
        {rows.map(([label, kind]) => (
          <div
            key={kind}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 py-2"
          >
            <strong className="display-i text-[20px]" style={{ color: mine.kitColour }}>
              {count(team, kind)}
            </strong>
            <span className="text-center text-[12px] text-text-dim">{label}</span>
            <strong
              className="display-i text-right text-[20px]"
              style={{ color: theirs.kitColour }}
            >
              {count(other, kind)}
            </strong>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-3 text-center">
      <strong className="num block text-[26px] leading-none text-text-bright">{value}</strong>
      <span className="label-xs mt-1.5 block text-text-faint">{label}</span>
    </div>
  );
}

function ShapeMultiples({
  territory,
  colour,
  identity,
}: {
  territory: Territory;
  colour: string;
  identity: StatsTeamIdentity;
}) {
  const snapshots = territory.snapshots.filter((snapshot) => snapshot.players.length >= 4);
  if (!snapshots.length) return null;
  const observed = snapshots.map((snapshot) => {
    const players = snapshot.players.filter((player) => !player.isGK);
    const xs = players.map((player) => player.x),
      ys = players.map((player) => player.y);
    return {
      cx: xs.reduce((sum, x) => sum + x, 0) / xs.length,
      cy: ys.reduce((sum, y) => sum + y, 0) / ys.length,
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  });
  const average = (key: keyof (typeof observed)[number]) =>
    observed.reduce((sum, item) => sum + item[key], 0) / observed.length;
  const cx = average("cx"),
    cy = average("cy"),
    halfLength = (average("maxX") - average("minX")) / 2,
    halfWidth = (average("maxY") - average("minY")) / 2;
  const shape = [
    { x: cx - halfLength, y: cy - halfWidth * 0.55 },
    { x: cx - halfLength * 0.55, y: cy - halfWidth },
    { x: cx + halfLength * 0.55, y: cy - halfWidth },
    { x: cx + halfLength, y: cy - halfWidth * 0.55 },
    { x: cx + halfLength, y: cy + halfWidth * 0.55 },
    { x: cx + halfLength * 0.55, y: cy + halfWidth },
    { x: cx - halfLength * 0.55, y: cy + halfWidth },
    { x: cx - halfLength, y: cy + halfWidth * 0.55 },
  ];
  const polygon = shape
    .map((point) => `${(clamp(point.y) / 100) * 64},${100 - clamp(point.x)}`)
    .join(" ");
  const length =
    Math.round((snapshots.reduce((sum, s) => sum + s.lengthM, 0) / snapshots.length) * 10) / 10;
  const width =
    Math.round((snapshots.reduce((sum, s) => sum + s.widthM, 0) / snapshots.length) * 10) / 10;
  return (
    <Card
      question="How did our shape change?"
      icon={Grid3x3}
      caption={`Average shape · ${identity.name}`}
      comparison={{ target: "—", opponent: "—", last5: "—" }}
      honesty={`${territory.frameCount} tracked frames`}
    >
      <StatsPitch
        portrait
        attackLabel={identity.shortCode}
        ariaLabel={`${identity.name} average shape on the pitch`}
      >
        <polygon
          points={polygon}
          fill={colour}
          fillOpacity=".25"
          stroke={colour}
          strokeWidth=".8"
        />
        <path
          d={`M${(cy / 100) * 64 - 2},${100 - cx}h4M${(cy / 100) * 64},${98 - cx}v4`}
          stroke={colour}
          strokeWidth="1.2"
        />
      </StatsPitch>
      <div className="mt-3 grid grid-cols-3 rule-x border border-wire">
        <Metric value={`${length} m`} label="Length" />
        <Metric value={`${width} m`} label="Width" />
        <Metric
          value={`${territory.lineHeightM || "—"}${territory.lineHeightM ? " m" : ""}`}
          label="Line height"
        />
      </div>
    </Card>
  );
}

function ShapeOutcome({ lineDefending, colour }: { lineDefending: LineDefending; colour: string }) {
  const states = lineDefending.states;
  if (!states.length) return null;
  const worst = [...states].sort((a, b) => b.shots - a.shots)[0]?.key;
  return (
    <Card
      question="In which shape did we suffer?"
      icon={Shield}
      caption="Defensive states compared by opponent shots and goals."
      honesty={`${lineDefending.timeline.length} shape samples`}
    >
      <div className="grid grid-cols-3 gap-2" role="img" aria-label="Defensive shape outcomes">
        {states.map((state) => (
          <div
            key={state.key}
            className={cn(
              "border bg-surface-2 p-2",
              state.key === worst ? "border-quality-bad" : "border-wire",
            )}
          >
            <div className="flex justify-between">
              <strong className="display text-[12px] uppercase">{state.key}</strong>
              <span className="num text-[11px] text-text-faint">{state.height}m</span>
            </div>
            <svg viewBox="0 0 70 46" className="my-2 w-full">
              <rect x="1" y="1" width="68" height="44" fill="none" stroke="var(--wire)" />
              <rect
                x={state.key === "low" ? 18 : state.key === "mid" ? 14 : 10}
                y={state.key === "high" ? 7 : 12}
                width={state.key === "low" ? 34 : state.key === "mid" ? 42 : 50}
                height={state.key === "low" ? 22 : state.key === "mid" ? 28 : 32}
                fill={colour}
                fillOpacity=".16"
                stroke={colour}
                strokeDasharray="2 2"
              />
            </svg>
            <div className="grid grid-cols-2 gap-1 text-center">
              <Metric value={`${state.shots}`} label="shots" />
              <Metric value={`${state.goals}`} label="goals" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ShotMap({ stats, colours, matchId, events, file, team, scopeBoth, teamA, teamB }: Props) {
  const metricShots = contractShots(stats);
  const eventShots: Shot[] = events
    .filter((event) => event.type === "shot" || event.type === "goal")
    .map((event) => {
      const point = eventPoint(event, file);
      return {
        id: event.id,
        t: event.t,
        team: (event.team === "B" ? "B" : "A") as TeamKey,
        x: point?.x ?? null,
        y: point?.y ?? null,
        goal: event.type === "goal",
        onTarget:
          event.type === "goal"
            ? true
            : typeof event.payload?.["on_target"] === "boolean"
              ? (event.payload["on_target"] as boolean)
              : null,
      };
    });
  // A shot with no position cannot be drawn on a pitch. It used to be planted
  // at a default spot, which made a metres-based export look like a team that
  // shot from one place all match.
  // Positions are stored with A attacking towards the far goal and B towards
  // the near one, already the right way round for both halves. Drawn as they
  // are stored, each side's shots cluster at the goal it was attacking — so
  // nothing here mirrors anything.
  const all = (metricShots.length ? metricShots : eventShots).filter((shot) =>
    insidePeriods(shot.t, file?.periods),
  );
  const shots = scopeBoth ? all : all.filter((shot) => shot.team === team);
  // A shot whose origin has not been marked by eye yet carries no position.
  // It still happened, so it stays in the count and in the timeline — it just
  // cannot be drawn on a pitch, and a guessed position is worse than none.
  const placed = shots.filter((shot) => shot.x !== null && shot.y !== null);
  const unplaced = shots.length - placed.length;
  if (!shots.length)
    return (
      <EvidenceUnavailable
        question="Where did shots come from?"
        icon={Goal}
        caption="The location and outcome of each reliable shot."
      />
    );
  return (
    <Card
      question="Where did shots come from?"
      icon={Goal}
      caption="Filled means on target, hollow a miss, dashed not graded yet. A cream ring marks a goal. Each side shoots towards the goal it was attacking."
      honesty={`${shots.length} ${shots.length === 1 ? "shot" : "shots"}${
        scopeBoth ? "" : ` · ${(team === "A" ? teamA : teamB).shortCode}`
      }${unplaced > 0 ? ` · ${placed.length} placed on the pitch` : ""}`}
    >
      {scopeBoth && (
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {[
            { id: "A" as TeamKey, who: teamA },
            { id: "B" as TeamKey, who: teamB },
          ].map(({ id, who }) => (
            <span key={id} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0"
                style={{ background: colours[id] }}
                aria-hidden="true"
              />
              <span className="text-[12px] text-text-dim">
                {who.name} · {all.filter((shot) => shot.team === id).length}
              </span>
            </span>
          ))}
        </div>
      )}
      {/* Every shot on a strip of match time, so a match whose positions are
          not marked yet still has something to look at. */}
      <ShotTimeline shots={shots} colours={colours} file={file} matchId={matchId} />
      {unplaced > 0 && (
        <p className="mt-2 text-[12px] text-text-dim">
          {unplaced} of {shots.length} {unplaced === 1 ? "shot has" : "shots have"} no marked
          position yet, so {unplaced === 1 ? "it is" : "they are"} on the strip above but not on the
          pitch. Tap any of them to watch it.
        </p>
      )}

      {placed.length > 0 && (
        <Pitch>
          {placed.map((shot, index) => {
            const shotTeam = shot.team;
            const x = shot.x!;
            const y = shot.y!;
            const t = shot.t;
            const goal = shot.goal;
            const on = shot.onTarget;
            return (
              <Link
                key={shot.id || index}
                to="/match/$matchId/match"
                params={{ matchId }}
                search={{ t }}
                aria-label={`Watch ${shotTeam} shot`}
              >
                {/* Drawn inside the pitch rectangle, not the viewBox. The pitch
                  is inset, so plotting straight into viewBox space put a shot
                  on the goal line three units outside the drawn goal. */}
                <circle
                  cx={3 + (clamp(x) / 100) * 94}
                  cy={1.5 + (clamp(y) / 100) * 60.9}
                  r={goal ? 1.9 : 1.4}
                  fill={on === true ? colours[shotTeam] : "transparent"}
                  fillOpacity={on === true ? 0.9 : 1}
                  stroke={goal ? "var(--cream)" : colours[shotTeam]}
                  strokeWidth={goal ? 0.9 : 0.6}
                  strokeDasharray={on === null ? "1 0.8" : undefined}
                />
              </Link>
            );
          })}
        </Pitch>
      )}
    </Card>
  );
}

/**
 * Every shot on a strip of match time.
 *
 * Positions are added by eye after the fact, so a freshly processed match has
 * shots with no place on a pitch. They still happened, at a known minute, to a
 * known side — which is enough for a coach to see the shape of the match and
 * to open any of them in the video. It is also what the shot map falls back to
 * rather than drawing a pitch with nothing on it.
 */
function ShotTimeline({
  shots,
  colours,
  file,
  matchId,
}: {
  shots: Shot[];
  colours: { A: string; B: string };
  file: MatchDataFile | undefined;
  matchId: string;
}) {
  if (shots.length === 0) return null;
  const periods = file?.periods ?? [];
  const end = Math.max(periods.at(-1)?.t_end ?? 0, ...shots.map((shot) => shot.t), 1);
  const pct = (t: number) => Math.max(0, Math.min(100, (t / end) * 100));

  return (
    <div className="mb-4">
      <div className="relative h-16 border border-wire bg-surface-2">
        {/* Half-time, so the gap in play is visible rather than implied. */}
        {periods.length >= 2 && (
          <span
            className="absolute inset-y-0 bg-bg"
            style={{
              left: `${pct(periods[0]!.t_end)}%`,
              width: `${Math.max(pct(periods[1]!.t_start) - pct(periods[0]!.t_end), 0.6)}%`,
            }}
            aria-hidden="true"
          />
        )}
        <span className="absolute inset-x-0 top-1/2 h-px bg-wire" aria-hidden="true" />
        {shots.map((shot, i) => (
          <Link
            key={shot.id || i}
            to="/match/$matchId/match"
            params={{ matchId }}
            search={{ t: Math.round(shot.t * 10) / 10 }}
            aria-label={`Watch ${shot.team === "A" ? "our" : "their"} ${shot.goal ? "goal" : "shot"} at ${Math.floor(shot.t / 60)} minutes`}
            className="absolute -translate-x-1/2"
            style={{
              left: `${pct(shot.t)}%`,
              // Ours above the line, theirs below, so the two sides read apart.
              top: shot.team === "A" ? "22%" : "58%",
            }}
          >
            <span
              className="block rounded-full"
              style={{
                width: shot.goal ? 13 : 9,
                height: shot.goal ? 13 : 9,
                background: shot.onTarget === true ? colours[shot.team] : "transparent",
                border: `${shot.goal ? 2 : 1.5}px ${shot.onTarget === null ? "dashed" : "solid"} ${shot.goal ? "var(--cream)" : colours[shot.team]}`,
                opacity: shot.onTarget === null ? 0.65 : 1,
              }}
            />
          </Link>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-text-faint">
        <span>0&apos;</span>
        <span>{Math.round(end / 120)}&apos;</span>
        <span>{Math.round(end / 60)}&apos;</span>
      </div>
    </div>
  );
}

function ShotSummary({ stats, team, events, file }: Props) {
  const metricShots = contractShots(stats, team).filter((shot) =>
    insidePeriods(shot.t, file?.periods),
  );
  const shots: Shot[] = metricShots.length
    ? metricShots
    : events
        .filter((event) => event.team === team && (event.type === "shot" || event.type === "goal"))
        .map((event, i) => ({
          id: event.id || `e${i}`,
          t: event.t,
          team,
          x: finite(event.payload?.["x"]),
          y: finite(event.payload?.["y"]),
          goal: event.type === "goal",
          onTarget:
            event.type === "goal"
              ? true
              : typeof event.payload?.["on_target"] === "boolean"
                ? (event.payload["on_target"] as boolean)
                : null,
        }));
  if (!shots.length)
    return (
      <EvidenceUnavailable
        question="What did our shooting produce?"
        icon={Zap}
        caption="Shot volume, accuracy and penalty-area share."
      />
    );
  const accuracy = accuracyOf(shots);
  const goals = shots.filter((shot) => shot.goal).length;
  // Only shots we can place can be said to be inside the box — so the figure is
  // reported out of the placed ones, not out of every shot. Out of every shot it
  // read as though the unplaced ones had been shown to be outside the area.
  const placed = shots.filter((shot) => shot.x !== null);
  // The penalty area is 16.5 m deep and 40.3 m wide: on a 105 x 68 pitch that
  // is the outer 15.7% of the length and the middle 59% of the width. The old
  // test was x-only, so a shot from the touchline level with the box counted
  // as one taken inside it.
  const inBox = (shot: Shot) =>
    shot.x !== null &&
    shot.y !== null &&
    (shot.x < 15.7 || shot.x > 84.3) &&
    shot.y > 20.5 &&
    shot.y < 79.5;
  const box = placed.filter(inBox).length;
  return (
    <Card
      question="What did our shooting produce?"
      icon={Zap}
      caption="The shot total, accuracy and penalty-area share without a score dial."
      honesty={`${shots.length} shot moments${
        accuracy.unknown > 0 ? ` · ${accuracy.judged} with the outcome recorded` : ""
      }`}
    >
      <div className="grid grid-cols-3 rule-x border border-wire">
        <Metric value={`${shots.length}`} label="shots" />
        {/* Accuracy over the graded shots only. A dash beats a number that
            counts every ungraded attempt as a miss. */}
        <Metric
          value={accuracy.judged === 0 ? "—" : `${accuracy.on}`}
          label={accuracy.judged === 0 ? "on target" : `on target of ${accuracy.judged}`}
        />
        <Metric value={`${goals}`} label="goals" />
      </div>
      <p className="mt-3 text-[12px] text-text-dim">
        {accuracy.judged === 0
          ? "No shot has been graded on target or wide yet, so accuracy is withheld rather than guessed."
          : `${accuracy.off} of the ${accuracy.judged} graded attempts missed the target.`}
        {accuracy.unknown > 0 &&
          ` ${accuracy.unknown} ${accuracy.unknown === 1 ? "shot is" : "shots are"} still ungraded.`}
      </p>
      {placed.length > 0 && (
        <p className="mt-1 text-[12px] text-text-dim">
          {box} of the {placed.length} shots with a marked position came from inside the penalty
          area.
        </p>
      )}
    </Card>
  );
}

function EntriesConceded({ events, team, matchId, file }: Props) {
  const opponent = team === "A" ? "B" : "A";
  const entries = events
    .filter(
      (e) => e.team === opponent && ["final_third_entry", "entry", "shot", "goal"].includes(e.type),
    )
    .map((event) => ({ event, point: eventPoint(event, file) }))
    .filter((x): x is { event: ReviewedEvent; point: Point } => x.point !== null);
  if (!entries.length)
    return (
      <EvidenceUnavailable
        question="Where did they get in?"
        icon={ArrowLeftRight}
        caption="Opponent entries into our defensive third."
      />
    );
  const lanes = [0, 0, 0, 0, 0];
  entries.forEach(({ point }) => {
    const index = Math.min(4, Math.floor(point.y / 20));
    lanes[index] = (lanes[index] ?? 0) + 1;
  });
  return (
    <Card
      question="Where did they get in?"
      icon={ArrowLeftRight}
      caption="Opponent entries into our defensive third, grouped into five lanes."
      honesty={`${entries.length} entries and shots`}
    >
      <Pitch>
        {entries.slice(0, 5).map(({ event, point }) => (
          <Link
            key={event.id}
            to="/match/$matchId/match"
            params={{ matchId }}
            search={{ t: event.t }}
            aria-label={`Watch entry at ${fmt(event.t)}`}
          >
            <line
              x1={point.x}
              y1={(point.y / 100) * 64}
              x2={Math.max(4, point.x - 10)}
              y2={(point.y / 100) * 64}
              stroke="var(--graphite)"
              strokeWidth="1.2"
            />
            <circle
              cx={Math.max(4, point.x - 10)}
              cy={(point.y / 100) * 64}
              r="1.8"
              fill={
                event.type === "shot" || event.type === "goal"
                  ? "var(--quality-bad)"
                  : "var(--text-faint)"
              }
            />
          </Link>
        ))}
      </Pitch>
      <div
        className="mt-3 grid h-20 grid-cols-5 items-end gap-1"
        role="img"
        aria-label="Entries by lane"
      >
        {lanes.map((count, index) => (
          <div key={index} className="text-center">
            <span className="num text-[10px] text-text-dim">{count}</span>
            <span
              className="mt-1 block bg-cream/50"
              style={{ height: `${Math.max(2, (count / Math.max(...lanes)) * 48)}px` }}
            />
            <span className="mt-1 block text-[8px] uppercase text-text-faint">
              {["Left", "Half", "Centre", "Half", "Right"][index]}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PlayerCards({ players, stats, matchId, colours }: Props) {
  const raw = stats?.players ?? [];
  if (!players.length) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {players.map((player) => {
        const detail = raw.find((p: any) => p?.team === player.team && p?.id === player.id) ?? {};
        const completion = player.passes
          ? Math.round((player.passesCompleted / player.passes) * 100)
          : 0;
        const risky = finite(detail?.risky_passes ?? detail?.passes_risky) ?? 0;
        const lost = Math.max(0, player.passes - player.passesCompleted),
          shirt = playerLabel(player.id);
        return (
          <Link
            key={`${player.team}-${player.id}`}
            to="/match/$matchId/player/$playerId"
            params={{ matchId, playerId: String(player.id) }}
            className="block border border-wire bg-surface p-4"
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-12 w-12 place-items-center display-i text-[22px] text-bg"
                style={{ background: colours[player.team] }}
              >
                {shirt}
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-text-bright">Player #{shirt}</h2>
                <p className="text-[11px] text-text-faint">{player.minutes} visible minutes</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-1">
              {[
                [Math.round(player.distanceM / Math.max(player.minutes, 1)), "m/min"],
                [player.touches, "touches"],
                [`${player.passesCompleted}/${player.passes}`, "passes"],
                [player.betterOptions, "options"],
                [completion, "quality"],
              ].map(([v, l]) => (
                <div key={l} className="bg-surface-2 p-2 text-center">
                  <strong className="num block text-[14px] text-cream">{v}</strong>
                  <span className="text-[8px] uppercase text-text-faint">{l}</span>
                </div>
              ))}
            </div>
            <div
              className="mt-3 flex h-2 overflow-hidden bg-surface-3"
              aria-label={`${completion}% completed, ${risky} risky, ${lost} lost`}
            >
              <span className="bg-quality-good" style={{ width: `${completion}%` }} />
              <span
                className="bg-quality-risky"
                style={{ width: `${Math.min(100 - completion, risky)}%` }}
              />
              <span className="bg-quality-bad" style={{ flex: lost }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * One team's passes, inside the match.
 *
 * Two things used to slip through. The "Full" filter is the whole recording,
 * not the match, so warm-up and half-time passes were counted alongside the
 * ones that mattered; and inRange waves a null time through, so a pass with no
 * clock at all landed in every period at once. Both inflate a pass count that
 * the audit already says is 1.5 to 2 times too high.
 *
 * A pass with no time cannot be shown to belong to this match, so it is left
 * out and counted separately rather than dropped quietly.
 */
function passSet(stats: StatsFile | undefined, team: TeamKey, range: number[], periods: Periods) {
  return (stats?.passes ?? []).filter((pass: any) => {
    if (passTeam(pass) !== team) return false;
    return inMatch(passTime(pass), range, periods);
  }) as Pass[];
}

/** Passes for this team that carry no usable clock, so the card can say so. */
function passesWithoutTime(stats: StatsFile | undefined, team: TeamKey) {
  return (stats?.passes ?? []).filter(
    (pass: any) => passTeam(pass) === team && passTime(pass) === null,
  ).length;
}
type PairCount = {
  from: number;
  to: number;
  total: number;
  complete: number;
  gain: number;
  /** How many of these passes carried a position, for the averages below. */
  located: number;
  start: Point | null;
  end: Point | null;
};
function pairCounts(passes: Pass[]) {
  const map = new Map<string, PairCount>();
  passes.forEach((pass) => {
    const from = passPlayer(pass, "from"),
      to = passPlayer(pass, "to");
    if (from === null || to === null) return;
    const key = `${from}-${to}`,
      start = passPoint(pass, "start"),
      end = passPoint(pass, "end"),
      item = map.get(key) ?? {
        from,
        to,
        total: 0,
        complete: 0,
        gain: 0,
        located: 0,
        start: null,
        end: null,
      };
    // A pass the file never judged belongs in neither column: counting it as
    // complete flattered every lane in the table.
    const completed = passCompleted(pass);
    if (completed !== null) {
      item.total += 1;
      if (completed) item.complete += 1;
    }
    if (start && end) {
      item.located += 1;
      item.gain += end.x - start.x;
      item.start = { x: (item.start?.x ?? 0) + start.x, y: (item.start?.y ?? 0) + start.y };
      item.end = { x: (item.end?.x ?? 0) + end.x, y: (item.end?.y ?? 0) + end.y };
    }
    map.set(key, item);
  });
  return [...map.values()]
    .map((item) => ({
      ...item,
      // Divided by the number of passes that contributed a position, not by
      // the number the file judged. Those are different counts, and dividing
      // by the judged one put a node at a multiple of its real spot -- or at
      // Infinity, which silently dropped it from the drawing.
      start:
        item.start && item.located > 0
          ? { x: item.start.x / item.located, y: item.start.y / item.located }
          : null,
      end:
        item.end && item.located > 0
          ? { x: item.end.x / item.located, y: item.end.y / item.located }
          : null,
    }))
    .sort((a, b) => b.total - a.total);
}

function LaneEffectiveness({
  passes,
  colour,
  identity,
}: {
  passes: Pass[];
  colour: string;
  identity: StatsTeamIdentity;
}) {
  const [minN, setMinN] = useState(2);
  const pairs = pairCounts(passes).filter((pair) => pair.total >= minN);
  const best = [...pairs]
    .filter((pair) => pair.total > 0)
    .sort((a, b) => b.complete / b.total - a.complete / a.total || b.total - a.total)
    .slice(0, 3);
  const worst = [...pairs]
    .filter((pair) => pair.total > 0 && !best.includes(pair))
    .sort((a, b) => a.complete / a.total - b.complete / b.total || b.total - a.total)
    .slice(0, 3);
  const rows = [...best, ...worst];
  const [selected, setSelected] = useState(0);
  const lane = rows[selected] ?? rows[0];
  if (!lane && minN === 2)
    return (
      <EvidenceUnavailable
        question="Which lanes worked?"
        icon={RouteIcon}
        caption="Lane use and completion quality."
      />
    );
  const renderRow = (pair: PairCount, index: number) => (
    <Button
      key={`${pair.from}-${pair.to}`}
      variant="ghost"
      onClick={() => setSelected(index)}
      aria-pressed={selected === index}
      className={cn(
        "grid h-11 w-full grid-cols-[28px_1fr_auto] gap-3 rounded-none px-2 text-left",
        index % 2 === 0 ? "bg-surface" : "bg-surface-2",
        selected === index && "border-l-2 border-cream",
      )}
    >
      <span className="text-[18px]" style={{ color: colour }}>
        →
      </span>
      <span className="num text-[14px] text-text">
        #{playerLabel(pair.from)} → #{playerLabel(pair.to)}
      </span>
      <span className="text-right">
        <strong
          className={cn(
            "num block text-[12px]",
            pair.complete / pair.total >= 0.7
              ? "text-positive"
              : pair.complete / pair.total >= 0.5
                ? "text-reaction-warn"
                : "text-reaction-bad",
          )}
        >
          {pair.complete}/{pair.total}
        </strong>
        <small className="text-[10px] text-text-faint">
          {Math.round(pair.gain / Math.max(pair.total, 1))} m avg
        </small>
      </span>
    </Button>
  );
  return (
    <Card
      question="Which lanes worked?"
      icon={RouteIcon}
      caption="Tap a lane to isolate the real pass route."
      comparison={{ target: "—", opponent: "—", last5: "—" }}
      honesty={`${passes.length} passes`}
    >
      <StatsPitch
        portrait
        attackLabel={identity.shortCode}
        ariaLabel={`${identity.name} selected passing lane`}
      >
        {lane && lane.start && lane.end && (
          <>
            <line
              x1={(lane.start.y / 100) * 64}
              y1={100 - lane.start.x}
              x2={(lane.end.y / 100) * 64}
              y2={100 - lane.end.x}
              stroke={colour}
              strokeWidth="1.8"
            />
            <circle cx={(lane.start.y / 100) * 64} cy={100 - lane.start.x} r="3" fill={colour} />
            <circle cx={(lane.end.y / 100) * 64} cy={100 - lane.end.x} r="3" fill={colour} />
            <text
              x={(lane.start.y / 100) * 64}
              y={100 - lane.start.x + 1}
              textAnchor="middle"
              fontSize="3"
              fill="var(--ink)"
              fontWeight="700"
            >
              {playerLabel(lane.from)}
            </text>
            <text
              x={(lane.end.y / 100) * 64}
              y={100 - lane.end.x + 1}
              textAnchor="middle"
              fontSize="3"
              fill="var(--ink)"
              fontWeight="700"
            >
              {playerLabel(lane.to)}
            </text>
          </>
        )}
      </StatsPitch>
      <div
        className="mt-3 flex items-center gap-2"
        role="group"
        aria-label="Minimum passes per lane"
      >
        <span className="text-[11px] text-text-faint">At least</span>
        {[2, 3, 5, 10].map((n) => (
          <Button
            key={n}
            variant="ghost"
            onClick={() => setMinN(n)}
            aria-pressed={minN === n}
            className={cn(
              "h-11 min-w-11 border px-2 text-[12px]",
              minN === n ? "border-cream bg-cream text-ink" : "border-wire text-text",
            )}
          >
            {n}
          </Button>
        ))}
        <span className="text-[11px] text-text-faint">passes</span>
      </div>
      <h3 className="section-kicker mt-3">Best lanes</h3>
      <div className="mt-1">{best.map((pair, index) => renderRow(pair, index))}</div>
      <h3 className="section-kicker mt-3 border-t border-wire pt-3">Worst lanes</h3>
      <div className="mt-1">{worst.map((pair, index) => renderRow(pair, best.length + index))}</div>
    </Card>
  );
}

function BetterOption({
  events,
  team,
  matchId,
  colour,
  teamA,
  teamB,
  file,
}: Props & { colour: string }) {
  const moments = events.filter((e) => e.team === team && e.type === "better_option");
  if (!moments.length) return null;
  const event = moments[0];
  if (!event) return null;
  const p = event.payload ?? {};
  const bestId = finite(p["best_to"]);
  let bestM: unknown = null;
  if (bestId !== null) {
    let near: Frame | undefined;
    for (const frame of file?.frames ?? []) {
      if (!near || Math.abs(frame.t - event.t) < Math.abs(near.t - event.t)) near = frame;
    }
    bestM = near?.players.find((pl) => pl.id === bestId)?.m ?? null;
  }
  const s0 = metresToPct(p["from_m"], team),
    p0 = metresToPct(p["to_m"], team),
    b0 = metresToPct(bestM, team);
  const sx = s0?.x ?? finite(p["x"] ?? p["start_x"]),
    sy = s0?.y ?? finite(p["y"] ?? p["start_y"]),
    px = p0?.x ?? finite(p["played_x"] ?? p["end_x"]),
    py = p0?.y ?? finite(p["played_y"] ?? p["end_y"]),
    bx = b0?.x ?? finite(p["better_x"] ?? p["target_x"]),
    by = b0?.y ?? finite(p["better_y"] ?? p["target_y"]);
  if ([sx, sy, px, py, bx, by].some((v) => v === null))
    return (
      <EvidenceUnavailable
        question="Where were we open?"
        icon={MapIcon}
        caption="The available moment has no reliable pitch coordinates."
      />
    );
  const start = { x: sx as number, y: sy as number },
    played = { x: px as number, y: py as number },
    better = { x: bx as number, y: by as number };
  const carrier = finite(p["carrier"] ?? p["from"] ?? p["player_id"]),
    receiver = finite(p["receiver"] ?? p["to"] ?? p["receiver_id"]),
    target = finite(p["better_receiver"] ?? p["target_player"] ?? p["better_to"] ?? p["best_to"]);
  const metres = (a: Point, b: Point) =>
    Math.round(Math.hypot(((b.x - a.x) * PITCH.length) / 100, ((b.y - a.y) * PITCH.width) / 100));
  const gain = finite(p["best_gain_m"]),
    beats = finite(p["best_bypassed"]),
    space = finite(p["best_space_m"]);
  const direction = (a: Point, b: Point) =>
    b.x - a.x > 4 ? "forward" : b.x - a.x < -4 ? "backward" : "across";
  const identity = team === "A" ? teamA : teamB;
  const shirt = (n: number | null) => (n === null ? "?" : String(n));
  return (
    <Card
      question="Where were we open?"
      icon={MapIcon}
      caption={`${identity.name} · #${shirt(carrier)} with the ball`}
      comparison={{ target: "—", opponent: "—", last5: "—" }}
      honesty={`${moments.filter((e) => e.status === "confirmed").length} confirmed · ${moments.length} detected`}
    >
      <Link
        to="/match/$matchId/match"
        params={{ matchId }}
        search={{ t: event.t }}
        aria-label="Watch better option"
      >
        <PortraitPitch>
          <circle cx={(start.y / 100) * 64} cy={100 - start.x} r="3.5" fill={colour} />
          <circle cx={(played.y / 100) * 64} cy={100 - played.x} r="2.8" fill={colour} />
          <circle
            cx={(better.y / 100) * 64}
            cy={100 - better.x}
            r="3"
            fill="var(--surface-2)"
            stroke="var(--cream)"
            strokeDasharray="1.4 1"
          />
          <line
            x1={(start.y / 100) * 64}
            y1={100 - start.x}
            x2={(played.y / 100) * 64}
            y2={100 - played.x}
            stroke={colour}
            strokeWidth="1.5"
          />
          <line
            x1={(start.y / 100) * 64}
            y1={100 - start.x}
            x2={(better.y / 100) * 64}
            y2={100 - better.x}
            stroke="var(--cream)"
            strokeDasharray="2 2"
            strokeWidth="1.2"
          />
          {[
            [start, carrier, "var(--ink)"],
            [played, receiver, "var(--ink)"],
            [better, target, "var(--cream)"],
          ].map(([point, id, fill], index) => (
            <text
              key={index}
              x={((point as Point).y / 100) * 64}
              y={100 - (point as Point).x + 1}
              textAnchor="middle"
              fontSize="3"
              fontWeight="800"
              fill={fill as string}
            >
              {shirt(id as number | null)}
            </text>
          ))}
        </PortraitPitch>
      </Link>
      <div className="mt-3 space-y-1 text-[12px]">
        <p className="text-text-dim">
          Pass played: #{shirt(carrier)} → #{shirt(receiver)}, {direction(start, played)},{" "}
          {metres(start, played)} m.
        </p>
        <p className="text-cream">
          Better option: #{shirt(carrier)} → #{shirt(target)}, {direction(start, better)},{" "}
          {metres(start, better)} m{gain !== null ? ` · +${Math.round(gain)} m` : ""}
          {beats !== null ? ` · beats ${beats}` : ""}
          {space !== null ? ` · ${Math.round(space)} m of space` : ""}.
        </p>
      </div>
    </Card>
  );
}

function PassNetwork({
  passes,
  colour,
  identity,
  opponentPasses,
}: {
  passes: Pass[];
  colour: string;
  identity: StatsTeamIdentity;
  opponentPasses: number;
}) {
  const pairs = pairCounts(passes)
    .filter((pair) => pair.start && pair.end)
    .slice(0, 14);
  if (!pairs.length) return null;
  const ids = [...new Set(pairs.flatMap((p) => [p.from, p.to]))].slice(0, 11);
  const touches = new Map<number, number>(),
    sum = new Map<number, { x: number; y: number; n: number }>();
  pairs.forEach((p) => {
    touches.set(p.from, (touches.get(p.from) ?? 0) + p.total);
    touches.set(p.to, (touches.get(p.to) ?? 0) + p.total);
    if (p.start) {
      const s = sum.get(p.from) ?? { x: 0, y: 0, n: 0 };
      s.x += p.start.x;
      s.y += p.start.y;
      s.n++;
      sum.set(p.from, s);
    }
    if (p.end) {
      const s = sum.get(p.to) ?? { x: 0, y: 0, n: 0 };
      s.x += p.end.x;
      s.y += p.end.y;
      s.n++;
      sum.set(p.to, s);
    }
  });
  const pos = new Map(
    ids.flatMap((id) => {
      const s = sum.get(id);
      return s ? [[id, { x: s.x / s.n, y: (s.y / s.n / 100) * 64 }] as const] : [];
    }),
  );
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Card
      question="How did we build?"
      icon={Users}
      caption={`Pass network · ${identity.name} · ${passes.length} passes`}
      comparison={{ opponent: `${opponentPasses} passes`, last5: "—" }}
      honesty={`${passes.length} pass records`}
    >
      <div className="relative">
        <Pitch>
          {pairs.map((pair) => {
            const a = pos.get(pair.from),
              b = pos.get(pair.to),
              key = `${pair.from}-${pair.to}`;
            return a && b ? (
              <g
                key={key}
                onClick={() => setSelected(key)}
                className="cursor-pointer"
                role="button"
                aria-label={`${pair.from} to ${pair.to}, ${pair.total} passes`}
              >
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--cream)"
                  strokeOpacity={
                    selected === key ? 0.9 : 0.15 + (0.55 * pair.complete) / pair.total
                  }
                  strokeWidth={Math.min(3, 0.3 + pair.total / 3)}
                />
              </g>
            ) : null;
          })}
          {ids.map((id) => {
            const p = pos.get(id);
            if (!p) return null;
            const r = 3 + Math.min(4, (touches.get(id) ?? 0) / 8);
            return (
              <g key={id}>
                <circle cx={p.x} cy={p.y} r={r} fill={colour} />
                <text
                  x={p.x}
                  y={p.y + 1.4}
                  textAnchor="middle"
                  fontSize="3.6"
                  fontWeight="800"
                  fill="var(--bg)"
                >
                  {id}
                </text>
              </g>
            );
          })}
        </Pitch>
        {selected && (
          <span className="absolute right-2 top-2 bg-cream px-2 py-1 text-[10px] font-bold text-ink">
            {pairs.find((p) => `${p.from}-${p.to}` === selected)?.total} passes
          </span>
        )}
      </div>
    </Card>
  );
}

/* ---------------- pass map ---------------- */

/**
 * Forces one-team scope for a card that only ever draws one team.
 *
 * The page's Both toggle sets a context flag that makes every card wear a
 * two-team pill. The pass map takes a single team's passes by construction, so
 * under Both it was captioned for two teams and drawn for one.
 */
function OneTeamCard({ children }: { children: React.ReactNode }) {
  const context = useContext(StatsCardContext);
  if (!context) return <>{children}</>;
  return (
    <StatsCardContext.Provider value={{ ...context, both: false }}>
      {children}
    </StatsCardContext.Provider>
  );
}

/**
 * The pitch is cut into zones rather than drawn pass by pass.
 *
 * A line per pass puts 1,300 strokes on one pitch, and the result is a grey
 * haze that answers nothing: a coach cannot see a route in it, only that
 * passes happened. Zones throw away the exact metres — which were never
 * trustworthy to the metre anyway — and keep the thing he asked about, which
 * is where the ball travels from and to.
 *
 * Six columns and three rows: enough to separate left, centre and right and to
 * tell own half from midfield from the final third, few enough that each zone
 * holds a countable number of passes.
 */
const ZONE_COLS = 6;
const ZONE_ROWS = 3;

type Zone = { col: number; row: number };

const zoneOf = (p: Point): Zone => ({
  col: Math.min(ZONE_COLS - 1, Math.max(0, Math.floor((p.x / 100) * ZONE_COLS))),
  row: Math.min(ZONE_ROWS - 1, Math.max(0, Math.floor((p.y / 100) * ZONE_ROWS))),
});
const zoneKey = (z: Zone) => z.row * ZONE_COLS + z.col;
const zoneFromKey = (k: number): Zone => ({ col: k % ZONE_COLS, row: Math.floor(k / ZONE_COLS) });

/** Football words for a zone, so the sentence under the map reads like speech. */
const COL_NAME = [
  "own half",
  "own half",
  "midfield",
  "midfield",
  "attacking third",
  "attacking third",
];
const ROW_NAME = ["left", "centre", "right"];
const zoneName = (z: Zone) => `${COL_NAME[z.col]} ${ROW_NAME[z.row]}`;

/**
 * A route in words.
 *
 * Two columns share each name -- 2 and 3 are both "midfield" -- so a forward
 * pass from one to the other came out as "from midfield left to midfield left",
 * which reads as a mistake even though the lane is real. When both ends land on
 * the same name the route is described as movement through that area instead of
 * between two identical ones.
 */
function routeName(from: Zone, to: Zone) {
  const a = zoneName(from);
  const b = zoneName(to);
  return a === b ? `forward through ${a}` : `from ${a} to ${b}`;
}

/* The drawing area inside StatsPitch: the touchlines sit at x 3..97, y 1.5..62.4. */
const PX = (x: number) => 3 + (x / 100) * 94;
const PY = (y: number) => 1.5 + (y / 100) * 60.9;
const zoneCentre = (z: Zone) => ({
  x: PX(((z.col + 0.5) / ZONE_COLS) * 100),
  y: PY(((z.row + 0.5) / ZONE_ROWS) * 100),
});

/** The final third begins two thirds of the way up, whatever the pitch measures. */
const FINAL_THIRD_PCT = (2 / 3) * 100;

type Route = {
  from: number;
  to: number;
  /** Passes the file actually judged, completed or not. */
  judged: number;
  completed: number;
  /** Passes with no recorded outcome. They are drawn but never ranked. */
  ungraded: number;
  forward: boolean;
};

/**
 * Routes between zones, counted once.
 *
 * Success rate is taken over the judged passes only. Counting an ungraded pass
 * as a failure would rank the lanes by how much of the match the pipeline had
 * got round to grading rather than by how the team played, and most passes in
 * a fresh export are ungraded.
 */
function routesOf(located: { start: Point; end: Point; completed: boolean | null }[]): Route[] {
  const map = new Map<string, Route>();
  for (const pass of located) {
    const from = zoneKey(zoneOf(pass.start));
    const to = zoneKey(zoneOf(pass.end));
    const key = `${from}>${to}`;
    const route = map.get(key) ?? {
      from,
      to,
      judged: 0,
      completed: 0,
      ungraded: 0,
      forward: zoneFromKey(to).col > zoneFromKey(from).col,
    };
    if (pass.completed === null) route.ungraded += 1;
    else {
      route.judged += 1;
      if (pass.completed) route.completed += 1;
    }
    map.set(key, route);
  }
  return [...map.values()];
}

/**
 * Success rate over every pass on the route, graded or not.
 *
 * The spec's denominator, chosen deliberately: an ungraded pass counts against
 * the lane. That reads a lane the pipeline has not finished grading as a lane
 * the team struggled with, so the figure is only honest while the export grades
 * most of what it detects. `ungraded` rides along in the tap detail and in the
 * card's caption so the gap is visible rather than assumed away.
 */
const rateOf = (route: Route) => (volumeOf(route) === 0 ? 0 : route.completed / volumeOf(route));
const volumeOf = (route: Route) => route.judged + route.ungraded;

/** A bowed line, so two routes between the same pair of zones do not overlap. */
function curvePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const bow = 0.16;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} Q ${((a.x + b.x) / 2 - dy * bow).toFixed(
    2,
  )} ${((a.y + b.y) / 2 + dx * bow).toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/** Enough passes that a success rate means something rather than describing one moment. */
const LANE_MIN_PASSES = 5;
const ROUTES_SHOWN = 14;

function IndividualPassMap({
  passes,
  colour,
  identity,
  opponentPasses,
}: {
  passes: Pass[];
  colour: string;
  identity: StatsTeamIdentity;
  opponentPasses: number;
}) {
  const markerId = useId().replace(/:/g, "");
  const [outcome, setOutcome] = useState<"all" | "completed" | "incomplete" | "unknown">("all");
  const [player, setPlayer] = useState("all");
  const located = passes.flatMap((pass, index) => {
    const start = passPoint(pass, "start");
    const end = passPoint(pass, "end");
    return start && end
      ? [
          {
            pass,
            index,
            start,
            end,
            completed: passCompleted(pass),
            from: passPlayer(pass, "from"),
          },
        ]
      : [];
  });
  const playerIds = [...new Set(located.flatMap((p) => (p.from === null ? [] : [p.from])))].sort(
    (a, b) => a - b,
  );
  const shown = located.filter(
    (p) =>
      (player === "all" || String(p.from) === player) &&
      (outcome === "all" ||
        (outcome === "completed" && p.completed === true) ||
        (outcome === "incomplete" && p.completed === false) ||
        (outcome === "unknown" && p.completed === null)),
  );
  const completed = shown.filter((p) => p.completed === true).length;
  const incomplete = shown.filter((p) => p.completed === false).length;
  const unknown = shown.length - completed - incomplete;
  const tone = (result: boolean | null) =>
    result === true ? colour : result === false ? "var(--pitch-chalk)" : "var(--text-faint)";
  return (
    <Card
      question="Where did our passes go?"
      caption={`${identity.name} · ${shown.length} passes${player === "all" ? "" : ` · Player ${player}`}`}
      icon={RouteIcon}
      comparison={{ target: "—", opponent: `${opponentPasses} passes`, last5: "—" }}
      honesty={`${shown.length} detected passes · ${completed + incomplete} with an outcome`}
      footer={
        passes.length > located.length
          ? `${passes.length - located.length} without coordinates`
          : "Selected period"
      }
    >
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Pass outcomes">
        {(
          [
            ["all", "All"],
            ["completed", "Completed"],
            ["incomplete", "Incomplete"],
            ["unknown", "Unrated"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={outcome === key ? "primary" : "ghost"}
            aria-pressed={outcome === key}
            onClick={() => setOutcome(key)}
            className="min-h-11 px-3"
          >
            {label}
          </Button>
        ))}
      </div>
      <label className="mb-4 flex items-center gap-3 text-[12.5px] text-text-dim">
        Player
        <select
          aria-label="Pass map player"
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
          className="min-h-11 min-w-0 flex-1 border border-wire bg-surface-2 px-3 text-text focus-visible:outline-2 focus-visible:outline-cream"
        >
          <option value="all">All players</option>
          {playerIds.map((id) => (
            <option key={id} value={id}>
              Player {id}
            </option>
          ))}
        </select>
      </label>
      <StatsPitch
        chalk="var(--pitch-chalk)"
        attackLabel={identity.shortCode}
        ariaLabel={`${identity.name} individual pass map: ${completed} completed, ${incomplete} incomplete, ${unknown} unrated`}
      >
        <defs>
          {([true, false, null] as const).map((result, i) => (
            <marker
              key={i}
              id={`${markerId}-${i}`}
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="3.5"
              markerHeight="3.5"
              orient="auto-start-reverse"
              markerUnits="strokeWidth"
            >
              <path d="M0 0 L6 3 L0 6 Z" fill={tone(result)} />
            </marker>
          ))}
        </defs>
        {shown
          .filter((p) => p.completed === true)
          .map((p) => (
            <line
              key={`outline-${p.index}`}
              x1={3 + p.start.x * 0.94}
              y1={1.5 + p.start.y * 0.609}
              x2={3 + p.end.x * 0.94}
              y2={1.5 + p.end.y * 0.609}
              stroke="var(--pitch-chalk)"
              strokeWidth=".65"
              strokeOpacity=".3"
            />
          ))}
        {[...shown]
          .sort((a, b) => Number(a.completed === true) - Number(b.completed === true))
          .map((p) => (
            <line
              key={p.index}
              x1={3 + p.start.x * 0.94}
              y1={1.5 + p.start.y * 0.609}
              x2={3 + p.end.x * 0.94}
              y2={1.5 + p.end.y * 0.609}
              stroke={tone(p.completed)}
              strokeWidth=".35"
              strokeOpacity={p.completed === null ? 0.35 : 0.7}
              strokeDasharray={p.completed === false ? "1.5 1" : undefined}
              markerEnd={`url(#${markerId}-${p.completed === true ? 0 : p.completed === false ? 1 : 2})`}
            >
              <title>{`${p.completed === true ? "Completed" : p.completed === false ? "Incomplete" : "Unrated"} pass${p.from === null ? "" : ` · Player ${p.from}`}${passTime(p.pass) === null ? "" : ` · ${fmt(passTime(p.pass) ?? 0)}`}`}</title>
            </line>
          ))}
      </StatsPitch>
      {shown.length === 0 && (
        <p className="mt-3 text-[12.5px] text-text-faint">No passes match this selection.</p>
      )}
      <div
        className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-text-dim"
        aria-label="Pass map legend"
      >
        {(
          [
            [true, "Completed", completed],
            [false, "Incomplete", incomplete],
            [null, "Unrated", unknown],
          ] as const
        ).map(([result, label, count]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden="true">
              <path
                d="M0 6 H20 M16 2 L20 6 L16 10"
                fill="none"
                stroke={tone(result)}
                strokeWidth="1.5"
                strokeDasharray={result === false ? "3 2" : undefined}
              />
            </svg>
            {label} · {count}
          </span>
        ))}
      </div>
    </Card>
  );
}

function PassMap({
  passes,
  matchId,
  colour,
  withoutTime,
}: {
  passes: Pass[];
  matchId: string;
  colour: string;
  /** Passes this team made that carry no clock, so none of them are drawn. */
  withoutTime: number;
}) {
  const [view, setView] = useState<"routes" | "entries">("routes");
  const [selected, setSelected] = useState<string | null>(null);

  const located = passes
    .map((pass) => ({
      pass,
      start: passPoint(pass, "start"),
      end: passPoint(pass, "end"),
      completed: passCompleted(pass),
    }))
    .filter(
      (x): x is { pass: Pass; start: Point; end: Point; completed: boolean | null } =>
        x.start !== null && x.end !== null,
    );

  if (!located.length)
    return (
      <EvidenceUnavailable
        question="Where the passes go"
        icon={RouteIcon}
        caption="The routes passes travel between areas of the pitch."
      />
    );

  const routes = routesOf(located);
  const between = routes.filter((route) => route.from !== route.to);
  const within = routes.filter((route) => route.from === route.to);

  // Weighted by completed passes: a map weighted by attempts draws its thickest
  // arrow along a lane where nothing arrives. If nothing in the file carries an
  // outcome at all, weight falls back to attempts so the map is not blank.
  const anyCompleted = between.some((route) => route.completed > 0);
  const weightOf = (route: Route) => (anyCompleted ? route.completed : volumeOf(route));

  // Only forward routes are ranked. A square ball and a pass back to the
  // goalkeeper almost always arrive, so a table open to every direction is won
  // by the passes that risk nothing and tells the coach to play backwards.
  const rankable = between.filter((route) => route.forward && volumeOf(route) >= LANE_MIN_PASSES);
  const byRate = [...rankable].sort((a, b) => rateOf(b) - rateOf(a) || volumeOf(b) - volumeOf(a));
  const best = byRate.slice(0, 3);
  const hardest = [...rankable]
    .sort((a, b) => rateOf(a) - rateOf(b) || volumeOf(b) - volumeOf(a))
    .filter((route) => !best.includes(route))
    .slice(0, 2);

  // The busiest routes, plus every ranked lane. A high success rate rarely
  // belongs to the highest-volume route, so taking the top fourteen alone left
  // the sentence under the map naming a lane that was nowhere on it.
  const busiestRoutes = [...between]
    .sort((a, b) => weightOf(b) - weightOf(a))
    .slice(0, ROUTES_SHOWN);
  const drawn = [...new Set([...busiestRoutes, ...best, ...hardest])];
  const busiest = Math.max(1, ...drawn.map(weightOf));

  const toneOf = (route: Route) =>
    best.includes(route) ? "best" : hardest.includes(route) ? "hard" : "muted";

  const entries = located.filter(
    (pass) => pass.start.x < FINAL_THIRD_PCT && pass.end.x >= FINAL_THIRD_PCT,
  );
  const entriesDone = entries.filter((pass) => pass.completed === true).length;
  const entriesUngraded = entries.filter((pass) => pass.completed === null).length;

  // Every percentage on this card charges an ungraded pass to the lane, so the
  // share of them is the single number that says how much to trust the rest.
  const ungradedShare = Math.round(
    (located.filter((pass) => pass.completed === null).length / Math.max(1, located.length)) * 100,
  );
  const headline = best[0];
  const selectedRoute = drawn.find((route) => `${route.from}>${route.to}` === selected);

  return (
    <OneTeamCard>
      <Card
        question={view === "routes" ? "Where the passes go" : "Passes into the final third"}
        icon={RouteIcon}
        caption={
          view === "routes"
            ? "Top routes between zones · arrow width = passes that arrived"
            : `${entries.length} ${entries.length === 1 ? "pass" : "passes"} · ${entriesDone} completed${
                entriesUngraded > 0 ? ` · ${entriesUngraded} not graded` : ""
              }`
        }
        honesty={`${located.length} located passes${
          ungradedShare > 0 ? ` · ${ungradedShare}% without a recorded outcome` : ""
        }${withoutTime > 0 ? ` · ${withoutTime} without a clock, not shown` : ""} · Beta`}
      >
        <div
          className="mb-3 inline-flex border border-wire p-0.5"
          role="group"
          aria-label="Pass map view"
        >
          {(
            [
              ["routes", "Routes"],
              ["entries", "Into the final third"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setView(id);
                setSelected(null);
              }}
              aria-pressed={view === id}
              className={cn(
                "px-3 py-1.5 text-[12px] font-semibold transition-colors",
                view === id ? "bg-accent-sea text-ink" : "text-text-dim hover:text-text-bright",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Pitch>
          <defs>
            <marker
              id="pm-head-muted"
              markerUnits="userSpaceOnUse"
              markerWidth="2.6"
              markerHeight="2.6"
              refX="2.2"
              refY="1.3"
              orient="auto"
            >
              <path d="M0,0.35 L2.3,1.3 L0,2.25 Z" fill={colour} opacity="0.8" />
            </marker>
            <marker
              id="pm-head-best"
              markerUnits="userSpaceOnUse"
              markerWidth="3"
              markerHeight="3"
              refX="2.5"
              refY="1.5"
              orient="auto"
            >
              <path d="M0,0.4 L2.6,1.5 L0,2.6 Z" fill="var(--positive)" />
            </marker>
            <marker
              id="pm-head-hard"
              markerUnits="userSpaceOnUse"
              markerWidth="3"
              markerHeight="3"
              refX="2.5"
              refY="1.5"
              orient="auto"
            >
              <path d="M0,0.4 L2.6,1.5 L0,2.6 Z" fill="var(--reaction-bad)" />
            </marker>
          </defs>

          {/* Zone lines, faint enough to read the arrows over. */}
          <g
            stroke="var(--cream)"
            strokeOpacity="0.16"
            strokeWidth="0.25"
            strokeDasharray="1.2 1.6"
          >
            {Array.from({ length: ZONE_COLS - 1 }, (_, i) => (
              <line
                key={`c${i}`}
                x1={PX(((i + 1) / ZONE_COLS) * 100)}
                y1={PY(0)}
                x2={PX(((i + 1) / ZONE_COLS) * 100)}
                y2={PY(100)}
              />
            ))}
            {Array.from({ length: ZONE_ROWS - 1 }, (_, i) => (
              <line
                key={`r${i}`}
                x1={PX(0)}
                y1={PY(((i + 1) / ZONE_ROWS) * 100)}
                x2={PX(100)}
                y2={PY(((i + 1) / ZONE_ROWS) * 100)}
              />
            ))}
          </g>

          {view === "routes" ? (
            <>
              {/* Passes that never left their zone have no direction to draw, so
                they are a count rather than an arrow. */}
              {/* Muted first, ranked lanes on top, so a green lane is never hidden
                under a busier grey one. */}
              {[...drawn]
                .sort((a, b) => (toneOf(a) === "muted" ? -1 : 1) - (toneOf(b) === "muted" ? -1 : 1))
                .map((route) => {
                  const tone = toneOf(route);
                  const from = zoneCentre(zoneFromKey(route.from));
                  const to = zoneCentre(zoneFromKey(route.to));
                  const key = `${route.from}>${route.to}`;
                  const weight = weightOf(route) / busiest;
                  const stroke =
                    tone === "best"
                      ? "var(--positive)"
                      : tone === "hard"
                        ? "var(--reaction-bad)"
                        : colour;
                  return (
                    <g key={key}>
                      <path
                        d={curvePath(from, to)}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={tone === "muted" ? 0.3 + weight * 1.1 : 0.8 + weight * 0.8}
                        strokeOpacity={tone === "muted" ? 0.3 + weight * 0.45 : 0.95}
                        strokeDasharray={tone === "hard" ? "3 1.5" : undefined}
                        markerEnd={`url(#pm-head-${tone})`}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelected(selected === key ? null : key)}
                      />
                    </g>
                  );
                })}

              {within.map((route) => {
                const centre = zoneCentre(zoneFromKey(route.from));
                return (
                  <text
                    key={`w${route.from}`}
                    x={centre.x - 6.2}
                    y={centre.y - 6}
                    textAnchor="start"
                    fontSize="2.4"
                    fill="var(--text-faint)"
                    stroke="var(--pitch-top)"
                    strokeWidth="0.6"
                    paintOrder="stroke"
                    opacity="0.8"
                  >
                    {volumeOf(route)}
                  </text>
                );
              })}

              {/* Labels last, so a thick grey route can never sit over the one
                number on the map a coach is meant to read. */}
              {[...best, ...hardest]
                .filter((route) => drawn.includes(route))
                .map((route) => {
                  const head = zoneCentre(zoneFromKey(route.to));
                  return (
                    <text
                      key={`l${route.from}>${route.to}`}
                      x={head.x}
                      y={head.y - 3.4}
                      textAnchor="middle"
                      fontSize="2.4"
                      fontWeight="600"
                      fill={best.includes(route) ? "var(--positive)" : "var(--reaction-bad)"}
                      stroke="var(--pitch-top)"
                      strokeWidth="0.9"
                      paintOrder="stroke"
                    >
                      {route.completed}/{volumeOf(route)} · {Math.round(rateOf(route) * 100)}%
                    </text>
                  );
                })}
            </>
          ) : (
            <>
              <line
                x1={PX(FINAL_THIRD_PCT)}
                y1={PY(0)}
                x2={PX(FINAL_THIRD_PCT)}
                y2={PY(100)}
                stroke="var(--cream)"
                strokeOpacity="0.45"
                strokeWidth="0.4"
                strokeDasharray="2 2"
              />
              {entries.map((pass, index) => (
                <Link
                  key={index}
                  to="/match/$matchId/match"
                  params={{ matchId }}
                  search={{ t: passTime(pass.pass) ?? 0 }}
                  aria-label={`Watch pass into the final third at ${fmt(passTime(pass.pass) ?? 0)}`}
                >
                  <line
                    x1={PX(pass.start.x)}
                    y1={PY(pass.start.y)}
                    x2={PX(pass.end.x)}
                    y2={PY(pass.end.y)}
                    stroke={pass.completed === true ? colour : "var(--text-faint)"}
                    strokeWidth={pass.completed === true ? 0.55 : 0.4}
                    strokeOpacity={pass.completed === null ? 0.35 : 0.8}
                    strokeDasharray={pass.completed === true ? undefined : "2 1.4"}
                    markerEnd={pass.completed === true ? "url(#pm-head-muted)" : undefined}
                  />
                </Link>
              ))}
            </>
          )}
        </Pitch>

        {view === "routes" ? (
          <>
            <p className="mt-3 text-[12px] leading-snug text-text-dim">
              <span className="text-positive">Green</span> = best forward lanes (most passes
              arrived) · <span className="text-reaction-bad">Red</span> = forward lanes where most
              passes were lost · <span className="text-text-faint">Grey</span> = other routes
            </p>
            <p className="mt-2 text-[13px] leading-snug text-text-bright">
              {headline
                ? `Best lane: ${routeName(
                    zoneFromKey(headline.from),
                    zoneFromKey(headline.to),
                  )}, ${headline.completed} of ${volumeOf(headline)} passes arrived (${Math.round(
                    rateOf(headline) * 100,
                  )}%).`
                : "Too few forward passes to rank lanes."}
            </p>
            {selectedRoute && (
              <p className="mt-2 border-t border-wire pt-2 text-[12.5px] text-text-dim">
                {routeName(zoneFromKey(selectedRoute.from), zoneFromKey(selectedRoute.to))}
                {" · "}
                {volumeOf(selectedRoute)} passes · {selectedRoute.completed} completed ·{" "}
                {Math.round(rateOf(selectedRoute) * 100)}%
                {selectedRoute.ungraded > 0 &&
                  ` · ${selectedRoute.ungraded} of them ungraded, counted as not arrived`}
              </p>
            )}
          </>
        ) : (
          entries.length === 0 && (
            <p className="mt-3 text-[13px] text-text-dim">
              No pass in this period started outside the final third and ended inside it.
            </p>
          )
        )}

        <p className="mt-3 text-[11.5px] leading-snug text-text-faint">
          Passes are detected automatically from the video and are still being calibrated (Beta).
        </p>
      </Card>
    </OneTeamCard>
  );
}

function Interceptions({ events, team, matchId, colour, file }: Props & { colour: string }) {
  const items = events
    .filter(
      (e) =>
        e.team === team && ["interception", "pass_intercepted", "turnover_won"].includes(e.type),
    )
    .map((event) => ({ event, point: eventPoint(event, file) }))
    .filter((x): x is { event: ReviewedEvent; point: Point } => x.point !== null);
  if (!items.length) return null;
  return (
    <Card
      question="Where did we cut passes out?"
      icon={Scissors}
      caption="Each mark is an interception or pass-led regain."
      honesty={`${items.length} moments`}
    >
      <Pitch>
        {items.map(({ event, point }) => (
          <Link
            key={event.id}
            to="/match/$matchId/match"
            params={{ matchId }}
            search={{ t: event.t }}
            aria-label={`Watch interception at ${fmt(event.t)}`}
          >
            <g transform={`translate(${point.x} ${(point.y / 100) * 64})`}>
              <path d="M-2 -2 2 2M2 -2-2 2" stroke={colour} strokeWidth="1.2" />
              <path d="M2 0h5" stroke="var(--cream)" strokeWidth=".7" />
            </g>
          </Link>
        ))}
      </Pitch>
    </Card>
  );
}

function PassLog({ passes, matchId }: { passes: Pass[]; matchId: string }) {
  if (!passes.length) return null;
  return (
    <Card
      question="Which passes should we review?"
      icon={Scissors}
      caption="A chronological log of player, direction, quality and outcome."
      honesty={`${passes.length} passes in this period`}
    >
      <div className="rule-y">
        {passes.slice(0, 30).map((pass, index) => {
          const t = passTime(pass) ?? 0;
          const from = passPlayer(pass, "from"),
            to = passPlayer(pass, "to");
          const s = passPoint(pass, "start"),
            e = passPoint(pass, "end");
          const direction =
            s && e ? (e.x - s.x > 8 ? "Forward" : e.x - s.x < -8 ? "Back" : "Across") : "Pass";
          return (
            <Link
              key={index}
              to="/match/$matchId/match"
              params={{ matchId }}
              search={{ t }}
              className="grid min-h-11 grid-cols-[44px_1fr_auto] items-center gap-2 py-1.5"
            >
              <span className="num text-[11px] text-text-faint">{fmt(t)}</span>
              <span className="text-[12px]">
                {from ?? "—"} → {to ?? "—"}{" "}
                <small className="ml-1 text-text-faint">{direction}</small>
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase",
                  passCompleted(pass) ? "text-positive" : "text-reaction-bad",
                )}
              >
                {passCompleted(pass) === null
                  ? "Not graded"
                  : passCompleted(pass)
                    ? "Complete"
                    : "Lost"}
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Shape by phase (real positions only) ---------- */
type PhaseKey = "all" | "out" | "in" | "winning" | "losing";
const PHASES: { key: PhaseKey; label: string; needs: null | "possession" | "events" }[] = [
  { key: "out", label: "Out of possession", needs: "possession" },
  { key: "in", label: "In possession", needs: "possession" },
  { key: "winning", label: "Winning it", needs: "events" },
  { key: "losing", label: "Losing it", needs: "events" },
  { key: "all", label: "Whole period", needs: null },
];
const median = (values: number[]) => {
  const v = [...values].sort((a, b) => a - b);
  return v.length
    ? (v[Math.floor((v.length - 1) / 2)]! + v[Math.ceil((v.length - 1) / 2)]!) / 2
    : 0;
};
function hullOf(points: { x: number; y: number }[]) {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (
    o: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: typeof pts = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: typeof pts = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return [...lower, ...upper];
}
function ShapeByPhase({
  file,
  events,
  team,
  colour,
  identity,
  ballGrade,
  range,
}: {
  file: MatchDataFile | undefined;
  events: ReviewedEvent[];
  team: TeamKey;
  colour: string;
  identity: StatsTeamIdentity;
  ballGrade: Props["ballGrade"];
  range: number[];
}) {
  const allowed = (needs: null | "possession" | "events") =>
    needs === null || !ballGrade
      ? true
      : Boolean(needs === "possession" ? ballGrade.possession_ok : ballGrade.events_ok);
  const [phase, setPhase] = useState<PhaseKey>(allowed("possession") ? "out" : "all");
  const active: PhaseKey = allowed(PHASES.find((x) => x.key === phase)?.needs ?? null)
    ? phase
    : "all";
  const opp: TeamKey = team === "A" ? "B" : "A";
  const windows = (type: string) =>
    events.filter((e) => e.team === team && e.type === type).map((e) => [e.t, e.t + 5] as const);
  const winW = windows("turnover_won"),
    loseW = windows("turnover_lost");
  const inWin = (t: number, w: readonly (readonly [number, number])[]) =>
    w.some(([a, b]) => t >= a && t <= b);
  const right = PITCH.attackRight[team];
  const measure = (players: Frame["players"], who: TeamKey) => {
    const ps = players.filter((pl) => pl.team === who && !pl.gk && pl.state !== "stale");
    if (ps.length < 6) return null;
    const rel = ps.map((pl) => (PITCH.attackRight[who] ? pl.m[0] : PITCH.length - pl.m[0]));
    const ys = ps.map((pl) => pl.m[1]);
    return {
      length: Math.max(...rel) - Math.min(...rel),
      width: Math.max(...ys) - Math.min(...ys),
      line: Math.min(...rel),
      n: ps.length,
    };
  };
  const samples: { frame: Frame; m: NonNullable<ReturnType<typeof measure>> }[] = [];
  const oppLengths: number[] = [];
  let lastSecond = -1;
  for (const frame of file?.frames ?? []) {
    if (!inMatch(frame.t, range, file?.periods)) continue;
    const sec = Math.floor(frame.t);
    if (sec === lastSecond) continue;
    lastSecond = sec;
    const ok =
      active === "all"
        ? true
        : active === "in"
          ? frame.possession === team
          : active === "out"
            ? frame.possession === opp
            : active === "winning"
              ? inWin(frame.t, winW)
              : inWin(frame.t, loseW);
    if (!ok) continue;
    const m = measure(frame.players, team);
    if (m) samples.push({ frame, m });
    const o = measure(frame.players, opp);
    if (o) oppLengths.push(o.length);
  }
  const chips = (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Phase of play">
      {PHASES.map((ph) => {
        const ok = allowed(ph.needs);
        return (
          <Button
            key={ph.key}
            variant="ghost"
            onClick={() => ok && setPhase(ph.key)}
            aria-pressed={active === ph.key}
            aria-disabled={!ok}
            title={ok ? undefined : "Needs reliable ball tracking"}
            className={cn(
              "h-11 border px-3 text-[12px]",
              active === ph.key ? "border-cream bg-cream text-ink" : "border-wire text-text",
              !ok && "opacity-40",
            )}
          >
            {ph.label}
          </Button>
        );
      })}
    </div>
  );
  if (samples.length < 5)
    return (
      <Card
        question="How did our shape look?"
        icon={Grid3x3}
        caption={`${PHASES.find((x) => x.key === active)?.label} · ${identity.name}`}
        footer="Evidence threshold not met"
      >
        {chips}
        <p className="mt-3 text-[12.5px] text-text-dim">
          Fewer than five moments in this phase had at least six of our outfield players in view.
        </p>
      </Card>
    );
  const medLen = median(samples.map((x) => x.m.length)),
    medWid = median(samples.map((x) => x.m.width)),
    medLine = median(samples.map((x) => x.m.line));
  const rep = samples.reduce(
    (best, x) => {
      const score =
        Math.abs(x.m.length - medLen) / Math.max(medLen, 1) +
        Math.abs(x.m.width - medWid) / Math.max(medWid, 1) +
        Math.abs(x.m.line - medLine) / Math.max(medLine, 1);
      return score < best.score ? { x, score } : best;
    },
    { x: samples[0]!, score: Infinity },
  ).x;
  const dots = rep.frame.players
    .filter((pl) => pl.team === team && pl.state !== "stale")
    .map((pl) => {
      const q = metresToPct(pl.m, team);
      return q ? { id: pl.id, gk: pl.gk, x: (q.y / 100) * 64, y: 100 - q.x } : null;
    })
    .filter((d): d is { id: number; gk: boolean; x: number; y: number } => d !== null);
  const field = dots.filter((d) => !d.gk);
  const hull = hullOf(field);
  const minX = Math.min(...field.map((d) => d.x)),
    maxX = Math.max(...field.map((d) => d.x)),
    minY = Math.min(...field.map((d) => d.y)),
    maxY = Math.max(...field.map((d) => d.y));
  const cx = field.reduce((a, d) => a + d.x, 0) / field.length,
    cy = field.reduce((a, d) => a + d.y, 0) / field.length;
  const visibleMed = Math.round(median(samples.map((x) => x.m.n)));
  void right;
  return (
    <Card
      question="How did our shape look?"
      icon={Grid3x3}
      caption={`Median over ${samples.length} moments · dots show one representative moment (${fmt(rep.frame.t)})`}
      comparison={{
        target: "—",
        opponent: oppLengths.length ? `${Math.round(median(oppLengths))} m long` : "—",
        last5: "—",
      }}
      honesty={`${samples.length} moments · median ${visibleMed} of 10 outfield in view`}
    >
      {chips}
      <div className="mt-3">
        <StatsPitch
          portrait
          attackLabel={identity.shortCode}
          ariaLabel={`${identity.name} shape, ${PHASES.find((x) => x.key === active)?.label}`}
        >
          {hull.length >= 3 && (
            <polygon
              points={hull.map((d) => `${d.x},${d.y}`).join(" ")}
              fill={colour}
              fillOpacity=".2"
              stroke={colour}
              strokeWidth=".6"
            />
          )}
          <g stroke="var(--cream)" strokeOpacity=".45" strokeWidth=".35">
            <line x1={minX} y1={minY - 3} x2={minX} y2={maxY + 3} />
            <line x1={maxX} y1={minY - 3} x2={maxX} y2={maxY + 3} />
            <line x1={minX - 3} y1={minY} x2={maxX + 3} y2={minY} />
            <line x1={minX - 3} y1={maxY} x2={maxX + 3} y2={maxY} />
          </g>
          {dots.map((d) => (
            <g key={d.id}>
              <circle
                cx={d.x}
                cy={d.y}
                r="2.6"
                fill={colour}
                stroke={d.gk ? "var(--cream)" : "none"}
                strokeWidth=".5"
              />
              <text x={d.x} y={d.y + 5} textAnchor="middle" fontSize="2.6" fill="var(--cream)">
                P{d.id}
              </text>
            </g>
          ))}
          <path d={`M${cx - 2},${cy}h4M${cx},${cy - 2}v4`} stroke="var(--cream)" strokeWidth=".7" />
        </StatsPitch>
      </div>
      <div className="mt-3 grid grid-cols-3 rule-x border border-wire">
        <Metric value={`${medLen.toFixed(1)} m`} label="Length" />
        <Metric value={`${medWid.toFixed(1)} m`} label="Width" />
        <Metric value={`${Math.round(medLine)} m`} label="Line height" />
      </div>
    </Card>
  );
}

/* ---------- Shape vs outcome as a table ---------- */
function ShapeOutcomeTable({ lineDefending }: { lineDefending: LineDefending }) {
  const tl = lineDefending.timeline;
  if (!lineDefending.states.length || tl.length < 2) return null;
  const dt =
    median(
      tl
        .slice(1)
        .map((p, i) => p.t - (tl[i]?.t ?? p.t))
        .filter((d) => d > 0),
    ) || 1;
  const stateOf = (h: number) => (h < 30 ? "low" : h <= 38 ? "mid" : "high");
  const rows = lineDefending.states
    .map((s) => ({ ...s, min: (tl.filter((p) => stateOf(p.height) === s.key).length * dt) / 60 }))
    .filter((r) => r.min > 0)
    .sort((a, b) => b.height - a.height);
  const rate = (r: { shots: number; min: number }) => r.shots / r.min;
  const highest = [...rows].sort((a, b) => rate(b) - rate(a))[0];
  const mostTime = [...rows].sort((a, b) => b.min - a.min)[0];
  const maxMin = Math.max(...rows.map((r) => r.min), 1);
  const small = (r: { shots: number; min: number }) => r.min < 8 || r.shots < 3;
  const name = (key: string) => `${key.charAt(0).toUpperCase()}${key.slice(1)} line`;
  const time = (min: number) => (min < 1 ? `${Math.round(min * 60)} s` : `${Math.round(min)} min`);

  return (
    <Card
      question="How high did we defend, and what did it cost?"
      icon={Shield}
      caption="Defensive height · time spent · shots conceded per minute."
      honesty={`${lineDefending.shotConfirmed} confirmed · ${lineDefending.shots.length} detected shots · ${tl.length} line samples`}
    >
      <div
        className="defensive-height-map"
        role="img"
        aria-label="Defensive heights on a vertical 0 to 100 metre pitch axis, with time spent and shots conceded"
      >
        <div className="defensive-height-goal text-text-faint">Opponent goal ↑</div>
        <div className="defensive-height-axis text-text-faint" aria-hidden="true">
          {[100, 80, 60, 40, 20, 0].map((m) => (
            <span key={m} style={{ top: `${100 - m}%` }}>
              {m} m
            </span>
          ))}
        </div>
        <div className="defensive-height-field">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="defensive-height-pitch"
          >
            <g fill="none" stroke="var(--pitch-chalk)" strokeWidth=".35" opacity=".25">
              <rect x="1" y="1" width="98" height="98" />
              <rect x="44" y="0" width="12" height="1" />
              <rect x="44" y="99" width="12" height="1" />
              <rect x="22" y="1" width="56" height="16" />
              <rect x="22" y="83" width="56" height="16" />
              <line x1="1" y1="50" x2="99" y2="50" />
              <ellipse cx="50" cy="50" rx="12" ry="8" />
              <path d="M1 33.33H99M1 66.67H99" strokeDasharray="1 2" />
            </g>
          </svg>
          {rows.map((r) => {
            const peak = highest?.key === r.key && r.shots > 0;
            return (
              <div
                key={r.key}
                className="defensive-height-zone"
                style={{ top: `${100 - Math.min(90, Math.max(10, r.height))}%` }}
              >
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <span className="display text-[12px] uppercase text-text-dim">
                      {name(r.key)}
                    </span>
                    <div className="display-i text-[34px] leading-none text-cream">
                      {Math.round(r.height)}
                      <span className="ml-1 text-[16px]">m</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        "num-flat text-[22px] leading-none",
                        peak ? "text-reaction-warn" : "text-cream",
                      )}
                    >
                      {rate(r).toFixed(3)}
                    </div>
                    <div className="text-[10px] text-text-faint">shots / min</div>
                  </div>
                </div>
                <div className="relative mt-2 h-1 bg-surface-2">
                  <span
                    className="absolute inset-y-0 left-0 bg-cream/40"
                    style={{ width: `${(r.min / maxMin) * 100}%` }}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap justify-between gap-x-2 text-[11.5px] text-text-dim">
                  <span>{time(r.min)}</span>
                  <span>
                    {r.shots} {r.shots === 1 ? "shot" : "shots"} · {r.goals}{" "}
                    {r.goals === 1 ? "goal" : "goals"}
                  </span>
                </div>
                {peak && (
                  <div className="mt-1 text-[10px] uppercase text-reaction-warn">
                    Highest rate{small(r) ? " · Small sample" : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="defensive-height-home text-text-faint">Our goal</div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-faint">
        <span className="h-1 w-6 bg-cream/40" aria-hidden="true" /> Width = time spent
      </div>
      {mostTime && (
        <div className="mt-4 border-t border-wire pt-3">
          <p className="display text-[18px] uppercase leading-snug text-cream">
            Most time: {name(mostTime.key)} · {time(mostTime.min)}
          </p>
          <p className="mt-1 text-[12px] text-text-dim">
            {mostTime.shots} shots · {mostTime.goals} goals conceded there.
          </p>
          {highest && highest.shots > 0 && (
            <p className="mt-2 text-[12px] text-text-dim">
              Highest shot rate: {name(highest.key)} · {rate(highest).toFixed(3)}/min
              {small(highest)
                ? ` · only ${time(highest.min)}, ${highest.shots} ${highest.shots === 1 ? "shot" : "shots"}.`
                : "."}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

/* ---------- Lanes: table first, map on demand ---------- */
function LanesTable({
  passes,
  colour,
  identity,
}: {
  passes: Pass[];
  colour: string;
  identity: StatsTeamIdentity;
}) {
  const [minN, setMinN] = useState(3);
  const [showMap, setShowMap] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const map = new Map<
    string,
    {
      key: string;
      from: number;
      to: number;
      total: number;
      complete: number;
      prog: number;
      start: Point | null;
      end: Point | null;
      ns: number;
    }
  >();
  for (const pass of passes) {
    const from = passPlayer(pass, "from"),
      to = passPlayer(pass, "to");
    if (from === null || to === null) continue;
    const key = `${from}-${to}`;
    const item = map.get(key) ?? {
      key,
      from,
      to,
      total: 0,
      complete: 0,
      prog: 0,
      start: null,
      end: null,
      ns: 0,
    };
    const judged = passCompleted(pass);
    if (judged !== null) {
      item.total += 1;
      if (judged) item.complete += 1;
    }
    const gain = finite(pass["gain_m"]);
    if (gain !== null && gain > 0) item.prog += gain;
    const a = passPoint(pass, "start"),
      b = passPoint(pass, "end");
    if (a && b) {
      item.start = { x: (item.start?.x ?? 0) + a.x, y: (item.start?.y ?? 0) + a.y };
      item.end = { x: (item.end?.x ?? 0) + b.x, y: (item.end?.y ?? 0) + b.y };
      item.ns += 1;
    }
    map.set(key, item);
  }
  const lanes = [...map.values()]
    .filter((l) => l.total >= minN)
    .map((l) => ({
      ...l,
      start: l.start && l.ns ? { x: l.start.x / l.ns, y: l.start.y / l.ns } : null,
      end: l.end && l.ns ? { x: l.end.x / l.ns, y: l.end.y / l.ns } : null,
    }));
  const ratio = (l: { complete: number; total: number }) => l.complete / l.total;
  const best = [...lanes]
    .sort((a, b) => ratio(b) - ratio(a) || b.prog - a.prog || b.total - a.total)
    .slice(0, 3);
  const worst = [...lanes]
    .filter((l) => !best.includes(l))
    .sort((a, b) => ratio(a) - ratio(b) || b.total - a.total)
    .slice(0, 3);
  const who = (id: number) => `P${id}`;
  const row = (l: (typeof lanes)[number], kind: "best" | "worst") => (
    <button
      type="button"
      key={l.key}
      onClick={() => {
        setSel(l.key === sel ? null : l.key);
        setShowMap(true);
      }}
      aria-pressed={sel === l.key}
      className={cn(
        "grid min-h-11 w-full grid-cols-[28px_1fr_auto] items-center gap-3 px-2 text-left",
        sel === l.key ? "border-l-2 border-cream bg-surface-2" : "border-l-2 border-transparent",
      )}
    >
      <svg viewBox="0 0 24 10" className="h-3 w-6" aria-hidden="true">
        <path
          d="M1 5h18M15 1l5 4-5 4"
          fill="none"
          stroke={kind === "best" ? colour : "var(--reaction-bad)"}
          strokeOpacity={kind === "best" ? 1 : 0.6}
          strokeWidth="1.8"
        />
      </svg>
      <span className="display text-[14px] text-cream">
        {who(l.from)} → {who(l.to)}
      </span>
      <span className="text-right">
        <strong
          className={cn(
            "display block text-[14px]",
            kind === "best" ? "text-reaction-good" : "text-reaction-bad",
          )}
        >
          {l.complete}/{l.total}
        </strong>
        <small className="block text-[11px] text-text-faint">
          +{Math.round(l.prog)} m progressive · <span title="Needs reliable ball tracking">—</span>{" "}
          shots against
        </small>
      </span>
    </button>
  );
  const drawn = [
    ...best.map((l, i) => ({ l, stroke: colour, op: [1, 0.7, 0.5][i] ?? 0.5 })),
    ...worst.map((l, i) => ({ l, stroke: "var(--reaction-bad)", op: [0.8, 0.6, 0.4][i] ?? 0.4 })),
  ];
  return (
    <Card
      question="Which lanes worked?"
      icon={RouteIcon}
      caption="Volume, completion and progression between players."
      comparison={{ target: "—", opponent: "—", last5: "—" }}
      honesty={`${passes.length} passes · players labelled by tracker id until a lineup is set`}
    >
      <label className="flex min-h-11 items-center gap-3 text-[12px] text-text">
        <span className="shrink-0">
          Min passes · <strong className="num text-cream">{minN}</strong>
        </span>
        <input
          type="range"
          min={1}
          max={15}
          value={minN}
          onChange={(e) => setMinN(Number(e.target.value))}
          className="w-full accent-[var(--cream)]"
          aria-label="Minimum passes between players"
        />
      </label>
      <button
        type="button"
        onClick={() => setShowMap((v) => !v)}
        className="mt-1 min-h-11 text-[12px] font-semibold text-cream"
      >
        {showMap ? "Hide map" : "Show map →"}
      </button>
      {showMap && (
        <div className="mt-2">
          <StatsPitch
            portrait
            attackLabel={identity.shortCode}
            ariaLabel={`${identity.name} best and worst passing lanes`}
          >
            {drawn.map(({ l, stroke, op }) =>
              l.start && l.end ? (
                <g key={l.key} opacity={sel && sel !== l.key ? 0.2 : op}>
                  <line
                    x1={(l.start.y / 100) * 64}
                    y1={100 - l.start.x}
                    x2={(l.end.y / 100) * 64}
                    y2={100 - l.end.x}
                    stroke={stroke}
                    strokeWidth="1.6"
                  />
                  <circle cx={(l.end.y / 100) * 64} cy={100 - l.end.x} r="1.6" fill={stroke} />
                </g>
              ) : null,
            )}
          </StatsPitch>
        </div>
      )}
      {lanes.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-text-dim">
          No lane has at least {minN} passes in this period.
        </p>
      ) : (
        <>
          <h3 className="section-kicker mt-3">Best lanes</h3>
          <div className="mt-1 rule-y">{best.map((l) => row(l, "best"))}</div>
          {worst.length > 0 && (
            <>
              <h3 className="section-kicker mt-3 border-t border-wire pt-3">Worst lanes</h3>
              <div className="mt-1 rule-y">{worst.map((l) => row(l, "worst"))}</div>
            </>
          )}
        </>
      )}
    </Card>
  );
}

/**
 * Said in place of a figure we are not standing behind yet.
 *
 * Better than a confident number nobody has checked, and better than an empty
 * tab that looks broken.
 */
export function NotVerifiedYet({ what }: { what: string }) {
  return (
    <div className="border border-wire bg-surface p-5">
      <p className="text-[13.5px] leading-relaxed text-text-dim">{what}</p>
    </div>
  );
}

export function StatsVisuals(props: Props) {
  setPitchContext(props.file);
  const range = periodRange(props.file, props.period);
  const periods = props.file?.periods;
  const frames = (props.file?.frames ?? []).filter((frame) => inMatch(frame.t, range, periods));
  const events = props.events.filter((event) => inMatch(event.t, range, periods));
  const passes = passSet(props.stats, props.team, range, props.file?.periods);
  const p = { ...props, events };
  const colour = props.colours[props.team];
  const identity = props.team === "A" ? props.teamA : props.teamB;
  const other = props.team === "A" ? props.teamB : props.teamA;
  const opponentPasses = passSet(
    props.stats,
    props.team === "A" ? "B" : "A",
    range,
    props.file?.periods,
  ).length;
  let cards: React.ReactNode[] = [];
  if (props.tab === "ball")
    cards = [
      <Control key="control" {...p} />,
      <Thirds key="thirds" frames={frames} team={props.team} colour={colour} />,
      <HeatMap key="heat" frames={frames} team={props.team} colour={colour} file={props.file} />,
      <SequenceLength key="sequence" {...p} />,
      <Runs key="runs" frames={frames} team={props.team} colour={colour} />,
      <Distance
        key="distance"
        players={props.players.filter((x) => x.team === props.team)}
        colour={colour}
      />,
    ];
  if (props.tab === "pressing")
    cards = [
      <PressureMap
        key="pressure"
        frames={frames}
        team={props.team}
        colours={props.colours}
        file={props.file}
        teamA={props.teamA}
        teamB={props.teamB}
      />,
      <PressMap key="press" {...p} colour={colour} />,
      <CounterPress key="counter" {...p} />,
      props.lineDefending && props.lineDefending.lineBreakCount !== 0 ? (
        <LineBreakHero key="breaks" data={props.lineDefending} matchId={props.matchId} />
      ) : null,
    ];
  if (props.tab === "shape") {
    const line = props.lineDefending;
    cards = [
      line && line.medianM !== null && line.usualM !== null ? (
        <DeepAnswer key="depth" data={line} />
      ) : (
        <EvidenceUnavailable
          key="depth-empty"
          question="Did we defend too deep?"
          icon={Ruler}
          caption="Our defensive line compared with its usual height."
        />
      ),
      <ShapeByPhase
        key="multiples"
        file={props.file}
        events={props.events}
        team={props.team}
        colour={colour}
        identity={identity}
        ballGrade={props.ballGrade ?? null}
        range={range}
      />,
      <BlockSpacing
        key="blocks"
        blocks={buildBlocks({
          file: props.file,
          team: props.team,
          ceilingM: props.thresholds.blockCeilingM,
          events: props.events,
        })}
        ceilingM={props.thresholds.blockCeilingM}
        matchId={props.matchId}
        teamName={(props.team === "A" ? props.teamA : props.teamB).name}
      />,
      line ? (
        <ShapeOutcomeTable key="outcome" lineDefending={line} />
      ) : (
        <EvidenceUnavailable
          key="outcome-empty"
          question="In which shape did we suffer?"
          icon={Shield}
          caption="Defensive states compared with opponent outcomes."
        />
      ),
      line && line.timeline.length ? (
        <LineTimeline key="timeline" data={line} matchId={props.matchId} />
      ) : (
        <EvidenceUnavailable
          key="timeline-empty"
          question="Where was our line over time?"
          icon={TrendingUp}
          caption="Defensive line height across the selected period."
        />
      ),
    ];
  }
  if (props.tab === "shooting")
    cards = [
      <ShotMap key="map" {...p} />,
      <ShotSummary key="summary" {...p} />,
      <EntriesConceded key="entries" {...p} />,
    ];
  if (props.tab === "players") cards = [<PlayerCards key="players" {...p} />];
  if (props.tab === "setpieces")
    cards = [
      <SetPieceCounts key="counts" {...p} />,
      <SetPieceMap key="map" {...p} colour={colour} />,
    ];
  if (props.tab === "passes")
    cards = [
      <LanesTable key="lanes" passes={passes} colour={colour} identity={identity} />,
      <IndividualPassMap
        key={`individual-${props.team}-${props.period}`}
        passes={passes}
        colour={colour}
        identity={identity}
        opponentPasses={opponentPasses}
      />,
      <BetterOption key="better" {...p} colour={colour} />,
      <PassNetwork
        key="network"
        passes={passes}
        colour={colour}
        identity={identity}
        opponentPasses={opponentPasses}
      />,
      <PassMap
        key="map"
        passes={passes}
        colour={colour}
        matchId={props.matchId}
        withoutTime={passesWithoutTime(props.stats, props.team)}
      />,
      <Interceptions key="interceptions" {...p} colour={colour} />,
      <PassLog key="log" passes={passes} matchId={props.matchId} />,
    ];
  const shown = cards.filter(Boolean);
  return (
    <FramesLoading.Provider value={Boolean(props.framesLoading)}>
      <StatsCardContext.Provider value={{ identity, other, both: props.scopeBoth }}>
        {shown.length ? (
          <div className="gap-4 min-[1100px]:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {shown}
          </div>
        ) : (
          <EmptyTab />
        )}
      </StatsCardContext.Provider>
    </FramesLoading.Provider>
  );
}
