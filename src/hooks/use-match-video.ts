import { useQuery } from "@tanstack/react-query";
import { videoSrc, type MatchRow } from "@/lib/match-source";

/**
 * The signed URL for a match's video.
 *
 * Every screen that plays the match asks for it under the same query key, so a
 * clip played on Insights and the workspace timeline are served from one signed
 * URL and one set of cached bytes. Moving between them re-signs nothing.
 */
export function useMatchVideo(row: MatchRow | null | undefined) {
  const { data } = useQuery({
    queryKey: ["match-video", row?.id],
    queryFn: () => videoSrc(row!),
    enabled: Boolean(row),
    staleTime: 30 * 60_000,
  });
  return data;
}
