-- event_reviews: replace the permissive policies with per-coach ownership.
--
-- The table shipped with policies of the form USING (true), so any signed-in
-- user could read, change or delete every coach's review decisions. The client
-- also sets `reviewed_by` itself from the session, so nothing stopped a caller
-- writing rows attributed to someone else.
--
-- A review is one coach's judgement about one moment, so ownership is simply
-- reviewed_by = auth.uid().

-- One transaction: a partial apply would leave the table with RLS on and no
-- policies, which locks every coach out of their own reviews.
BEGIN;

ALTER TABLE public.event_reviews ENABLE ROW LEVEL SECURITY;

-- Drop whatever is currently there. Names are not known ahead of time because
-- the table was not created by a migration in this repo.
DO $$
DECLARE existing record;
BEGIN
  FOR existing IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_reviews'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.event_reviews', existing.policyname);
  END LOOP;
END $$;

-- A review is per coach, so the row identity has to include the reviewer.
-- Without this, two coaches reviewing the same match collide on one row: the
-- second one's upsert would be refused by the new policies and then fail on the
-- unique constraint. Any unique constraint or index on exactly
-- (match_id, event_id) is replaced.
DO $$
DECLARE existing record;
BEGIN
  FOR existing IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'event_reviews'
      AND con.contype IN ('u', 'p')
      AND (
        SELECT array_agg(att.attname::text ORDER BY att.attname::text)
        FROM unnest(con.conkey) AS k(attnum)
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum
      ) = ARRAY['event_id', 'match_id']
  LOOP
    EXECUTE format('ALTER TABLE public.event_reviews DROP CONSTRAINT %I', existing.conname);
  END LOOP;

  FOR existing IN
    SELECT cls.relname
    FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    JOIN pg_class rel ON rel.oid = idx.indrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'event_reviews'
      AND idx.indisunique
      AND (
        SELECT array_agg(att.attname::text ORDER BY att.attname::text)
        FROM unnest(idx.indkey::int2[]) AS k(attnum)
        JOIN pg_attribute att ON att.attrelid = idx.indrelid AND att.attnum = k.attnum
      ) = ARRAY['event_id', 'match_id']
  LOOP
    EXECUTE format('DROP INDEX public.%I', existing.relname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS event_reviews_match_event_reviewer_key
  ON public.event_reviews (match_id, event_id, reviewed_by);

-- Reviews are never public. The share routes that used to read this data are
-- gone; nothing anonymous needs it.
REVOKE ALL ON public.event_reviews FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_reviews TO authenticated;
GRANT ALL ON public.event_reviews TO service_role;

CREATE POLICY "event_reviews_select_own" ON public.event_reviews
  FOR SELECT TO authenticated USING (auth.uid() = reviewed_by);

-- WITH CHECK is what stops a caller attributing a review to another coach.
CREATE POLICY "event_reviews_insert_own" ON public.event_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewed_by);

CREATE POLICY "event_reviews_update_own" ON public.event_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = reviewed_by) WITH CHECK (auth.uid() = reviewed_by);

CREATE POLICY "event_reviews_delete_own" ON public.event_reviews
  FOR DELETE TO authenticated USING (auth.uid() = reviewed_by);

COMMIT;
