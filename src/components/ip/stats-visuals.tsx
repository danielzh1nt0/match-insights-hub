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
import { createContext, useContext, useState } from "react";
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
  insidePeriods,
  passCompleted,
  periodWindow,
  shotsOf as contractShots,
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
const inRange = (time: number | null, range: number[]) =>
  time === null || (time >= (range[0] ?? 0) && time <= (range[1] ?? Infinity));
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
}: {
  children?: React.ReactNode;
  portrait?: boolean;
  attackLabel: string;
  ariaLabel: string;
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
          <g stroke="var(--cream)" fill="none">
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
          <g stroke="var(--cream)" fill="none">
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

function EvidenceUnavailable({
  question,
  caption,
  icon,
}: {
  question: string;
  caption: string;
  icon?: LucideIcon;
}) {
  return (
    <Card
      question={question}
      caption={caption}
      footer="Evidence threshold not met"
      {...(icon ? { icon } : {})}
    >
      <div className="flex min-h-28 items-center border-l-2 border-text-faint bg-surface-2 px-4">
        <p className="max-w-[460px] text-[12.5px] leading-relaxed text-text-dim">
          This match does not contain enough reliable evidence to answer this coaching question.
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
      question="Who covered the ground?"
      icon={Footprints}
      caption="Sorted by distance per visible minute. Bright segment marks the top-intensity share."
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
  const press = events
    .filter(
      (event) =>
        event.team === team &&
        ["pressure", "press", "turnover_won", "high_turnover"].includes(event.type),
    )
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
        <Metric
          value={`${Math.round(value(row, "pressed_within_2s_pct") ?? 0)}%`}
          label="within 2 s"
        />
        <Metric
          value={`${Math.round(value(row, "regained_within_5s_pct") ?? 0)}%`}
          label="back in 5 s"
        />
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
        onTarget: event.type === "goal" || event.payload?.["on_target"] === true,
      };
    });
  // A shot with no position cannot be drawn on a pitch. It used to be planted
  // at a default spot, which made a metres-based export look like a team that
  // shot from one place all match.
  // Positions are stored with A attacking towards the far goal and B towards
  // the near one, already the right way round for both halves. Drawn as they
  // are stored, each side's shots cluster at the goal it was attacking — so
  // nothing here mirrors anything.
  const all = (metricShots.length ? metricShots : eventShots).filter(
    (shot) => shot.x !== null && shot.y !== null && insidePeriods(shot.t, file?.periods),
  );
  const shots = scopeBoth ? all : all.filter((shot) => shot.team === team);
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
      caption="Filled means on target. A cream ring marks a goal. Each side shoots towards the goal it was attacking."
      honesty={`${shots.length} ${shots.length === 1 ? "shot" : "shots"}${
        scopeBoth ? "" : ` · ${(team === "A" ? teamA : teamB).shortCode}`
      }`}
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
      <Pitch>
        {shots.map((shot, index) => {
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
              <circle
                cx={clamp(x)}
                cy={(clamp(y) / 100) * 64}
                r={goal ? 2.8 : 2.2}
                fill={on ? colours[shotTeam] : "var(--surface-2)"}
                stroke={goal ? "var(--cream)" : colours[shotTeam]}
                strokeWidth={goal ? 1.2 : 0.8}
              />
            </Link>
          );
        })}
      </Pitch>
    </Card>
  );
}

function ShotSummary({ stats, team, events }: Props) {
  const metricShots = contractShots(stats, team);
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
          onTarget: event.type === "goal" || event.payload?.["on_target"] === true,
        }));
  if (!shots.length)
    return (
      <EvidenceUnavailable
        question="What did our shooting produce?"
        icon={Zap}
        caption="Shot volume, accuracy and penalty-area share."
      />
    );
  const on = shots.filter((shot) => shot.onTarget).length;
  const goals = shots.filter((shot) => shot.goal).length;
  // Only shots we can place can be said to be inside the box.
  const placed = shots.filter((shot) => shot.x !== null);
  const box = placed.filter((shot) => shot.x! < 18 || shot.x! > 82).length;
  return (
    <Card
      question="What did our shooting produce?"
      icon={Zap}
      caption="The shot total, accuracy and penalty-area share without a score dial."
      honesty={`${shots.length} shot moments`}
    >
      <div className="grid grid-cols-3 rule-x border border-wire">
        <Metric value={`${shots.length}`} label="shots" />
        <Metric value={`${on}`} label="on target" />
        <Metric value={`${goals}`} label="goals" />
      </div>
      <p className="mt-3 text-[12px] text-text-dim">
        {box} of {shots.length} attempts came from inside the penalty area.
      </p>
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

function passSet(stats: StatsFile | undefined, team: TeamKey, range: number[]) {
  return (stats?.passes ?? []).filter(
    (pass: any) => passTeam(pass) === team && inRange(passTime(pass), range),
  ) as Pass[];
}
type PairCount = {
  from: number;
  to: number;
  total: number;
  complete: number;
  gain: number;
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
      item = map.get(key) ?? { from, to, total: 0, complete: 0, gain: 0, start: null, end: null };
    // A pass the file never judged belongs in neither column: counting it as
    // complete flattered every lane in the table.
    const completed = passCompleted(pass);
    if (completed !== null) {
      item.total += 1;
      if (completed) item.complete += 1;
    }
    if (start && end) {
      item.gain += end.x - start.x;
      item.start = { x: (item.start?.x ?? 0) + start.x, y: (item.start?.y ?? 0) + start.y };
      item.end = { x: (item.end?.x ?? 0) + end.x, y: (item.end?.y ?? 0) + end.y };
    }
    map.set(key, item);
  });
  return [...map.values()]
    .map((item) => ({
      ...item,
      start: item.start ? { x: item.start.x / item.total, y: item.start.y / item.total } : null,
      end: item.end ? { x: item.end.x / item.total, y: item.end.y / item.total } : null,
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

function PassMap({ passes, matchId, colour }: { passes: Pass[]; matchId: string; colour: string }) {
  const all = passes
    .map((pass) => ({ pass, start: passPoint(pass, "start"), end: passPoint(pass, "end") }))
    .filter(
      (x): x is { pass: Pass; start: Point; end: Point } => x.start !== null && x.end !== null,
    );
  const mapped = all.slice(0, 5);
  if (!mapped.length)
    return (
      <EvidenceUnavailable
        question="Where did our passes go?"
        icon={RouteIcon}
        caption="Release and reception locations for reliable passes."
      />
    );
  return (
    <Card
      question="Where did our passes go?"
      icon={RouteIcon}
      caption="The first five located passes; open the log for the full sequence."
      honesty={`${all.length} located passes`}
    >
      <Pitch>
        {mapped.map(({ pass, start, end }, index) => {
          const t = passTime(pass) ?? 0;
          return (
            <Link
              key={index}
              to="/match/$matchId/match"
              params={{ matchId }}
              search={{ t }}
              aria-label={`Watch pass at ${fmt(t)}`}
            >
              <line
                x1={start.x}
                y1={(start.y / 100) * 64}
                x2={end.x}
                y2={(end.y / 100) * 64}
                stroke={passCompleted(pass) ? colour : "var(--text-faint)"}
                strokeWidth=".65"
                strokeDasharray={passCompleted(pass) ? undefined : "2 1"}
                opacity=".55"
              />
            </Link>
          );
        })}
      </Pitch>
    </Card>
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
                {passCompleted(pass) ? "Complete" : "Lost"}
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
    if (!inRange(frame.t, range)) continue;
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
  const minutes = (key: string) => (tl.filter((p) => stateOf(p.height) === key).length * dt) / 60;
  const rows = lineDefending.states
    .map((s) => ({ ...s, min: minutes(s.key) }))
    .filter((r) => r.min > 0);

  /**
   * How much of a spell it takes before a rate means anything.
   *
   * One shot in seven minutes reads as the worst rate in the match and is
   * nothing of the sort — it is one shot. Without a floor the badge lands on
   * whichever state the team barely used, and the sentence underneath then
   * contradicts the goals column sitting next to it.
   */
  const ENOUGH_MIN = 8;
  const ENOUGH_SHOTS = 3;
  const rate = (r: { shots: number; min: number }) => r.shots / Math.max(r.min, 0.1);
  const judged = rows.filter((r) => r.min >= ENOUGH_MIN && r.shots >= ENOUGH_SHOTS);
  const worst = [...judged].sort((a, b) => rate(b) - rate(a))[0];
  const mostShots = [...rows].sort((a, b) => b.shots - a.shots || b.goals - a.goals)[0];
  const name = (k: string) => (k === "high" ? "High line" : k === "mid" ? "Mid line" : "Low line");

  const maxMin = Math.max(...rows.map((r) => r.min), 1);
  // Positioned against the real pitch, because the drawing carries real
  // markings: a line placed on a made-up scale would sit in the wrong place
  // relative to the box and the halfway line underneath it.
  const pitchLength = PITCH.length;

  return (
    <Card
      question="How high was our last line, and what did it cost?"
      icon={Shield}
      caption="Each band is the height we defended at. Thickness is time spent there."
      honesty={`${lineDefending.shots.length} shots conceded · ${tl.length} line samples`}
    >
      {/* Our goal is on the left, so a band further right is a higher line.
          The picture is the point — the figures sit beside it, not instead. */}
      <StatsPitch attackLabel="" ariaLabel="Defensive line height, our goal on the left">
        {rows.map((r) => {
          const x = 3 + (r.height / pitchLength) * 94;
          const thickness = 1 + (r.min / maxMin) * 5;
          const alarm = worst?.key === r.key;
          return (
            <g key={r.key}>
              <rect
                x={x - thickness / 2}
                y={1.5}
                width={thickness}
                height={60.9}
                fill={alarm ? "var(--reaction-bad)" : "var(--cream)"}
                fillOpacity={alarm ? 0.5 : 0.22}
              />
              <rect
                x={x - 0.25}
                y={1.5}
                width={0.5}
                height={60.9}
                fill={alarm ? "var(--reaction-bad)" : "var(--cream)"}
              />
              {/* One mark per shot conceded while we sat at this height. */}
              {Array.from({ length: Math.min(r.shots, 12) }, (_, i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={6 + i * 4.4}
                  r={i < r.goals ? 1.7 : 1.2}
                  fill={i < r.goals ? "var(--reaction-bad)" : "var(--surface)"}
                  stroke={i < r.goals ? "var(--cream)" : "var(--text-dim)"}
                  strokeWidth={0.4}
                />
              ))}
            </g>
          );
        })}
      </StatsPitch>

      <ul className="rule-y mt-3 border-t border-wire">
        {rows.map((r) => (
          <li
            key={r.key}
            className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2"
          >
            <span className="flex items-center gap-2 text-[13px] text-text">
              {worst?.key === r.key && (
                <span className="h-1.5 w-1.5 shrink-0 bg-reaction-bad" aria-hidden="true" />
              )}
              {name(r.key)}
              <span className="num text-text-faint">{Math.round(r.height)} m</span>
            </span>
            <span className="num-flat text-[12px] text-text-dim">
              {r.min < 1 ? `${Math.round(r.min * 60)} s` : `${Math.round(r.min)} min`} · {r.shots}{" "}
              {r.shots === 1 ? "shot" : "shots"}
              {r.goals > 0 ? ` · ${r.goals} ${r.goals === 1 ? "goal" : "goals"}` : ""}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[12px] leading-relaxed text-text-dim">
        {worst
          ? `Per minute spent there, we gave up most while defending in a ${name(worst.key).toLowerCase()} (${Math.round(worst.height)} m).`
          : mostShots && mostShots.shots > 0
            ? `Most of what we conceded came while defending in a ${name(mostShots.key).toLowerCase()} (${Math.round(mostShots.height)} m) — ${mostShots.shots} of ${lineDefending.shots.length} shots. No line state was used long enough to compare rates fairly.`
            : "No shots conceded in any line state in this period."}
      </p>
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
    item.total += 1;
    if (passCompleted(pass)) item.complete += 1;
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
  const frames = (props.file?.frames ?? []).filter((frame) => inRange(frame.t, range));
  const events = props.events.filter((event) => inRange(event.t, range));
  const passes = passSet(props.stats, props.team, range);
  const p = { ...props, events };
  const colour = props.colours[props.team];
  const identity = props.team === "A" ? props.teamA : props.teamB;
  const other = props.team === "A" ? props.teamB : props.teamA;
  const opponentPasses = passSet(props.stats, props.team === "A" ? "B" : "A", range).length;
  let cards: React.ReactNode[] = [];
  if (props.tab === "ball")
    cards = [
      <Control key="control" {...p} />,
      <Thirds key="thirds" frames={frames} team={props.team} colour={colour} />,
      <HeatMap key="heat" frames={frames} team={props.team} colour={colour} file={props.file} />,
      <SequenceLength key="sequence" {...p} />,
      <Runs key="runs" frames={frames} team={props.team} colour={colour} />,
      // Distance covered only counts a player while the camera can see him,
      // so the figure is far below the truth. Out until it is whole.
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
      <BetterOption key="better" {...p} colour={colour} />,
      <PassNetwork
        key="network"
        passes={passes}
        colour={colour}
        identity={identity}
        opponentPasses={opponentPasses}
      />,
      // The pass map and the located-pass count are roughly 30% short of the
      // real passes, so neither is shown.
      <Interceptions key="interceptions" {...p} colour={colour} />,
    ];
  const shown = cards.filter(Boolean);
  return (
    <StatsCardContext.Provider value={{ identity, other, both: props.scopeBoth }}>
      {shown.length ? (
        <div className="gap-4 min-[1100px]:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {shown}
        </div>
      ) : (
        <EmptyTab />
      )}
    </StatsCardContext.Provider>
  );
}
