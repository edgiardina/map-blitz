-- Cache for individual tournament detail responses (e.g. player data for spotlight)
-- Keyed by the full API endpoint string so it works for any matchplay-proxy call.
-- TTL is enforced in the edge function (5 minutes), not via DB constraints.

CREATE TABLE IF NOT EXISTS public.tournament_detail_cache (
  cache_key text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_detail_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Detail cache is publicly readable"
  ON public.tournament_detail_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert detail cache"
  ON public.tournament_detail_cache
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update detail cache"
  ON public.tournament_detail_cache
  FOR UPDATE
  USING (auth.role() = 'service_role');
