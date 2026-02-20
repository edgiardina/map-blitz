
-- Single-row cache table for Matchplay tournament data
CREATE TABLE public.tournament_cache (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert the initial empty row
INSERT INTO public.tournament_cache (id, data) VALUES (1, '[]'::jsonb);

-- Allow anyone to read the cache (public data)
ALTER TABLE public.tournament_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache is publicly readable"
  ON public.tournament_cache
  FOR SELECT
  USING (true);

-- Only service role can write (edge function uses service role key)
CREATE POLICY "Only service role can update cache"
  ON public.tournament_cache
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can insert cache"
  ON public.tournament_cache
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
