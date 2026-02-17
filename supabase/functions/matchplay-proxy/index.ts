import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MATCHPLAY_BASE = 'https://app.matchplay.events/api';

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

    const apiUrl = `${MATCHPLAY_BASE}/${endpoint}?${params.toString()}`;
    console.log(`Fetching: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${MATCHPLAY_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Matchplay API error [${response.status}]:`, JSON.stringify(data));
      return new Response(JSON.stringify({ error: `Matchplay API error: ${response.status}`, details: data }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
