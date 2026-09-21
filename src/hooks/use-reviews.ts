import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clearReviews,
  fetchReviews,
  reviewMap,
  saveReview,
  saveReviews,
  type EventReview,
  type Verdict,
} from "@/lib/event-reviews";

/** one shared empty list: a new [] on every render made every derived object (and the overlays) reset each render */
const EMPTY_ROWS: EventReview[] = [];

export function useReviews(matchId: string) {
  const queryClient = useQueryClient();
  const key = useMemo(() => ["event-reviews", matchId], [matchId]);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchReviews(matchId),
    staleTime: 30_000,
  });

  const rows: EventReview[] = query.data ?? EMPTY_ROWS;
  const reviews = useMemo(() => reviewMap(rows), [rows]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: key });
  }, [queryClient, key]);

  const setVerdict = useMutation({
    mutationFn: (input: {
      eventId: string;
      verdict: Verdict;
      tCorrected?: number | null;
      teamCorrected?: string | null;
    }) => saveReview({ matchId, ...input }),
    onSuccess: invalidate,
    onError: () => toast.error("Could not save that review"),
  });

  const clear = useMutation({
    mutationFn: (eventIds: string[]) => clearReviews(matchId, eventIds),
    onSuccess: invalidate,
    onError: () => toast.error("Could not undo that"),
  });

  const confirmMany = useMutation({
    mutationFn: async (eventIds: string[]) => {
      const fresh = eventIds.filter((id) => !reviews.has(id));
      await saveReviews(
        matchId,
        eventIds.map((id) => ({ eventId: id, verdict: "confirmed" as Verdict })),
      );
      return fresh;
    },
    onSuccess: (fresh, eventIds) => {
      invalidate();
      toast.success(`Confirmed ${eventIds.length} moment${eventIds.length === 1 ? "" : "s"}`, {
        action: {
          label: "Undo",
          onClick: () => clear.mutate(fresh),
        },
      });
    },
    onError: () => toast.error("Could not confirm those moments"),
  });

  return {
    rows,
    reviews,
    loading: query.isPending,
    setVerdict,
    clear,
    confirmMany,
  };
}
