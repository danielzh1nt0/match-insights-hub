import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TeamScope } from "@/components/ip/chrome";
import { buildMatchData } from "@/lib/match-data";
import {
  buildFindings,
  buildLineDefending,
  buildPlayerStats,
  buildStatSections,
  buildSummary,
  buildTerritory,
  teamColours,
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
import { applyReviews, confirmedOnly, fileWithReviews } from "@/lib/event-reviews";
import { useReviews } from "@/hooks/use-reviews";

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

/** Findings switch to confirmed events once this many are confirmed. */
const CONFIRMED_BASIS_MIN = 5;

/**
 * The open match's own files, plus everything derived from them for the
 * selected team. Team is always the literal "A" or "B" from the data.
 *
 * The coach's confirmations are applied first: deleted moments are removed
 * everywhere and corrected times/teams replace the pipeline's values.
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

  const review = useReviews(matchId);
  const raw: MatchDataFile | undefined = dataQuery.data;
  const stats = statsQuery.data;
  const team = teamKey(scope);
  const thresholds = useMemo(() => thresholdsFrom(label), [label]);
  const colours = useMemo(() => teamColours(label), [label]);

  const { events, hidden } = useMemo(
    () => applyReviews(raw?.events, review.reviews),
    [raw?.events, review.reviews],
  );
  const confirmed = useMemo(() => confirmedOnly(events), [events]);
  const basis: "confirmed" | "detected" =
    confirmed.length >= CONFIRMED_BASIS_MIN ? "confirmed" : "detected";

  /** Deleted moments are gone from every derived view. */
  const file = useMemo(() => fileWithReviews(raw, events), [raw, events]);
  const findingFile = useMemo(
    () => (basis === "confirmed" ? fileWithReviews(raw, confirmed) : file),
    [basis, raw, confirmed, file],
  );

  const match = useMemo(() => (item ? toLibraryMatch(item) : undefined), [item]);

  const territory = useMemo(() => buildTerritory(file, stats, team), [file, stats, team]);
  const lineDefending = useMemo(() => buildLineDefending(file, stats, team ?? "A"), [file, stats, team]);
  const findings = useMemo(
    () =>
      buildFindings(findingFile, stats, team ?? "A", thresholds).map((f) => ({ ...f, basis })),
    [findingFile, stats, team, thresholds, basis],
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
    colours,
    thresholds,
    territory,
    lineDefending,
    findings,
    summary,
    sections,
    players,
    /** Reviewed, non-deleted events sorted by time. */
    events,
    hiddenEvents: hidden,
    confirmedCount: confirmed.length,
    basis,
    review,
    loading: recordPending || dataQuery.isPending || statsQuery.isPending,
    error: dataQuery.error ?? statsQuery.error,
    needsSetup: Boolean(item && !isLabelled(item.label)),
  };
}
