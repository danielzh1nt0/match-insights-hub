CREATE TABLE public.event_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL,
  event_id text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('confirmed','deleted','retimed')),
  t_corrected real,
  team_corrected text,
  note text,
  reviewed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, event_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_reviews TO authenticated;
GRANT ALL ON public.event_reviews TO service_role;

ALTER TABLE public.event_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_reviews_select ON public.event_reviews
  FOR SELECT TO authenticated USING (true);
CREATE POLICY event_reviews_insert ON public.event_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewed_by);
CREATE POLICY event_reviews_update ON public.event_reviews
  FOR UPDATE TO authenticated USING (true) WITH CHECK (auth.uid() = reviewed_by);
CREATE POLICY event_reviews_delete ON public.event_reviews
  FOR DELETE TO authenticated USING (true);

CREATE INDEX event_reviews_match_idx ON public.event_reviews (match_id);

CREATE TRIGGER event_reviews_set_updated_at
  BEFORE UPDATE ON public.event_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();