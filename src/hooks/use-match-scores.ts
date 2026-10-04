import { useQueries } from "@tanstack/react-query";
import { goalsFrom } from "@/lib/export-contract";
import type { StatsFile } from "@/lib/match-analysis";
import { fetchMatchData, fetchMatchStats, type MatchListItem } from "@/lib/match-source";

/**
 * The scoreline for a list of matches, counted from the goals in each file.
 *
 * The library used to read `score_a` / `score_b` off the match label. Nobody
 * fills those in, so every card read 0–0 while the shot map underneath showed
 * three goals. Counting from `metrics.shots[]` means the card and the match
 * screen are reading the same records and cannot disagree.
 *
 * It costs two file reads per match, which is fine for a handful and wrong for
 * a season. The fix is for the pipeline to put the periods and the goal counts
 * on the `matches` row, so a library card never has to open a match file at
 * all — worth asking for once the demo is out of the way.
 */
export function useMatchScores(items: MatchListItem[] | undefined) {
  const ready = (items ?? []).filter((item) => item.row.status === "ready");

  const results = useQueries({
    queries: ready.map((item) => ({
      queryKey: ["match-score", item.row.id],
      queryFn: async () => {
        const [stats, data] = await Promise.all([
          fetchMatchStats(item.row) as Promise<StatsFile>,
          fetchMatchData(item.row).catch(() => undefined),
        ]);
        return goalsFrom(stats, data?.periods);
      },
      staleTime: Infinity,
    })),
  });

  const byId = new Map<string, { a: number; b: number }>();
  ready.forEach((item, i) => {
    const score = results[i]?.data;
    if (score) byId.set(item.row.id, score);
  });
  return byId;
}
