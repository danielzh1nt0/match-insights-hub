-- 24 Oct 2026: coach intent (data strategy, dataset 2). Which findings the coach acted on - saved into a session, put in a
-- reel, shown to the players - recorded as they do it, never as a separate chore. One row per (match, finding, kind).
CREATE TABLE public.finding_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  finding_id TEXT NOT NULL,                    -- the app's finding id (insights model)
  kind TEXT NOT NULL,                          -- session | reel | shown | dismissed
  headline TEXT,                               -- the finding's headline at the time (the model's wording changes over time)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, match_id, finding_id, kind)
);
ALTER TABLE public.finding_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finding_uses_all_own" ON public.finding_uses FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX finding_uses_match_idx ON public.finding_uses (owner_id, match_id);
