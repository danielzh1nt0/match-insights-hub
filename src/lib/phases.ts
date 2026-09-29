import type { ReviewedEvent } from "@/lib/event-reviews";
import type { StatsFile, TeamKey, Thresholds } from "@/lib/match-analysis";
import { teamRow } from "@/lib/match-analysis";
import type { Frame } from "@/lib/match-source";

/**
 * The four moments of the game, built from the match file.
 *
 * Every figure here is read from the stats the pipeline wrote or counted off
 * the events. Where the file cannot support a number, the phase says so
 * rather than carrying an invented one — a phase with no evidence is a
 * truthful answer.
 */

export type PhaseKey = "attack" | "lose" | "defend" | "win";

export type PhaseNumber = {
  label: string;
  /** What good looks like, in words. Null when the team has set no target. */
  target: string | null;
  value: string | null;
  status: "on" | "off" | "unknown";
};

export type PhaseMoment = { t: number; title: string; why: string };

export type PhaseSeries = {
  label: string;
  points: { t: number; value: number }[];
  target: number | null;
  /** True when a smaller number is the better one. */
  lowerIsBetter: boolean;
};

export type Phase = {
  key: PhaseKey;
  name: string;
  /** The one figure on the picker button. */
  headline: { value: string | null; label: string };
  status: "on" | "off" | "unknown";
  numbers: PhaseNumber[];
  series: PhaseSeries | null;
  best: PhaseMoment | null;
  worst: PhaseMoment | null;
  /** Which frames show this phase, for the average shape. */
  wantsBall: boolean;
  /** The events that belong to this phase, for the zone map. */
  eventTypes: string[];
};

const finite = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const round = (value: number, places = 0) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

function statusOf(
  value: number | null,
  target: number | null,
  lowerIsBetter: boolean,
): "on" | "off" | "unknown" {
  if (value === null || target === null) return "unknown";
  return (lowerIsBetter ? value <= target : value >= target) ? "on" : "off";
}

function number(
  label: string,
  value: number | null,
  suffix: string,
  target: number | null,
  targetWord: string | null,
  lowerIsBetter: boolean,
  places = 0,
): PhaseNumber {
  return {
    label,
    target: targetWord,
    value: value === null ? null : `${round(value, places)}${suffix}`,
    status: statusOf(value, target, lowerIsBetter),
  };
}

/** The seconds to first pressure the pipeline recorded for a loss, if any. */
function pressSeconds(event: ReviewedEvent) {
  return finite(event.payload?.["time_to_press"]);
}

function clock(t: number) {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
}

/** The shape samples the pipeline wrote for this team, if it wrote any. */
function shapeTimeline(stats: StatsFile | undefined, team: TeamKey) {
  const raw = ((stats?.metrics?.["shape_timeline"] as Record<string, unknown[]> | undefined)?.[
    team
  ] ?? []) as Record<string, unknown>[];
  return raw.flatMap((sample) => {
    const t = finite(sample["t"]);
    const length = finite(sample["length"]);
    const width = finite(sample["width"]);
    return t === null ? [] : [{ t, length, width }];
  });
}

export function buildPhases({
  stats,
  events,
  team,
  thresholds,
}: {
  stats: StatsFile | undefined;
  events: ReviewedEvent[];
  team: TeamKey;
  thresholds: Thresholds;
}): Phase[] {
  const row = teamRow(stats, team) as Record<string, unknown> | null;
  const value = (key: string) => finite(row?.[key]);
  const mine = events.filter((event) => event.team === team);
  const shape = shapeTimeline(stats, team);

  const losses = mine.filter((event) => event.type === "turnover_lost");
  const pressed = losses
    .map((event) => ({ event, seconds: pressSeconds(event) }))
    .filter((item): item is { event: ReviewedEvent; seconds: number } => item.seconds !== null)
    .sort((a, b) => a.seconds - b.seconds);

  const attack: Phase = {
    key: "attack",
    name: "In possession",
    headline: {
      value:
        value("block_width_median_m") === null
          ? null
          : `${round(value("block_width_median_m")!)} m`,
      label: "width when we have it",
    },
    status: "unknown",
    numbers: [
      number("Passes that found a team-mate", value("pass_completion_pct"), "%", null, null, false),
      number(
        "Forward share of our passes",
        value("forward_pass_share_pct"),
        "%",
        null,
        null,
        false,
      ),
      number("Width side to side", value("block_width_median_m"), " m", null, null, false),
    ],
    series: shape.some((s) => s.width !== null)
      ? {
          label: "Width side to side (m)",
          points: shape.flatMap((s) => (s.width === null ? [] : [{ t: s.t, value: s.width }])),
          target: null,
          lowerIsBetter: false,
        }
      : null,
    best: null,
    worst: null,
    wantsBall: true,
    eventTypes: ["shot", "goal", "better_option", "sequence_end"],
  };
  const firstBetter = mine.find((event) => event.type === "better_option");
  const firstShot =
    mine.find((event) => event.type === "goal") ?? mine.find((event) => event.type === "shot");
  if (firstShot)
    attack.best = {
      t: firstShot.t,
      title: firstShot.type === "goal" ? "Our goal" : "Our best chance",
      why: `${clock(firstShot.t)} · ${firstShot.subtitle || firstShot.title}`,
    };
  if (firstBetter)
    attack.worst = {
      t: firstBetter.t,
      title: "A better pass was open",
      why: `${clock(firstBetter.t)} · ${firstBetter.subtitle || firstBetter.title}`,
    };

  const pressPct = value("pressed_within_2s_pct");
  const lose: Phase = {
    key: "lose",
    name: "Losing it",
    headline: {
      value: pressPct === null ? null : `${round(pressPct)}%`,
      label: "pressed within 2 s",
    },
    status: statusOf(pressPct, thresholds.pressWithin2s, false),
    numbers: [
      number(
        "Pressed within 2 seconds",
        pressPct,
        "%",
        thresholds.pressWithin2s,
        `Target ${thresholds.pressWithin2s}%`,
        false,
      ),
      number(
        "Ball back within 5 seconds",
        value("regained_within_5s_pct"),
        "%",
        thresholds.regainWithin5s,
        `Target ${thresholds.regainWithin5s}%`,
        false,
      ),
      number(
        "Time to first pressure",
        value("time_to_press_median_s"),
        " s",
        2,
        "Target under 2 s",
        true,
        1,
      ),
    ],
    series: pressed.length
      ? {
          label: "Time to first pressure (s)",
          points: pressed
            .map((item) => ({ t: item.event.t, value: item.seconds }))
            .sort((a, b) => a.t - b.t),
          target: 2,
          lowerIsBetter: true,
        }
      : null,
    best: null,
    worst: null,
    wantsBall: false,
    eventTypes: ["turnover_lost"],
  };
  const quickest = pressed[0];
  const slowest = pressed.at(-1);
  if (quickest)
    lose.best = {
      t: quickest.event.t,
      title: `Pressure in ${round(quickest.seconds, 1)} s`,
      why: `${clock(quickest.event.t)} · the quickest reaction in the match`,
    };
  if (slowest && slowest !== quickest)
    lose.worst = {
      t: slowest.event.t,
      title: `${round(slowest.seconds, 1)} s before anyone pressed`,
      why: `${clock(slowest.event.t)} · the slowest reaction in the match`,
    };

  const blockLength = value("block_length_median_m");
  const defend: Phase = {
    key: "defend",
    name: "Out of possession",
    headline: {
      value: blockLength === null ? null : `${round(blockLength)} m`,
      label: "block length",
    },
    status: statusOf(blockLength, thresholds.blockCeilingM, true),
    numbers: [
      number(
        "Length back to front",
        blockLength,
        " m",
        thresholds.blockCeilingM,
        `Your ceiling is ${thresholds.blockCeilingM} m`,
        true,
      ),
      number("Height of the last line", value("def_line_height_median_m"), " m", null, null, false),
      number("Team-mates near at 2 s", value("near_at_2s_median"), "", null, null, false, 1),
    ],
    series: shape.some((s) => s.length !== null)
      ? {
          label: "Block length (m)",
          points: shape.flatMap((s) => (s.length === null ? [] : [{ t: s.t, value: s.length }])),
          target: thresholds.blockCeilingM,
          lowerIsBetter: true,
        }
      : null,
    best: null,
    worst: null,
    wantsBall: false,
    eventTypes: ["line_break_against", "turnover_won", "high_turnover"],
  };
  const withLength = shape.filter(
    (s): s is { t: number; length: number; width: number | null } => s.length !== null,
  );
  if (withLength.length > 1) {
    const shortest = withLength.reduce((a, b) => (b.length < a.length ? b : a));
    const longest = withLength.reduce((a, b) => (b.length > a.length ? b : a));
    defend.best = {
      t: shortest.t,
      title: `Compact at ${round(shortest.length)} m`,
      why: `${clock(shortest.t)} · the shortest the block got`,
    };
    defend.worst = {
      t: longest.t,
      title: `Block ${round(longest.length)} m long`,
      why: `${clock(longest.t)} · the longest the block got`,
    };
  }

  const regained = value("regained_within_5s_pct");
  const win: Phase = {
    key: "win",
    name: "Winning it",
    headline: {
      value: regained === null ? null : `${round(regained)}%`,
      label: "ball back within 5 s",
    },
    status: statusOf(regained, thresholds.regainWithin5s, false),
    numbers: [
      number(
        "Ball back within 5 seconds",
        regained,
        "%",
        thresholds.regainWithin5s,
        `Target ${thresholds.regainWithin5s}%`,
        false,
      ),
      {
        label: "Balls won high up the pitch",
        target: null,
        value: `${mine.filter((event) => event.type === "high_turnover").length}`,
        status: "unknown",
      },
      number("Progressive passes", value("progressive_passes"), "", null, null, false),
    ],
    series: null,
    best: null,
    worst: null,
    wantsBall: true,
    eventTypes: ["turnover_won", "high_turnover"],
  };
  const firstHigh = mine.find((event) => event.type === "high_turnover");
  if (firstHigh)
    win.best = {
      t: firstHigh.t,
      title: "Won it high up",
      why: `${clock(firstHigh.t)} · ${firstHigh.subtitle || firstHigh.title}`,
    };

  attack.status = "unknown";
  return [attack, lose, defend, win];
}
