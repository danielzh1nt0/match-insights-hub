/**
 * Coach confirmation over the pipeline's detected events.
 *
 * The processed matches live in the read-only analysis backend, so the reviews
 * are kept in this app's own backend and joined to the events by match id +
 * the pipeline's event id. Nothing in the pipeline data is ever modified.
 */

import { supabase } from "@/integrations/supabase/client";
import type { FeedEvent, MatchDataFile } from "@/lib/match-source";

export type Verdict = "confirmed" | "deleted" | "retimed";

export type EventReview = {
  id: string;
  match_id: string;
  event_id: string;
  verdict: Verdict;
  t_corrected: number | null;
  team_corrected: string | null;
  note: string | null;
  reviewed_by: string;
  created_at: string;
};

export type EventStatus = "confirmed" | "detected" | "deleted";

export type ReviewedEvent = FeedEvent & {
  status: EventStatus;
  /** Present when the coach moved the moment or changed the team. */
  corrected: boolean;
};

export type ReviewMap = Map<string, EventReview>;

export async function fetchReviews(matchId: string): Promise<EventReview[]> {
  const { data, error } = await supabase
    .from("event_reviews")
    .select("*")
    .eq("match_id", matchId);
  if (error) throw error;
  return (data ?? []) as EventReview[];
}

export function reviewMap(rows: EventReview[] | undefined): ReviewMap {
  return new Map((rows ?? []).map((r) => [r.event_id, r]));
}

export async function saveReview(input: {
  matchId: string;
  eventId: string;
  verdict: Verdict;
  tCorrected?: number | null;
  teamCorrected?: string | null;
  note?: string | null;
}) {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("Sign in to confirm events");
  const { error } = await supabase.from("event_reviews").upsert(
    {
      match_id: input.matchId,
      event_id: input.eventId,
      verdict: input.verdict,
      t_corrected: input.tCorrected ?? null,
      team_corrected: input.teamCorrected ?? null,
      note: input.note ?? null,
      reviewed_by: userId,
    },
    { onConflict: "match_id,event_id" },
  );
  if (error) throw error;
}

export async function saveReviews(
  matchId: string,
  items: { eventId: string; verdict: Verdict }[],
) {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("Sign in to confirm events");
  if (items.length === 0) return;
  const { error } = await supabase.from("event_reviews").upsert(
    items.map((i) => ({
      match_id: matchId,
      event_id: i.eventId,
      verdict: i.verdict,
      t_corrected: null,
      team_corrected: null,
      note: null,
      reviewed_by: userId,
    })),
    { onConflict: "match_id,event_id" },
  );
  if (error) throw error;
}

export async function clearReviews(matchId: string, eventIds: string[]) {
  if (eventIds.length === 0) return;
  const { error } = await supabase
    .from("event_reviews")
    .delete()
    .eq("match_id", matchId)
    .in("event_id", eventIds);
  if (error) throw error;
}

function statusOf(verdict: Verdict | undefined): EventStatus {
  if (verdict === "deleted") return "deleted";
  if (verdict === "confirmed" || verdict === "retimed") return "confirmed";
  return "detected";
}

/** Events with the coach's verdicts applied: retimes moved, deletions split out. */
export function applyReviews(
  events: FeedEvent[] | undefined,
  reviews: ReviewMap,
): { events: ReviewedEvent[]; hidden: ReviewedEvent[] } {
  const kept: ReviewedEvent[] = [];
  const hidden: ReviewedEvent[] = [];
  for (const e of events ?? []) {
    const review = reviews.get(e.id);
    const status = statusOf(review?.verdict);
    const t = review?.t_corrected != null ? review.t_corrected : e.t;
    const team = (review?.team_corrected as "A" | "B" | null | undefined) ?? e.team;
    const next: ReviewedEvent = {
      ...e,
      t,
      team,
      status,
      corrected: Boolean(review?.t_corrected != null || review?.team_corrected),
    };
    if (status === "deleted") hidden.push(next);
    else kept.push(next);
  }
  kept.sort((a, b) => a.t - b.t);
  hidden.sort((a, b) => a.t - b.t);
  return { events: kept, hidden };
}

/** The file the rest of the app reads: deleted moments gone, retimes applied. */
export function fileWithReviews(
  file: MatchDataFile | undefined,
  events: ReviewedEvent[],
): MatchDataFile | undefined {
  if (!file) return file;
  return { ...file, events };
}

export function confirmedOnly(events: ReviewedEvent[]) {
  return events.filter((e) => e.status === "confirmed");
}

export type Counted = { confirmed: number; detected: number };

export function countEvents(
  events: ReviewedEvent[],
  match: (e: ReviewedEvent) => boolean,
): Counted {
  let confirmed = 0;
  let detected = 0;
  for (const e of events) {
    if (!match(e)) continue;
    detected += 1;
    if (e.status === "confirmed") confirmed += 1;
  }
  return { confirmed, detected };
}

export function countLine(c: Counted) {
  return c.confirmed > 0 ? `${c.confirmed} confirmed · ${c.detected} detected` : `${c.detected} detected`;
}

/** Downloads reviews.json for the pipeline to read back for retraining. */
export function downloadReviews(matchId: string, rows: EventReview[]) {
  const payload = {
    match_id: matchId,
    exported_at: new Date().toISOString(),
    count: rows.length,
    reviews: rows,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${matchId}-reviews.json`;
  a.click();
  URL.revokeObjectURL(url);
}
