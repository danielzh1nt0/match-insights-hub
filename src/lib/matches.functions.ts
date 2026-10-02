import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MATCHES_BUCKET, matchesAdmin } from "@/integrations/matches/client.server";
import type { MatchLabelRow, MatchListItem, MatchRow } from "@/lib/match-source";

/**
 * Everything that reads the matches project goes through here.
 *
 * Each handler does the same two things before touching that project: confirm
 * there is a signed-in caller, and confirm `match_access` grants them the match
 * they asked for. The service-role key stays on the server.
 */

const SIGN_TTL_S = 3600;

async function accessibleMatchIds(supabase: any, userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("match_access").select("match_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row: { match_id: string }) => row.match_id);
}

async function hasAccess(supabase: any, userId: string, matchId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("match_access")
    .select("match_id")
    .eq("user_id", userId)
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** The matches this coach has been given, with their labels. */
export const listMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MatchListItem[]> => {
    const { supabase, userId } = context;
    const ids = await accessibleMatchIds(supabase, userId);
    if (ids.length === 0) return [];

    const db = matchesAdmin();
    const [{ data: rows, error }, { data: labels, error: labelError }] = await Promise.all([
      db.from("matches").select("*").in("id", ids).order("created_at", { ascending: false }),
      db.from("match_labels").select("*").in("match_id", ids),
    ]);
    if (error) throw error;
    if (labelError) throw labelError;

    const byId = new Map<string, MatchLabelRow>(((labels ?? []) as MatchLabelRow[]).map((l) => [l.match_id, l]));
    return ((rows ?? []) as MatchRow[]).map((row) => ({ row, label: byId.get(row.id) ?? null }));
  });

export const getMatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ matchId: z.string().max(200) }))
  .handler(async ({ context, data }): Promise<MatchListItem | null> => {
    const { supabase, userId } = context;
    if (!(await hasAccess(supabase, userId, data.matchId))) return null;

    const db = matchesAdmin();
    const [{ data: row, error }, { data: label }] = await Promise.all([
      db.from("matches").select("*").eq("id", data.matchId).maybeSingle(),
      db.from("match_labels").select("*").eq("match_id", data.matchId).maybeSingle(),
    ]);
    if (error) throw error;
    if (!row) return null;
    return { row: row as MatchRow, label: (label as MatchLabelRow | null) ?? null };
  });

export const saveLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ matchId: z.string().max(200), patch: z.record(z.string(), z.unknown()) }))
  .handler(async ({ context, data }): Promise<void> => {
    const { supabase, userId } = context;
    if (!(await hasAccess(supabase, userId, data.matchId))) throw new Error("No access to that match");
    const { error } = await matchesAdmin()
      .from("match_labels")
      .upsert({ ...data.patch, match_id: data.matchId }, { onConflict: "match_id" });
    if (error) throw error;
  });

/**
 * Sign one file for one match.
 *
 * The path is checked against that match's own `files` entry rather than taken
 * on trust. Without that, a coach with access to a single match could sign any
 * object in the bucket by passing someone else's path.
 */
export const signMatchFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ matchId: z.string().max(200), path: z.string().max(500) }))
  .handler(async ({ context, data }): Promise<string> => {
    const { supabase, userId } = context;
    if (!(await hasAccess(supabase, userId, data.matchId))) throw new Error("No access to that match");

    const db = matchesAdmin();
    const { data: row, error } = await db.from("matches").select("files").eq("id", data.matchId).maybeSingle();
    if (error) throw error;

    const files = (row?.files ?? {}) as Record<string, string | undefined>;
    const owned = new Set(Object.values(files).filter((value): value is string => typeof value === "string"));
    if (!owned.has(data.path)) throw new Error("That file does not belong to this match");

    const { data: signed, error: signError } = await db.storage
      .from(MATCHES_BUCKET)
      .createSignedUrl(data.path, SIGN_TTL_S);
    if (signError || !signed?.signedUrl) throw signError ?? new Error(`Could not sign ${data.path}`);
    return signed.signedUrl;
  });
