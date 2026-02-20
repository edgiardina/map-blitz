-- Tournament cache table for storing Matchplay API responses
-- This avoids hitting the Matchplay API on every frontend request.
-- The backend refreshes this cache every 5 minutes.

CREATE TABLE IF NOT EXISTS public.tournament_cache (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tournament_cache (id, data)
VALUES (1, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.tournament_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache is publicly readable"
  ON public.tournament_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Only service role can update cache"
  ON public.tournament_cache
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can insert cache"
  ON public.tournament_cache
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
