import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const teamSchema = z.object({
  name: z.string().max(120),
  ageGroup: z.string().max(60),
  colorA: z.string().max(32),
  colorB: z.string().max(32),
});

const onboardingSchema = z.object({
  club: z.object({
    name: z.string().max(120),
    country: z.string().max(120),
    crestInitial: z.string().max(4),
  }),
  teams: z.array(teamSchema).max(20),
  targets: z.object({
    pressWithin2s: z.number().int().min(0).max(100),
    regainWithin5s: z.number().int().min(0).max(100),
    blockCeilingMin: z.number().int().min(0).max(120),
  }),
});

export type AccountData = {
  profile: {
    fullName: string;
    clubName: string;
    role: string;
    onboarded: boolean;
    email: string;
  };
  club: {
    name: string;
    country: string;
    crestInitial: string;
  } | null;
  targets: {
    pressWithin2s: number;
    regainWithin5s: number;
    blockCeilingMin: number;
  } | null;
  teams: Array<{ id: string; name: string; ageGroup: string; colorA: string; colorB: string }>;
};

export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountData> => {
    const { supabase, userId, claims } = context;

    const [{ data: profile }, { data: club }, { data: teams }] = await Promise.all([
      supabase.from("profiles").select("full_name, club_name, role, onboarded").eq("id", userId).maybeSingle(),
      supabase
        .from("club_settings")
        .select("club_name, country, crest_initial, press_within_2s, regain_within_5s, block_ceiling_min")
        .eq("owner_id", userId)
        .maybeSingle(),
      supabase
        .from("teams")
        .select("id, name, age_group, color_a, color_b")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true }),
    ]);

    return {
      profile: {
        fullName: profile?.full_name ?? "",
        clubName: profile?.club_name ?? "",
        role: profile?.role ?? "Head coach",
        onboarded: profile?.onboarded ?? false,
        email: (claims as { email?: string })?.email ?? "",
      },
      club: club
        ? { name: club.club_name, country: club.country, crestInitial: club.crest_initial }
        : null,
      targets: club
        ? {
            pressWithin2s: club.press_within_2s,
            regainWithin5s: club.regain_within_5s,
            blockCeilingMin: club.block_ceiling_min,
          }
        : null,
      teams: (teams ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        ageGroup: t.age_group,
        colorA: t.color_a,
        colorB: t.color_b,
      })),
    };
  });

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => onboardingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const clubUpsert = await supabase.from("club_settings").upsert(
      {
        owner_id: userId,
        club_name: data.club.name,
        country: data.club.country,
        crest_initial: data.club.crestInitial,
        press_within_2s: data.targets.pressWithin2s,
        regain_within_5s: data.targets.regainWithin5s,
        block_ceiling_min: data.targets.blockCeilingMin,
      },
      { onConflict: "owner_id" },
    );
    if (clubUpsert.error) throw new Error(clubUpsert.error.message);

    const del = await supabase.from("teams").delete().eq("owner_id", userId);
    if (del.error) throw new Error(del.error.message);

    if (data.teams.length > 0) {
      const insert = await supabase.from("teams").insert(
        data.teams.map((t) => ({
          owner_id: userId,
          name: t.name,
          age_group: t.ageGroup,
          color_a: t.colorA,
          color_b: t.colorB,
        })),
      );
      if (insert.error) throw new Error(insert.error.message);
    }

    const profile = await supabase
      .from("profiles")
      .upsert({ id: userId, club_name: data.club.name, onboarded: true }, { onConflict: "id" })
      .select("id")
      .maybeSingle();
    if (profile.error) throw new Error(profile.error.message);

    return { ok: true };
  });
