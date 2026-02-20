import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MATCHPLAY_BASE = 'https://app.matchplay.events/api';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MATCHPLAY_API_TOKEN = Deno.env.get('MATCHPLAY_API_TOKEN');
    if (!MATCHPLAY_API_TOKEN) {
      throw new Error('MATCHPLAY_API_TOKEN is not configured');
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'tournaments';
    const params = new URLSearchParams();

    // Forward all query params except 'endpoint'
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== 'endpoint') {
        params.set(key, value);
      }
    }

    // Build a cache key from the endpoint + forwarded params
    const cacheKey = `${endpoint}?${params.toString()}`;

    // Only cache GET requests
    const isPost = req.method === 'POST';

    if (!isPost) {
      // Try reading from cache
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const { data: cached } = await supabase
        .from('tournament_detail_cache')
        .select('data, updated_at')
        .eq('cache_key', cacheKey)
        .single();

      if (cached) {
        const age = Date.now() - new Date(cached.updated_at).getTime();
        if (age < CACHE_TTL_MS) {
          console.log(`Detail cache hit for ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
          return new Response(JSON.stringify(cached.data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Cache miss or POST — fetch from Matchplay
    const apiUrl = `${MATCHPLAY_BASE}/${endpoint}?${params.toString()}`;
    console.log(`Fetching: ${apiUrl}`);

    const body = isPost ? await req.text() : undefined;

    const response = await fetch(apiUrl, {
      method: isPost ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${MATCHPLAY_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...(body ? { body } : {}),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Matchplay API error [${response.status}]:`, JSON.stringify(data));
      return new Response(JSON.stringify({ error: `Matchplay API error: ${response.status}`, details: data }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Write to cache for GET requests
    if (!isPost) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const now = new Date().toISOString();
      const { error: writeError } = await supabase
        .from('tournament_detail_cache')
        .upsert({ cache_key: cacheKey, data, updated_at: now }, { onConflict: 'cache_key' });

      if (writeError) {
        console.error('Detail cache write error:', writeError.message);
      } else {
        console.log(`Cached detail response for ${cacheKey}`);
      }
    }

    return new Response(JSON.stringify(data), {
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
