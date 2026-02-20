import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MATCHPLAY_BASE = 'https://app.matchplay.events/api';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchAllPagesFromMatchplay(apiToken: string): Promise<unknown[]> {
  let allTournaments: unknown[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const params = new URLSearchParams({
      status: 'started',
      per_page: '100',
      page: String(page),
    });

    const url = `${MATCHPLAY_BASE}/tournaments?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Matchplay API error ${response.status}: ${body}`);
      throw new Error(`Matchplay API error: ${response.status} - ${body}`);
    }

    const json = await response.json();
    const tournaments = json?.data || [];
    allTournaments = allTournaments.concat(tournaments);

    if (json?.meta?.last_page) {
      lastPage = json.meta.last_page;
    }
    page++;
  } while (page <= lastPage);

  return allTournaments;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read cache
    const { data: cache, error: readError } = await supabase
      .from('tournament_cache')
      .select('data, updated_at')
      .eq('id', 1)
      .single();

    if (readError) {
      throw new Error(`Cache read error: ${readError.message}`);
    }

    const age = Date.now() - new Date(cache.updated_at).getTime();

    // If cache is fresh, return it
    if (age < CACHE_TTL_MS && cache.data) {
      console.log(`Cache hit (age: ${Math.round(age / 1000)}s)`);
      return new Response(JSON.stringify({ data: cache.data, cached_at: cache.updated_at }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cache is stale — try to refresh from Matchplay
    console.log(`Cache miss (age: ${Math.round(age / 1000)}s), refreshing...`);
    const apiToken = Deno.env.get('MATCHPLAY_API_TOKEN');
    if (!apiToken) {
      // No token — return stale cache
      console.warn('MATCHPLAY_API_TOKEN not configured, returning stale cache');
      return new Response(JSON.stringify({ data: cache.data, cached_at: cache.updated_at, stale: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let tournaments: unknown[];
    try {
      tournaments = await fetchAllPagesFromMatchplay(apiToken);
    } catch (fetchErr) {
      console.error('Matchplay fetch failed, returning stale cache:', fetchErr);
      return new Response(JSON.stringify({ data: cache.data, cached_at: cache.updated_at, stale: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update cache
    const now = new Date().toISOString();
    const { error: writeError } = await supabase
      .from('tournament_cache')
      .update({ data: tournaments, updated_at: now })
      .eq('id', 1);

    if (writeError) {
      console.error('Cache write error:', writeError.message);
    }

    console.log(`Refreshed cache with ${tournaments.length} tournaments`);
    return new Response(JSON.stringify({ data: tournaments, cached_at: now }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
