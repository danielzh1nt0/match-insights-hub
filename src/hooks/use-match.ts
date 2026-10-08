import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TeamScope } from "@/components/ip/chrome";
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
import { goalsFrom } from "@/lib/export-contract";
import {
  fetchMatch,
  fetchAllFrames,
  fetchMatchData,
  fetchMatchStats,
  isLabelled,
  toLibraryMatch,
  type MatchDataFile,
} from "@/lib/match-source";
import { applyReviews, confirmedOnly, fileWithReviews } from "@/lib/event-reviews";
import { useReviews } from "@/hooks/use-reviews";
import { colourForTeam } from "@/lib/team-crests";

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
  return {
    match,
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

  // Full matches carry no inline frames; load the whole match, thinned, once.
  const chunks = dataQuery.data?.frame_chunks;
  const needsFrames = Boolean(row && chunks?.length && !dataQuery.data?.frames.length);
  const framesQuery = useQuery({
    queryKey: ["match-frames", matchId],
    queryFn: () => fetchAllFrames(row!.files, chunks!),
    enabled: needsFrames,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
  });

  const review = useReviews(matchId);
  const raw: MatchDataFile | undefined = useMemo(() => {
    const data = dataQuery.data;
    if (!data || !needsFrames || !framesQuery.data) return data;
    return { ...data, frames: framesQuery.data };
  }, [dataQuery.data, needsFrames, framesQuery.data]);
  const stats = statsQuery.data;
  const team = teamKey(scope);
  const thresholds = useMemo(() => thresholdsFrom(label), [label]);
  // The label's score field is empty on every match, which is why the app was
  // showing 0-0 everywhere. The goals are in the stats file, so the scoreline
  // and the shot map are now counted from the same records.
  const match = useMemo(() => {
    if (!item) return undefined;
    const base = toLibraryMatch(item);
    if (!stats) return base;
    const goals = goalsFrom(stats, raw?.periods);
    return { ...base, scoreA: goals.a, scoreB: goals.b };
  }, [item, stats, raw?.periods]);
  const colours = useMemo(() => {
    const saved = teamColours(label);
    return {
      A: colourForTeam(match?.teamA ?? "", saved.A),
      B: colourForTeam(match?.teamB ?? "", saved.B),
    };
  }, [label, match?.teamA, match?.teamB]);

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

  const territory = useMemo(() => buildTerritory(file, stats, team), [file, stats, team]);
  const lineDefending = useMemo(
    () => buildLineDefending(file, stats, team ?? "A"),
    [file, stats, team],
  );
  const findings = useMemo(
    () => buildFindings(findingFile, stats, team ?? "A", thresholds).map((f) => ({ ...f, basis })),
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
  const sections = useMemo(
    () => buildStatSections(file, stats, thresholds),
    [file, stats, thresholds],
  );
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
    /** True while a full match's tracking is still downloading. */
    framesLoading: needsFrames && framesQuery.isPending,
    error: dataQuery.error ?? statsQuery.error,
    needsSetup: Boolean(item && !isLabelled(item.label)),
  };
}
