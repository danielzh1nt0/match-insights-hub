import type { StatsFile, TeamKey } from "@/lib/match-analysis";
import type { MatchDataFile } from "@/lib/match-source";
import {
  completionOf,
  finalThirdEntries,
  goalsFrom,
  insidePeriods,
  passCompleted,
  shotCount,
} from "@/lib/export-contract";
import type { MatchTimeline } from "@/lib/timeline";

/**
 * The coach's own scorecard for the match.
 *
 * Every other screen answers "what happened". This one answers "did we do what
 * we said we would", which is a different question and the only one with a
 * right answer the coach already knows before kick-off. He sets the targets; a
 * match either meets them or it does not.
 *
 * Deliberately built only from the figures the 2 Oct audit cleared: goals,
 * shots, possession, final-third entries and pass completion. Pressing, PPDA
 * and sequence counts are out by a factor of four to ten, and a score built
 * partly on those would be a confident number with a lie inside it.
 */

export type KpiTargets = {
  /** Attack. Met when the match figure is at or above the target. */
  possessionPct: number;
  shots: number;
  finalThirdEntries: number;
  passCompletionPct: number;
  /** Defence. Met when the match figure is at or below the target. */
  shotsConceded: number;
  goalsConceded: number;
  entriesConceded: number;
};

export const KPI_DEFAULTS: KpiTargets = {
  possessionPct: 50,
  shots: 10,
  finalThirdEntries: 15,
  passCompletionPct: 70,
  shotsConceded: 10,
  goalsConceded: 1,
  entriesConceded: 15,
};

export type KpiMeasure = {
  key: string;
  label: string;
  /** Null when the file cannot answer. The target is then neither met nor missed. */
  value: number | null;
  target: number;
  /** Whether a bigger number is the good one. */
  goodWhen: "up" | "down";
  unit: "%" | "";
  met: boolean | null;
};

export type KpiGroup = {
  label: string;
  /** Share of the measurable targets met, 0-100. Null when none could be measured. */
  score: number | null;
  met: number;
  /** How many of the targets this file could answer at all. */
  measured: number;
  total: number;
  measures: KpiMeasure[];
};

export type TeamKpi = { attack: KpiGroup; defence: KpiGroup; overall: KpiGroup };

function measure(
  key: string,
  label: string,
  value: number | null,
  target: number,
  goodWhen: "up" | "down",
  unit: "%" | "",
): KpiMeasure {
  return {
    key,
    label,
    value,
    target,
    goodWhen,
    unit,
    // An unmeasured target is not a failed one. Scoring it as missed would
    // punish the team for what the pipeline has not finished reading.
    met: value === null ? null : goodWhen === "up" ? value >= target : value <= target,
  };
}

function group(label: string, measures: KpiMeasure[]): KpiGroup {
  const measured = measures.filter((m) => m.met !== null);
  const met = measured.filter((m) => m.met === true).length;
  return {
    label,
    score: measured.length === 0 ? null : Math.round((met / measured.length) * 100),
    met,
    measured: measured.length,
    total: measures.length,
    measures,
  };
}

/** Mean possession across the match windows, as a percentage for this team. */
function possessionOf(timeline: MatchTimeline | undefined, team: TeamKey): number | null {
  const points = (timeline?.possession ?? []).filter((p) => p.value !== null);
  if (points.length === 0) return null;
  const mean = points.reduce((sum, p) => sum + (p.value ?? 0), 0) / points.length;
  // The windows record team A's share, whichever team is selected.
  return Math.round((team === "A" ? mean : 1 - mean) * 100);
}

/** Completion over this team's passes inside the match, judged ones only. */
function completionFor(
  stats: StatsFile | undefined,
  team: TeamKey,
  file: MatchDataFile | undefined,
): number | null {
  const passes = ((stats?.passes ?? []) as Record<string, unknown>[]).filter((pass) => {
    if (pass["team"] !== team) return false;
    const t = pass["t"] ?? pass["time"] ?? pass["start_t"];
    if (typeof t !== "number" || !Number.isFinite(t)) return false;
    return insidePeriods(t, file?.periods);
  });
  if (passes.length === 0) return null;
  // completionOf already excludes passes the file never judged, so a half
  // graded match reports the rate of what was graded rather than a rate
  // dragged down by everything nobody looked at.
  void passCompleted;
  return completionOf(passes).pct;
}

export function buildKpi({
  stats,
  file,
  team,
  timeline,
  targets,
}: {
  stats: StatsFile | undefined;
  file: MatchDataFile | undefined;
  team: TeamKey;
  timeline: MatchTimeline | undefined;
  targets: KpiTargets;
}): TeamKpi {
  const them: TeamKey = team === "A" ? "B" : "A";
  const periods = file?.periods;
  const goals = goalsFrom(stats, periods);

  const attack = group("Attack", [
    measure(
      "possession",
      "Possession",
      possessionOf(timeline, team),
      targets.possessionPct,
      "up",
      "%",
    ),
    measure("shots", "Shots", shotCount(stats, team, periods) || null, targets.shots, "up", ""),
    measure(
      "entries",
      "Final-third entries",
      finalThirdEntries(stats, team),
      targets.finalThirdEntries,
      "up",
      "",
    ),
    measure(
      "completion",
      "Pass completion",
      completionFor(stats, team, file),
      targets.passCompletionPct,
      "up",
      "%",
    ),
  ]);

  const defence = group("Defence", [
    measure(
      "shots_conceded",
      "Shots conceded",
      shotCount(stats, them, periods) || null,
      targets.shotsConceded,
      "down",
      "",
    ),
    // Goals conceded is the one figure that is honestly zero rather than
    // missing, so it is only withheld when the file carries no shots at all.
    measure(
      "goals_conceded",
      "Goals conceded",
      shotCount(stats, them, periods) === 0 && shotCount(stats, team, periods) === 0
        ? null
        : team === "A"
          ? goals.b
          : goals.a,
      targets.goalsConceded,
      "down",
      "",
    ),
    measure(
      "entries_conceded",
      "Entries conceded",
      finalThirdEntries(stats, them),
      targets.entriesConceded,
      "down",
      "",
    ),
  ]);

  return {
    attack,
    defence,
    // Overall is every target together, not the mean of the two scores: with
    // four attacking targets and three defensive ones, averaging the scores
    // would quietly weight one defensive target more heavily than one
    // attacking one.
    overall: group("Overall", [...attack.measures, ...defence.measures]),
  };
}

/** The targets a coach saved, falling back to the defaults field by field. */
export function kpiTargetsFrom(raw: Record<string, unknown> | null | undefined): KpiTargets {
  const n = (key: string, fallback: number) => {
    const value = raw?.[key];
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  };
  return {
    possessionPct: n("kpi_possession_pct", KPI_DEFAULTS.possessionPct),
    shots: n("kpi_shots", KPI_DEFAULTS.shots),
    finalThirdEntries: n("kpi_final_third_entries", KPI_DEFAULTS.finalThirdEntries),
    passCompletionPct: n("kpi_pass_completion_pct", KPI_DEFAULTS.passCompletionPct),
    shotsConceded: n("kpi_shots_conceded", KPI_DEFAULTS.shotsConceded),
    goalsConceded: n("kpi_goals_conceded", KPI_DEFAULTS.goalsConceded),
    entriesConceded: n("kpi_entries_conceded", KPI_DEFAULTS.entriesConceded),
  };
}
