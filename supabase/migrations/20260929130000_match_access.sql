-- match_access: who is allowed to see which match.
--
-- Matches live in a second Supabase project, reached with a publishable key and
-- no user identity, and `matches` has no owner column. So there is nothing over
-- there to scope a match to a coach, and nothing that could be scoped without
-- changing that project's schema.
--
-- This table puts the ownership question in the project that does have auth.
-- Server code checks it before signing a file URL or listing a match. The
-- matches project stays as it is and is only ever reached from the server with
-- a service-role key.
--
-- Granting is deliberately not something a coach can do for themselves: there
-- are no insert, update or delete policies, so only service-role (the pipeline,
-- or a server route) can hand out access.

BEGIN;

CREATE TABLE IF NOT EXISTS public.match_access (
  match_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS match_access_user_id_idx ON public.match_access (user_id);

ALTER TABLE public.match_access ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.match_access FROM anon;
GRANT SELECT ON public.match_access TO authenticated;
GRANT ALL ON public.match_access TO service_role;

-- A coach can see which matches they have been given, and nothing else.
DROP POLICY IF EXISTS "match_access_select_own" ON public.match_access;
CREATE POLICY "match_access_select_own" ON public.match_access
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

COMMIT;

-- BACKFILL REQUIRED BEFORE THIS SHIPS.
--
-- Every match is currently visible to every user. Once the server checks this
-- table, a coach with no rows here sees an empty library. Decide who owns the
-- existing matches and insert them, for example, to give one user everything:
--
--   INSERT INTO public.match_access (match_id, user_id)
--   SELECT m.id, '<user-uuid>'
--   FROM (VALUES ('<match-id-1>'), ('<match-id-2>')) AS m(id)
--   ON CONFLICT DO NOTHING;
--
-- The match ids live in the other project, so they have to be listed here or
-- copied across; this database cannot query them.
--
-- Longer term the pipeline that creates a match should insert the row that
-- grants its owner access, at the same time.
