import type { Finding } from "@/lib/match-data";
import type { PlayerStat, StatsFile, TeamKey } from "@/lib/match-analysis";
import { teamRow } from "@/lib/match-analysis";
import type { MatchDataFile } from "@/lib/match-source";
import type { LibraryMatch } from "@/lib/sample-data";

export type RecapStrength = {
  label: string;
  value: number;
  other: number;
  unit: string;
  headline: string;
  explanation: string;
};

export type RecapPlayer = PlayerStat & {
  completion: number;
  title: string;
  reasons: { value: string; label: string }[];
};

export type RecapAnalysis = {
  ownName: string;
  otherName: string;
  ownColour: string;
  otherColour: string;
  strength: RecapStrength;
  standout: RecapPlayer | null;
  improvement: Finding | null;
  firstMoment: number | null;
  eventCount: number;
  turnoversWon: number;
  turnoversLost: number;
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function strongestMetric(stats: StatsFile | undefined, team: TeamKey): RecapStrength {
  const other: TeamKey = team === "A" ? "B" : "A";
  const own = teamRow(stats, team);
  const rival = teamRow(stats, other);
  const field = stats?.metrics?.["field"];
  const choices = [
    {
      label: "Possession",
      value: number(own?.possession_pct),
      other: number(rival?.possession_pct),
      unit: "%",
      higher: true,
      headline: "Controlled more of the game",
      explanation: "The clearest edge came from keeping the ball away from the opponent.",
    },
    {
      label: "Pass completion",
      value: number(own?.pass_completion_pct),
      other: number(rival?.pass_completion_pct),
      unit: "%",
      higher: true,
      headline: "Kept the passing cleaner",
      explanation: "The team completed a greater share of its passes than the opposition.",
    },
    {
      label: "Pressure within 2 seconds",
      value: number(own?.pressed_within_2s_pct),
      other: number(rival?.pressed_within_2s_pct),
      unit: "%",
      higher: true,
      headline: "Reacted faster after losses",
      explanation: "The first pressure arrived more reliably within two seconds.",
    },
    {
      label: "Final-third share",
      value: number(field?.[team]?.field_tilt_pct),
      other: number(field?.[other]?.field_tilt_pct),
      unit: "%",
      higher: true,
      headline: "Pushed play towards their goal",
      explanation: "More of the final-third play happened at the attacking end.",
    },
  ];
  return [...choices].sort((a, b) => {
    const aEdge = a.higher ? a.value - a.other : a.other - a.value;
    const bEdge = b.higher ? b.value - b.other : b.other - b.value;
    return bEdge - aEdge;
  })[0]!;
}

function standoutPlayer(players: PlayerStat[]): RecapPlayer | null {
  if (players.length === 0) return null;
  const ranked = [...players].sort((a, b) => {
    const aCompletion = a.passes ? a.passesCompleted / a.passes : 0;
    const bCompletion = b.passes ? b.passesCompleted / b.passes : 0;
    const aScore = a.touches + a.passesCompleted * 1.5 + aCompletion * 20 + a.distanceM / 100;
    const bScore = b.touches + b.passesCompleted * 1.5 + bCompletion * 20 + b.distanceM / 100;
    return bScore - aScore;
  });
  const player = ranked[0];
  if (!player) return null;
  const completion = player.passes ? Math.round((player.passesCompleted / player.passes) * 100) : 0;
  return {
    ...player,
    completion,
    title: `Tracked player ${player.id}`,
    reasons: [
      { value: `${player.touches}`, label: "touches" },
      { value: `${completion}%`, label: "pass completion" },
      { value: `${(player.distanceM / 1000).toFixed(1)} km`, label: "covered" },
    ],
  };
}

function biggestGap(findings: Finding[]) {
  return [...findings].sort((a, b) => {
    const gap = (f: Finding) =>
      Math.abs(f.value - f.target) / Math.max(Math.abs(f.target), 1);
    return gap(b) - gap(a);
  })[0] ?? null;
}

export function buildRecapAnalysis({
  match,
  data,
  stats,
  findings,
  players,
  team,
  colours,
}: {
  match: LibraryMatch;
  data: MatchDataFile | undefined;
  stats: StatsFile | undefined;
  findings: Finding[];
  players: PlayerStat[];
  team: TeamKey;
  colours: { A: string; B: string };
}): RecapAnalysis {
  const ownName = team === "A" ? match.teamA : match.teamB;
  const otherName = team === "A" ? match.teamB : match.teamA;
  const improvement = biggestGap(findings);
  const ownEvents = (data?.events ?? []).filter((event) => event.team === team);
  return {
    ownName,
    otherName,
    ownColour: colours[team],
    otherColour: colours[team === "A" ? "B" : "A"],
    strength: strongestMetric(stats, team),
    standout: standoutPlayer(players),
    improvement,
    firstMoment: improvement?.timestamps[0] ?? ownEvents[0]?.t ?? null,
    eventCount: ownEvents.length,
    turnoversWon: ownEvents.filter((event) => event.type === "turnover_won").length,
    turnoversLost: ownEvents.filter((event) => event.type === "turnover_lost").length,
  };
}