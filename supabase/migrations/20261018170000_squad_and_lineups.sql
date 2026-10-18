-- 18 Oct 2026: the player record. Why: the stats engine can be cloned; a season of coach-entered lineups, minutes and
-- consents for grassroots players cannot. This is the first slice: the squad, consent per player, who played each match.
-- Deliberately minimal (name, shirt, position, birth year) - GDPR: no more than the coach already keeps on paper.
-- Per-player tracked stats across matches come later, when the pipeline can tell players apart (re-identification);
-- these lineups are the ground truth that will train it.

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  shirt INTEGER,
  position TEXT NOT NULL DEFAULT '',          -- GK / DF / MF / FW / '' (free text allowed)
  birth_year INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  -- consent to keep the player's match record (given by the player or, for a minor, a guardian). No consent = the
  -- player appears only as a shirt number in lineups and nothing is ever shown per name outside the coach's own club.
  consent_status TEXT NOT NULL DEFAULT 'none',  -- none | given | withdrawn
  consent_at TIMESTAMPTZ,
  consent_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players_all_own" ON public.players FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX players_owner_idx ON public.players (owner_id, active);

-- who played which match: starters, subs and minutes, entered by the coach (the only source of truth for minutes today)
CREATE TABLE public.match_lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,                      -- the pipeline's match id (matches.id)
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  started BOOLEAN NOT NULL DEFAULT true,
  minute_on INTEGER NOT NULL DEFAULT 0,        -- match minute the player came on (0 = started)
  minute_off INTEGER,                          -- NULL = played to the end
  shirt INTEGER,                               -- shirt worn in this match (may differ from the squad default)
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_id)
);
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_lineups_all_own" ON public.match_lineups FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX match_lineups_match_idx ON public.match_lineups (owner_id, match_id);
CREATE INDEX match_lineups_player_idx ON public.match_lineups (player_id);

-- the coach's own match-level corrections that are not tied to one event (the event ones live in event_reviews):
-- e.g. possession "we had more than that", final score, which way we attacked. Each row is a label for the pipeline.
CREATE TABLE public.match_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  field TEXT NOT NULL,                         -- possession_pct | score | attack_right | other
  value JSONB NOT NULL,                        -- {"A": 48, "B": 52} / {"A": 3, "B": 2} / {"A": true}
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, match_id, field)
);
ALTER TABLE public.match_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_corrections_all_own" ON public.match_corrections FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER players_touch BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER match_lineups_touch BEFORE UPDATE ON public.match_lineups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
