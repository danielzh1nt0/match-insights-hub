import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TeamScope } from "@/components/ip/chrome";
import { buildMatchData } from "@/lib/match-data";
import {
  buildFindings,
  buildPlayerStats,
  buildStatSections,
  buildSummary,
  buildTerritory,
  teamKey,
  thresholdsFrom,
  type StatsFile,
} from "@/lib/match-analysis";
import {
  fetchMatch,
  fetchMatchData,
  fetchMatchStats,
  isLabelled,
  toLibraryMatch,
  type MatchDataFile,
} from "@/lib/match-source";

export function useMatchRecord(matchId: string) {
  return useQuery({
    queryKey: ["match", matchId],
    queryFn: () => fetchMatch(matchId),
    staleTime: 60_000,
  });
}

export function useMatch(matchId: string) {
  const { data: item, isPending, error } = useMatchRecord(matchId);
  const match = useMemo(() => (item ? toLibraryMatch(item) : undefined), [item]);
  const data = useMemo(
    () => (match ? buildMatchData(match.id, match.durationS) : null),
    [match?.id, match?.durationS],
  );
  return {
    match,
    data,
    item: item ?? null,
    loading: isPending,
    error,
    needsSetup: Boolean(item && !isLabelled(item.label)),
  };
}

/**
 * The open match's own files, plus everything derived from them for the
 * selected team. Team is always the literal "A" or "B" from the data.
 */
export function useAnalysis(matchId: string, scope: TeamScope) {
  const { data: item, isPending: recordPending } = useMatchRecord(matchId);
  const row = item?.row;
  const label = item?.label ?? null;

  const dataQuery = useQuery({
    queryKey: ["match-data", matchId],
    queryFn: () => fetchMatchData(row!),
    enabled: Boolean(row),
    staleTime: Infinity,
  });
  const statsQuery = useQuery({
    queryKey: ["match-stats", matchId],
    queryFn: () => fetchMatchStats(row!) as Promise<StatsFile>,
    enabled: Boolean(row),
    staleTime: Infinity,
  });

  const file: MatchDataFile | undefined = dataQuery.data;
  const stats = statsQuery.data;
  const team = teamKey(scope);
  const thresholds = useMemo(() => thresholdsFrom(label), [label]);

  const match = useMemo(() => (item ? toLibraryMatch(item) : undefined), [item]);

  const territory = useMemo(() => buildTerritory(file, stats, team), [file, stats, team]);
  const findings = useMemo(
    () => buildFindings(file, stats, team ?? "A", thresholds),
    [file, stats, team, thresholds],
  );
  const summary = useMemo(
    () =>
      buildSummary(file, stats, team ?? "A", findings, {
        own: team === "B" ? (match?.teamB ?? "Team B") : (match?.teamA ?? "Team A"),
        other: team === "B" ? (match?.teamA ?? "Team A") : (match?.teamB ?? "Team B"),
      }),
    [file, stats, team, findings, match?.teamA, match?.teamB],
  );
  const sections = useMemo(() => buildStatSections(file, stats, thresholds), [file, stats, thresholds]);
  const players = useMemo(() => buildPlayerStats(stats, team), [stats, team]);

  return {
    match,
    item: item ?? null,
    row: row ?? null,
    label,
    file,
    stats,
    team,
    thresholds,
    territory,
    findings,
    summary,
    sections,
    players,
    loading: recordPending || dataQuery.isPending || statsQuery.isPending,
    error: dataQuery.error ?? statsQuery.error,
    needsSetup: Boolean(item && !isLabelled(item.label)),
  };
}
