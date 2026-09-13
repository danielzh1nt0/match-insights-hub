import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildMatchData } from "@/lib/match-data";
import { fetchMatch, isLabelled, toLibraryMatch } from "@/lib/match-source";

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
