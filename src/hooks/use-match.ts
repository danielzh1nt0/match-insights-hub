import { useMemo } from "react";
import { buildMatchData } from "@/lib/match-data";
import { useApp } from "@/store/app-store";

export function useMatch(matchId: string) {
  const match = useApp((s) => s.matches.find((m) => m.id === matchId));
  const data = useMemo(
    () => (match ? buildMatchData(match.id, match.durationS) : null),
    [match?.id, match?.durationS],
  );
  return { match, data };
}
