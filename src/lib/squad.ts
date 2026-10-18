/**
 * The player record (18 Oct 2026): the squad, consent per player, and who played each match.
 *
 * Why this exists: match stats can be re-made by anyone with the video; a season of coach-entered lineups,
 * minutes and consents for grassroots players is the one dataset nobody else holds. Everything here is the
 * coach's own rows (RLS: owner_id = auth.uid()); the pipeline data is never modified.
 *
 * Minutes come from the coach, not the tracker: the tracker cannot yet tell players apart across a match.
 */
import { supabase } from "@/integrations/supabase/client";

export type ConsentStatus = "none" | "given" | "withdrawn";

export type Player = {
  id: string;
  owner_id: string;
  team_id: string | null;
  full_name: string;
  shirt: number | null;
  position: string;
  birth_year: number | null;
  active: boolean;
  consent_status: ConsentStatus;
  consent_at: string | null;
  consent_note: string | null;
  created_at: string;
  updated_at: string;
};

export type LineupRow = {
  id: string;
  owner_id: string;
  match_id: string;
  player_id: string;
  started: boolean;
  minute_on: number;
  minute_off: number | null;
  shirt: number | null;
  note: string | null;
};

export type MatchCorrection = {
  id: string;
  match_id: string;
  field: "possession_pct" | "score" | "attack_right" | "other";
  value: Record<string, unknown>;
  note: string | null;
  created_at: string;
};

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Sign in to edit the squad");
  return id;
}

export async function fetchPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from("players").select("*").order("shirt", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Player[];
}

export async function savePlayer(input: Partial<Player> & { full_name: string }): Promise<Player> {
  const owner_id = await userId();
  const row = { ...input, owner_id, full_name: input.full_name.trim() };
  const { data, error } = await supabase.from("players").upsert(row).select("*").single();
  if (error) throw error;
  return data as Player;
}

export async function setConsent(playerId: string, status: ConsentStatus, note?: string): Promise<void> {
  const { error } = await supabase
    .from("players")
    .update({ consent_status: status, consent_at: status === "none" ? null : new Date().toISOString(), consent_note: note ?? null })
    .eq("id", playerId);
  if (error) throw error;
}

export async function deletePlayer(playerId: string): Promise<void> {
  // the player's right to be forgotten: the row and, through ON DELETE CASCADE, every lineup row
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw error;
}

export async function fetchLineup(matchId: string): Promise<LineupRow[]> {
  const { data, error } = await supabase.from("match_lineups").select("*").eq("match_id", matchId);
  if (error) throw error;
  return (data ?? []) as LineupRow[];
}

export async function fetchLineupsForPlayer(playerId: string): Promise<LineupRow[]> {
  const { data, error } = await supabase.from("match_lineups").select("*").eq("player_id", playerId);
  if (error) throw error;
  return (data ?? []) as LineupRow[];
}

export async function saveLineupRow(input: {
  matchId: string;
  playerId: string;
  started: boolean;
  minuteOn?: number;
  minuteOff?: number | null;
  shirt?: number | null;
}): Promise<void> {
  const owner_id = await userId();
  const { error } = await supabase.from("match_lineups").upsert(
    {
      owner_id,
      match_id: input.matchId,
      player_id: input.playerId,
      started: input.started,
      minute_on: input.started ? 0 : (input.minuteOn ?? 0),
      minute_off: input.minuteOff ?? null,
      shirt: input.shirt ?? null,
    },
    { onConflict: "match_id,player_id" },
  );
  if (error) throw error;
}

export async function removeLineupRow(matchId: string, playerId: string): Promise<void> {
  const { error } = await supabase.from("match_lineups").delete().eq("match_id", matchId).eq("player_id", playerId);
  if (error) throw error;
}

export async function saveCorrection(matchId: string, field: MatchCorrection["field"], value: Record<string, unknown>, note?: string): Promise<void> {
  const owner_id = await userId();
  const { error } = await supabase
    .from("match_corrections")
    .upsert({ owner_id, match_id: matchId, field, value: value as never, note: note ?? null }, { onConflict: "owner_id,match_id,field" });
  if (error) throw error;
}

export async function fetchCorrections(matchId: string): Promise<MatchCorrection[]> {
  const { data, error } = await supabase.from("match_corrections").select("*").eq("match_id", matchId);
  if (error) throw error;
  return (data ?? []) as MatchCorrection[];
}

/** Minutes a lineup row stands for, given the match length in minutes (coach-entered; the tracker cannot see substitutions). */
export function minutesPlayed(row: Pick<LineupRow, "minute_on" | "minute_off">, matchMinutes: number): number {
  const off = row.minute_off ?? matchMinutes;
  return Math.max(0, Math.min(off, matchMinutes) - Math.max(0, row.minute_on));
}
